import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {protocol} from './protocol.mjs';
import {protocol as v5} from '../contact-v5/protocol.mjs';
import {trajectory,observe} from '../contact-v5/sensor.mjs';
import {generateRanges} from './sensor.mjs';
import {deriveRange,localizeRanges} from './inference.mjs';
import {CausalMeasurements,CausalTracker,TemporalDecision,measurementsForBudget,estimate,positionEvidence} from '../contact-v5/inference.mjs';
import {evaluate} from '../contact-v5/evaluation.mjs';
import {random} from '../angular-v4/sensor.mjs';
const mode=process.argv[2]??'development';if(!['development','evaluation'].includes(mode))throw new Error('Choose development or evaluation.');
const out=resolve(process.argv[3]??`results/ranging-v6-${mode}`);
if(existsSync(out))throw new Error('Output exists. Use a fresh directory.');mkdirSync(out,{recursive:true});
const files=[],save=(file,value)=>{const json=JSON.stringify(value);writeFileSync(join(out,file),file.endsWith('.gz')?gzipSync(json):json);files.push(file);};
const hash=x=>createHash('sha256').update(x).digest('hex');
const sourceRoot=fileURLToPath(new URL('../../',import.meta.url));
const sources=['protocol.mjs','sensor.mjs','inference.mjs','run.mjs','test.mjs','verify.mjs'].map(f=>`research/ranging-v6/${f}`)
  .concat(['protocol.mjs','sensor.mjs','inference.mjs','evaluation.mjs'].map(f=>`research/contact-v5/${f}`),
    ['sensor.mjs','inference.mjs','evaluation.mjs'].map(f=>`research/angular-v4/${f}`));
const manifest={...protocol,mode,status:'running',seeds:mode==='evaluation'?protocol.evaluationSeeds:protocol.developmentSeeds,
  protocolSha256:hash(JSON.stringify(protocol)),referenceProtocol:v5,
  protocolInterpretation:'controlled sensor and scheduling comparison; no measured hardware ranking',node:process.version};
