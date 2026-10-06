import fs from 'fs';
import path from 'path';
import type { AggregatedBaselineResult } from './campaignTypes.js';
import type { ConsolidatedExperimentResult } from '../evaluation/evaluationTypes.js';

const CONFIRMATORY_OUTPUT_ROOT = 'results/confirmatory';

function fmt(n: number | undefined, d = 3): string {
  if (n === undefined || !Number.isFinite(n)) return 'undefined';
  return n.toFixed(d);
}

function summarizeMetric(summary: any): string {
  if (!summary) return 'undefined';
  if (summary.mean === undefined || summary.n === 0) return 'undefined';
  
  const mean = fmt(summary.mean);
  const ci = summary.confidenceInterval95
    ? `[${fmt(summary.confidenceInterval95.lower)}, ${fmt(summary.confidenceInterval95.upper)}]`
    : '';
  
  return `${mean} ${ci}`;
}

function processPhase8() {
  console.log('Generating Phase-8 Confirmatory Report...');

  const e1Path = path.join(CONFIRMATORY_OUTPUT_ROOT, 'E1_reference.json');
  const e3Path = path.join(CONFIRMATORY_OUTPUT_ROOT, 'E3_baseline_comparison.json');

  if (!fs.existsSync(e1Path) || !fs.existsSync(e3Path)) {
    console.error('Missing confirmatory JSON artifacts.');
    process.exit(1);
  }

  const e1: ConsolidatedExperimentResult = JSON.parse(fs.readFileSync(e1Path, 'utf8'));
  const e3: AggregatedBaselineResult = JSON.parse(fs.readFileSync(e3Path, 'utf8'));

  let report = `# Phase 8 Confirmatory Campaign Results (N=30 Seeds)\n\n`;

  report += `## 1. E3 Baseline Comparison\n\n`;
  report += `| Model | AUROC | AUPRC | F1 | Brier | ECE | Valid n | Total n | Undefined n |\n`;
  report += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  e3.methods.forEach(m => {
    const totalN = e3.seedList.length;
    const validN = m.auroc.n;
    const undefinedN = totalN - validN;
    report += `| ${m.name} | ${summarizeMetric(m.auroc)} | ${summarizeMetric(m.auprc)} | ${summarizeMetric(m.f1AtDefault)} | ${summarizeMetric(m.brierScore)} | ${summarizeMetric(m.ece)} | ${validN} | ${totalN} | ${undefinedN} |\n`;
  });

  report += `\n### Raw Seed Values (Bayesian Model)\n\n`;
  const bayesModel = e3.methods.find(m => m.name === 'Proposed Bayesian');
  if (bayesModel) {
    const aurocRaw = bayesModel.auroc.rawValues || [];
    report += `AUROC per-seed values: [${aurocRaw.map(v => fmt(v)).join(', ')}]\n\n`;
    
    const calculateStats = (arr: number[]) => {
      if (arr.length === 0) return { median: 'undefined', iqr: 'undefined', min: 'undefined', max: 'undefined' };
      const sorted = [...arr].sort((a,b) => a-b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const median = sorted[Math.floor(sorted.length/2)];
      const q1 = sorted[Math.floor(sorted.length/4)];
      const q3 = sorted[Math.floor(sorted.length * 3/4)];
      return { median: fmt(median), iqr: fmt(q3 - q1), min: fmt(min), max: fmt(max) };
    };

    const aurocStats = calculateStats(aurocRaw);
    const auprcStats = calculateStats(bayesModel.auprc.rawValues || []);
    const f1Stats = calculateStats(bayesModel.f1AtDefault.rawValues || []);

    report += `| Metric | Median | IQR | Min | Max |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- |\n`;
    report += `| AUROC | ${aurocStats.median} | ${aurocStats.iqr} | ${aurocStats.min} | ${aurocStats.max} |\n`;
    report += `| AUPRC | ${auprcStats.median} | ${auprcStats.iqr} | ${auprcStats.min} | ${auprcStats.max} |\n`;
    report += `| F1 | ${f1Stats.median} | ${f1Stats.iqr} | ${f1Stats.min} | ${f1Stats.max} |\n`;
  }

  report += `\n## 2. Paired Differences vs. Baseline\n\n`;
  report += `*Note: Positive $\\Delta$ indicates Bayesian model superiority for AUROC, AUPRC, F1. Negative $\\Delta$ indicates Bayesian model superiority for Brier, ECE.*\n\n`;
  report += `| Baseline | $\\Delta$ AUROC | $\\Delta$ AUPRC | $\\Delta$ F1 | $\\Delta$ Brier | $\\Delta$ ECE |\n`;
  report += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  
  if (e3.pairedDifferences) {
    e3.pairedDifferences.forEach(diff => {
      report += `| ${diff.baselineName} | ${summarizeMetric(diff.aurocDiff)} | ${summarizeMetric(diff.auprcDiff)} | ${summarizeMetric(diff.f1Diff)} | ${summarizeMetric(diff.brierDiff)} | ${summarizeMetric(diff.eceDiff)} |\n`;
    });
  }

  report += `\n## 3. E1 Contact Reconstruction (Option C vs Geometric)\n\n`;
  
  const c = e1.contactSummary;
  if (c) {
    report += `| Metric | Mean ± SD | 95% CI |\n`;
    report += `| :--- | :--- | :--- |\n`;
    report += `| True Positives | ${summarizeMetric(c.truePositives)} |\n`;
    report += `| False Positives | ${summarizeMetric(c.falsePositives)} |\n`;
    report += `| False Negatives | ${summarizeMetric(c.falseNegatives)} |\n`;
    report += `| Total GT Contacts | ${summarizeMetric(c.totalGroundTruthContacts)} |\n`;
    report += `| Precision | ${summarizeMetric(c.precision)} |\n`;
    report += `| Recall | ${summarizeMetric(c.recall)} |\n`;
    report += `| F1 Score | ${summarizeMetric(c.f1Score)} |\n`;
    report += `| Duration MAE (s) | ${summarizeMetric(c.durationMaeSeconds)} |\n`;
    report += `| Duration RMSE (s) | ${summarizeMetric(c.durationRmseSeconds)} |\n`;
    report += `| Fragmentation Rate | ${summarizeMetric(c.fragmentationRate)} |\n`;
  } else {
    report += `Contact Summary data not found in E1_reference.json.\n`;
  }

  const reportPath = path.join(CONFIRMATORY_OUTPUT_ROOT, 'PHASE_8_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log('Report saved to', reportPath);
}

processPhase8();
