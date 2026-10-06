"""Independent verifier: no import of training/model/metric implementations."""
import argparse
import gzip
import json
import hashlib
from pathlib import Path
import numpy as np

def read(path):
    with (gzip.open(path,'rt',encoding='utf-8') if str(path).endswith('.gz') else Path(path).open(encoding='utf-8')) as f:return json.load(f)
def hashes(root):
    for record in read(root/'checksums.json'):
        assert hashlib.sha256((root/record['file']).read_bytes()).hexdigest()==record['sha256'],record['file']
def independent_sessions(bits,pairs):
    result=[]
    for j,pair in enumerate(pairs):
        start=None
        for t in range(len(bits)+1):
            positive=t<len(bits) and bool(bits[t,j])
            if positive and start is None:start=t
            if not positive and start is not None:
                end=t-1
                if end-start>=30:result.append({'pair':'|'.join(pair),'start':start,'end':end,'detectedAt':start+30})
                start=None
    return sorted(result,key=lambda s:(s['pair'],s['start']))
def independent_decode(p,e,threshold,policy):
    result=np.zeros_like(e)
    if policy=='strict':return (p>=threshold)&e
    for t in range(9,len(p)):
        result[t]=(((p[t-9:t+1]>=threshold)&e[t-9:t+1]).sum(axis=0)>=7)&e[t]
    return result

def verify(root,models,evaluation):
    root,models,evaluation=map(Path,[root,models,evaluation])
    selected=read(models/'selection.json');assert selected['status']=='frozen-before-test'
    hashes(models);hashes(evaluation)
    groups={s:set(read(root/s/'manifest.json')['seeds']) for s in ['train','validation','calibration','test','external']}
    assert len(set.union(*groups.values()))==sum(len(v) for v in groups.values())
    manifests={s:read(root/s/'manifest.json') for s in groups}
    assert len({m['protocolSha256'] for m in manifests.values()})==1
    # Check every split's geometry/labels without using simulator reference routines.
    references={};sample_count=0
    for split,m in manifests.items():
        hashes(root/split)
        for seed in m['seeds']:
            truth=read(root/split/f'truth-{seed}.json.gz')
            bits=np.zeros(m['shape'][:2],bool)
            for f in truth['frames']:
                positions={p['id']:p for p in f['positions']}
                for j,(a,b) in enumerate(m['pairs']):
                    p,q=positions[a],positions[b]
                    bits[f['t'],j]=(p['x']<12)==(q['x']<12) and (p['x']-q['x'])**2+(p['y']-q['y'])**2<=4
                if f['t']:
                    previous={p['id']:p for p in truth['frames'][f['t']-1]['positions']}
                    for p in positions.values():
                        a=previous[p['id']];assert np.hypot(a['x']-p['x'],a['y']-p['y'])<=1.2+1e-8
                        if (a['x']<12)!=(p['x']<12):assert 9<=a['y']<=11 and 9<=p['y']<=11
            with gzip.open(root/split/f'labels-{seed}.u8.gz','rb') as f:labels=np.frombuffer(f.read(),np.uint8).reshape(bits.shape)
            np.testing.assert_array_equal(bits,labels)
            reference=independent_sessions(bits,m['pairs']);assert reference==sorted(truth['reference'],key=lambda s:(s['pair'],s['start']))
            references[(split,seed)]=reference;sample_count+=bits.size
    ev=read(evaluation/'manifest.json');assert ev['status']=='complete'
    assert ev['modelSelectionSha256']==hashlib.sha256((models/'selection.json').read_bytes()).hexdigest()
    rows=read(evaluation/'per-case-metrics.json');index={(r['split'],r['caseId'],r['modality'],r['detector']):r for r in rows};checked=0
    for artifact in ev['outputs']:
        split=artifact['split'];m=manifests[split];seed=int(artifact['caseId'].split('-')[0]);reference=references[(split,seed)]
        arrays=np.load(evaluation/artifact['predictionFile']);contacts=read(evaluation/artifact['contactFile']);eligible=arrays['eligible']
        for detector in contacts:
            row=index[(split,artifact['caseId'],artifact['modality'],detector)];p=arrays[f'p_{detector}'];bits=arrays[f'd_{detector}']
            np.testing.assert_array_equal(bits,independent_decode(p,eligible,row['threshold'],row['decoder']))
            predicted=independent_sessions(bits,m['pairs']);assert predicted==contacts[detector]
            edges=[]
            for i,a in enumerate(predicted):
                for j,b in enumerate(reference):
                    overlap=min(a['end'],b['end'])-max(a['start'],b['start'])
                    iou=overlap/(max(a['end'],b['end'])-min(a['start'],b['start']))
                    if a['pair']==b['pair'] and overlap>=5 and iou>=.2:edges.append((iou,i,j))
            pp,gg=set(),set()
            for _,i,j in sorted(edges,key=lambda e:(-e[0],e[1],e[2])):
                if i not in pp and j not in gg:pp.add(i);gg.add(j)
            assert (row['tp'],row['fp'],row['fn'])==(len(pp),len(predicted)-len(pp),len(reference)-len(gg))
            denom=2*row['tp']+row['fp']+row['fn'];assert row['f1']==(2*row['tp']/denom if denom else None)
            target=np.zeros_like(bits);output=np.zeros_like(bits);pi={'|'.join(pair):j for j,pair in enumerate(m['pairs'])}
            for s in reference:target[s['start']:s['end']+1,pi[s['pair']]]=True
            for s in predicted:output[s['start']:s['end']+1,pi[s['pair']]]=True
            assert row['falsePositivePairSeconds']==int((output&~target).sum())
            assert row['falseNegativePairSeconds']==int((target&~output).sum())
            with gzip.open(root/split/f'labels-{seed}.u8.gz','rb') as f:y=np.frombuffer(f.read(),np.uint8).reshape(bits.shape)
            assert abs(row['frameBrier']-float(np.mean((p.ravel()-y.ravel())**2)))<1e-8
            checked+=1
    assert checked==ev['detectorEvaluations'];print(f'Independently verified {sample_count:,} physical labels and {checked:,} detector evaluations.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('data',nargs='?',default='results/ml-v7-data');p.add_argument('models',nargs='?',default='results/ml-v7-models');p.add_argument('evaluation',nargs='?',default='results/ml-v7-evaluation');a=p.parse_args();verify(a.data,a.models,a.evaluation)
