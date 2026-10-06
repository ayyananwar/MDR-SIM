import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {protocol} from './protocol.mjs';
import {makeRecording} from './scenarios.mjs';
import {FeatureBuilder,featureNames,pairs,phaseFitResidual} from './features.mjs';
import {protocol as v5} from '../contact-v5/protocol.mjs';
import {observe} from '../contact-v5/sensor.mjs';
import {CausalMeasurements,CausalTracker,measurementsForBudget,estimate,positionEvidence} from '../contact-v5/inference.mjs';
import {evidenceSessions} from '../contact-v5/evaluation.mjs';
import {protocol as v6} from '../ranging-v6/protocol.mjs';
import {generateRanges} from '../ranging-v6/sensor.mjs';
import {deriveRange,rttDistance,localizeRanges} from '../ranging-v6/inference.mjs';
const split=process.argv[2]??'train';if(!protocol.splits[split])throw new Error('Unknown split.');
const output=resolve(process.argv[3]??`results/ml-v7-data/${split}`);
if(existsSync(output))throw new Error('Use a fresh output directory.');mkdirSync(output,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex'),files=[];
const save=(name,data)=>{const bytes=Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data));writeFileSync(join(output,name),name.endsWith('.gz')?gzipSync(bytes):bytes);files.push(name);};
const ids=Array.from({length:8},(_,i)=>`w${i}`),pairList=pairs(ids),sourceRoot=fileURLToPath(new URL('../../',import.meta.url));
const sourceFiles=['protocol.mjs','scenarios.mjs','features.mjs','generate.mjs'].map(f=>`research/ml-v7/${f}`)
  .concat(['protocol.mjs','sensor.mjs','inference.mjs','evaluation.mjs'].map(f=>`research/contact-v5/${f}`),
    ['protocol.mjs','sensor.mjs','inference.mjs'].map(f=>`research/ranging-v6/${f}`),
    ['sensor.mjs','inference.mjs','evaluation.mjs'].map(f=>`research/angular-v4/${f}`));
const manifest={version:protocol.version,split,status:'running',protocol,protocolSha256:hash(JSON.stringify(protocol)),
  features:featureNames,pairs:pairList,shape:[360,28,featureNames.length],dtype:'little-endian float32',labelDtype:'uint8',
  rowOrder:'timestamp-major, pair-major',cases:[],seeds:protocol.splits[split],node:process.version};
save('manifest.json',manifest);save('source-checksums.json',sourceFiles.map(file=>({file,sha256:hash(readFileSync(join(sourceRoot,file)))})));
for(const [seedIndex,seed] of protocol.splits[split].entries()) {
  const family=split==='external'?protocol.externalFamily:protocol.families[seedIndex%protocol.families.length],truth=makeRecording(seed,family);
  const referenceFrames=truth.map(f=>({t:f.t,evidence:positionEvidence(f.positions,ids,v5.floorplan,2)}));
  const reference=evidenceSessions(referenceFrames),labels=Buffer.from(referenceFrames.flatMap(f=>pairList.map(([a,b])=>Number(f.evidence[`${a}|${b}`]))));
  save(`truth-${seed}.json.gz`,{frames:truth,reference});save(`labels-${seed}.u8.gz`,labels);
  for(const condition of v6.conditions) {
    const caseId=`${seed}-${condition.id}`,received=observe(truth,seed,v5.conditions[condition.legacyCondition]),rawRanges=generateRanges(truth,received,seed,condition,8,v5.anchors);
    save(`raw-${caseId}.json.gz`,{ble:received,ranging:rawRanges});
    const sample={caseId,seed,family,condition:condition.id,referenceContacts:reference.length,
      positiveFrames:labels.reduce((s,v)=>s+v,0),totalPairFrames:labels.length,modalities:{}};
    for(const modality of protocol.modalities) {
      const angular=modality==='AoA2'||modality==='AoA4',rangeMode={PBR:'ble-pbr',RTT:'ble-rtt',PBR_RTT:'ble-pbr-rtt',UWB:'uwb-ds-twr'}[modality];
      const enabled=new Set(modality==='AoA4'?v5.anchors.map(a=>a.id):modality==='AoA2'?v5.upgradedTwo:[]);
      const filter=new CausalMeasurements(5),tracker=new CausalTracker(v5.estimator,rangeMode?
        (modality==='RTT'?v6.rttPositionMeasurementVariance:v6.positionMeasurementVariance):angular?v5.estimator.fusionPositionVariance:v5.estimator.rssiPositionVariance);
      const builder=new FeatureBuilder(ids),rangeHistory=new Map(),values=[];
      for(const [index,frame] of received.entries()) {
        const allowed=measurementsForBudget(frame.observations,enabled),filtered=filter.update(frame.t,allowed),currentRanges=[],diagnostics=[];
        if(rangeMode)for(const o of rawRanges[index].observations) {
          const distance=deriveRange(o,rangeMode,v6);if(distance===null)continue;
          const key=`${o.wearableId}|${o.anchor.id}`,h=(rangeHistory.get(key)??[]).filter(v=>v.t>frame.t-5);h.push({t:frame.t,distance});rangeHistory.set(key,h);
          const sorted=h.map(v=>v.distance).sort((a,b)=>a-b);currentRanges.push({wearableId:o.wearableId,anchor:o.anchor,distance:sorted[Math.floor(sorted.length/2)]});
          const diagnostic={wearableId:o.wearableId};
          if(modality==='PBR'||modality==='PBR_RTT')diagnostic.phaseResidual=phaseFitResidual(o.phases);
          if(modality==='PBR_RTT'){const timing=rttDistance(o.rtt);diagnostic.disagreement=timing===null?0:Math.abs(distance-timing);}
          diagnostics.push(diagnostic);
        }
        const positions=ids.flatMap(id=>{
          const p=rangeMode?localizeRanges(currentRanges.filter(o=>o.wearableId===id),v6.nominalRangeSigma[rangeMode]):
            estimate(filtered.filter(o=>o.wearableId===id),v5.estimator);
          const tracked=tracker.update(frame.t,id,p);return tracked?[{id,...tracked}]:[];
        });
        values.push(...builder.update(frame.t,allowed,positions,currentRanges,diagnostics).flat());
      }
      const floats=Float32Array.from(values),name=`X-${caseId}-${modality}.f32.gz`;
      save(name,Buffer.from(floats.buffer));sample.modalities[modality]=name;
    }
    manifest.cases.push(sample);
  }
  console.log(`${split}: generated seed ${seed}, family ${family}, ${manifest.cases.length} recording conditions`);
}
manifest.status='complete';writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest));
writeFileSync(join(output,'checksums.json'),JSON.stringify(files.map(file=>({file,sha256:hash(readFileSync(join(output,file)))}))));
console.log(`Complete ${split}: ${output}`);
