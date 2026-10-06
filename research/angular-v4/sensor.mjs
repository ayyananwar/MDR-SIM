// Hidden geometry is used ONLY to create synthetic observations and reference.
// This is an abstract bearing-error model, not an IQ/antenna-array simulator.
import {wrap} from './inference.mjs';
export function random(seed) {
  let a=seed>>>0;
  const uniform=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  return {uniform,normal:()=>Math.sqrt(-2*Math.log(Math.max(uniform(),1e-12)))*Math.cos(2*Math.PI*uniform())};
}
export const anchors=[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]
  .map((p,i)=>({...p,id:`g${i}`,orientationRad:i*Math.PI/2}));
export function trajectory(seed, seconds=240) {
  const rng=random(seed); const phases=[rng.uniform(),rng.uniform(),rng.uniform()].map(x=>x*2*Math.PI);
  return Array.from({length:seconds},(_,t)=>({t,positions:Array.from({length:6},(_,i)=>{
    const group=Math.floor(i/2),base=[[4,4],[14,4],[8,14]][group];
    // Controlled approach/departure at <=0.32 m/s, not room teleports.
    const start=40+group*15,end=160+group*10;
    const strength=Math.max(0,Math.min(1,(t-start)/10,(end-t)/10));
    const offset=i%2 ? 3.2-2*strength : 0;
    return {id:`w${i}`,x:base[0]+offset+.4*Math.sin(t/30+phases[group]),
      y:base[1]+.4*Math.cos(t/30+phases[group])};
  })}));
}
export function observe(frames,seed,sigmaDegrees,nlos=false) {
  // Restarting a fixed stream matches noise draws/dropouts across conditions.
  const rng=random(seed^0x5a5a5a5a);
  return frames.map(frame=>({t:frame.t,observations:frame.positions.flatMap(p=>anchors.flatMap(anchor=>{
    const drop=rng.uniform(),bad=rng.uniform()<.1,zAngle=rng.normal(),zRssi=rng.normal();
    if(drop<.1) return [];
    const d=Math.max(.1,Math.hypot(p.x-anchor.x,p.y-anchor.y));
    return [{wearableId:p.id,anchor,
      bearingRad:wrap(Math.atan2(p.y-anchor.y,p.x-anchor.x)-anchor.orientationRad+
        (zAngle*sigmaDegrees+(nlos&&bad?20:0))*Math.PI/180),
      rssiDbm:-50-25*Math.log10(d)+6*zRssi-(nlos&&bad?8:0)}];
  }))}));
}
