"""Supplementary final audit, independent of production metrics/training code.

Checks eligible flags against X, frame ranking/calibration arithmetic, grouped
summaries, selected model provenance, paired intervals and manuscript table.
Does not fit models, select new settings or modify frozen campaign artifacts.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
from datetime import datetime,timezone
import numpy as np

def read(path):
    with (gzip.open(path,'rt',encoding='utf-8') if str(path).endswith('.gz') else Path(path).open(encoding='utf-8')) as f:return json.load(f)

def close(a,b,tolerance=1e-7):
    if a is None or b is None:assert a is None and b is None,(a,b)
    else:assert abs(a-b)<=tolerance,(a,b)

def average(values):
    values=[v for v in values if v is not None and np.isfinite(v)]
    return float(sum(values)/len(values)) if values else None

def frame_numbers(p,y):
    p=p.ravel();y=y.ravel();bins=np.minimum((p*10).astype(int),9);ece=0.
    for b in range(10):
        group=bins==b
        if group.any():ece+=group.mean()*abs(p[group].mean()-y[group].mean())
    positive=int(y.sum());negative=len(y)-positive
    auc=ap=None
    if positive and negative:
        order=np.argsort(p,kind='stable');pp=p[order];yy=y[order]
        starts=np.r_[0,np.flatnonzero(pp[1:]!=pp[:-1])+1]
        sizes=np.diff(np.r_[starts,len(y)]);positives=np.add.reduceat(yy.astype('i8'),starts);negatives=sizes-positives
        auc=float(np.sum(positives*(np.cumsum(negatives)-negatives+.5*negatives))/(positive*negative))
        sizes=sizes[::-1];positives=positives[::-1]
        ap=float(np.sum((positives/positive)*(np.cumsum(positives)/np.cumsum(sizes))))
    return {'frameBrier':float(np.mean((p-y)**2)),'frameECE':float(ece),'frameAUROC':auc,'frameAP':ap,
            'framePositive':positive,'frameCount':len(y)}

def audit(data,models,evaluation,output,project):
    data,models,evaluation,output,project=map(Path,[data,models,evaluation,output,project])
    if output.exists():raise ValueError('Use a fresh audit output')
    selected=read(models/'selection.json');ev=read(evaluation/'manifest.json')
    assert selected['status']=='frozen-before-test' and ev['status']=='complete'
    assert selected['testAccessedDuringTraining'] is False
    hashes_checked=0
    for path in [models/'source-checksums.json',data/'test'/'source-checksums.json',project/'results/paper-v3/source-checksums.json']:
        for r in read(path):
            assert hashlib.sha256((project/r['file']).read_bytes()).hexdigest()==r['sha256'],r['file']
            hashes_checked+=1
    manifests={s:read(data/s/'manifest.json') for s in ['train','validation','calibration','test','external']}
    for s in ['train','validation','calibration']:
        assert selected[f'{s}Seeds']==manifests[s]['seeds']
        assert selected['dataManifests'][s]==hashlib.sha256((data/s/'manifest.json').read_bytes()).hexdigest()
    for s in ['test','external']:
        assert ev['splits'][s]==manifests[s]['seeds']
        assert ev['testManifestHashes'][s]==hashlib.sha256((data/s/'manifest.json').read_bytes()).hexdigest()
    for mod,det in selected['best_by_validation'].items():
        candidates={d:selected['models'][mod][d] for d in manifests['train']['protocol']['familiesML']}
        winner=max(candidates,key=lambda d:(candidates[d]['validationSeedMeanF1'] or 0,-candidates[d]['validationFP'],candidates[d]['validationTP']))
        assert det==winner,(mod,det,winner)
    rows=read(evaluation/'per-case-metrics.json');keys=[(r['split'],r['caseId'],r['modality'],r['detector']) for r in rows]
    assert len(set(keys))==len(keys)==ev['detectorEvaluations']==6468
    index=dict(zip(keys,rows));checked=0;label_cache={}
    for artifact in ev['outputs']:
        split,case,mod=artifact['split'],artifact['caseId'],artifact['modality'];m=manifests[split]
        seed=int(case.split('-')[0]);key=(split,seed)
        if key not in label_cache:
            with gzip.open(data/split/f'labels-{seed}.u8.gz','rb') as f:label_cache[key]=np.frombuffer(f.read(),np.uint8).reshape(m['shape'][:2])
        entry=next(c for c in m['cases'] if c['caseId']==case)
        with gzip.open(data/split/entry['modalities'][mod],'rb') as f:x=np.frombuffer(f.read(),dtype='<f4').reshape(m['shape'])
        assert np.isfinite(x).all()
        with np.load(evaluation/artifact['predictionFile']) as arrays:
            np.testing.assert_array_equal(arrays['eligible'],x[:,:,2]>.5)
            detectors=[d[2:] for d in arrays.files if d.startswith('p_')]
            assert len(detectors)==11
            for det in detectors:
                row=index[(split,case,mod,det)];p=arrays[f'p_{det}']
                assert np.isfinite(p).all() and np.min(p)>=0 and np.max(p)<=1
                for metric,value in frame_numbers(p,label_cache[key]).items():close(row[metric],value)
                if det in selected['models'][mod]:
                    configuration=selected['models'][mod][det]
                    assert row['threshold']==configuration['threshold'] and row['decoder']==configuration['decoder']
                    assert (p[~arrays['eligible']]==0).all()
                checked+=1
    summary=read(evaluation/'summary.json');summary_keys=[(s['split'],s['modality'],s['detector'],s['condition']) for s in summary]
    assert len(set(summary_keys))==len(summary)==462
    metrics=['f1','precision','recall','frameBrier','frameECE','frameAUROC','frameAP','durationMAE','medianDetectionLatency','falseSessionsPerPairHour','missedContactTimeRate','falsePositiveTimeRate']
    for s in summary:
        rr=[r for r in rows if (r['split'],r['modality'],r['detector'])==(s['split'],s['modality'],s['detector']) and (s['condition']=='all' or r['condition']==s['condition'])]
        seeds=sorted({r['seed'] for r in rr})
        for metric in metrics:
            vv=[average([r[metric] for r in rr if r['seed']==seed]) for seed in seeds]
            close(s[f'meanSeed_{metric}'],average(vv))
            assert s[f'supportedSeeds_{metric}']==sum(v is not None for v in vv)
        for count in ['tp','fp','fn','referenceContacts']:assert s[count]==sum(r[count] for r in rr)
    rng=np.random.default_rng(1701);contrasts=read(evaluation/'contrasts.json')
    for c in contrasts:
        a,b=c['contrast'].split(' minus ')
        rr=[r for r in rows if r['split']==c['split'] and r['modality']==c['modality']]
        differences=[]
        for seed in sorted({r['seed'] for r in rr}):
            aa=average([r['f1'] for r in rr if r['seed']==seed and r['detector']==a]);bb=average([r['f1'] for r in rr if r['seed']==seed and r['detector']==b])
            if aa is not None and bb is not None:differences.append(aa-bb)
        assert c['supportedSeeds']==len(differences)
        close(c['meanSeedF1Difference'],average(differences))
        if differences:
            draws=np.mean(rng.choice(differences,size=(2000,len(differences)),replace=True),axis=1)
            np.testing.assert_allclose(c['pairedBootstrap95'],np.quantile(draws,[.025,.975]),atol=1e-12,rtol=0)
        else:assert c['pairedBootstrap95'] is None
    manuscript=(project/'docs/ML_V7_MANUSCRIPT_DRAFT.md').read_text(encoding='utf-8')
    expected_support={'train':119,'validation':49,'calibration':52,'test':176,'external':68}
    for split,m in manifests.items():
        unique={c['seed']:c for c in m['cases']}
        assert sum(c['referenceContacts'] for c in unique.values())==expected_support[split]
    mod_labels={'RSSI':'RSSI','AoA2':'RSSI + two angular receivers','AoA4':'RSSI + four angular receivers','PBR':'RSSI + PBR','RTT':'RSSI + RTT','PBR_RTT':'RSSI + PBR/RTT gate','UWB':'RSSI + UWB DS-TWR'}
    family_labels={'logistic':'Logistic regression','random_forest':'Random forest','boosted_trees':'Boosted trees','gaussian_bayes':'Gaussian naive Bayes'}
    for mod,det in selected['best_by_validation'].items():
        def result(split,d):return next(r for r in summary if (r['split'],r['modality'],r['detector'],r['condition'])==(split,mod,d,'all'))['meanSeed_f1']
        c=next(c for c in contrasts if (c['split'],c['modality'],c['contrast'])==('test',mod,f'{det} minus tuned_rule'))
        ci=c['pairedBootstrap95'];text=f"| {mod_labels[mod]} | {family_labels[det]} | {result('test','tuned_rule'):.3f} | {result('test',det):.3f} | {c['meanSeedF1Difference']:.3f} [{ci[0]:.3f}, {ci[1]:.3f}] | {result('external',det):.3f} |"
        assert text in manuscript,(mod,text)
    output.mkdir(parents=True)
    record={'status':'passed','auditedAtUTC':datetime.now(timezone.utc).isoformat(),'productionArtifactsModified':False,
            'sourceHashesChecked':hashes_checked,'frameMetricEvaluations':checked,'groupedSummaryRows':len(summary),'pairedIntervals':len(contrasts),
            'manuscriptPrimaryRows':7,'uniqueContactsByPartition':expected_support,
            'checks':['source provenance','partition identity and manifest provenance','validation-only primary family selection',
                      'finite probabilities and observable feature availability','frame Brier/ECE/AUROC/AP arithmetic','seed/condition aggregation and support',
                      'paired bootstrap interval arithmetic','manuscript primary numerical table'],
            'limits':['saved fitted models not retrained in this audit','same simulator, not external hardware or clinical validation','independent session verification is a separate command'],
            'modelSelectionSHA256':hashlib.sha256((models/'selection.json').read_bytes()).hexdigest(),
            'evaluationManifestSHA256':hashlib.sha256((evaluation/'manifest.json').read_bytes()).hexdigest(),
            'auditSourceSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (output/'audit.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(record,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('output');p.add_argument('--data',default='results/ml-v7-data');p.add_argument('--models',default='results/ml-v7-models-complete');p.add_argument('--evaluation',default='results/ml-v7-evaluation');p.add_argument('--project',default='.');a=p.parse_args();audit(a.data,a.models,a.evaluation,a.output,a.project)
