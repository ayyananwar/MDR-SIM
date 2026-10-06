import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {trajectory,observe,anchors,random} from './sensor.mjs';
import {triangulate,localize} from './inference.mjs';
import {sessions,contactMetrics,quantile} from './evaluation.mjs';
const out=resolve(process.argv[2]??'results/angular-v4-pilot');
if(existsSync(out))throw new Error('Output already exists; use a new directory.');
mkdirSync(out,{recursive:true});
const files=[];
const save=(name,data)=>{writeFileSync(join(out,name),JSON.stringify(data,null,2));files.push(name);};
const methods={rssi:(o,s)=>localize(o,'rssi',s),angle:o=>triangulate(o),
  fusion:(o,s)=>localize(o,'hybrid',s),robustFusion:(o,s)=>localize(o,'hybrid',s,true)};
const protocol={version:'angular-v4-pilot',status:'development pilot; not confirmatory',
  seeds:[401,402,403,404,405],reservedHoldoutSeeds:'501–530 (not run; register final protocol first)',
  seconds:240,people:6,anchors,angleSigmaDegrees:[2,5,15],environments:['LOS','synthetic-outliers'],
  rssiSigmaDb:6,packetDropProbability:.1,outlierProbability:.1,
  outlierAngleBiasDegrees:20,outlierRssiBiasDb:-8,thresholdMeters:2,minimumDurationSeconds:30,
  sessionRule:'consecutive 1-second samples; last minus first; no missing-frame bridging',
  matching:'same pair, greedy descending IoU >= .2 and overlap >=5 seconds',
  independentUnit:'seed; paired draws across methods and conditions',
  limitations:['abstract bearing sensor, no IQ/antenna simulation','controlled single-room trajectories',
    'no measured hardware error distribution','no original gateway-co-observation baseline in this pilot',
    'instantaneous localization, no temporal smoothing','five development seeds cannot support broad claims']};
save('manifest.json',protocol);
const rows=[];
for(const seed of protocol.seeds) {
  const truth=trajectory(seed,protocol.seconds),reference=sessions(truth);
  save(`truth-${seed}.json`,{frames:truth,reference});
  for(const sigma of protocol.angleSigmaDegrees)for(const environment of protocol.environments) {
    const measured=observe(truth,seed,sigma,environment!=='LOS');
    const predictions={},conditionRows=[];
    for(const [method,estimate] of Object.entries(methods)) {
      const errors=[];
      const frames=measured.map((frame,index)=>({t:frame.t,positions:[...new Set(frame.observations.map(o=>o.wearableId))].sort().flatMap(id=>{
        const observations=frame.observations.filter(o=>o.wearableId===id);
        const result=estimate(observations,sigma*Math.PI/180);
        if(!result)return [];
        const p=truth[index].positions.find(p=>p.id===id); // scoring only
        errors.push(Math.hypot(result.x-p.x,result.y-p.y));
        return [{id,...result}];
      })}));
      const contacts=sessions(frames);
      predictions[method]={frames,contacts};
      const row={seed,sigmaDegrees:sigma,environment,method,
        availability:errors.length/(protocol.people*protocol.seconds),
        medianLocalizationError:quantile(errors,.5),p95LocalizationError:quantile(errors,.95),
        referenceContacts:reference.length,...contactMetrics(contacts,reference)};
      rows.push(row);conditionRows.push(row);
    }
    save(`seed-${seed}-${sigma}-${environment}.json`,{measurements:measured,predictions,metrics:conditionRows});
  }
}
save('per-seed-metrics.json',rows);
const bootstrap=random(81729),summary=[];
for(const sigma of protocol.angleSigmaDegrees)for(const environment of protocol.environments) {
  const selected=rows.filter(r=>r.sigmaDegrees===sigma&&r.environment===environment);
  for(const method of Object.keys(methods)) {
    const rr=selected.filter(r=>r.method===method);
    summary.push({sigmaDegrees:sigma,environment,method,
      meanSeedF1:rr.reduce((s,r)=>s+r.f1,0)/rr.length,
      meanSeedRecall:rr.reduce((s,r)=>s+r.recall,0)/rr.length,
      meanAvailability:rr.reduce((s,r)=>s+r.availability,0)/rr.length,
      meanSeedMedianError:rr.reduce((s,r)=>s+r.medianLocalizationError,0)/rr.length});
  }
  for(const method of ['angle','fusion','robustFusion']) {
    const differences=protocol.seeds.map(seed=>selected.find(r=>r.seed===seed&&r.method===method).f1-
      selected.find(r=>r.seed===seed&&r.method==='rssi').f1);
    const draws=Array.from({length:2000},()=>differences.reduce(sum=>sum+
      differences[Math.floor(bootstrap.uniform()*differences.length)],0)/differences.length);
    summary.push({sigmaDegrees:sigma,environment,contrast:`${method} minus rssi`,
      meanSeedF1Difference:differences.reduce((s,x)=>s+x,0)/differences.length,
      exploratoryPairedBootstrap95:[quantile(draws,.025),quantile(draws,.975)]});
  }
}
save('summary.json',summary);
const sourceRoot=fileURLToPath(new URL('.',import.meta.url));
save('source-checksums.json',['inference.mjs','sensor.mjs','evaluation.mjs','pilot.mjs','test.mjs'].map(file=>({
  file:`research/angular-v4/${file}`,sha256:createHash('sha256').update(readFileSync(join(sourceRoot,file))).digest('hex')})));
save('checksums.json',files.map(file=>({file,sha256:createHash('sha256').update(readFileSync(join(out,file))).digest('hex')})));
console.log(`Saved ${rows.length} evaluations and paired exploratory summaries in ${out}`);
