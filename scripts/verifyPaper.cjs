// Independent arithmetic and temporal-target checks; no research metric imports.
const fs=require('fs'),path=require('path');
const dir=process.argv[2]??'results/paper-v3';
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
if(manifest.status!=='complete')throw new Error('Campaign is incomplete');
const rows=fs.readFileSync(path.join(dir,'E3_RAW_PREDICTIONS.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(line=>{const [seed,method,index,session,y,p]=line.split(',');return {seed:+seed,method,index:+index,session,y:+y,p:+p};});
const sum=JSON.parse(fs.readFileSync(path.join(dir,'E3_baseline_comparison.json')));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const near=(a,b,label)=>{if(Math.abs(a-b)>1e-12)throw new Error(`${label}: ${a} != ${b}`);};
for(const seed of manifest.seeds){
 const d=JSON.parse(fs.readFileSync(path.join(dir,`per_seed/seed_${seed}.json`)));
 const wearable=new Map(d.people.map(p=>[p.personId,p.wearableId]));
 const key=(a,b)=>[a,b].sort().join('::');
 d.records.forEach((r,i)=>{
  const expected=d.groundTruthContacts.some(g=>key(wearable.get(g.personA),wearable.get(g.personB))===key(r.targetWearableId,r.sourceWearableId)&&Math.max(r.sessionStartTime,g.startTime)<Math.min(r.sessionEndTime,g.endTime))?1:0;
  if(d.labels[i]!==expected)throw new Error(`Temporal label mismatch seed ${seed}, record ${i}`);
 });
 for(const s of sum.summary){
  const rr=rows.filter(r=>r.seed===seed&&r.method===s.name);
  if(rr.length!==d.records.length)throw new Error(`Missing predictions seed ${seed}, method ${s.name}`);
  rr.forEach(r=>{if(r.y!==d.labels[r.index]||r.session!==d.records[r.index].sessionId)throw new Error('CSV labels/identities differ from records');});
 }
}
for(const s of sum.summary){
 const folds=[];
 for(const seed of manifest.seeds){
  const rr=rows.filter(r=>r.seed===seed&&r.method===s.name);if(!rr.length)continue;
  const pos=rr.filter(r=>r.y),neg=rr.filter(r=>!r.y);let auc,ap;
  if(pos.length&&neg.length){auc=mean(pos.flatMap(a=>neg.map(b=>a.p>b.p?1:a.p===b.p?.5:0)));ap=0;let prev=0;
   for(const t of [...new Set(rr.map(r=>r.p))].sort((a,b)=>b-a)){const selected=rr.filter(r=>r.p>=t),tp=selected.filter(r=>r.y).length,rec=tp/pos.length;ap+=(rec-prev)*tp/selected.length;prev=rec;}
  }
  const tp=rr.filter(r=>r.y&&r.p>=.5).length,fp=rr.filter(r=>!r.y&&r.p>=.5).length,fn=pos.length-tp;
  const brier=mean(rr.map(r=>(r.p-r.y)**2));let ece=0;
  for(let b=0;b<10;b++){const bin=rr.filter(r=>r.p>=b/10&&(b===9?r.p<=1:r.p<(b+1)/10));if(bin.length)ece+=bin.length/rr.length*Math.abs(mean(bin.map(r=>r.y))-mean(bin.map(r=>r.p)));}
  folds.push({auc,ap,f1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):0,brier,ece});
 }
 for(const [stored,key] of [['auroc','auc'],['ap','ap'],['f1','f1'],['brier','brier'],['ece','ece']]){
  if(s[stored]===null)continue;const values=folds.map(f=>f[key]).filter(v=>v!==undefined);
  if(s[stored].n!==values.length)throw new Error(`Wrong valid fold count ${s.name}: ${stored}`);
  if(values.length)near(s[stored].mean,mean(values),`${s.name} ${stored}`);
 }
}
console.log(`Verified all temporal targets, CSV identities and independent macro metrics for ${manifest.seeds.length} seeds.`);
