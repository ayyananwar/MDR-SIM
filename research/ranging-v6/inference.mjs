// Observable phase/timing only; no sensor, trajectory or evaluator imports.
const C=299792458;
export function pbrDistance(phases,frequencies) {
  if(phases.length<2||phases.length!==frequencies.length)return null;
  let last=phases[0],unwrapped=last;
  const y=[unwrapped];
  for(const phase of phases.slice(1)){unwrapped+=Math.atan2(Math.sin(phase-last),Math.cos(phase-last));y.push(unwrapped);last=phase;}
  const fx=frequencies.reduce((s,x)=>s+x,0)/frequencies.length,fy=y.reduce((s,x)=>s+x,0)/y.length;
  let numerator=0,denominator=0;
  for(let i=0;i<y.length;i++){numerator+=(frequencies[i]-fx)*(y[i]-fy);denominator+=(frequencies[i]-fx)**2;}
  const d=numerator/denominator*C/(4*Math.PI);
  return Number.isFinite(d)&&d>=0?d:null;
}
export function rttDistance({elapsedNs,reportedTurnaroundNs}) {
  const d=(elapsedNs-reportedTurnaroundNs)*C/2e9;
  return Number.isFinite(d)&&d>=0?d:null;
}
export function uwbDistance({roundA,roundB,delayA,delayB}) {
  const tof=(roundA*roundB-delayA*delayB)/(roundA+roundB+delayA+delayB);
  const d=tof*C/1e9;return Number.isFinite(d)&&d>=0?d:null;
}
export function deriveRange(o,method,settings) {
  const f=settings.frequencyModel;
  if(method==='ble-rtt')return rttDistance(o.rtt);
  if(method==='uwb-ds-twr')return uwbDistance(o.uwb);
  const pbr=pbrDistance(o.phases,Array.from({length:f.tones},(_,i)=>f.startHz+i*f.stepHz));
  if(method==='ble-pbr')return pbr;
  const rtt=rttDistance(o.rtt);
  // RTT is a coarse consistency check. Shared NLOS bias can pass this gate.
  if(pbr===null)return null;
  return rtt!==null&&Math.abs(pbr-rtt)<=3*Math.hypot(settings.nominalRangeSigma['ble-pbr'],settings.nominalRangeSigma['ble-rtt'])?pbr:null;
}
export function localizeRanges(observations,sigma) {
  if(observations.length<3)return null;
  const center={x:observations.reduce((s,o)=>s+o.anchor.x,0)/observations.length,
    y:observations.reduce((s,o)=>s+o.anchor.y,0)/observations.length};
  const rows=p=>observations.map(o=>{const dx=p.x-o.anchor.x,dy=p.y-o.anchor.y,d=Math.max(.1,Math.hypot(dx,dy));
    return {r:(d-o.distance)/sigma,x:dx/d/sigma,y:dy/d/sigma};});
  const cost=rr=>rr.reduce((s,{r})=>s+(Math.abs(r)>1.5?1.5*(Math.abs(r)-.75):.5*r*r),0);
  let answer=null,best=Infinity;
  for(const initial of [center,...observations.map(o=>({x:(center.x+o.anchor.x)/2,y:(center.y+o.anchor.y)/2}))]) {
    let p={...initial};
    for(let it=0;it<30;it++) {
      const rr=rows(p);let a=1e-4,b=0,c=1e-4,u=0,v=0;
      for(const r of rr){const w=Math.abs(r.r)>1.5?1.5/Math.abs(r.r):1;a+=w*r.x*r.x;b+=w*r.x*r.y;c+=w*r.y*r.y;u-=w*r.x*r.r;v-=w*r.y*r.r;}
      const det=a*c-b*b;if(det<1e-10*(a+c)**2)break;
      const step=[(c*u-b*v)/det,(a*v-b*u)/det];let accepted=false;const old=cost(rr);
      for(let scale=1;scale>=1/64;scale/=2){const next={x:p.x+scale*step[0],y:p.y+scale*step[1]};
        if(cost(rows(next))<old){p=next;accepted=true;break;}}
      if(!accepted||Math.hypot(...step)<1e-4)break;
    }
    const value=cost(rows(p));if(Number.isFinite(value)&&value<best){best=value;answer=p;}
  }
  return answer;
}
