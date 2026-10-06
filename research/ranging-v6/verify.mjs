import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
const root=process.argv[2]??'results/ranging-v6-evaluation';
const read=f=>JSON.parse(f.endsWith('.gz')?gunzipSync(readFileSync(join(root,f))):readFileSync(join(root,f),'utf8'));
const manifest=read('manifest.json'),rows=read('per-seed-metrics.json');
function reconstruct(frames) {
  const pairs=new Map();for(const f of frames)for(const [pair,value] of Object.entries(f.evidence))if(value===true){const ts=pairs.get(pair)??[];ts.push(f.t);pairs.set(pair,ts);}
  const out=[];for(const [pair,ts] of pairs){let start=ts[0],end=start;const finish=()=>{if(end-start>=30)out.push({pair,start,end,detectedAt:start+30});};
    for(const t of ts.slice(1)){if(t!==end+1){finish();start=t;}end=t;}finish();}return out.sort((a,b)=>a.pair.localeCompare(b.pair)||a.start-b.start);
}
let count=0;
for(const seed of manifest.seeds) {
  const truth=read(`truth-${seed}.json.gz`),reference=reconstruct(truth.referenceFrames);assert.equal(reference.length,3);
  for(const f of truth.frames)for(let i=0;i<8;i++)for(let j=i+1;j<8;j++) {
    const a=f.positions[i],b=f.positions[j];assert.equal(truth.referenceFrames[f.t].evidence[`${a.id}|${b.id}`],
      (a.x<12)===(b.x<12)&&(a.x-b.x)**2+(a.y-b.y)**2<=4);
  }
  for(const condition of manifest.conditions)for(const clients of manifest.clientsPerZone) {
    const artifact=read(`seed-${seed}-${condition.id}-${clients}.json.gz`);
    for(const f of artifact.ranges)for(const o of f.observations) {
      const i=Number(o.wearableId.slice(1));assert.ok(Array.from({length:4},(_,s)=>(f.t*4+s)%clients).includes(i));
      assert.equal(o.phases.length,72);assert.ok(!('distance' in o));
    }
    for(const [method,{frames,contacts}] of Object.entries(artifact.predictions)) {
      const pred=reconstruct(frames);assert.deepEqual(pred,[...contacts].sort((a,b)=>a.pair.localeCompare(b.pair)||a.start-b.start));
      const candidates=[];pred.forEach((p,i)=>reference.forEach((g,j)=>{const overlap=Math.min(p.end,g.end)-Math.max(p.start,g.start),iou=overlap/(Math.max(p.end,g.end)-Math.min(p.start,g.start));
        if(p.pair===g.pair&&iou>=.2&&overlap>=5)candidates.push({i,j,iou});}));
      candidates.sort((a,b)=>b.iou-a.iou||a.i-b.i||a.j-b.j);const pp=new Set(),gg=new Set();
      for(const c of candidates)if(!pp.has(c.i)&&!gg.has(c.j)){pp.add(c.i);gg.add(c.j);}
      const row=rows.find(r=>r.seed===seed&&r.condition===condition.id&&r.clients===clients&&r.method===method);
      assert.equal(row.tp,pp.size);assert.equal(row.fp,pred.length-pp.size);assert.equal(row.fn,reference.length-gg.size);
      assert.equal(row.f1,2*row.tp/(2*row.tp+row.fp+row.fn));
      assert.equal(row.localizationAvailability,frames.reduce((s,f)=>s+f.positions.length,0)/(8*360));
      let fp=0,fn=0;for(const f of frames)for(const pair of Object.keys(f.evidence)) {
        const g=reference.some(s=>s.pair===pair&&s.start<=f.t&&s.end>=f.t),p=pred.some(s=>s.pair===pair&&s.start<=f.t&&s.end>=f.t);
        if(p&&!g)fp++;if(g&&!p)fn++;
      }
      assert.equal(row.falsePositivePairSeconds,fp);assert.equal(row.falseNegativePairSeconds,fn);count++;
    }
  }
}
assert.equal(count,manifest.seeds.length*36);assert.equal(manifest.status,'complete');
console.log(`Independently verified ${count} contact, availability, time-error and scheduled-observation evaluations.`);
