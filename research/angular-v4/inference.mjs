// Observable-only estimators. Anchor positions/orientations are public calibration.
// No trajectory, room identity, contact label, or reference distance is an input.
export const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const solve = (a,b,c,u,v) => {
  const det = a*c-b*b;
  return det > 1e-10*(a+c)**2 ? [(c*u-b*v)/det,(a*v-b*u)/det] : null;
};
export function triangulate(observations) {
  if (observations.length < 2) return null;
  let a=0,b=0,c=0,u=0,v=0;
  for (const o of observations) {
    const theta=o.bearingRad+o.anchor.orientationRad;
    const nx=-Math.sin(theta), ny=Math.cos(theta), z=nx*o.anchor.x+ny*o.anchor.y;
    a+=nx*nx; b+=nx*ny; c+=ny*ny; u+=nx*z; v+=ny*z;
  }
  const p=solve(a,b,c,u,v);
  if (!p || observations.some(o => {
    const theta=o.bearingRad+o.anchor.orientationRad;
    return (p[0]-o.anchor.x)*Math.cos(theta)+(p[1]-o.anchor.y)*Math.sin(theta)<0;
  })) return null;
  return {x:p[0],y:p[1]};
}
function residuals(p, observations, mode, sigmaRad) {
  const rows=[];
  for (const o of observations) {
    const dx=p.x-o.anchor.x,dy=p.y-o.anchor.y,d2=Math.max(dx*dx+dy*dy,.01);
    if (mode !== 'rssi') rows.push({
      r:wrap(Math.atan2(dy,dx)-o.anchor.orientationRad-o.bearingRad)/sigmaRad,
      gx:-dy/d2/sigmaRad,gy:dx/d2/sigmaRad,
    });
    if (mode !== 'angle') {
      const k=25/Math.LN10;
      rows.push({r:(-50-25*Math.log10(Math.sqrt(d2))-o.rssiDbm)/6,
        gx:-k*dx/d2/6,gy:-k*dy/d2/6});
    }
  }
  return rows;
}
const loss = (rows,robust) => rows.reduce((sum,{r}) => sum +
  (robust && Math.abs(r)>1.5 ? 1.5*(Math.abs(r)-.75) : .5*r*r),0);
// Damped Gauss-Newton with backtracking and multiple observable initializations.
// Huber weighting is an ablation, not a claim of calibrated probability.
export function localize(observations, mode, sigmaRad, robust=false) {
  if (observations.length < (mode === 'rssi' ? 3 : 2)) return null;
  const center={x:observations.reduce((s,o)=>s+o.anchor.x,0)/observations.length,
    y:observations.reduce((s,o)=>s+o.anchor.y,0)/observations.length};
  const starts=[center, ...observations.map(o=>({x:(center.x+o.anchor.x)/2,y:(center.y+o.anchor.y)/2}))];
  const tri=mode==='rssi' ? null : triangulate(observations); if(tri) starts.unshift(tri);
  let best=null,bestLoss=Infinity;
  for (const initial of starts) {
    let p={...initial};
    for(let iteration=0;iteration<40;iteration++) {
      const rows=residuals(p,observations,mode,sigmaRad);
      let a=1e-4,b=0,c=1e-4,u=0,v=0;
      for(const {r,gx,gy} of rows) {
        const w=robust && Math.abs(r)>1.5 ? 1.5/Math.abs(r) : 1;
        a+=w*gx*gx;b+=w*gx*gy;c+=w*gy*gy;u-=w*gx*r;v-=w*gy*r;
      }
      const step=solve(a,b,c,u,v); if(!step) break;
      const old=loss(rows,robust);let accepted=false;
      for(let scale=1;scale>=1/128;scale/=2) {
        const next={x:p.x+scale*step[0],y:p.y+scale*step[1]};
        if(loss(residuals(next,observations,mode,sigmaRad),robust)<old) {
          p=next;accepted=true;break;
        }
      }
      if(!accepted || Math.hypot(...step)<1e-5) break;
    }
    const value=loss(residuals(p,observations,mode,sigmaRad),robust);
    if(Number.isFinite(value)&&value<bestLoss) {best=p;bestLoss=value;}
  }
  return best;
}
