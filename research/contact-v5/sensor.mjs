import {random} from '../angular-v4/sensor.mjs';
import {protocol} from './protocol.mjs';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function roomAt(p) {return p.x<protocol.floorplan.wallX?'A':'B';}
export function blocked(a,p) {
  const wall=protocol.floorplan.wallX;
  if((a.x-wall)*(p.x-wall)>=0)return false;
  const y=a.y+(p.y-a.y)*(wall-a.x)/(p.x-a.x);
  return y<protocol.floorplan.doorY[0]||y>protocol.floorplan.doorY[1];
}
export function trajectory(seed) {
  const rng=random(seed),phases=Array.from({length:4},()=>rng.uniform()*2*Math.PI);
  const ramp=(t,start,end)=>Math.max(0,Math.min(1,(t-start)/10,(end-t)/10));
  return Array.from({length:protocol.seconds},(_,t)=>({t,positions:Array.from({length:8},(_,i)=>{
    const g=Math.floor(i/2),phase=phases[g];
    const base=[[4,4],[15,5],[4,14],[11.4,15]][g];
    let offset=3.2;
    if(g===0)offset-=2*ramp(t,50,180)+.8*ramp(t,230,310); // long contact, then near miss
    if(g===1)offset-=2*ramp(t,120,290);
    if(g===2)offset-=2*Math.max(ramp(t,30,55),ramp(t,220,320)); // short, then long
    if(g===3)offset=1.2; // close in Euclidean distance but opposite sides of a wall
    return {id:`w${i}`,x:base[0]+(i%2?offset:0)+.2*Math.sin(t/25+phase),
      y:base[1]+.2*Math.cos(t/25+phase)};
  })}));
}
export function observe(truth,seed,condition) {
  const rng=random(seed^0x17ab1923),bias=Array.from({length:8},()=>rng.normal()*condition.deviceBiasSigma);
  const orientations=protocol.anchors.map(()=>rng.normal()*condition.orientationBiasSigmaDegrees);
  const states=Array.from({length:8},()=>protocol.anchors.map(()=>({r:rng.normal(),a:rng.normal(),until:-1})));
  return truth.map(({t,positions})=>({t,observations:positions.flatMap((p,i)=>protocol.anchors.flatMap((anchor,j)=>{
    const s=states[i][j],rho=condition.correlation;
    s.r=rho*s.r+Math.sqrt(1-rho*rho)*rng.normal();
    s.a=rho*s.a+Math.sqrt(1-rho*rho)*rng.normal();
    const drop=rng.uniform(),burst=rng.uniform();
    if(burst<condition.burstStart)s.until=t+condition.burstSeconds;
    const wall=blocked(anchor,p),distance=Math.max(.1,Math.hypot(p.x-anchor.x,p.y-anchor.y));
    const rssiDbm=-50-25*Math.log10(distance)+s.r*condition.rssiSigma+bias[i]-(wall?condition.wallLossDb:0);
    if(drop<protocol.reception.packetLoss||t<s.until||rssiDbm<protocol.reception.sensitivityDbm)return [];
    return [{wearableId:p.id,anchor,rssiDbm,
      bearingRad:wrap(Math.atan2(p.y-anchor.y,p.x-anchor.x)-anchor.orientationRad+
        (s.a*condition.angleSigmaDegrees+orientations[j]+(wall?condition.wallAngleBiasDegrees:0))*Math.PI/180)}];
  }))}));
}
