import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { getLabelsForRecords } from '../src/evaluation/recordLabels.js';
import { evaluateRiskAssessments } from '../src/evaluation/riskMetrics.js';
import { LogisticRegressionBaseline } from '../src/evaluation/baselines.js';
import type { ExposureRecord, RiskAssessment } from '../src/risk/riskTypes.js';
import type { Person } from '../src/simulation/scenarioTypes.js';
import type { GroundTruthContact } from '../src/simulation/groundTruth.js';

const people: Person[] = ['1','2'].map(id=>({personId:`P${id}`,wearableId:`W${id}`,role:'patient',roomId:'R',x:0,y:0,sourceStatus:'non-source',active:true}));
const groundTruthContacts: GroundTruthContact[] = [{personA:'P1',personB:'P2',startTime:100,endTime:140,durationSeconds:40,roomId:'R',trueDistanceSamples:[1],sourceStatusA:'non-source',sourceStatusB:'non-source'}];
const record=(start:number,end:number):ExposureRecord=>({targetWearableId:'W1',sourceWearableId:'W2',sessionId:`S${start}`,sessionStartTime:start,sessionEndTime:end,durationSeconds:end-start,observationCount:10,supportingGatewayCount:1,proximityEvidence:1,previousSessionCount:0,cumulativePriorDurationSeconds:0});
const records=[record(110,150),record(10,50),record(140,180)];
assert.deepEqual(getLabelsForRecords(records,{people,groundTruthContacts}),[1,0,0],'pair-only membership or endpoint touch must not qualify');
const reverse={...records[0],targetWearableId:'W2',sourceWearableId:'W1'};
assert.deepEqual(getLabelsForRecords([reverse],{people,groundTruthContacts}),[1],'direction must not change geometric target');
const assessments: RiskAssessment[]=records.map((r,i)=>({targetWearableId:r.targetWearableId,sourceWearableId:r.sourceWearableId,sessionId:r.sessionId,modelVersion:'test',exposureProbability:i===0?.9:.1,priorProbability:.1,evidence:{} as RiskAssessment['evidence'],inferenceTimestamp:r.sessionEndTime}));
const metrics=evaluateRiskAssessments(assessments,groundTruthContacts,people,records);
assert.equal(metrics.positiveExposureCount,1);assert.equal(metrics.auroc,1);
assert.throws(()=>evaluateRiskAssessments([...assessments].reverse(),groundTruthContacts,people,records),/ordered identities/);

// Check that cumulative history reaches the trained model, rather than merely testing the accessor.
const lr=new LogisticRegressionBaseline();
lr.train([record(0,30),{...record(0,30),cumulativePriorDurationSeconds:200}], [0,1]);
const probabilities=lr.predict([record(0,30),{...record(0,30),cumulativePriorDurationSeconds:200}]).map(r=>r.exposureProbability);
assert.notEqual(probabilities[0],probabilities[1],'otherwise identical records must respond to cumulative history');

// Inspect actual imports with the TypeScript parser: evaluation may access truth, inference may not.
for(const dir of ['src/edge','src/risk']) {
 for(const entry of fs.readdirSync(dir).filter(f=>f.endsWith('.ts'))) {
  const file=path.join(dir,entry),source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const visit=(node:ts.Node)=>{
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)) {
    const spec=node.moduleSpecifier.text;
    assert.ok(!/simulation\/(groundTruth|movementModel|scenarioGenerator)|evaluation\/|datasets\/generator/.test(spec),`${file} imports hidden state/evaluation: ${spec}`);
   }
   ts.forEachChild(node,visit);
  };visit(source);
 }
}
console.log('Paper regression tests passed: temporal labels, ordered identity alignment, cumulative feature influence, inference import boundaries.');
