// Observable-only causal features. No hidden-state or evaluation imports.
export const featureNames=['estimatedDistance','estimatedSameRoom','pairPositionAvailable','minTelemetryAge','maxTelemetryAge',
  'commonReceivers','minMeanRssi','maxMeanRssi','rssiMeanDifference','centeredRssiProfileDifference','rssiProfileMaxDifference',
  'minPacketCount','maxPacketCount','meanAngularDifference','maxAngularDifference',
  'meanRangeProfileDifference','maxRangeProfileDifference','meanRangeFitResidual','meanPhaseFitResidual','meanPbrRttDisagreement',
  'distanceMean10','distanceStd10','distanceMean30','positiveFraction10','positiveFraction30',
  'availableFraction10','availableFraction30','distanceChange10','rssiProfileDifferenceMean10'];
export const contactHistoryFeatures=featureNames.slice(20);
export const pairs=ids=>ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b]));
const mean=v=>v.length?v.reduce((s,x)=>s+x,0)/v.length:0;
const median=v=>{if(!v.length)return 0;const a=[...v].sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
export function phaseFitResidual(phases) {
  if(phases.length<2)return 0;const yy=[phases[0]];let last=phases[0];
  for(const p of phases.slice(1)){yy.push(yy.at(-1)+Math.atan2(Math.sin(p-last),Math.cos(p-last)));last=p;}
  const mx=(yy.length-1)/2,my=mean(yy);let u=0,d=0;
  yy.forEach((y,i)=>{u+=(i-mx)*(y-my);d+=(i-mx)**2;});const slope=u/d;
  return Math.sqrt(mean(yy.map((y,i)=>(y-my-slope*(i-mx))**2)));
}
export class FeatureBuilder {
  constructor(ids){this.ids=ids;this.pairs=pairs(ids);this.telemetry=new Map();this.pairHistory=new Map();}
  update(t,ble,positions,ranges=[],diagnostics=[]) {
    const pos=new Map(positions.map(p=>[p.id,p]));
    for(const o of ble){const key=`${o.wearableId}|${o.anchor.id}`,history=(this.telemetry.get(key)??[]).filter(v=>v.t>t-5);history.push({t,...o});this.telemetry.set(key,history);}
    const byDevice=new Map(this.ids.map(id=>[id,[]]));
    for(const history of this.telemetry.values()) {
      const h=history.filter(v=>v.t>t-5);if(!h.length)continue;
      const last=h.at(-1),angles=h.filter(v=>v.bearingRad!==undefined).map(v=>v.bearingRad);
      byDevice.get(last.wearableId)?.push({gateway:last.anchor.id,age:t-last.t,count:h.length,rssi:median(h.map(v=>v.rssiDbm)),
        angle:angles.length?Math.atan2(mean(angles.map(Math.sin)),mean(angles.map(Math.cos))):null});
    }
    return this.pairs.map(([a,b])=>{
      const aa=byDevice.get(a),bb=byDevice.get(b),pa=pos.get(a),pb=pos.get(b);
      const ageA=aa.length?Math.min(...aa.map(o=>o.age)):30,ageB=bb.length?Math.min(...bb.map(o=>o.age)):30;
      const available=Boolean(pa&&pb&&ageA<=3&&ageB<=3),distance=available?Math.min(30,Math.hypot(pa.x-pb.x,pa.y-pb.y)):0;
      const sameRoom=available?(pa.x<12)===(pb.x<12):false;
      const common=aa.flatMap(x=>{const y=bb.find(y=>y.gateway===x.gateway);return y?[{x,y}]:[];});
      const offset=mean(common.map(o=>o.x.rssi-o.y.rssi));
      const differences=common.map(o=>Math.abs(o.x.rssi-o.y.rssi-offset));
      const angleDifferences=common.filter(o=>o.x.angle!==null&&o.y.angle!==null).map(o=>Math.abs(Math.atan2(Math.sin(o.x.angle-o.y.angle),Math.cos(o.x.angle-o.y.angle))));
      const ar=ranges.filter(r=>r.wearableId===a),br=ranges.filter(r=>r.wearableId===b);
      const rangeDifferences=ar.flatMap(x=>{const y=br.find(y=>y.anchor.id===x.anchor.id);return y?[Math.abs(x.distance-y.distance)]:[];});
      const residuals=[...ar.map(o=>pa?Math.abs(Math.hypot(pa.x-o.anchor.x,pa.y-o.anchor.y)-o.distance):0),...br.map(o=>pb?Math.abs(Math.hypot(pb.x-o.anchor.x,pb.y-o.anchor.y)-o.distance):0)];
      const diagnostic=diagnostics.filter(o=>o.wearableId===a||o.wearableId===b);
      const key=`${a}|${b}`,history=(this.pairHistory.get(key)??[]).filter(v=>v.t>t-30);
      history.push({t,distance,available,positive:available&&sameRoom&&distance<=2,profile:mean(differences)});this.pairHistory.set(key,history);
      const h10=history.filter(v=>v.t>t-10),valid10=h10.filter(v=>v.available),valid30=history.filter(v=>v.available);
      const mean10=mean(valid10.map(v=>v.distance)),std10=Math.sqrt(mean(valid10.map(v=>(v.distance-mean10)**2)));
      const means=[mean(aa.map(o=>o.rssi)),mean(bb.map(o=>o.rssi))],counts=[aa.reduce((s,o)=>s+o.count,0),bb.reduce((s,o)=>s+o.count,0)];
      const values=[distance,Number(sameRoom),Number(available),Math.min(ageA,ageB),Math.max(ageA,ageB),common.length,
        Math.min(...means),Math.max(...means),Math.abs(offset),mean(differences),differences.length?Math.max(...differences):0,
        Math.min(...counts),Math.max(...counts),mean(angleDifferences),angleDifferences.length?Math.max(...angleDifferences):0,
        mean(rangeDifferences),rangeDifferences.length?Math.max(...rangeDifferences):0,mean(residuals),
        mean(diagnostic.map(o=>o.phaseResidual??0)),mean(diagnostic.map(o=>o.disagreement??0)),
        mean10,std10,mean(valid30.map(v=>v.distance)),h10.filter(v=>v.positive).length/h10.length,
        history.filter(v=>v.positive).length/history.length,valid10.length/h10.length,valid30.length/history.length,
        valid10.length>1?valid10.at(-1).distance-valid10[0].distance:0,mean(h10.map(v=>v.profile))];
      if(values.length!==featureNames.length||values.some(v=>!Number.isFinite(v)))throw new Error('Invalid observable features.');
      return values.map(v=>Math.round(v*1000)/1000);
    });
  }
}
