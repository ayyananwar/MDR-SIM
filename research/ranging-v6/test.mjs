import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {protocol} from './protocol.mjs';
import {C,phaseSamples,rawTiming,isScheduled} from './sensor.mjs';
import {pbrDistance,rttDistance,uwbDistance,deriveRange,localizeRanges} from './inference.mjs';
const f=protocol.frequencyModel,freq=Array.from({length:f.tones},(_,i)=>f.startHz+i*f.stepHz);
const noiseless={...protocol.conditions[0],phaseSigmaRad:0};
const zero={normal:()=>0};
for(const d of [.1,2,20,60])for(const offset of [0,2,-2])
  assert.ok(Math.abs(pbrDistance(phaseSamples(d,offset,noiseless,false,zero),freq)-d)<1e-7,'wrapped phase slope must recover range independently of offset');
assert.ok(Math.abs(rttDistance({elapsedNs:1e6+2*2/C*1e9,reportedTurnaroundNs:1e6})-2)<1e-9);
for(const d of [1,10,30]) {
  const raw=rawTiming(d,false,noiseless,{rtt:0,uwb:0},zero);
  assert.ok(Math.abs(uwbDistance(raw.uwb)-d)<.001,'double-sided timing must suppress clock skew');
}
assert.equal(rttDistance({elapsedNs:9,reportedTurnaroundNs:10}),null,'negative ranges must not be clipped to a near contact');
const packet={phases:phaseSamples(2,0,noiseless,false,zero),rtt:{elapsedNs:1e6+2*20/C*1e9,reportedTurnaroundNs:1e6}};
assert.equal(deriveRange(packet,'ble-pbr-rtt',protocol),null,'gross phase/timing disagreement must abstain');
const anchors=[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}];
const p=localizeRanges(anchors.map(anchor=>({anchor,distance:Math.hypot(anchor.x-7,anchor.y-8)})),.2);
assert.ok(p&&Math.hypot(p.x-7,p.y-8)<1e-3);
assert.equal(localizeRanges(anchors.slice(0,2).map(anchor=>({anchor,distance:10})),.2),null);
for(const clients of protocol.clientsPerZone) {
  const served=Array.from({length:clients},()=>0);
  for(let t=0;t<clients;t++)for(let i=0;i<clients;i++)if(isScheduled(t,i,clients))served[i]++;
  assert.ok(served.every(n=>n===4),'round robin must allocate service fairly');
  assert.equal(served.reduce((s,x)=>s+x,0),clients*4);
}
assert.equal(/^import\s/m.test(readFileSync(new URL('./inference.mjs',import.meta.url),'utf8')),false);
assert.equal(new Set([...protocol.developmentSeeds,...protocol.evaluationSeeds]).size,35);
console.log('v6 passed: phase wrapping/offset, RTT units/turnaround, DS-TWR clocks, cross-check abstention, localization and fair scheduling.');
