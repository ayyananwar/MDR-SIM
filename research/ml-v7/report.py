"""Publication tables and standard Matplotlib figures from frozen evaluation."""
import argparse
import os
from pathlib import Path
import numpy as np
from data import read_json,write_json,checksums,manifest,load_labels

def run(models,evaluation,output,data):
    models,evaluation,output=map(Path,[models,evaluation,output])
    if output.exists():raise ValueError('Choose a fresh report directory')
    output.mkdir(parents=True)
    os.environ['MPLCONFIGDIR']=str(output/'plot-cache')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    selection=read_json(models/'selection.json');summary=read_json(evaluation/'summary.json')
    rows=read_json(evaluation/'per-case-metrics.json');contrasts=read_json(evaluation/'contrasts.json')
    assert read_json(evaluation/'manifest.json')['status']=='complete'
    modalities=list(selection['models'])
    def pick(split,mod,det,condition='all'):
        return next(r for r in summary if (r['split'],r['modality'],r['detector'],r['condition'])==(split,mod,det,condition))
    def f(value):return '—' if value is None else f'{value:.3f}'
    lines=['# Trained contact reconstruction: v7 results','',
        'Models and decision settings were frozen before generating final test recordings. Training, probability calibration, validation and final evaluation use disjoint simulation seeds. These are synthetic contact results, not hardware or clinical validation.','',
        'The primary F1 is the mean within each seed across two sensor conditions, then across supported seeds. TP/FP/FN counts pool conditions and therefore repeat the same underlying motion realization twice. Empty reference-and-prediction cases have undefined event F1; false alarms in empty-reference cases are retained. Frame Brier/ECE use all frames, including negative and unavailable pairs.','',
        '## Prespecified selection and primary held-out results','',
        '| Observable modality | Validation-selected family | Threshold / decoder | Tuned rule F1 | Selected ML F1 | TP / FP / FN | Frame Brier | Frame ECE |','|---|---|---|---:|---:|---|---:|---:|']
    for mod in modalities:
        family=selection['best_by_validation'][mod];record=selection['models'][mod][family]
        a=pick('test',mod,family);b=pick('test',mod,'tuned_rule')
        lines.append(f"| {mod} | {family} | {record['threshold']} / {record['decoder']} | {f(b['meanSeed_f1'])} | {f(a['meanSeed_f1'])} | {a['tp']} / {a['fp']} / {a['fn']} | {f(a['meanSeed_frameBrier'])} | {f(a['meanSeed_frameECE'])} |")
    lines+=['','## All trained families and controls','', '| Modality | Strict | Temporal | Tuned rule | Logistic | Forest | Boosted trees | Learned Gaussian Bayes | Learned Markov | No history | No room feature |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    detectors=['strict_rule','temporal_rule','tuned_rule','logistic','random_forest','boosted_trees','gaussian_bayes','learned_markov','without_contact_history','without_room_feature']
    for mod in modalities:lines.append('| '+mod+' | '+' | '.join(f(pick('test',mod,d)['meanSeed_f1']) for d in detectors)+' |')
    lines+=['','## Condition-specific performance and unseen motion','',
        '| Modality | Selected family | LOS F1 | Wall F1 | Unseen-motion F1 | Unseen TP / FP / FN | Supported unseen seeds | Unseen false sessions / pair-hour |','|---|---|---:|---:|---:|---|---:|---:|']
    for mod in modalities:
        family=selection['best_by_validation'][mod];a=pick('external',mod,family)
        lines.append(f"| {mod} | {family} | {f(pick('test',mod,family,'LOS')['meanSeed_f1'])} | {f(pick('test',mod,family,'wall-multipath')['meanSeed_f1'])} | {f(a['meanSeed_f1'])} | {a['tp']} / {a['fp']} / {a['fn']} | {a['supportedSeeds_f1']} / 12 | {f(a['meanSeed_falseSessionsPerPairHour'])} |")
    lines+=['','## Paired uncertainty: selected ML minus equally tuned rule','', '| Modality | Mean seed F1 difference | Pointwise paired bootstrap 95% interval | Seeds |','|---|---:|---|---:|']
    for mod in modalities:
        family=selection['best_by_validation'][mod]
        c=next(c for c in contrasts if c['split']=='test' and c['modality']==mod and c['contrast']==f'{family} minus tuned_rule')
        ci=c['pairedBootstrap95'];lines.append(f"| {mod} | {f(c['meanSeedF1Difference'])} | {f(ci[0])}, {f(ci[1])} | {c['supportedSeeds']} |")
    lines+=['','Intervals are exploratory and pointwise; no multiple-comparison correction is applied. They reflect simulation seed variation under fixed error assumptions, not uncertainty over real hospital hardware.','',
        '## Limits and reproducibility','',
        '- Instantaneous proximity is the training target; qualified consecutive 30-second sessions are the primary evaluation target. Contact probability is not infection probability.',
        '- The room feature uses estimated positions and a public floor plan. True geometry is confined to sensor generation and labels. Missing pair estimates force nonpositive output.',
        '- Unseen motion uses independent waypoints on the same floor plan. This is not external hardware, hospital, map or patient validation.',
        '- The Markov extension learns transition frequencies from training labels. Its emission-independence approximation is imperfect for correlated feature histories; its outputs are not guaranteed calibrated.',
        '- All seven modalities include RSSI telemetry; AoA2/AoA4 add angles, and ranging modalities add their corresponding ranging observations. PBR+RTT uses the inherited consistency gate, not a new ranging fusion estimator.',
        '- Host inference timing excludes sensing and feature extraction and cannot establish wearable energy consumption or embedded latency.',
        '- The interrupted results/ml-v7-models directory is nonauthoritative. Frozen trained artifacts are in results/ml-v7-models-complete.',
        '',f'Frozen models: `{models.as_posix()}`. Evaluation: `{evaluation.as_posix()}`. Exact configurations, fitted estimators, per-recording probabilities, decisions, sessions and checksum manifests are retained.']
    lines+=['','## Recording support','', '| Partition | Independent motion seeds | Unique qualified contacts | Physical positive frames / unique pair-frames |','|---|---:|---:|---|']
    for split in ['train','validation','calibration','test','external']:
        m=manifest(data,split);unique={c['seed']:c for c in m['cases']}
        lines.append(f"| {split} | {len(unique)} | {sum(c['referenceContacts'] for c in unique.values())} | {sum(c['positiveFrames'] for c in unique.values())} / {sum(c['totalPairFrames'] for c in unique.values())} |")
    lines+=['','## Selected model duration, latency and false-alarm outcomes','', '| Modality | Duration MAE (s) | Median detection latency (s) | Missed qualified contact time | False sessions / pair-hour |','|---|---:|---:|---:|---:|']
    for mod in modalities:
        a=pick('test',mod,selection['best_by_validation'][mod]);lines.append(f"| {mod} | {f(a['meanSeed_durationMAE'])} | {f(a['meanSeed_medianDetectionLatency'])} | {f(a['meanSeed_missedContactTimeRate'])} | {f(a['meanSeed_falseSessionsPerPairHour'])} |")
    lines+=['','Duration and latency are means of supported per-recording conditional summaries. Poor recall can make their values look deceptively favorable; read them with missed-contact time and TP/FN.','',
        '## Frame-probability baseline','', '| Modality | Prior-only Brier | Selected-model Brier | Prior-only ECE | Selected-model ECE |','|---|---:|---:|---:|---:|']
    for mod in modalities:
        a=pick('test',mod,selection['best_by_validation'][mod]);b=pick('test',mod,'prior_only')
        lines.append(f"| {mod} | {f(b['meanSeed_frameBrier'])} | {f(a['meanSeed_frameBrier'])} | {f(b['meanSeed_frameECE'])} | {f(a['meanSeed_frameECE'])} |")
    (output/'ML_V7_RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    matrix=np.array([[pick('test',m,d)['meanSeed_f1'] or 0 for d in detectors] for m in modalities])
    fig,ax=plt.subplots(figsize=(12,4.5),layout='constrained');im=ax.imshow(matrix,vmin=0,vmax=1,cmap='viridis',aspect='auto')
    ax.set_xticks(range(len(detectors)),['Strict','Temporal','Tuned rule','Logistic','Forest','Boosted','Bayes','Markov','No history','No room'],rotation=35,ha='right');ax.set_yticks(range(len(modalities)),modalities)
    for i in range(len(modalities)):
        for j in range(len(detectors)):ax.text(j,i,f'{matrix[i,j]:.2f}',ha='center',va='center',color='white' if matrix[i,j]<.5 else 'black',fontsize=8)
    fig.colorbar(im,ax=ax,label='Mean seed contact F1');ax.set_title('Held-out synthetic contact reconstruction (30 seeds)')
    for ext in ['png','pdf']:fig.savefig(output/f'contact-f1-matrix.{ext}',dpi=220)
    plt.close(fig)
    fig,axes=plt.subplots(2,4,figsize=(12,6),layout='constrained');m=manifest(data,'test')
    reliability=[]
    for mod,ax in zip(modalities,axes.flat):
        family=selection['best_by_validation'][mod];count=np.zeros(10);psum=np.zeros(10);ysum=np.zeros(10)
        for case in m['cases']:
            with np.load(evaluation/'predictions'/f"test-{case['caseId']}-{mod}.npz") as archive:p=archive[f'p_{family}'].ravel()
            y=load_labels(data,'test',case,m).ravel();bins=np.minimum((p*10).astype(int),9)
            count+=np.bincount(bins,minlength=10);psum+=np.bincount(bins,weights=p,minlength=10);ysum+=np.bincount(bins,weights=y,minlength=10)
        supported=count>0;xx=psum[supported]/count[supported];yy=ysum[supported]/count[supported]
        ax.plot([0,1],[0,1],':',color='gray');ax.plot(xx,yy,'o-',markersize=4);ax.set_xlim(0,1);ax.set_ylim(0,1);ax.set_title(f'{mod}: {family}',fontsize=9)
        ax.set_xlabel('Predicted proximity probability');ax.set_ylabel('Observed positive fraction')
        reliability.append({'modality':mod,'family':family,'binCounts':count.tolist(),'probabilitySums':psum.tolist(),'labelSums':ysum.tolist()})
    axes.flat[-1].axis('off');fig.suptitle('Pooled descriptive reliability; frames and conditions are correlated',fontsize=11)
    for ext in ['png','pdf']:fig.savefig(output/f'reliability.{ext}',dpi=220)
    plt.close(fig);write_json(output/'reliability-bins.json',reliability)
    fig,axes=plt.subplots(1,2,figsize=(11,4),layout='constrained')
    positions=np.arange(len(modalities));width=.36
    for ax,split,title in zip(axes,['test','external'],['Held-out recordings','Unseen motion on the same map']):
        for shift,detlabel,color in [(-width/2,'rule','#666666'),(width/2,'ml','#167daa')]:
            values=[pick(split,m,'tuned_rule' if detlabel=='rule' else selection['best_by_validation'][m])['meanSeed_f1'] or 0 for m in modalities]
            ax.bar(positions+shift,values,width,label='Tuned rule' if detlabel=='rule' else 'Validation-selected ML',color=color)
        ax.set_xticks(positions,modalities,rotation=35,ha='right');ax.set_ylim(0,1);ax.set_ylabel('Mean supported seed contact F1');ax.set_title(title);ax.legend(fontsize=8)
    for ext in ['png','pdf']:fig.savefig(output/f'generalization.{ext}',dpi=220)
    plt.close(fig)
    write_json(output/'manifest.json',{'status':'complete','models':str(models.resolve()),'evaluation':str(evaluation.resolve()),'figures':'Matplotlib; fixed [0,1] F1 scales; no hardware validation'})
    checksums(output);print(f'Report and scientific figures: {output}')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('models');p.add_argument('evaluation');p.add_argument('output');p.add_argument('--data',default='results/ml-v7-data');a=p.parse_args();run(a.models,a.evaluation,a.output,a.data)
