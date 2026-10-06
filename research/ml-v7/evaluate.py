"""Apply frozen models; no fit, calibration or selection on final recordings."""
import argparse
from pathlib import Path
import time
import joblib
import numpy as np
from threadpoolctl import threadpool_limits
from data import read_json,write_json,manifest,load_features,load_labels,load_reference,sha,checksums
from metrics import decode,sessions,event_metrics,frame_metrics,mean_supported
from model import filtered_probability

def summarize(rows,selected):
    summary=[];contrasts=[];rng=np.random.default_rng(1701)
    for split in sorted({r['split'] for r in rows}):
        for modality in selected['models']:
            subset=[r for r in rows if r['split']==split and r['modality']==modality]
            seeds=sorted({r['seed'] for r in subset})
            for detector in sorted({r['detector'] for r in subset}):
                rr=[r for r in subset if r['detector']==detector]
                for condition in ['all','LOS','wall-multipath']:
                    cc=rr if condition=='all' else [r for r in rr if r['condition']==condition]
                    out={'split':split,'modality':modality,'detector':detector,'condition':condition}
                    for metric in ['f1','precision','recall','frameBrier','frameECE','frameAUROC','frameAP',
                        'durationMAE','medianDetectionLatency','falseSessionsPerPairHour','missedContactTimeRate','falsePositiveTimeRate']:
                        values=[mean_supported([r[metric] for r in cc if r['seed']==seed]) for seed in seeds]
                        out[f'meanSeed_{metric}']=mean_supported(values);out[f'supportedSeeds_{metric}']=sum(v is not None for v in values)
                    for count in ['tp','fp','fn','referenceContacts']:out[count]=sum(r[count] for r in cc)
                    summary.append(out)
            comparisons=[(family,'tuned_rule') for family in selected['models'][modality]]
            full=selected['best_by_validation'][modality]
            comparisons.extend([(full,'without_contact_history'),(full,'without_room_feature'),('learned_markov',full)])
            for a,b in comparisons:
                differences=[]
                for seed in seeds:
                    aa=mean_supported([r['f1'] for r in subset if r['seed']==seed and r['detector']==a]);bb=mean_supported([r['f1'] for r in subset if r['seed']==seed and r['detector']==b])
                    if aa is not None and bb is not None:differences.append(aa-bb)
                draws=np.mean(rng.choice(differences,size=(2000,len(differences)),replace=True),axis=1) if differences else np.array([])
                contrasts.append({'split':split,'modality':modality,'contrast':f'{a} minus {b}','supportedSeeds':len(differences),
                    'meanSeedF1Difference':mean_supported(differences),'pairedBootstrap95':np.quantile(draws,[.025,.975]).tolist() if len(draws) else None})
    return summary,contrasts

def run(root,models,output):
    root,models,output=Path(root),Path(models),Path(output)
    selected=read_json(models/'selection.json')
    if selected['status']!='frozen-before-test':raise ValueError('Models not frozen')
    for record in read_json(models/'checksums.json'):
        if sha(models/record['file'])!=record['sha256']:raise ValueError('Model/provenance checksum mismatch')
    if output.exists():raise ValueError('Use fresh evaluation directory')
    output.mkdir(parents=True);(output/'predictions').mkdir();rows=[];artifacts=[]
    split_manifests={s:manifest(root,s) for s in ['test','external']}
    known=set(selected['trainSeeds']+selected['validationSeeds']+selected['calibrationSeeds'])
    test_seeds=set()
    for m in split_manifests.values():
        if known.intersection(m['seeds']) or test_seeds.intersection(m['seeds']):raise ValueError('Final split leakage')
        test_seeds.update(m['seeds'])
        if m['protocolSha256']!=selected['protocolSha256']:raise ValueError('Protocol changed after training')
    evaluation={'version':'ml-v7','status':'running','models':str(models.resolve()),'modelSelectionSha256':sha(models/'selection.json'),
        'splits':{s:m['seeds'] for s,m in split_manifests.items()},'protocolSha256':selected['protocolSha256'],
        'selectionFrozenBeforeTest':True,'outputs':artifacts,
        'testManifestHashes':{s:sha(root/s/'manifest.json') for s in split_manifests}}
    write_json(output/'manifest.json',evaluation)
    bundles={(mod,det):joblib.load(models/'models'/f'{mod}-{det}.joblib') for mod in selected['models'] for det in selected['models'][mod]}
    for split,m in split_manifests.items():
        for case in m['cases']:
            reference=load_reference(root,split,case);labels=load_labels(root,split,case,m)
            for modality in selected['models']:
                x=load_features(root,split,case,modality,m);eligible=x[:,:,2]>.5
                probabilities={};decisions={};contacts={}
                for detector in [*selected['models'][modality],'strict_rule','temporal_rule','tuned_rule','prior_only']:
                    start=time.perf_counter()
                    if detector in selected['models'][modality]:
                        bundle=bundles[(modality,detector)];p=filtered_probability(bundle,x).astype('f4');threshold=bundle['threshold'];policy=bundle['decoder']
                    elif detector=='prior_only':
                        p=np.full(eligible.shape,selected['transitions']['prior'],dtype='f4');threshold=.5;policy='strict'
                    else:
                        settings=selected['tuned_rules'][modality] if detector=='tuned_rule' else {'distance':2,'decoder':'occupancy' if detector=='temporal_rule' else 'strict'}
                        p=np.where(eligible&(x[:,:,1]>.5)&(x[:,:,0]<=settings['distance']),1.,0.).astype('f4');threshold=.5;policy=settings['decoder']
                    bits=decode(p,eligible,threshold,policy);elapsed=time.perf_counter()-start
                    predicted=sessions(bits,m['pairs']);contact=event_metrics(predicted,reference,len(bits),m['pairs'])
                    row={'split':split,'seed':case['seed'],'caseId':case['caseId'],'family':case['family'],'condition':case['condition'],
                        'modality':modality,'detector':detector,'threshold':threshold,'decoder':policy,
                        'availablePairFraction':float(eligible.mean()),'hostInferenceSeconds':elapsed,
                        **contact,**frame_metrics(p,labels)}
                    rows.append(row);probabilities[detector]=p;decisions[detector]=bits;contacts[detector]=predicted
                name=f"{split}-{case['caseId']}-{modality}.npz"
                np.savez_compressed(output/'predictions'/name,eligible=eligible,
                    **{f'p_{k}':v for k,v in probabilities.items()},**{f'd_{k}':v for k,v in decisions.items()})
                json_name=name.replace('.npz','.json');write_json(output/'predictions'/json_name,contacts)
                artifacts.append({'split':split,'caseId':case['caseId'],'modality':modality,'predictionFile':f'predictions/{name}',
                    'contactFile':f'predictions/{json_name}'})
            print(f"Evaluated {split} {case['caseId']} ({len(rows)} detector evaluations)",flush=True)
    summary,contrasts=summarize(rows,selected)
    write_json(output/'per-case-metrics.json',rows);write_json(output/'summary.json',summary);write_json(output/'contrasts.json',contrasts)
    evaluation['status']='complete';evaluation['detectorEvaluations']=len(rows);write_json(output/'manifest.json',evaluation)
    checksums(output);print(f'Complete: {output}',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('data',nargs='?',default='results/ml-v7-data');p.add_argument('models',nargs='?',default='results/ml-v7-models');p.add_argument('output',nargs='?',default='results/ml-v7-evaluation')
    args=p.parse_args()
    with threadpool_limits(limits=4):run(args.data,args.models,args.output)
