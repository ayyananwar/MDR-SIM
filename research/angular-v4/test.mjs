import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {triangulate,localize,wrap} from './inference.mjs';
import {anchors,trajectory,observe} from './sensor.mjs';
import {sessions,contactMetrics} from './evaluation.mjs';
const point={x:7,y:9};
const exact=anchors.map(anchor=>({anchor,wearableId:'w',
  bearingRad:wrap(Math.atan2(point.y-anchor.y,point.x-anchor.x)-anchor.orientationRad),
  rssiDbm:-50-25*Math.log10(Math.hypot(point.x-anchor.x,point.y-anchor.y))}));
for(const estimate of [triangulate(exact),localize(exact,'rssi',.1),localize(exact,'hybrid',.1,true)])
  assert.ok(estimate&&Math.hypot(estimate.x-7,estimate.y-9)<1e-3,'exact geometry must be recovered');
assert.equal(triangulate([{anchor:{x:0,y:0,orientationRad:0},bearingRad:0},
  {anchor:{x:1,y:0,orientationRad:0},bearingRad:0}]),null,'parallel bearings must abstain');
assert.ok(Math.abs(wrap(2*Math.PI+.2)-.2)<1e-12);
assert.deepEqual(localize(exact,'rssi',.1),localize(exact.map(o=>({...o,bearingRad:2})),'rssi',.1),
  'RSSI baseline must not use angle values, including initialization');
const frame=t=>({t,positions:[{id:'a',x:0,y:0},{id:'b',x:1,y:0}]});
assert.equal(sessions(Array.from({length:30},(_,t)=>frame(t))).length,0);
const contacts=sessions(Array.from({length:31},(_,t)=>frame(t)));
assert.equal(contacts.length,1);
assert.equal(sessions(Array.from({length:61},(_,t)=>t===30?{t,positions:[]}:frame(t))).length,0,
  'a missing frame must break continuity, not hide uncertain geometry');
assert.equal(contactMetrics(contacts,contacts).f1,1);
assert.equal(contactMetrics([],contacts).fn,1);
const frames=trajectory(401);
assert.equal(sessions(frames).length,3,'fixture must have three controlled reference contacts');
assert.deepEqual(observe(frames,401,5),observe(frames,401,5),'deterministic replay');
const low=observe(frames,401,2),high=observe(frames,401,15);
assert.deepEqual(low.map(f=>f.observations.map(o=>[o.wearableId,o.anchor.id,o.rssiDbm])),
  high.map(f=>f.observations.map(o=>[o.wearableId,o.anchor.id,o.rssiDbm])),
  'angle sensitivity must preserve RSSI and reception');
for(const o of low[0].observations)
  assert.deepEqual(Object.keys(o).sort(),['anchor','bearingRad','rssiDbm','wearableId']);
const source=readFileSync(new URL('./inference.mjs',import.meta.url),'utf8');
assert.equal(/^import\s/m.test(source),false,'observable inference must remain dependency-free');
console.log('Angular prototype: geometry, modality isolation, continuity, deterministic matched observations passed.');
