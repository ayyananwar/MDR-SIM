// Independent artifact check: no imports from simulator, inference or evaluator.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const directory=process.argv[2]??'results/angular-v4-pilot';
const read=name=>JSON.parse(readFileSync(join(directory,name),'utf8'));
const protocol=read('manifest.json'),rows=read('per-seed-metrics.json');
function reconstruct(frames) {
  const pairs=new Map();
  for(const {t,positions} of frames)for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++) {
    const a=positions[i],b=positions[j];
    if((a.x-b.x)**2+(a.y-b.y)**2>4)continue;
    const key=[a.id,b.id].sort().join('|');
    if(!pairs.has(key))pairs.set(key,[]);
    pairs.get(key).push(t);
  }
  const result=[];
  for(const [pair,times] of pairs) {
    let start=times[0],end=start;
    const finish=()=>{if(end-start>=30)result.push({pair,start,end});};
    for(const t of times.slice(1)) {if(t!==end+1){finish();start=t;}end=t;}
    finish();
  }
  return result.sort((a,b)=>a.pair.localeCompare(b.pair)||a.start-b.start);
}
const sorted=ss=>[...ss].sort((a,b)=>a.pair.localeCompare(b.pair)||a.start-b.start);
for(const seed of protocol.seeds) {
  const truth=read(`truth-${seed}.json`),reference=reconstruct(truth.frames);
  assert.deepEqual(reference,sorted(truth.reference));
  for(const sigma of protocol.angleSigmaDegrees)for(const environment of protocol.environments) {
    const artifact=read(`seed-${seed}-${sigma}-${environment}.json`);
    for(const [method,{frames,contacts}] of Object.entries(artifact.predictions)) {
      const calculated=reconstruct(frames);assert.deepEqual(calculated,sorted(contacts));
      const candidates=[];
      calculated.forEach((p,i)=>reference.forEach((g,j)=>{
        const overlap=Math.min(p.end,g.end)-Math.max(p.start,g.start);
        const iou=overlap/(Math.max(p.end,g.end)-Math.min(p.start,g.start));
        if(p.pair===g.pair&&overlap>=5&&iou>=.2)candidates.push({i,j,iou});
      }));
      candidates.sort((a,b)=>b.iou-a.iou||a.i-b.i||a.j-b.j);
      const matchedPred=new Set(),matchedTruth=new Set();
      for(const c of candidates)if(!matchedPred.has(c.i)&&!matchedTruth.has(c.j)) {
        matchedPred.add(c.i);matchedTruth.add(c.j);
      }
      const row=rows.find(r=>r.seed===seed&&r.sigmaDegrees===sigma&&r.environment===environment&&r.method===method);
      assert.equal(row.tp,matchedPred.size);assert.equal(row.fp,calculated.length-row.tp);
      assert.equal(row.fn,reference.length-row.tp);
      assert.equal(row.f1,2*row.tp/(2*row.tp+row.fp+row.fn));
      assert.equal(row.availability,frames.reduce((s,f)=>s+f.positions.length,0)/(6*240));
    }
  }
}
assert.equal(rows.length,120);
console.log('Independently verified all 120 contact evaluations, saved reference sessions and availability.');
