// Independent contact reconstruction and event/time scoring from saved artifacts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
const root=process.argv[2]??'results/contact-v5-evaluation';
const read=name=>JSON.parse(name.endsWith('.gz')?gunzipSync(readFileSync(join(root,name))):readFileSync(join(root,name),'utf8'));
const manifest=read('manifest.json'),rows=read('per-seed-metrics.json');
const reconstruct=frames=>{
  const pairs=new Map();
  for(const f of frames)for(const [pair,value] of Object.entries(f.evidence))if(value===true){const times=pairs.get(pair)??[];times.push(f.t);pairs.set(pair,times);}
  const result=[];
  for(const [pair,times] of pairs){let start=times[0],end=start;
    const finish=()=>{if(end-start>=30)result.push({pair,start,end,detectedAt:start+30});};
    for(const t of times.slice(1)){if(t!==end+1){finish();start=t;}end=t;}finish();}
  return result.sort((a,b)=>a.pair.localeCompare(b.pair)||a.start-b.start);
};
const ordered=ss=>[...ss].sort((a,b)=>a.pair.localeCompare(b.pair)||a.start-b.start);
let checked=0;
for(const seed of manifest.seeds) {
  const truth=read(`truth-${seed}.json.gz`);
  for(const f of truth.frames) {
    const saved=truth.referenceFrames[f.t].evidence;
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++) {
      const a=f.positions[i],b=f.positions[j];
      assert.equal(saved[`${a.id}|${b.id}`],(a.x<12)===(b.x<12)&&(a.x-b.x)**2+(a.y-b.y)**2<=4);
    }
  }
  const reference=reconstruct(truth.referenceFrames);assert.equal(reference.length,3);
  for(const condition of manifest.conditions) {
    const artifact=read(`seed-${seed}-${condition.id}.json.gz`);
    for(const [method,{frames,contacts}] of Object.entries(artifact.predictions)) {
      const pred=reconstruct(frames);assert.deepEqual(pred,ordered(contacts));
      const edges=[];
      pred.forEach((p,i)=>reference.forEach((g,j)=>{const overlap=Math.min(p.end,g.end)-Math.max(p.start,g.start);
        const iou=overlap/(Math.max(p.end,g.end)-Math.min(p.start,g.start));
        if(p.pair===g.pair&&overlap>=5&&iou>=.2)edges.push({i,j,iou});}));
      edges.sort((a,b)=>b.iou-a.iou||a.i-b.i||a.j-b.j);const pp=new Set(),gg=new Set();
      for(const e of edges)if(!pp.has(e.i)&&!gg.has(e.j)){pp.add(e.i);gg.add(e.j);}
      const row=rows.find(r=>r.seed===seed&&r.condition===condition.id&&r.method===method);
      assert.equal(row.tp,pp.size);assert.equal(row.fp,pred.length-pp.size);assert.equal(row.fn,reference.length-gg.size);
      assert.equal(row.f1,2*row.tp/(2*row.tp+row.fp+row.fn));
      let fp=0,fn=0,pos=0,neg=0;
      for(const f of frames)for(const pair of Object.keys(f.evidence)) {
        const target=reference.some(s=>s.pair===pair&&s.start<=f.t&&s.end>=f.t);
        const predicted=pred.some(s=>s.pair===pair&&s.start<=f.t&&s.end>=f.t);
        if(target){pos++;if(!predicted)fn++;}else{neg++;if(predicted)fp++;}
      }
      assert.equal(row.falsePositivePairSeconds,fp);assert.equal(row.falseNegativePairSeconds,fn);
      assert.equal(row.positivePairSeconds,pos);assert.equal(row.negativePairSeconds,neg);
      if(row.localizationAvailability!==null)assert.equal(row.localizationAvailability,frames.reduce((sum,f)=>sum+f.positions.length,0)/(8*360));
      checked++;
    }
  }
}
assert.equal(checked,manifest.seeds.length*24);assert.equal(manifest.status,'complete');
console.log(`Independently verified ${checked} event, time-error and availability evaluations.`);
