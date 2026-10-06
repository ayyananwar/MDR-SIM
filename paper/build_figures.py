"""Publication figures derived exclusively from frozen research artifacts."""
import json
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'paper/figures';OUT.mkdir(parents=True,exist_ok=True)
os.environ['MPLCONFIGDIR']=str(ROOT/'.research-cache/paper-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

read=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))
selection=read('results/ml-v7-models-complete/selection.json');summary=read('results/ml-v7-evaluation/summary.json');contrasts=read('results/ml-v7-evaluation/contrasts.json')
mods=list(selection['models']);labels=['RSSI','AoA2','AoA4','PBR','RTT','PBR/RTT','UWB']
plt.rcParams.update({'font.family':'DejaVu Serif','font.size':9.5,'axes.spines.top':False,'axes.spines.right':False,'pdf.fonttype':42})
def save(fig,name):
    for ext in ['png','pdf']:fig.savefig(OUT/f'{name}.{ext}',dpi=320,bbox_inches='tight',pad_inches=.12)
    plt.close(fig)
def get(split,mod,det,condition='all'):
    return next(r for r in summary if (r['split'],r['modality'],r['detector'],r['condition'])==(split,mod,det,condition))

fig,ax=plt.subplots(figsize=(6.8,3.8),layout='constrained')
ax.add_patch(Rectangle((0,0),24,20,facecolor='#f5f7f8',edgecolor='black',lw=1))
ax.plot([12,12],[0,9],color='black',lw=2);ax.plot([12,12],[11,20],color='black',lw=2)
ax.text(6,10,'Room A',ha='center',fontsize=11);ax.text(18,10,'Room B',ha='center',fontsize=11)
anchors=[(2,2,0),(22,2,np.pi/2),(22,18,np.pi),(2,18,-np.pi/2)]
for i,(x,y,theta) in enumerate(anchors):
    color='#126b8e' if i in [0,2] else '#555555';ax.scatter(x,y,s=75,marker='s',color=color,zorder=4)
    ax.annotate(f'g{i} ({x}, {y})',(x,y),xytext=(5,6) if x<12 else (-5,6),textcoords='offset points',ha='left' if x<12 else 'right',fontsize=8)
    ax.arrow(x,y,1.4*np.cos(theta),1.4*np.sin(theta),head_width=.45,length_includes_head=True,color=color)
ax.annotate('Doorway y = 9–11 m',(12,10),(13,5),arrowprops={'arrowstyle':'->'},fontsize=8.5)
ax.set(xlim=(-.5,24.5),ylim=(-.5,20.5),xlabel='x coordinate (m)',ylabel='y coordinate (m)');ax.set_aspect('equal')
ax.text(24,21.5,'Blue receivers: AoA2 upgrades; all four: AoA4',ha='right',fontsize=8.5)
save(fig,'floorplan')

fig,ax=plt.subplots(figsize=(6.8,3.5),layout='constrained')
for i,mod in enumerate(mods):
    det=selection['best_by_validation'][mod]
    c=next(c for c in contrasts if (c['split'],c['modality'],c['contrast'])==('test',mod,f'{det} minus tuned_rule'))
    mid=c['meanSeedF1Difference'];lo,hi=c['pairedBootstrap95']
    ax.errorbar(mid,i,xerr=[[mid-lo],[hi-mid]],fmt='o',capsize=3,color='#126b8e')
    ax.text(.515,i,f'{mid:.3f} [{lo:.3f}, {hi:.3f}]',va='center',ha='left',fontsize=8.8)
ax.axvline(0,color='gray',linestyle='--',lw=1);ax.set_yticks(range(7),labels);ax.invert_yaxis();ax.set_xlim(-.04,.77);ax.set_xticks([0,.1,.2,.3,.4,.5])
ax.set_xlabel('Mean seed contact F1 difference');ax.grid(axis='x',alpha=.18)
save(fig,'paired-effects')

fig,axes=plt.subplots(1,2,figsize=(6.8,3.2),layout='constrained')
x=np.arange(7);width=.36
for ax,split,title in zip(axes,['test','external'],['Primary test (30 seeds)','Unseen motion (12 seeds)']):
    rule=[get(split,m,'tuned_rule')['meanSeed_f1'] for m in mods]
    ml=[get(split,m,selection['best_by_validation'][m])['meanSeed_f1'] for m in mods]
    ax.bar(x-width/2,rule,width,color='#a8a8a8',label='Tuned rule');ax.bar(x+width/2,ml,width,color='#126b8e',label='Selected ML')
    ax.set_xticks(x,labels,rotation=55,ha='right',fontsize=8);ax.set_ylim(0,1);ax.set_title(title,fontsize=10);ax.grid(axis='y',alpha=.16)
    ax.set_ylabel('Mean seed contact F1',fontsize=9);ax.legend(loc='upper left',fontsize=7.5,frameon=False)
save(fig,'generalization')

bins=read('results/ml-v7-report/reliability-bins.json')
fig,axes=plt.subplots(3,3,figsize=(6.8,6.8),layout='constrained')
for i,(r,ax) in enumerate(zip(bins,axes.flat)):
    counts=np.array(r['binCounts']);valid=counts>0
    xx=np.array(r['probabilitySums'])[valid]/counts[valid];yy=np.array(r['labelSums'])[valid]/counts[valid]
    ax.plot([0,1],[0,1],'--',color='gray',lw=.8);ax.plot(xx,yy,'o-',color='#126b8e',markersize=3,lw=1)
    ax.set_xlim(0,1);ax.set_ylim(0,1);ax.set_xticks([0,.5,1]);ax.set_yticks([0,.5,1]);ax.tick_params(labelsize=8)
    ax.set_title(labels[i],fontsize=10)
    ax.set_xlabel('Predicted probability',fontsize=8);ax.set_ylabel('Positive fraction',fontsize=8);ax.grid(alpha=.12)
for ax in list(axes.flat)[7:]:ax.axis('off')
save(fig,'reliability')
print('Created eight publication figure files from frozen geometry and results.')
