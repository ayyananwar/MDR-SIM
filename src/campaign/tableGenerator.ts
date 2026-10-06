/**
 * Phase 7 Paper-Ready Table Generator.
 *
 * Generates CSV, JSON, and Markdown tables from campaign experiment results.
 * All data originates from actual executed experiments — no fabrication.
 */

import fs from 'fs';
import path from 'path';
import type {
  CampaignResults,
  ContactTableRow,
  RiskBaselineTableRow,
  AblationTableRow,
  RobustnessTableRow,
  ScalabilityTableRow,
  PrivacyTableRow,
} from './campaignTypes.js';
import type { MetricSummary } from '../evaluation/evaluationTypes.js';

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmt3 = (n: number) => n.toFixed(3);
const fmt4 = (n: number) => n.toFixed(4);
const fmt1 = (n: number) => n.toFixed(1);

function ciStr(s: MetricSummary): string {
  if (!s.confidenceInterval95) return 'N/A';
  return `[${fmt3(s.confidenceInterval95.lower)}, ${fmt3(s.confidenceInterval95.upper)}]`;
}

function nullableMetricStr(s: MetricSummary | null | undefined): string {
  if (s === null || s === undefined) return 'N/A';
  return fmt3(s.mean);
}

// ─── Table 1: Contact Detection ───────────────────────────────────────────────

function buildContactTable(results: CampaignResults): ContactTableRow[] {
  const rows: ContactTableRow[] = [];

  const addRow = (configId: string, condition: string, r: CampaignResults['E1_reference']) => {
    const c = r.contact;
    rows.push({
      configId,
      condition,
      n: r.replicateCount,
      precision_mean: c.precision.mean,
      precision_ci95_lower: c.precision.confidenceInterval95?.lower ?? c.precision.mean,
      precision_ci95_upper: c.precision.confidenceInterval95?.upper ?? c.precision.mean,
      recall_mean: c.recall.mean,
      recall_ci95_lower: c.recall.confidenceInterval95?.lower ?? c.recall.mean,
      recall_ci95_upper: c.recall.confidenceInterval95?.upper ?? c.recall.mean,
      f1_mean: c.f1Score.mean,
      f1_ci95_lower: c.f1Score.confidenceInterval95?.lower ?? c.f1Score.mean,
      f1_ci95_upper: c.f1Score.confidenceInterval95?.upper ?? c.f1Score.mean,
      duration_mae_s_mean: c.durationMaeSeconds.mean,
      duration_rmse_s_mean: c.durationRmseSeconds.mean,
      fragmentation_rate_mean: c.fragmentationRate.mean,
    });
  };

  addRow('reference-v1.0.0', 'Reference (n=50, 8GW)', results.E1_reference);
  addRow('dense-contact-v1.0.0', 'Dense Contact (n=80, 8GW)', results.E2_dense);

  return rows;
}

// ─── Table 2: Risk Baseline Comparison ────────────────────────────────────────

function buildBaselineTable(results: CampaignResults): RiskBaselineTableRow[] {
  return results.E3_baseline.methods.map((m) => ({
    method: m.name,
    n: results.E3_baseline.seedList.length,
    auroc_mean: m.auroc.mean,
    auroc_ci95_lower: m.auroc.confidenceInterval95?.lower ?? m.auroc.mean,
    auroc_ci95_upper: m.auroc.confidenceInterval95?.upper ?? m.auroc.mean,
    auprc_mean: m.auprc.mean,
    brier_mean: m.brierScore.mean,
    ece_mean: m.ece.mean,
    f1_mean: m.f1AtDefault.mean,
    precision_mean: m.precisionAtDefault.mean,
    recall_mean: m.recallAtDefault.mean,
  }));
}

// ─── Table 3: Feature Ablation ────────────────────────────────────────────────

