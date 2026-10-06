/** New diagnostic v3; historical 811-FP claim remains unverified. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REFERENCE_BASE_CONFIG } from './finalCampaign.js';
import { generateCanonicalDataset } from '../datasets/generator.js';
import { processBLEObservations } from '../edge/edgePipeline.js';
import { evaluateContactDetection } from '../evaluation/contactMetrics.js';
const out=process.argv[2] ?? 'results/diagnostic-v3';
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw new Error(`Output not empty: ${out}`);
fs.mkdirSync(out,{recursive:true});
const perSeed: Array<{seed:number,radius:number,metrics:ReturnType<typeof evaluateContactDetection>}> = [];
for(const seed of [1,2,3]) {
  console.log(`Matched-radio diagnostic seed ${seed}`);
  const config={...structuredClone(REFERENCE_BASE_CONFIG),seed,populationSize:30,durationSeconds:1800};
  const dataset=generateCanonicalDataset(config,{silent:true});
  for(const radius of [2,3]) {
    const edge=structuredClone(config.edge!);edge.proximity.thresholdDistanceMeters=radius;
    const result=processBLEObservations(dataset.bleObservations ?? [],edge);
    perSeed.push({seed,radius,metrics:evaluateContactDetection(dataset.groundTruthContacts,result.sessions,dataset.people)});
  }
}
const totals=[2,3].map(radius=>{const r=perSeed.filter(s=>s.radius===radius);return {radius,tp:r.reduce((s,v)=>s+v.metrics.truePositives,0),fp:r.reduce((s,v)=>s+v.metrics.falsePositives,0),fn:r.reduce((s,v)=>s+v.metrics.falseNegatives,0)};});
fs.writeFileSync(path.join(out,'diagnostic.json'),JSON.stringify({protocolVersion:'3.0.0',seeds:[1,2,3],populationSize:30,durationSeconds:1800,baseConfig:REFERENCE_BASE_CONFIG,intervention:'Change edge proximity threshold after median filtering; identical raw radio observations in both conditions',historical811Claim:'unsupported by original source/artifacts; these are newly generated results',perSeed,totals},null,2));
fs.writeFileSync(path.join(out,'RESULTS.md'),`# New matched-radio radius diagnostic v3\n\n30 participants, 1800 seconds, seeds 1–3. Edge thresholds changed after median filtering. This new run does not authenticate the historical 811-FP claim.\n\n| Radius (m) | TP | FP | FN |\n|---|---:|---:|---:|\n${totals.map(t=>`| ${t.radius} | ${t.tp} | ${t.fp} | ${t.fn} |`).join('\n')}\n\nTwo points do not establish a scaling law.\n`);
fs.writeFileSync(path.join(out,'checksums.json'),JSON.stringify(['diagnostic.json','RESULTS.md'].map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')})),null,2));
console.log(totals);
