import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {protocol} from './protocol.mjs';
import {trajectory,observe} from './sensor.mjs';
import {CausalMeasurements,CausalTracker,TemporalDecision,measurementsForBudget,estimate,positionEvidence,gatewayEvidence} from './inference.mjs';
import {evaluate} from './evaluation.mjs';
import {random} from '../angular-v4/sensor.mjs';
const mode=process.argv[2]??'development';
if(!['development','evaluation'].includes(mode))throw new Error('Mode must be development or evaluation.');
const output=resolve(process.argv[3]??`results/contact-v5-${mode}`);
if(existsSync(output))throw new Error('Refusing overwrite: choose a fresh output directory.');
mkdirSync(output,{recursive:true});
const files=[],save=(file,data,compressed=false)=>{
  const content=JSON.stringify(data);writeFileSync(join(output,file),compressed?gzipSync(content):content);files.push(file);
};
const hash=data=>createHash('sha256').update(data).digest('hex');
const root=fileURLToPath(new URL('../../',import.meta.url));
const sourceFiles=['protocol.mjs','sensor.mjs','inference.mjs','evaluation.mjs','run.mjs','test.mjs','verify.mjs']
  .map(f=>`research/contact-v5/${f}`).concat(['research/angular-v4/sensor.mjs','research/angular-v4/inference.mjs','research/angular-v4/evaluation.mjs']);
const sources=sourceFiles.map(file=>({file,sha256:hash(readFileSync(join(root,file)))}));
const manifest={...protocol,mode,status:'running',protocolSha256:hash(JSON.stringify(protocol)),
  seeds:mode==='evaluation'?protocol.evaluationSeeds:protocol.developmentSeeds,node:process.version,
  interpretation:mode==='evaluation'?'held-out simulation benchmark under registered assumptions':'development results; no settings changed automatically'};
save('manifest.json',manifest);save('source-checksums.json',sources);
const ids=Array.from({length:protocol.people},(_,i)=>`w${i}`),rows=[];
for(const seed of manifest.seeds) {
  const truth=trajectory(seed),referenceFrames=truth.map(f=>({t:f.t,evidence:positionEvidence(f.positions,ids,protocol.floorplan,protocol.distanceMeters)}));
  save(`truth-${seed}.json.gz`,{frames:truth,referenceFrames},true);
  for(const condition of protocol.conditions) {
    const measured=observe(truth,seed,condition),predictions=Object.fromEntries(protocol.methods.map(m=>[m.id,[]]));
    const pipelines=[0,2,4].map(budget=>({budget,enabled:new Set(budget===4?protocol.anchors.map(a=>a.id):budget===2?protocol.upgradedTwo:[]),
      filter:new CausalMeasurements(protocol.estimator.medianWindowSeconds),
      tracker:new CausalTracker(protocol.estimator,budget===0?protocol.estimator.rssiPositionVariance:protocol.estimator.fusionPositionVariance)}));
    const decisions=new Map(protocol.methods.filter(m=>m.occupancy).map(m=>[m.id,new TemporalDecision(protocol.estimator.occupancyWindowSeconds,protocol.estimator.occupancyThreshold)]));
    for(const frame of measured) {
      const variants=new Map();
      for(const pipeline of pipelines) {
        const allowed=measurementsForBudget(frame.observations,pipeline.enabled),filtered=pipeline.filter.update(frame.t,allowed);
        const raw=[],tracked=[];
        for(const id of ids) {
          // Raw branches are used only for budgets zero and two.
          if(pipeline.budget!==4) {const p=estimate(allowed.filter(o=>o.wearableId===id),protocol.estimator);if(p)raw.push({id,...p});}
          const p=estimate(filtered.filter(o=>o.wearableId===id),protocol.estimator);
          const smoothed=pipeline.tracker.update(frame.t,id,p);if(smoothed)tracked.push({id,...smoothed});
        }
        variants.set(pipeline.budget,{raw,tracked});
      }
      for(const method of protocol.methods) {
        const positions=method.id==='gateway-rssi'?null:variants.get(method.aoaGateways)[method.tracking?'tracked':'raw'];
        let evidence=positions?positionEvidence(positions,ids,protocol.floorplan,protocol.distanceMeters):
          gatewayEvidence(frame.observations,ids,protocol.estimator,protocol.distanceMeters);
        if(method.occupancy)evidence=decisions.get(method.id).update(frame.t,evidence);
        predictions[method.id].push({t:frame.t,evidence,...(positions?{positions}:{})});
      }
    }
    const metrics=[];
    for(const method of protocol.methods) {
      const evaluated=evaluate(predictions[method.id],referenceFrames,truth,ids,protocol.seconds);
      const row={seed,condition:condition.id,method:method.id,aoaGateways:method.aoaGateways,...evaluated.metrics};
      metrics.push(row);rows.push(row);
      predictions[method.id]={frames:predictions[method.id],contacts:evaluated.contacts};
    }
    save(`seed-${seed}-${condition.id}.json.gz`,{measurements:measured,predictions,metrics},true);
  }
  console.log(`${mode}: completed seed ${seed} (${rows.length} method evaluations)`);
}
save('per-seed-metrics.json',rows);
const summary=[],rng=random(551907),mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const percentile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.floor(q*(xs.length-1))];
for(const condition of protocol.conditions) {
  const selected=rows.filter(r=>r.condition===condition.id);
  for(const method of protocol.methods) {
    const rr=selected.filter(r=>r.method===method.id),aggregate={condition:condition.id,method:method.id,aoaGateways:method.aoaGateways};
    for(const metric of ['f1','precision','recall','falsePositiveTimeRate','missedContactTimeRate','localizationAvailability','medianLocalizationError','medianDetectionLatencySeconds']) {
      const supported=rr.map(r=>r[metric]).filter(x=>x!==null);aggregate[`meanSeed_${metric}`]=supported.length?mean(supported):null;
      aggregate[`supportedSeeds_${metric}`]=supported.length;
    }
    for(const count of ['tp','fp','fn'])aggregate[count]=rr.reduce((s,r)=>s+r[count],0);
    summary.push(aggregate);
  }
  for(const [a,b] of [['rssi-temporal','rssi-raw'],['rssi-angle2-temporal','rssi-temporal'],['rssi-angle4-temporal','rssi-angle2-temporal']]) {
    const diffs=manifest.seeds.map(seed=>selected.find(r=>r.seed===seed&&r.method===a).f1-selected.find(r=>r.seed===seed&&r.method===b).f1);
    const draws=Array.from({length:2000},()=>mean(diffs.map(()=>diffs[Math.floor(rng.uniform()*diffs.length)])));
    summary.push({condition:condition.id,contrast:`${a} minus ${b}`,meanSeedF1Difference:mean(diffs),pairedBootstrap95:[percentile(draws,.025),percentile(draws,.975)]});
  }
}
save('summary.json',summary);
manifest.status='complete';manifest.methodEvaluations=rows.length;
writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest));
writeFileSync(join(output,'checksums.json'),JSON.stringify(files.map(file=>({file,sha256:hash(readFileSync(join(output,file)))}))));
console.log(`Complete: ${output}`);