function buildAblationTable(results: CampaignResults): AblationTableRow[] {
  return results.E4_ablation.variants.map((v) => ({
    variant: v.variant,
    n: results.E4_ablation.seedList.length,
    auroc_mean: v.auroc.mean,
    delta_auroc: v.deltaAuroc !== undefined ? (v.deltaAuroc >= 0 ? `+${fmt3(v.deltaAuroc)}` : fmt3(v.deltaAuroc)) : '—',
    auprc_mean: v.auprc.mean,
    delta_auprc: v.deltaAuprc !== undefined ? (v.deltaAuprc >= 0 ? `+${fmt3(v.deltaAuprc)}` : fmt3(v.deltaAuprc)) : '—',
    f1_mean: v.f1AtDefault.mean,
    delta_f1: v.deltaF1 !== undefined ? (v.deltaF1 >= 0 ? `+${fmt3(v.deltaF1)}` : fmt3(v.deltaF1)) : '—',
    brier_mean: v.brierScore.mean,
    ece_mean: v.ece.mean,
  }));
}

// ─── Tables 4–7: Robustness sweeps ────────────────────────────────────────────

function buildRobustnessTable(
  sweepResults: CampaignResults['E5_rssiSweep'],
  paramLabel: string
): RobustnessTableRow[] {
  return sweepResults.map((r) => ({
    sweep_parameter: paramLabel,
    sweep_value: String(r.sweepValue ?? 'N/A'),
    n: r.replicateCount,
    f1_mean: r.contact.f1Score.mean,
    f1_ci95_lower: r.contact.f1Score.confidenceInterval95?.lower ?? r.contact.f1Score.mean,
    f1_ci95_upper: r.contact.f1Score.confidenceInterval95?.upper ?? r.contact.f1Score.mean,
    auroc_mean: r.risk.auroc.mean,
    auprc_mean: r.risk.auprc.mean,
    brier_mean: r.risk.brierScore.mean,
  }));
}

// ─── Table 8: Scalability ─────────────────────────────────────────────────────

function buildScalabilityTable(results: CampaignResults): ScalabilityTableRow[] {
  return results.E15_scalability.map((s) => ({
    population_size: s.populationSize,
    gateway_count: s.gatewayCount,
    n: s.rawObservations.n,
    raw_observations_mean: s.rawObservations.mean,
    detected_sessions_mean: s.detectedSessions.mean,
    f1_mean: s.f1Score.mean,
    wall_clock_ms_mean: s.wallClockMs.mean,
    throughput_obs_per_sec_mean: s.throughputObsPerSec.mean,
    note: 'machine-dependent telemetry — host-specific, not for scientific comparison',
  }));
}

// ─── Table 9: Privacy Rotation Sweep ──────────────────────────────────────────

function buildPrivacyRotationTable(results: CampaignResults): PrivacyTableRow[] {
  return results.E9_privacyRotationSweep.map((p) => ({
    experiment: p.experimentId,
    sweep_parameter: 'rotationIntervalSeconds',
    sweep_value: String(p.sweepValue),
    n: p.seedList.length,
    linkage_f1_mean: nullableMetricStr(p.linkageF1),
    linkage_success_rate_mean: nullableMetricStr(p.linkageSuccessRate),
    unlinkability_proxy_mean: nullableMetricStr(p.unlinkabilityProxy),
    identity_top1_mean: p.identityTop1Accuracy.mean,
    fragmentation_ratio_mean: p.sessionFragmentationRatio.mean,
    duration_attenuation_mean: p.durationAttenuationRatio.mean,
  }));
}

// ─── Table 10: Privacy–Utility Trade-off ──────────────────────────────────────

function buildPrivacyUtilityTable(results: CampaignResults): PrivacyTableRow[] {
  // Include rotation sweep to show how fragmentation and duration attenuation vary
  return results.E9_privacyRotationSweep.map((p) => ({
    experiment: p.experimentId,
    sweep_parameter: 'rotationIntervalSeconds',
    sweep_value: String(p.sweepValue),
    n: p.seedList.length,
    linkage_f1_mean: nullableMetricStr(p.linkageF1),
    linkage_success_rate_mean: nullableMetricStr(p.linkageSuccessRate),
    unlinkability_proxy_mean: nullableMetricStr(p.unlinkabilityProxy),
    identity_top1_mean: p.identityTop1Accuracy.mean,
    fragmentation_ratio_mean: p.sessionFragmentationRatio.mean,
    duration_attenuation_mean: p.durationAttenuationRatio.mean,
  }));
}

// ─── CSV serializer ────────────────────────────────────────────────────────────

