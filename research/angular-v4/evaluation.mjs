export function sessions(frames, threshold=2, minimumDuration=30) {
  const open=new Map(),out=[];
  const close=(key)=>{const s=open.get(key);if(s&&s.end-s.start>=minimumDuration)out.push(s);open.delete(key);};
  for(const frame of frames) {
    const active=new Set();
    for(let i=0;i<frame.positions.length;i++) for(let j=i+1;j<frame.positions.length;j++) {
      const a=frame.positions[i],b=frame.positions[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)>threshold)continue;
      const key=[a.id,b.id].sort().join('|');active.add(key);
      const previous=open.get(key);
      if(previous&&previous.end===frame.t-1)previous.end=frame.t;
      else {close(key);open.set(key,{pair:key,start:frame.t,end:frame.t});}
    }
    for(const key of open.keys())if(!active.has(key))close(key);
  }
  for(const key of open.keys())close(key);
  return out;
}
export function contactMetrics(predicted,truth) {
  const candidates=[];
  predicted.forEach((p,i)=>truth.forEach((g,j)=>{
    if(p.pair!==g.pair)return;
    const overlap=Math.max(0,Math.min(p.end,g.end)-Math.max(p.start,g.start));
    const iou=overlap/(Math.max(p.end,g.end)-Math.min(p.start,g.start));
    if(overlap>=5&&iou>=.2)candidates.push({i,j,iou});
  }));
  candidates.sort((a,b)=>b.iou-a.iou||a.i-b.i||a.j-b.j);
  const usedP=new Set(),usedG=new Set(),durationErrors=[];
  for(const c of candidates)if(!usedP.has(c.i)&&!usedG.has(c.j)) {
    usedP.add(c.i);usedG.add(c.j);
    durationErrors.push(Math.abs((predicted[c.i].end-predicted[c.i].start)-(truth[c.j].end-truth[c.j].start)));
  }
  const tp=usedP.size,fp=predicted.length-tp,fn=truth.length-tp;
  return {tp,fp,fn,precision:tp+fp?tp/(tp+fp):0,recall:tp+fn?tp/(tp+fn):0,
    f1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):0,
    matchedDurationMAE:durationErrors.length?durationErrors.reduce((s,x)=>s+x,0)/durationErrors.length:null};
}
export const quantile=(values,q)=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b);return s[Math.floor(q*(s.length-1))];};
