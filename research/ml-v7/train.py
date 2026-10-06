"""Train/calibrate/select models without opening test or external directories."""
import argparse
from pathlib import Path
import warnings
import platform
import time
import joblib
import numpy as np
import sklearn
from scipy.special import logit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.naive_bayes import GaussianNB
from threadpoolctl import threadpool_limits
from data import manifest, training_matrix, load_features, load_labels, load_reference, write_json, sha, checksums
from metrics import decode, sessions, event_metrics, frame_metrics, hmm_filter, mean_supported
from model import probability

def candidates(name):
    if name == 'logistic':
        return [(f'C={c}', make_pipeline(StandardScaler(),LogisticRegression(C=c,class_weight='balanced',max_iter=2000,random_state=1701))) for c in [.1,1.]]
    if name == 'random_forest':
        return [(f'depth={d}',RandomForestClassifier(n_estimators=64,max_depth=d,min_samples_leaf=25,class_weight='balanced',n_jobs=4,random_state=1701)) for d in [8,12]]
    if name == 'boosted_trees':
        return [(f'leaves={n}',HistGradientBoostingClassifier(max_iter=80,max_leaf_nodes=n,min_samples_leaf=50,l2_regularization=.1,
            early_stopping=False,class_weight='balanced',random_state=1701)) for n in [15,31]]
    if name == 'gaussian_bayes':
        return [(f'variance_smoothing={s}',make_pipeline(StandardScaler(),GaussianNB(var_smoothing=s))) for s in [1e-6,1e-3]]
    raise ValueError(name)

def transitions(root, m):
    counts = np.ones((2,2),dtype=float); positive=total=0
    for case in m['cases']:
        y=load_labels(root,'train',case,m)
        for a in [0,1]:
            for b in [0,1]: counts[a,b]+=int(((y[:-1]==a)&(y[1:]==b)).sum())
        positive+=int(y.sum());total+=y.size
    return {'p01':counts[0,1]/counts[0].sum(),'p11':counts[1,1]/counts[1].sum(),'prior':positive/total,
        'counts_with_beta_one':counts.tolist()}

def select_policy(probabilities, cases, pairs, grid, policies):
    best=None; records=[]
    for threshold in grid:
        for policy in policies:
            results=[]
            for case,p in zip(cases,probabilities):
                bits=decode(p,case['eligible'],threshold,policy)
                metrics=event_metrics(sessions(bits,pairs),case['reference'],len(bits),pairs)
                results.append({'seed':case['seed'],**metrics})
            seeds=sorted({r['seed'] for r in results})
            seed_f1=[mean_supported([r['f1'] for r in results if r['seed']==seed]) for seed in seeds]
            score=mean_supported(seed_f1)
            record={'threshold':threshold,'decoder':policy,'validationSeedMeanF1':score,
                'validationFP':sum(r['fp'] for r in results),'validationTP':sum(r['tp'] for r in results),
                'validationFN':sum(r['fn'] for r in results)}
            records.append(record)
            key=(score if score is not None else -1.,-record['validationFP'],record['validationTP'],threshold,policy=='strict')
            if best is None or key>best[0]:best=(key,record)
    return best[1],records

def calibrate(estimator, indices, xc, yc):
    eligible=xc[:,2]>.5
    raw=estimator.predict_proba(xc[:,indices])[:,1]
    calibration=LogisticRegression(C=100.,max_iter=2000,random_state=1701)
    calibration.fit(logit(np.clip(raw[eligible],1e-6,1-1e-6)).reshape(-1,1),yc[eligible])
    return calibration,raw,float(yc[eligible].mean())

def fit_select(estimator,indices,xt,yt,xc,yc,cases,pairs,protocol,trans):
    start=time.perf_counter()
    with warnings.catch_warnings(record=True) as recorded:
        warnings.simplefilter('always');estimator.fit(xt[:,indices],yt)
        calibrator,raw,emission_prior=calibrate(estimator,indices,xc,yc)
    bundle={'estimator':estimator,'calibrator':calibrator,'indices':indices,'hmm':False,
        'transitions':trans,'emission_prior':emission_prior}
    probs=[probability(bundle,c['x']) for c in cases]
    selected,grid=select_policy(probs,cases,pairs,protocol['thresholdGrid'],protocol['decoderGrid'])
    bundle.update(selected)
    return bundle,grid,probs,raw,{'fitSeconds':time.perf_counter()-start,'warnings':[str(w.message) for w in recorded]}