function toCsv(rows: object[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const v = (row as Record<string, unknown>)[h];
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') ? `"${s}"` : s;
    }).join(','));
  }
  return lines.join('\n');
}

// ─── Markdown table serializer ────────────────────────────────────────────────

function toMarkdownTable(headers: string[], rows: string[][]): string {
  const header = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

// ─── Write table in all formats ───────────────────────────────────────────────

function writeTable<T extends object>(
  dir: string,
  basename: string,
  rows: T[],
  mdHeaders: string[],
  mdRows: string[][]
): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${basename}.json`), JSON.stringify(rows, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dir, `${basename}.csv`), toCsv(rows), 'utf-8');
  fs.writeFileSync(path.join(dir, `${basename}.md`), toMarkdownTable(mdHeaders, mdRows), 'utf-8');
}

// ─── Main table generation ────────────────────────────────────────────────────

export function generateAllTables(results: CampaignResults, tablesDir: string): void {
  fs.mkdirSync(tablesDir, { recursive: true });

  // Table 1: Contact Detection
  const contactRows = buildContactTable(results);
  writeTable(tablesDir, '01_contact_detection', contactRows,
    ['Config', 'Condition', 'N', 'Precision', '95% CI', 'Recall', '95% CI', 'F1', '95% CI', 'Duration MAE (s)', 'Duration RMSE (s)', 'Frag Rate'],
    contactRows.map((r) => [
      r.configId, r.condition, String(r.n),
      fmt3(r.precision_mean), `[${fmt3(r.precision_ci95_lower)}, ${fmt3(r.precision_ci95_upper)}]`,
      fmt3(r.recall_mean), `[${fmt3(r.recall_ci95_lower)}, ${fmt3(r.recall_ci95_upper)}]`,
      fmt3(r.f1_mean), `[${fmt3(r.f1_ci95_lower)}, ${fmt3(r.f1_ci95_upper)}]`,
      fmt1(r.duration_mae_s_mean), fmt1(r.duration_rmse_s_mean), fmt3(r.fragmentation_rate_mean),
    ])
  );

  // Table 2: Baseline Comparison
  const baselineRows = buildBaselineTable(results);
  writeTable(tablesDir, '02_risk_baseline', baselineRows,
    ['Method', 'N', 'AUROC', '95% CI', 'AUPRC', 'Brier', 'ECE', 'F1@0.5', 'Prec@0.5', 'Rec@0.5'],
    baselineRows.map((r) => [
      r.method, String(r.n), fmt3(r.auroc_mean),
      `[${fmt3(r.auroc_ci95_lower)}, ${fmt3(r.auroc_ci95_upper)}]`,
      fmt3(r.auprc_mean), fmt4(r.brier_mean), fmt4(r.ece_mean),
      fmt3(r.f1_mean), fmt3(r.precision_mean), fmt3(r.recall_mean),
    ])
  );

  // Table 3: Ablation
  const ablationRows = buildAblationTable(results);
  writeTable(tablesDir, '03_ablation', ablationRows,
    ['Variant', 'N', 'AUROC', 'ΔAUROC', 'AUPRC', 'ΔAUPRC', 'F1@0.5', 'ΔF1', 'Brier', 'ECE'],
    ablationRows.map((r) => [
      r.variant, String(r.n), fmt3(r.auroc_mean), r.delta_auroc,
      fmt3(r.auprc_mean), r.delta_auprc, fmt3(r.f1_mean), r.delta_f1,
      fmt4(r.brier_mean), fmt4(r.ece_mean),
    ])
  );

  // Table 4: RSSI Robustness
  const rssiRows = buildRobustnessTable(results.E5_rssiSweep, 'noiseSigmaDb');
  writeTable(tablesDir, '04_rssi_robustness', rssiRows,
    ['Noise σ (dB)', 'N', 'F1', '95% CI F1', 'AUROC', 'AUPRC', 'Brier'],
    rssiRows.map((r) => [
      r.sweep_value, String(r.n), fmt3(r.f1_mean),
      `[${fmt3(r.f1_ci95_lower)}, ${fmt3(r.f1_ci95_upper)}]`,
      fmt3(r.auroc_mean), fmt3(r.auprc_mean), fmt4(r.brier_mean),
    ])
  );

  // Table 5: Packet Loss Robustness
  const plossRows = buildRobustnessTable(results.E6_packetLossSweep, 'packetLossProbability');
  writeTable(tablesDir, '05_packet_loss_robustness', plossRows,
    ['Packet Loss', 'N', 'F1', '95% CI F1', 'AUROC', 'AUPRC', 'Brier'],
    plossRows.map((r) => [
      r.sweep_value, String(r.n), fmt3(r.f1_mean),
      `[${fmt3(r.f1_ci95_lower)}, ${fmt3(r.f1_ci95_upper)}]`,
      fmt3(r.auroc_mean), fmt3(r.auprc_mean), fmt4(r.brier_mean),
    ])
  );

  // Table 6: Advertising Interval Robustness
  const advRows = buildRobustnessTable(results.E7_advIntervalSweep, 'advertisingIntervalMs');
  writeTable(tablesDir, '06_adv_interval_robustness', advRows,
    ['Adv Interval (ms)', 'N', 'F1', '95% CI F1', 'AUROC', 'AUPRC', 'Brier'],
    advRows.map((r) => [
      r.sweep_value, String(r.n), fmt3(r.f1_mean),
      `[${fmt3(r.f1_ci95_lower)}, ${fmt3(r.f1_ci95_upper)}]`,
      fmt3(r.auroc_mean), fmt3(r.auprc_mean), fmt4(r.brier_mean),
    ])
  );

  // Table 7: Gateway Density Robustness
  const gwRows = buildRobustnessTable(results.E8_gatewayDensitySweep, 'gatewayCount');
  writeTable(tablesDir, '07_gateway_density_robustness', gwRows,
    ['Gateway Count', 'N', 'F1', '95% CI F1', 'AUROC', 'AUPRC', 'Brier'],
    gwRows.map((r) => [
      r.sweep_value, String(r.n), fmt3(r.f1_mean),
      `[${fmt3(r.f1_ci95_lower)}, ${fmt3(r.f1_ci95_upper)}]`,
      fmt3(r.auroc_mean), fmt3(r.auprc_mean), fmt4(r.brier_mean),
    ])
  );

  // Table 8: Scalability
  const scalRows = buildScalabilityTable(results);
  writeTable(tablesDir, '08_scalability', scalRows,
    ['Population', 'Gateways', 'N', 'Raw Obs (mean)', 'Sessions (mean)', 'F1', 'Wall ms', 'Throughput obs/s', 'Note'],
    scalRows.map((r) => [
      String(r.population_size), String(r.gateway_count), String(r.n),
      fmt1(r.raw_observations_mean), fmt1(r.detected_sessions_mean),
      fmt3(r.f1_mean), fmt1(r.wall_clock_ms_mean), fmt1(r.throughput_obs_per_sec_mean), r.note,
    ])
  );

  // Table 9: Privacy Rotation Sweep
  const privRotRows = buildPrivacyRotationTable(results);
  writeTable(tablesDir, '09_privacy_rotation', privRotRows,
    ['Experiment', 'Rotation (s)', 'N', 'Linkage F1', 'Linkage Rate', 'Unlinkability', 'ID Top-1', 'Frag Ratio', 'Dur Attn'],
    privRotRows.map((r) => [
      r.experiment, r.sweep_value, String(r.n),
      r.linkage_f1_mean, r.linkage_success_rate_mean, r.unlinkability_proxy_mean,
      fmt3(r.identity_top1_mean), fmt3(r.fragmentation_ratio_mean), fmt3(r.duration_attenuation_mean),
    ])
  );

  // Table 10: Privacy–Utility Trade-off
  const privUtilRows = buildPrivacyUtilityTable(results);
  writeTable(tablesDir, '10_privacy_utility', privUtilRows,
    ['Experiment', 'Rotation (s)', 'N', 'Linkage F1', 'Linkage Rate', 'Unlinkability', 'ID Top-1', 'Frag Ratio', 'Dur Attn'],
    privUtilRows.map((r) => [
      r.experiment, r.sweep_value, String(r.n),
      r.linkage_f1_mean, r.linkage_success_rate_mean, r.unlinkability_proxy_mean,
      fmt3(r.identity_top1_mean), fmt3(r.fragmentation_ratio_mean), fmt3(r.duration_attenuation_mean),
    ])
  );
}