save('manifest.json',manifest);save('source-checksums.json',sources.map(file=>({file,sha256:hash(readFileSync(join(sourceRoot,file)))})));
const ids=Array.from({length:8},(_,i)=>`w${i}`),rows=[];
function decisionFrames(positions) {
  const d=new TemporalDecision(v5.estimator.occupancyWindowSeconds,v5.estimator.occupancyThreshold);
  return positions.map(f=>({...f,evidence:d.update(f.t,positionEvidence(f.positions,ids,v5.floorplan,2))}));
}
function baseline(received,angles) {
  const filter=new CausalMeasurements(5),tracker=new CausalTracker(v5.estimator,angles?v5.estimator.fusionPositionVariance:v5.estimator.rssiPositionVariance);
  const enabled=new Set(angles?v5.anchors.map(a=>a.id):[]);
  return decisionFrames(received.map(frame=>{
    const current=filter.update(frame.t,measurementsForBudget(frame.observations,enabled));
    return {t:frame.t,positions:ids.flatMap(id=>{const p=estimate(current.filter(o=>o.wearableId===id),v5.estimator),tracked=tracker.update(frame.t,id,p);return tracked?[{id,...tracked}]:[];})};
  }));
}
function rangeFrames(raw,method) {
  const tracker=new CausalTracker(v5.estimator,method==='ble-rtt'?protocol.rttPositionMeasurementVariance:protocol.positionMeasurementVariance);
  const history=new Map(),sigma=protocol.nominalRangeSigma[method];
  return decisionFrames(raw.map(frame=>{
    const observations=frame.observations.flatMap(o=>{
      const distance=deriveRange(o,method,protocol);if(distance===null)return [];
      const key=`${o.wearableId}|${o.anchor.id}`,h=(history.get(key)??[]).filter(v=>v.t>frame.t-5);h.push({t:frame.t,distance});history.set(key,h);
      const sorted=h.map(v=>v.distance).sort((a,b)=>a-b),n=sorted.length;
      return [{wearableId:o.wearableId,anchor:o.anchor,distance:n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2}];
    });
    return {t:frame.t,positions:ids.flatMap(id=>{const p=localizeRanges(observations.filter(o=>o.wearableId===id),sigma),tracked=tracker.update(frame.t,id,p);return tracked?[{id,...tracked}]:[];})};
  }));
}
for(const seed of manifest.seeds) {
  const truth=trajectory(seed),referenceFrames=truth.map(f=>({t:f.t,evidence:positionEvidence(f.positions,ids,v5.floorplan,2)}));
  save(`truth-${seed}.json.gz`,{frames:truth,referenceFrames});
  for(const condition of protocol.conditions) {
    const received=observe(truth,seed,v5.conditions[condition.legacyCondition]),baselines={
      'rssi-temporal':baseline(received,false),'aoa4-temporal':baseline(received,true)};
    save(`ble-${seed}-${condition.id}.json.gz`,{measurements:received});
    for(const clients of protocol.clientsPerZone) {
      const raw=generateRanges(truth,received,seed,condition,clients,v5.anchors),predictions={},metrics=[];
      const attemptedTransactions=protocol.seconds*4*4;
      for(const method of protocol.methods) {
        const frames=baselines[method]??rangeFrames(raw,method);
        const evaluated=evaluate(frames,referenceFrames,truth,ids,protocol.seconds);
        const active=method.startsWith('ble-')||method.startsWith('uwb-');
        const row={seed,condition:condition.id,clients,method,...evaluated.metrics,
          nominalRefreshSeconds:active?clients/4:1,
          receivedAnchorRangesPerScoredTagSecond:active?raw.reduce((s,f)=>s+f.observations.length,0)/(8*360):null,
          activeTransactionsAllClients:active?attemptedTransactions:0};
        rows.push(row);metrics.push(row);predictions[method]={frames,contacts:evaluated.contacts};
      }
      save(`seed-${seed}-${condition.id}-${clients}.json.gz`,{ranges:raw,predictions,metrics});
    }
  }
  console.log(`${mode}: completed seed ${seed}, ${rows.length} method evaluations`);
}
save('per-seed-metrics.json',rows);
const summary=[],rng=random(61049),mean=v=>v.reduce((s,x)=>s+x,0)/v.length;
const q=(v,p)=>[...v].sort((a,b)=>a-b)[Math.floor(p*(v.length-1))];
for(const condition of protocol.conditions)for(const clients of protocol.clientsPerZone) {
  for(const method of protocol.methods) {
    const rr=rows.filter(r=>r.condition===condition.id&&r.clients===clients&&r.method===method),s={condition:condition.id,clients,method};
    for(const metric of ['f1','precision','recall','localizationAvailability','medianLocalizationError','falsePositiveTimeRate','missedContactTimeRate','medianDetectionLatencySeconds']) {
      const values=rr.map(r=>r[metric]).filter(x=>x!==null);s[`meanSeed_${metric}`]=values.length?mean(values):null;s[`supportedSeeds_${metric}`]=values.length;
    }
    for(const metric of ['tp','fp','fn'])s[metric]=rr.reduce((sum,r)=>sum+r[metric],0);
    summary.push(s);
  }
  for(const method of ['ble-pbr','ble-rtt','ble-pbr-rtt','uwb-ds-twr']) {
    const differences=manifest.seeds.map(seed=>rows.find(r=>r.seed===seed&&r.condition===condition.id&&r.clients===clients&&r.method===method).f1-
      rows.find(r=>r.seed===seed&&r.condition===condition.id&&r.clients===clients&&r.method==='aoa4-temporal').f1);
    const draws=Array.from({length:2000},()=>mean(differences.map(()=>differences[Math.floor(rng.uniform()*differences.length)])));
    summary.push({condition:condition.id,clients,contrast:`${method} minus aoa4-temporal`,meanSeedF1Difference:mean(differences),pairedBootstrap95:[q(draws,.025),q(draws,.975)]});
  }
}
save('summary.json',summary);manifest.status='complete';manifest.methodEvaluations=rows.length;
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest));
writeFileSync(join(out,'checksums.json'),JSON.stringify(files.map(file=>({file,sha256:hash(readFileSync(join(out,file)))}))));
console.log(`Complete: ${out}`);
