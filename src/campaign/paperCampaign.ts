/** Paper protocol v3: one simulation per seed, temporal E3 labels, strict LOSO. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateCanonicalDataset } from '../datasets/generator.js';
import { REFERENCE_BASE_CONFIG } from './finalCampaign.js';
import { extractExposureRecords } from '../risk/featureExtraction.js';
import { createDefaultRiskModel } from '../risk/model.js';
import { getLabelsForRecords } from '../evaluation/recordLabels.js';
import { evaluateContactDetection } from '../evaluation/contactMetrics.js';
import { evaluateRiskPredictions } from '../evaluation/riskMetrics.js';
import { evaluateCalibration } from '../evaluation/calibrationMetrics.js';
import { summarizeReplicateMetric } from '../evaluation/statisticalSummary.js';
import { DEFAULT_HOSPITAL_ROOMS, generateCanonicalGateways } from '../simulation/scenarioGenerator.js';
import { ProximityOnlyBaseline, ProximityDurationBaseline, LegacyHeuristicBaseline, ProposedBayesianMethod, LogisticRegressionBaseline, PriorOnlyBaseline, type EvaluationMethod } from '../evaluation/baselines.js';

const seeds = [101,102,103,104,105,106,107,108,109,110,201,202,203,204,205,206,207,208,209,210,301,302,303,304,305,306,307,308,309,310];
const out = process.argv[2] ?? 'results/paper-v3';
if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`Output is not empty: ${out}. Choose a new output directory.`);
fs.mkdirSync(path.join(out, 'per_seed'), { recursive: true });
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(out,name), JSON.stringify(value,null,2)+'\n');
const config = structuredClone(REFERENCE_BASE_CONFIG);
write('manifest.json', {
  protocolVersion: '3.0.0', status: 'running', seeds, config,
  rooms: DEFAULT_HOSPITAL_ROOMS, gateways: generateCanonicalGateways(DEFAULT_HOSPITAL_ROOMS,8),
  movement: { maxSpeedMps:1.2,directionChangeProbability:.05,pauseProbability:.08,pauseSeconds:[3,15],roomTransitionProbability:.005,transition:'instant relocation to arbitrary selected room' },
  reference: 'Same room; distance <=2m at every 1s sample; last qualifying sample minus first >=30s',
  reconstructed: 'Rounded endpoint-span duration >=30s; count is pair-evidence events; maximum gap 5s',
  e3: 'Canonical pair AND strictly positive temporal overlap; two directed records per session',
  validation: 'LOSO logistic; fixed Bayesian tables; ranking over both-class folds; F1/Brier/ECE over nonempty folds',
  bayesian: 'Fixed DEFAULT_REFERENCE_LIKELIHOODS, not trained or Laplace-smoothed from campaign folds',
  logistic: {features:['durationSeconds','proximityEvidence','encounterCount','cumulativeDurationSeconds','sourceStatus'],epochs:200,learningRate:.05,L2:.1,standardized:false},
  environment: {node:process.version,platform:process.platform},
});
const seedData = seeds.map(seed => {
  console.log(`Generating paper seed ${seed}`);
  const dataset = generateCanonicalDataset({...config,seed},{silent:true});
  const registry = Object.fromEntries(dataset.people.map(p=>[p.wearableId,p.sourceStatus]));
  const records = extractExposureRecords(dataset.detectedContactSessions ?? [],{directed:true,sourceStatusRegistry:registry});
  const labels = getLabelsForRecords(records,dataset);
  const contacts = evaluateContactDetection(dataset.groundTruthContacts,dataset.detectedContactSessions ?? [],dataset.people);
  const data = {seed,records,labels,contacts,groundTruthContacts:dataset.groundTruthContacts,people:dataset.people};
  write(`per_seed/seed_${seed}.json`,data);
  return data;
});
const raw = ['Seed,Baseline,RecordIndex,SessionId,y_true,raw_score_or_prob'];
const methodResults: Record<string, Array<{seed:number,n:number,positive:number,metrics:ReturnType<typeof evaluateRiskPredictions>,calibration:ReturnType<typeof evaluateCalibration>|null}>> = {};
const folds = [];
for(const test of seedData) {
  const train = seedData.filter(d=>d.seed!==test.seed);
  const trainRecords = train.flatMap(d=>d.records), trainLabels = train.flatMap(d=>d.labels);
  folds.push({seed:test.seed,testRecords:test.records.length,testPositive:test.labels.filter(Boolean).length,testNegative:test.labels.filter(y=>!y).length,trainPositive:trainLabels.filter(Boolean).length,trainNegative:trainLabels.filter(y=>!y).length});
  const methods: Array<{model:EvaluationMethod,probability:boolean}> = [
    {model:new ProximityOnlyBaseline(),probability:false},
    {model:new ProximityDurationBaseline(),probability:false},
    {model:new LegacyHeuristicBaseline(),probability:false},
    {model:new ProposedBayesianMethod(createDefaultRiskModel(config.risk)),probability:true},
    {model:new LogisticRegressionBaseline(),probability:true},
    {model:new PriorOnlyBaseline(),probability:true},
  ];
  for(const {model,probability} of methods) {
    model.train?.(trainRecords,trainLabels);
    const predictions = model.predict(test.records).map(a=>a.exposureProbability);
    const metrics = evaluateRiskPredictions(predictions,test.labels);
    const calibration = probability && test.records.length ? evaluateCalibration(predictions,test.labels) : null;
    (methodResults[model.name] ??= []).push({seed:test.seed,n:predictions.length,positive:metrics.positiveExposureCount,metrics,calibration});
    predictions.forEach((p,i)=>raw.push(`${test.seed},${model.name},${i},${test.records[i].sessionId},${test.labels[i]},${p}`));
  }
}
const summary = Object.entries(methodResults).map(([name,all])=>{
  const valid=all.filter(r=>r.n>0),ranking=valid.filter(r=>r.metrics.auroc!==undefined),prob=valid.filter(r=>r.calibration!==null);
  return {name,
    auroc:summarizeReplicateMetric('AUROC',ranking.map(r=>r.metrics.auroc!)),
    ap:summarizeReplicateMetric('AP',ranking.map(r=>r.metrics.auprc!)),
    f1:summarizeReplicateMetric('F1',valid.map(r=>r.metrics.defaultThresholdMetrics!.f1Score)),
    brier:prob.length?summarizeReplicateMetric('Brier',prob.map(r=>r.calibration!.brierScore)):null,
    ece:prob.length?summarizeReplicateMetric('ECE',prob.map(r=>r.calibration!.expectedCalibrationError)):null,
  };
});
const keys = ['totalGroundTruthContacts','totalDetectedSessions','truePositives','falsePositives','falseNegatives','precision','recall','f1Score'] as const;
const e1 = Object.fromEntries(keys.map(k=>[k,summarizeReplicateMetric(k,seedData.map(d=>d.contacts[k]))]));
write('E1_reference.json',e1);
write('E3_baseline_comparison.json',{summary,folds,perSeed:methodResults,alwaysZeroMacroBrier:summarizeReplicateMetric('always_zero_brier',seedData.filter(d=>d.records.length).map(d=>d.labels.filter(Boolean).length/d.records.length))});
fs.writeFileSync(path.join(out,'E3_RAW_PREDICTIONS.csv'),raw.join('\n')+'\n');
const fmt=(v:typeof summary[number]['auroc']|null)=>v&&v.n?v.mean.toFixed(3):'N/A';
fs.writeFileSync(path.join(out,'RESULTS.md'),`# Corrected paper campaign, protocol v3\n\nNew execution; original manuscript results remain in results/confirmatory.\n\n| Model | AUROC | AP | F1 | Brier | ECE |\n|---|---:|---:|---:|---:|---:|\n${summary.map(s=>`| ${s.name} | ${fmt(s.auroc)} | ${fmt(s.ap)} | ${fmt(s.f1)} | ${fmt(s.brier)} | ${fmt(s.ece)} |`).join('\n')}\n\nRanking uses both-class folds; F1 and calibration use nonempty folds. Six directed positive records do not represent six independent sessions. These results do not establish clinical utility or general model superiority.\n`);
const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));manifest.status='complete';write('manifest.json',manifest);
const files = ['manifest.json','E1_reference.json','E3_baseline_comparison.json','E3_RAW_PREDICTIONS.csv','RESULTS.md',...seeds.map(s=>`per_seed/seed_${s}.json`)];
write('checksums.json', files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')})));
console.log(`Corrected campaign complete: ${out}`);
