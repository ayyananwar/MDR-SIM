import { generateCanonicalDataset } from '../src/datasets/generator.js';
import { extractExposureRecords, extractFeatures } from '../src/risk/featureExtraction.js';
import { discretizeFeatures } from '../src/risk/discretization.js';
import { createDefaultRiskModel, assessExposureRecords } from '../src/risk/model.js';
import { getLabelsForRecords } from "../src/evaluation/recordLabels.js";
import { REFERENCE_BASE_CONFIG } from '../src/campaign/finalCampaign.js';

async function diagnose() {
  console.log('='.repeat(70));
  console.log('  MDR-SIM Feature & Bayesian Evidence Diagnosis (Seed 67867967)');
  console.log('='.repeat(70));

  console.log('\nGenerating canonical reference dataset for seed 67867967...');
  const t0 = Date.now();
  const dataset = generateCanonicalDataset({ ...REFERENCE_BASE_CONFIG, seed: 67867967 }, { silent: true });
  console.log(`Dataset generated in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

  const detectedSessions = dataset.detectedContactSessions ?? [];
  console.log(`Detected contact sessions: ${detectedSessions.length}`);

  const sourceStatusRegistry: Record<string, import('../src/simulation/scenarioTypes.js').SourceStatus> = {};
  for (const p of dataset.people) {
    sourceStatusRegistry[p.wearableId] = p.sourceStatus;
  }

  const records = extractExposureRecords(detectedSessions, {
    sourceStatusRegistry,
    directed: true,
  });
  console.log(`Extracted exposure records (directed): ${records.length}`);

  const model = dataset.fittedRiskModel ?? createDefaultRiskModel(REFERENCE_BASE_CONFIG.risk);
  const assessments = assessExposureRecords(records, model);
  const labels = getLabelsForRecords(records, dataset);

  console.log('\nDetailed Breakdown per Evaluated Record:');
  console.log('-'.repeat(100));
  console.log(
    'Rec | Pair (Target->Source) | Dur(s) | Prox | Enc | CumDur(s) | SourceStat | TrueLabel | P(E|X) | Discretized Bins'
  );
  console.log('-'.repeat(100));

  records.forEach((r, idx) => {
    const feats = extractFeatures(r);
    const disc = discretizeFeatures(feats, model.discretization);
    const isExposed = labels[idx] === 1;
    const prob = assessments[idx].exposureProbability;

    console.log(
      `${String(idx).padStart(3)} | ${r.targetWearableId}->${r.sourceWearableId} | ${r.durationSeconds
        .toFixed(1)
        .padStart(6)} | ${feats.proximityEvidence.toFixed(2).padStart(4)} | ${String(feats.encounterCount).padStart(3)} | ${feats.cumulativeDurationSeconds
        .toFixed(1)
        .padStart(9)} | ${feats.sourceStatus.padEnd(10)} | ${isExposed ? '  1 (POS) ' : '  0 (NEG) '} | ${prob.toFixed(6)} | ${JSON.stringify(disc)}`
    );
  });

  console.log('-'.repeat(100));
  console.log('\nLikelihood Evidence Contributions for Record 0:');
  const sampleAssessment = assessments[0];
  if (sampleAssessment?.contributions) {
    for (const c of sampleAssessment.contributions) {
      console.log(`  - Feature: ${c.feature.padEnd(20)} Bin: ${c.binLabel.padEnd(12)} LR: ${c.likelihoodRatio.toFixed(4)} ln(LR): ${c.logLikelihoodRatio.toFixed(4)}`);
    }
  }
  console.log(`\nPrior log-odds: ${Math.log(0.1 / 0.9).toFixed(4)} (Prior P = 0.10)`);
  console.log('='.repeat(70));
}

diagnose().catch(console.error);
