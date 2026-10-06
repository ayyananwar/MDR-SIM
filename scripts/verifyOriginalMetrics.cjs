const fs = require('fs');
const rows = fs.readFileSync('results/confirmatory/E3_RAW_PREDICTIONS_V2.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>{const [seed,method,index,y,p]=l.split(',');return {seed:+seed,method,y:+y,p:+p};});
const means = a => a.reduce((s,v)=>s+v,0)/a.length;
const output = [];
for(const method of [...new Set(rows.map(r=>r.method))]) {
 const folds = [...new Set(rows.filter(r=>r.method===method).map(r=>r.seed))].map(seed=>{
  const rr=rows.filter(r=>r.method===method&&r.seed===seed), pos=rr.filter(r=>r.y), neg=rr.filter(r=>!r.y);
  let auc,ap;
  if(pos.length&&neg.length) {
   auc=means(pos.flatMap(a=>neg.map(b=>a.p>b.p?1:a.p===b.p?0.5:0)));
   let prev=0; ap=0;
   for(const t of [...new Set(rr.map(r=>r.p))].sort((a,b)=>b-a)) {const selected=rr.filter(r=>r.p>=t),tp=selected.filter(r=>r.y).length,rec=tp/pos.length;ap+=(rec-prev)*tp/selected.length;prev=rec;}
  }
  const tp=rr.filter(r=>r.y&&r.p>=.5).length,fp=rr.filter(r=>!r.y&&r.p>=.5).length,fn=pos.length-tp;
  const brier=means(rr.map(r=>(r.p-r.y)**2));let ece=0;
  for(let b=0;b<10;b++){const bin=rr.filter(r=>r.p>=b/10&&(b===9?r.p<=1:r.p<(b+1)/10));if(bin.length)ece+=bin.length/rr.length*Math.abs(means(bin.map(r=>r.y))-means(bin.map(r=>r.p)));}
  return {seed,n:rr.length,pos:pos.length,auc,ap,f1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):0,brier,ece};
 });
 output.push({method,nonempty:folds.length,records:folds.reduce((s,f)=>s+f.n,0),positives:folds.reduce((s,f)=>s+f.pos,0),auc:means(folds.filter(f=>f.auc!==undefined).map(f=>f.auc)),ap:means(folds.filter(f=>f.ap!==undefined).map(f=>f.ap)),f1:means(folds.map(f=>f.f1)),brier:means(folds.map(f=>f.brier)),ece:means(folds.map(f=>f.ece)),supported:folds.filter(f=>f.auc!==undefined)});
}
console.log(JSON.stringify(output,null,2));
fs.writeFileSync('results/confirmatory/INDEPENDENT_REVIEW_METRICS.json',JSON.stringify(output,null,2));
