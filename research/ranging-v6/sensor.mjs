import {random} from '../angular-v4/sensor.mjs';
import {blocked} from '../contact-v5/sensor.mjs';
import {protocol} from './protocol.mjs';
export const C=299792458;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function phaseSamples(distance,offset,condition,wall,rng) {
  const model=protocol.frequencyModel;
  return Array.from({length:model.tones},(_,i)=>{
    const f=model.startHz+i*model.stepHz,phase=2*Math.PI*f*distance/C;
    const reflected=phase+2*Math.PI*f*condition.reflectionExcessMeters/C+.7;
    const alpha=wall?condition.reflectionAmplitude:0;
    // Ideal reciprocal two-path channel. Combined round-trip phase is twice
    // the channel phase; nuisance oscillator offset is constant across tones.
    return wrap(2*Math.atan2(Math.sin(phase)+alpha*Math.sin(reflected),
      Math.cos(phase)+alpha*Math.cos(reflected))+offset+rng.normal()*condition.phaseSigmaRad);
  });
}
export function rawTiming(distance,wall,condition,calibration,rng) {
  const setting=protocol.timing,cns=C/1e9;
  const rttDistance=distance+calibration.rtt+(wall?condition.rttWallBiasMeters:0);
  const elapsedNs=setting.turnaroundNs+2*rttDistance/cns+rng.normal()*setting.rttSigmaNs;
  const tof=(distance+calibration.uwb+(wall?condition.uwbWallBiasMeters:0))/cns;
  const a=1+setting.clockASkewPpm*1e-6,b=1+setting.clockBSkewPpm*1e-6;
  const delayA=5e5,delayB=7e5,noise=()=>rng.normal()*setting.uwbIntervalSigmaNs;
  return {rtt:{elapsedNs,reportedTurnaroundNs:setting.turnaroundNs},
    uwb:{roundA:(2*tof+delayB)*a+noise(),roundB:(2*tof+delayA)*b+noise(),
      delayA:delayA*a+noise(),delayB:delayB*b+noise()}};
}
export function isScheduled(t,wearableIndex,clients,slots=protocol.slotsPerAnchorPerSecond) {
  for(let s=0;s<Math.min(slots,clients);s++)if((t*slots+s)%clients===wearableIndex)return true;
  return false;
}
export function generateRanges(truth,received,seed,condition,clients,anchors) {
  const rng=random(seed^0x4c194721);
  const calibration=Array.from({length:8},()=>anchors.map(()=>({
    pbr:rng.normal()*protocol.timing.pbrCalibrationSigmaMeters,
    rtt:rng.normal()*protocol.timing.rttCalibrationSigmaMeters,
    uwb:rng.normal()*protocol.timing.uwbCalibrationSigmaMeters,offset:rng.uniform()*2*Math.PI})));
  return truth.map((frame,index)=>{
    const allowed=new Set(received[index].observations.map(o=>`${o.wearableId}|${o.anchor.id}`));
    const observations=[];
    for(const [i,p] of frame.positions.entries())for(const [j,anchor] of anchors.entries()) {
      const d=Math.hypot(p.x-anchor.x,p.y-anchor.y),wall=blocked(anchor,p),cal=calibration[i][j];
      // Draw for every potential link before scheduling, matching noise across loads.
      const phases=phaseSamples(d+cal.pbr,cal.offset,condition,wall,rng);
      const timing=rawTiming(d,wall,condition,cal,rng);
      if(isScheduled(frame.t,i,clients)&&allowed.has(`${p.id}|${anchor.id}`))
        observations.push({wearableId:p.id,anchor,phases,...timing});
    }
    return {t:frame.t,observations};
  });
}
