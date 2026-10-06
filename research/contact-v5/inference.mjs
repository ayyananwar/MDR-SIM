// Only observations and registered public settings; no sensor/trajectory imports.
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const solve=(a,b,c,u,v)=>{const d=a*c-b*b;return d>1e-10*(a+c)**2?[(c*u-b*v)/d,(a*v-b*u)/d]:null;};
export function measurementsForBudget(observations,enabled) {
  return observations.map(({bearingRad,...o})=>enabled.has(o.anchor.id)?{...o,bearingRad}:o);
}
const median=values=>{const v=[...values].sort((a,b)=>a-b);const n=v.length;return n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2;};
export class CausalMeasurements {
  constructor(windowSeconds){this.window=windowSeconds;this.history=new Map();}
  update(t,observations) {
    return observations.map(o=>{
      const key=`${o.wearableId}|${o.anchor.id}`,h=this.history.get(key)??[];
      const retained=h.filter(v=>v.t>t-this.window);retained.push({t,...o});this.history.set(key,retained);
      const result={...o,rssiDbm:median(retained.map(v=>v.rssiDbm))};
      const angular=retained.filter(v=>v.bearingRad!==undefined);
      if(o.bearingRad!==undefined)result.bearingRad=Math.atan2(angular.reduce((s,v)=>s+Math.sin(v.bearingRad),0),angular.reduce((s,v)=>s+Math.cos(v.bearingRad),0));
      return result;
    });
  }
}
function residuals(p,observations,settings) {
  const rows=[],sigma=settings.angleSigmaDegrees*Math.PI/180;
  for(const o of observations) {
    const dx=p.x-o.anchor.x,dy=p.y-o.anchor.y,d2=Math.max(dx*dx+dy*dy,.01),k=10*settings.pathLossExponent/Math.LN10;
    rows.push({r:(settings.referenceRssi-5*settings.pathLossExponent*Math.log10(d2)-o.rssiDbm)/settings.rssiSigma,
      gx:-k*dx/d2/settings.rssiSigma,gy:-k*dy/d2/settings.rssiSigma});
    if(o.bearingRad!==undefined)rows.push({r:wrap(Math.atan2(dy,dx)-o.anchor.orientationRad-o.bearingRad)/sigma,
      gx:-dy/d2/sigma,gy:dx/d2/sigma});
  }
  return rows;
}
const cost=rows=>rows.reduce((s,{r})=>s+(Math.abs(r)>1.5?1.5*(Math.abs(r)-.75):.5*r*r),0);
export function estimate(observations,settings) {
  // Two range/bearing anchors or >=3 RSSI anchors; no hidden bounds/room oracle.
  if(observations.length<3&&observations.filter(o=>o.bearingRad!==undefined).length<2)return null;
  const center={x:observations.reduce((s,o)=>s+o.anchor.x,0)/observations.length,
    y:observations.reduce((s,o)=>s+o.anchor.y,0)/observations.length};
  const starts=[center,...observations.map(o=>({x:(center.x+o.anchor.x)/2,y:(center.y+o.anchor.y)/2}))];
  let best=null,bestCost=Infinity;
  for(const initial of starts) {
    let p={...initial};
    for(let iteration=0;iteration<30;iteration++) {
      const rows=residuals(p,observations,settings);let a=1e-4,b=0,c=1e-4,u=0,v=0;
      for(const {r,gx,gy} of rows) {const w=Math.abs(r)>1.5?1.5/Math.abs(r):1;
        a+=w*gx*gx;b+=w*gx*gy;c+=w*gy*gy;u-=w*gx*r;v-=w*gy*r;}
      const step=solve(a,b,c,u,v);if(!step)break;const previous=cost(rows);let accepted=false;
      for(let scale=1;scale>=1/64;scale/=2){const next={x:p.x+scale*step[0],y:p.y+scale*step[1]};
        if(cost(residuals(next,observations,settings))<previous){p=next;accepted=true;break;}}
      if(!accepted||Math.hypot(...step)<1e-4)break;
    }
    const value=cost(residuals(p,observations,settings));if(Number.isFinite(value)&&value<bestCost){best=p;bestCost=value;}
  }
  return best;
}
function axisPredict(s,dt,q) {
  return {position:s.position+dt*s.velocity,velocity:s.velocity,
    a:s.a+2*dt*s.b+dt*dt*s.c+q*dt**4/4,b:s.b+dt*s.c+q*dt**3/2,c:s.c+q*dt*dt};
}
function axisUpdate(s,z,r) {
  const innovation=z-s.position,den=s.a+r,k0=s.a/den,k1=s.b/den;
  return {position:s.position+k0*innovation,velocity:s.velocity+k1*innovation,
    a:(1-k0)*s.a,b:(1-k0)*s.b,c:s.c-k1*s.b};
}
export class CausalTracker {
  constructor(settings,variance){this.settings=settings;this.variance=variance;this.states=new Map();}
  update(t,id,measurement) {
    let s=this.states.get(id);
    if(!s||t-s.lastMeasured>this.settings.maxPredictionGapSeconds) {
      if(!measurement)return null;
      s={t,lastMeasured:t,x:{position:measurement.x,velocity:0,a:this.variance,b:0,c:1},
        y:{position:measurement.y,velocity:0,a:this.variance,b:0,c:1}};
    } else {
      const dt=t-s.t;s.x=axisPredict(s.x,dt,this.settings.accelerationVariance);s.y=axisPredict(s.y,dt,this.settings.accelerationVariance);s.t=t;
      if(measurement){s.x=axisUpdate(s.x,measurement.x,this.variance);s.y=axisUpdate(s.y,measurement.y,this.variance);s.lastMeasured=t;}
    }
    this.states.set(id,s);
    return t-s.lastMeasured<=this.settings.maxPredictionGapSeconds?{x:s.x.position,y:s.y.position}:null;
  }
}
export function positionEvidence(positions,ids,floorplan,threshold) {
  const map=new Map(positions.map(p=>[p.id,p])),result={};
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++) {
    const a=map.get(ids[i]),b=map.get(ids[j]);
    result[`${ids[i]}|${ids[j]}`]=!a||!b?null:
      ((a.x<floorplan.wallX)===(b.x<floorplan.wallX)&&Math.hypot(a.x-b.x,a.y-b.y)<=threshold);
  }
  return result;
}
export function gatewayEvidence(observations,ids,settings,threshold) {
  const near=new Map();
  for(const o of observations)if(10**((settings.referenceRssi-o.rssiDbm)/(10*settings.pathLossExponent))<=threshold) {
    const set=near.get(o.wearableId)??new Set();set.add(o.anchor.id);near.set(o.wearableId,set);
  }
  const result={};
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)
    result[`${ids[i]}|${ids[j]}`]=[...(near.get(ids[i])??[])].some(g=>near.get(ids[j])?.has(g));
  return result;
}
export class TemporalDecision {
  constructor(window,threshold){this.window=window;this.threshold=threshold;this.history=new Map();}
  update(t,evidence) {
    const result={};
    for(const [pair,value] of Object.entries(evidence)) {
      const h=(this.history.get(pair)??[]).filter(v=>v.t>t-this.window);h.push({t,value});this.history.set(pair,h);
      // Unknown frames are counted as nonpositive and cannot maintain a current decision.
      result[pair]=value!==null&&h.length===this.window&&h.filter(v=>v.value===true).length/this.window>=this.threshold;
    }
    return result;
  }
}
