import {contactMetrics,quantile} from '../angular-v4/evaluation.mjs';
export function evidenceSessions(frames,minimum=30) {
  const open=new Map(),result=[];
  const close=pair=>{const s=open.get(pair);if(s&&s.end-s.start>=minimum)result.push({...s,detectedAt:s.start+minimum});open.delete(pair);};
  for(const {t,evidence} of frames) {
    for(const [pair,value] of Object.entries(evidence)) {
      if(value!==true){close(pair);continue;}
      const previous=open.get(pair);
      if(previous&&previous.end===t-1)previous.end=t;
      else{close(pair);open.set(pair,{pair,start:t,end:t});}
    }
  }
  for(const pair of open.keys())close(pair);
  return result;
}
export function evaluate(predictions,referenceFrames,truthFrames,ids,seconds) {
  const predicted=evidenceSessions(predictions),reference=evidenceSessions(referenceFrames);
  const event=contactMetrics(predicted,reference),errors=[];
  let available=0,fpSeconds=0,fnSeconds=0,positiveSeconds=0,negativeSeconds=0;
  for(const [index,frame] of predictions.entries()) {
    for(const p of frame.positions??[]) {const actual=truthFrames[index].positions.find(a=>a.id===p.id);
      errors.push(Math.hypot(p.x-actual.x,p.y-actual.y));available++;}
    for(const [pair,value] of Object.entries(frame.evidence)) {
      const target=reference.some(s=>s.pair===pair&&frame.t>=s.start&&frame.t<=s.end);
      const inferred=predicted.some(s=>s.pair===pair&&frame.t>=s.start&&frame.t<=s.end);
      if(target){positiveSeconds++;if(!inferred)fnSeconds++;}else{negativeSeconds++;if(inferred)fpSeconds++;}
    }
  }
  // Independently enumerate the matching again for latency summaries; same event policy.
  const candidates=[];
  predicted.forEach((p,i)=>reference.forEach((g,j)=>{
    const overlap=Math.max(0,Math.min(p.end,g.end)-Math.max(p.start,g.start));
    const iou=overlap/(Math.max(p.end,g.end)-Math.min(p.start,g.start));
    if(p.pair===g.pair&&iou>=.2&&overlap>=5)candidates.push({i,j,iou});
  }));
  candidates.sort((a,b)=>b.iou-a.iou||a.i-b.i||a.j-b.j);const pi=new Set(),gi=new Set(),latencies=[];
  for(const c of candidates)if(!pi.has(c.i)&&!gi.has(c.j)) {
    pi.add(c.i);gi.add(c.j);latencies.push(predicted[c.i].detectedAt-reference[c.j].start);
  }
  return {contacts:predicted,reference,metrics:{...event,referenceContacts:reference.length,
    localizationAvailability:predictions.some(f=>f.positions)?available/(ids.length*seconds):null,
    medianLocalizationError:quantile(errors,.5),p95LocalizationError:quantile(errors,.95),
    falsePositivePairSeconds:fpSeconds,falseNegativePairSeconds:fnSeconds,positivePairSeconds:positiveSeconds,
    negativePairSeconds:negativeSeconds,falsePositiveTimeRate:negativeSeconds?fpSeconds/negativeSeconds:null,
    missedContactTimeRate:positiveSeconds?fnSeconds/positiveSeconds:null,
    medianDetectionLatencySeconds:quantile(latencies,.5)}};
}
