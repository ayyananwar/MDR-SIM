import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {protocol} from './protocol.mjs';
import {makeRecording} from './scenarios.mjs';
import {FeatureBuilder,featureNames,phaseFitResidual} from './features.mjs';
const all=Object.values(protocol.splits).flat();assert.equal(new Set(all).size,all.length);
for(const family of [...protocol.families,protocol.externalFamily]) {
  const frames=makeRecording(2001,family);assert.deepEqual(frames,makeRecording(2001,family));
  let max=0;
  for(let t=1;t<frames.length;t++)for(const p of frames[t].positions) {
    const a=frames[t-1].positions.find(a=>a.id===p.id);max=Math.max(max,Math.hypot(p.x-a.x,p.y-a.y));
    if((p.x<12)!==(a.x<12))assert.ok(p.y>=9&&p.y<=11&&a.y>=9&&a.y<=11,'wall crossings must pass the doorway');
  }
  assert.ok(max<=1.2,`${family} has excessive movement ${max}`);
}
const anchor={id:'g0',x:0,y:0},ble=[{wearableId:'a',anchor,rssiDbm:-60},{wearableId:'b',anchor,rssiDbm:-62}],positions=[{id:'a',x:2,y:2},{id:'b',x:3,y:2}];
const first=new FeatureBuilder(['a','b']),second=new FeatureBuilder(['a','b']);
const prefix=[];for(let t=0;t<5;t++)prefix.push(first.update(t,ble,positions));
for(let t=0;t<5;t++)assert.deepEqual(prefix[t],second.update(t,ble,positions));
second.update(5,ble,[{id:'a',x:20,y:20},{id:'b',x:1,y:1}]);assert.equal(prefix[0][0][0],1,'future updates must not mutate saved features');
const swapped=new FeatureBuilder(['a','b']).update(0,[{...ble[1],wearableId:'a'},{...ble[0],wearableId:'b'}],
  [{...positions[1],id:'a'},{...positions[0],id:'b'}]);assert.deepEqual(prefix[0],swapped,'pair features must be symmetric');
assert.equal(prefix[0][0].length,featureNames.length);
assert.equal(new FeatureBuilder(['a','b']).update(0,[],[])[0][2],0);
assert.ok(featureNames.every(n=>!['seed','timestamp','personId','roomId','label','truth','sourceStatus'].includes(n)));
assert.equal(/^import\s/m.test(readFileSync(new URL('./features.mjs',import.meta.url),'utf8')),false);
assert.ok(phaseFitResidual([0,.2,.4,.6])<1e-12);
console.log('v7 passed: group disjointness, deterministic motion, doorway/speed rules, causal/symmetric features and observable-only architecture.');