def run(root, output):
    root,output=Path(root),Path(output)
    if output.exists():raise ValueError('Use a fresh model output directory.')
    output.mkdir(parents=True);(output/'models').mkdir();(output/'validation').mkdir();(output/'calibration').mkdir()
    tm,vm,cm=[manifest(root,s) for s in ['train','validation','calibration']]
    if not len(set(tm['seeds'])|set(vm['seeds'])|set(cm['seeds']))==sum(len(m['seeds']) for m in [tm,vm,cm]):raise ValueError('Seed leakage')
    if len({m['protocolSha256'] for m in [tm,vm,cm]})!=1:raise ValueError('Protocol mismatch')
    protocol=tm['protocol'];trans=transitions(root,tm)
    report={'version':'ml-v7','status':'training','protocolSha256':tm['protocolSha256'],'features':tm['features'],
        'trainSeeds':tm['seeds'],'validationSeeds':vm['seeds'],'calibrationSeeds':cm['seeds'],
        'trainingStrideSeconds':protocol['trainingStrideSeconds'],'transitions':trans,
        'models':{},'best_by_validation':{},'tuned_rules':{},'candidateSearch':[],
        'versions':{'python':platform.python_version(),'numpy':np.__version__,'sklearn':sklearn.__version__,'joblib':joblib.__version__},
        'dataManifests':{s:sha(root/s/'manifest.json') for s in ['train','validation','calibration']},
        'selection':'seed-mean validation event F1; ties fewer false sessions, more matches, larger threshold, strict policy',
        'testAccessedDuringTraining':False}
    source_dir=Path(__file__).parent;project=source_dir.parents[1]
    sources=[{'file':str(p.relative_to(project)).replace('\\','/'),'sha256':sha(p)} for p in sorted(source_dir.iterdir()) if p.suffix in ['.mjs','.py','.txt']]
    write_json(output/'source-checksums.json',sources);write_json(output/'selection.json',report)
    stride=protocol['trainingStrideSeconds']
    for modality in protocol['modalities']:
        xt,yt,_=training_matrix(root,'train',modality,stride);xc,yc,_=training_matrix(root,'calibration',modality)
        if len(np.unique(yt))!=2 or len(np.unique(yc))!=2:raise ValueError('Insufficient training/calibration classes')
        cases=[]
        for c in vm['cases']:
            x=load_features(root,'validation',c,modality,vm)
            cases.append({**c,'x':x,'eligible':x[:,:,2]>.5,'reference':load_reference(root,'validation',c),
                'labels':load_labels(root,'validation',c,vm)})
        model_records={};best_full=None
        for family in protocol['familiesML']:
            chosen=None
            for config,estimator in candidates(family):
                bundle,grid,probabilities,raw,diagnostic=fit_select(estimator,np.arange(len(tm['features'])),xt,yt,xc,yc,cases,tm['pairs'],protocol,trans)
                entry={'modality':modality,'family':family,'config':config,**diagnostic,'policies':grid}
                report['candidateSearch'].append(entry)
                key=(bundle['validationSeedMeanF1'] or 0.,-bundle['validationFP'],bundle['validationTP'])
                if chosen is None or key>chosen[0]:chosen=(key,config,bundle,probabilities,raw,diagnostic)
            key,config,bundle,probabilities,raw,diagnostic=chosen
            name=f'{modality}-{family}';joblib.dump(bundle,output/'models'/f'{name}.joblib',compress=3)
            record={k:bundle[k] for k in ['threshold','decoder','validationSeedMeanF1','validationFP','validationTP','validationFN']}
            record.update({'name':name,'family':family,'config':config,'indices':bundle['indices'].tolist(),
                'trainingRows':len(yt),'trainingPositive':int(yt.sum()),'calibrationRows':len(yc),
                'modelBytes':(output/'models'/f'{name}.joblib').stat().st_size,**diagnostic})
            model_records[family]=record
            for c,p in zip(cases,probabilities):
                bits=decode(p,c['eligible'],bundle['threshold'],bundle['decoder'])
                np.savez_compressed(output/'validation'/f"{name}-{c['caseId']}.npz",probability=p.astype('f4'),decisions=bits)
            calibrated=bundle['calibrator'].predict_proba(logit(np.clip(raw,1e-6,1-1e-6)).reshape(-1,1))[:,1]
            np.savez_compressed(output/'calibration'/f'{name}.npz',raw_probability=raw.astype('f4'),calibrated_probability=calibrated.astype('f4'))
            record['trainingFrameDiagnostic']=frame_metrics(probability(bundle,xt.reshape(1,len(xt),-1)),yt)
            record['validationFrameDiagnostic']={metric:mean_supported([frame_metrics(p,c['labels'])[metric] for c,p in zip(cases,probabilities)])
                for metric in ['frameBrier','frameECE','frameAUROC','frameAP']}
            # Interpretable fitted parameters/importances without claiming causality.
            model=estimator if family in ['random_forest','boosted_trees'] else bundle['estimator'].steps[-1][1]
            if family=='logistic':record['standardizedCoefficients']=dict(zip(tm['features'],model.coef_[0].tolist()))
            if family=='random_forest':record['impurityImportances']=dict(zip(tm['features'],bundle['estimator'].feature_importances_.tolist()))
            if family=='gaussian_bayes':record['learnedClassPrior']=model.class_prior_.tolist()
            if best_full is None or key>best_full[0]:best_full=(key,family,config,bundle,probabilities)
            print(f'{modality}: selected {family} {config}; validation F1={record["validationSeedMeanF1"]:.3f}',flush=True)
        _,best_family,best_config,best_bundle,best_probs=best_full
        report['best_by_validation'][modality]=best_family
        # Train-count transition model; approximate emission independence is disclosed.
        hmmp=[hmm_filter(p,c['eligible'],trans,best_bundle['emission_prior']) for c,p in zip(cases,best_probs)]
        chosen,hmmgrid=select_policy(hmmp,cases,tm['pairs'],protocol['thresholdGrid'],protocol['decoderGrid'])
        hmm_bundle={**best_bundle,**chosen,'hmm':True}
        joblib.dump(hmm_bundle,output/'models'/f'{modality}-learned_markov.joblib',compress=3)
        model_records['learned_markov']={**chosen,'family':best_family,'config':best_config,'baseFamily':best_family,'hmm':True}
        report['candidateSearch'].append({'modality':modality,'family':'learned_markov','policies':hmmgrid})
        for ablation in protocol['ablations']:
            indices=np.array([i for i,n in enumerate(tm['features']) if not (ablation=='without_room_feature' and n=='estimatedSameRoom')
                and not (ablation=='without_contact_history' and i>=20)])
            estimator=dict(candidates(best_family))[best_config]
            bundle,grid,_,_,diagnostic=fit_select(estimator,indices,xt,yt,xc,yc,cases,tm['pairs'],protocol,trans)
            joblib.dump(bundle,output/'models'/f'{modality}-{ablation}.joblib',compress=3)
            model_records[ablation]={k:bundle[k] for k in ['threshold','decoder','validationSeedMeanF1','validationFP','validationTP','validationFN']}
            model_records[ablation].update({'family':best_family,'config':best_config,'indices':indices.tolist(),**diagnostic})
            report['candidateSearch'].append({'modality':modality,'family':ablation,'policies':grid})
        # Give the deterministic comparator the same validation privilege as ML.
        best_rule=None;rule_grid=[]
        for distance in protocol['ruleDistanceGrid']:
            pp=[np.where(c['eligible']&(c['x'][:,:,1]>.5)&(c['x'][:,:,0]<=distance),1.,0.) for c in cases]
            selected,grid=select_policy(pp,cases,tm['pairs'],[.5],protocol['decoderGrid'])
            key=(selected['validationSeedMeanF1'] or 0.,-selected['validationFP'],selected['validationTP'],-abs(distance-2))
            rule_grid.append({'distance':distance,**selected})
            if best_rule is None or key>best_rule[0]:best_rule=(key,{'distance':distance,**selected})
        report['tuned_rules'][modality]=best_rule[1];report['models'][modality]=model_records
        report['candidateSearch'].append({'modality':modality,'family':'tuned_rule','policies':rule_grid})
        write_json(output/'selection.json',report)
    report['status']='frozen-before-test';write_json(output/'selection.json',report)
    checksums(output);print(f'Frozen models and settings: {output}',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('data',nargs='?',default='results/ml-v7-data');parser.add_argument('output',nargs='?',default='results/ml-v7-models')
    args=parser.parse_args()
    with threadpool_limits(limits=4):run(args.data,args.output)
