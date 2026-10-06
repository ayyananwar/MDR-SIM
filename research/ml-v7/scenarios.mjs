// Hidden geometry. No inference/model module imports this file.
import {random} from '../angular-v4/sensor.mjs';
import {protocol} from './protocol.mjs';
const ramp=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/8,(b-t)/8));
const routePoint=(points,speed,time)=>{
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total=lengths.reduce((s,x)=>s+x,0);let distance=Math.max(0,time*speed)%total;
  for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]){const ratio=distance/lengths[i];return {x:points[i].x+(points[i+1].x-points[i].x)*ratio,y:points[i].y+(points[i+1].y-points[i].y)*ratio};}distance-=lengths[i];}
  return points[0];
};
function waypointRecording(rng,ids) {
  const state=ids.map(id=>({id,x:rng.uniform()<.5?3+rng.uniform()*6:15+rng.uniform()*6,y:2+rng.uniform()*15,
    path:[],pause:Math.floor(rng.uniform()*40),speed:.35+rng.uniform()*.4}));
  return Array.from({length:protocol.seconds},(_,t)=>({t,positions:state.map(s=>{
    if(s.pause>0)s.pause--;
    else {
      if(!s.path.length) {
        const target={x:rng.uniform()<.5?3+rng.uniform()*6:15+rng.uniform()*6,y:2+rng.uniform()*15};
        s.path=(s.x<12)!==(target.x<12)?[{x:s.x<12?10:14,y:10},{x:s.x<12?14:10,y:10},target]:[target];
      }
      let remaining=s.speed;
      while(remaining>0&&s.path.length) {
        const p=s.path[0],d=Math.hypot(p.x-s.x,p.y-s.y);
        if(d<=remaining){s.x=p.x;s.y=p.y;s.path.shift();remaining-=d;if(!s.path.length){s.pause=20+Math.floor(rng.uniform()*70);break;}}
        else{s.x+=(p.x-s.x)*remaining/d;s.y+=(p.y-s.y)*remaining/d;remaining=0;}
      }
    }
    return {id:s.id,x:s.x,y:s.y};
  })}));
}
export function makeRecording(seed,family) {
  const rng=random(seed),ids=Array.from({length:8},(_,i)=>`w${i}`);
  // Shuffle device assignment so pair identity cannot identify an encounter role.
  for(let i=7;i>0;i--){const j=Math.floor(rng.uniform()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  if(family==='independent-waypoints')return waypointRecording(rng,ids);
  const groups=Array.from({length:4},(_,g)=>({
    x:(g%2?15:3)+rng.uniform()*3,y:3+Math.floor(g/2)*10+rng.uniform()*2,
    phase:rng.uniform()*2*Math.PI,start:30+Math.floor(rng.uniform()*90),
    length:65+Math.floor(rng.uniform()*100),gap:family==='threshold-encounters'?1.7+rng.uniform()*.25:.7+rng.uniform()*.8,
    far:family==='threshold-encounters'?2.1+rng.uniform()*.35:2.8+rng.uniform()*.8,
    speed:.22+rng.uniform()*.12}));
  return Array.from({length:protocol.seconds},(_,t)=>({t,positions:groups.flatMap((g,index)=>{
    let center={x:g.x+.25*Math.sin(t/25+g.phase),y:g.y+.25*Math.cos(t/25+g.phase)};
    let path=null;
    if(family==='doorway-rounds') {
      const left=3+index,right=17+index*.7;
      path=[{x:left,y:4+index},{x:left,y:10},{x:10,y:10},{x:14,y:10},{x:right,y:10},
        {x:right,y:15-index},{x:right,y:10},{x:14,y:10},{x:10,y:10},{x:left,y:10},{x:left,y:4+index}];
      center=routePoint(path,g.speed,t+index*25);
    }
    const strength=Math.max(ramp(t,g.start,g.start+g.length),ramp(t,270,290));
    let distance=g.far-(g.far-g.gap)*strength;
    // An always-separated-by-wall pair tests false contacts without crossing a wall.
    if(index===3&&family!=='doorway-rounds')center={x:11.4+.1*Math.sin(t/25+g.phase),y:g.y},distance=1.2;
    let second={x:center.x+distance,y:center.y};
    if(path)second=routePoint(path,g.speed,t+index*25-distance/g.speed);
    return [{id:ids[index*2],...center},{id:ids[index*2+1],...second}];
  }).sort((a,b)=>a.id.localeCompare(b.id))}));
}
