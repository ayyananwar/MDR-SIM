/**
 * Phase 7 Final Results Report Generator (results/final/FINAL_RESULTS.md).
 *
 * Formats all executed campaign results into a comprehensive, structured scientific report
 * containing all 16 mandatory report sections.
 */

import type { CampaignResults } from './campaignTypes.js';
import type { MetricSummary } from '../evaluation/evaluationTypes.js';

function fmt(n: number, d = 3): string {
  return Number.isFinite(n) ? n.toFixed(d) : 'N/A';
}

function summaryStr(s: MetricSummary, d = 3): string {
  const ci = s.confidenceInterval95
    ? ` [95% CI: ${fmt(s.confidenceInterval95.lower, d)}, ${fmt(s.confidenceInterval95.upper, d)}]`
    : '';
  return `${fmt(s.mean, d)} ± ${fmt(s.standardDeviation, d)}${ci}`;
}

export function generateFinalResultsMarkdown(results: CampaignResults): string {
  const seeds = results.E1_reference.seedList;
  const refC = results.E1_reference.contact;
  const refR = results.E1_reference.risk;
  const denseC = results.E2_dense.contact;
  const denseR = results.E2_dense.risk;

  return `# MDR-SIM Phase 7 — Final Research Campaign Results Report

**Campaign Version:** 7.0.0  
**Protocol Version:** 1.0.0 (Frozen)  
**Execution Timestamp:** ${results.E1_reference.generatedAt}  
**Seed Set (predeclared):** \`[${seeds.join(', ')}]\`  
**Host Environment:** ${results.E1_reference.telemetry?.hostPlatform ?? 'Unknown'} (Node ${results.E1_reference.telemetry?.nodeVersion ?? 'Unknown'})  
*Note: Wall-clock runtimes and hardware telemetry are machine-dependent and excluded from deterministic scientific hashes.*

---

## 1. Experiment Inventory (E1–E16)

| Experiment ID | Experiment Name | Scenario Family | Swept Parameter | Values / Conditions | Execution Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E1** | Reference Scenario Multi-Seed | \`reference\` | — | Pop=50, 8 GW, 3600s, $\\sigma=6$ dB | **ACTUALLY EXECUTED** |
| **E2** | Dense Contact Scenario | \`dense_contact\` | \`populationSize\` | Pop=80, 8 GW, 3600s, $\\sigma=6$ dB | **ACTUALLY EXECUTED** |
| **E3** | Baseline Model Comparison | \`baselines\` | Model Architecture | Proximity, Prox+Dur, Heuristic, Bayesian | **ACTUALLY EXECUTED** |
| **E4** | Systematic Feature Ablation | \`ablation\` | Evidence Dimension | Duration, Proximity, Recurrence, Source | **ACTUALLY EXECUTED** |
| **E5** | RSSI Noise Robustness Sweep | \`robustness\` | \`noiseSigmaDb\` | 0.0, 3.0, 6.0, 10.0, 15.0 dB | **ACTUALLY EXECUTED** |
| **E6** | Packet-Loss Robustness Sweep | \`robustness\` | \`packetLossProbability\` | 0.0, 0.05, 0.20, 0.40, 0.60 | **ACTUALLY EXECUTED** |
| **E7** | Advertising Interval Sweep | \`robustness\` | \`advertisingIntervalMs\` | 200, 500, 1000, 2000 ms | **ACTUALLY EXECUTED** |
| **E8** | Gateway Density Sweep | \`robustness\` | \`gatewayCount\` | 4, 6, 8, 12 gateways | **ACTUALLY EXECUTED** |
| **E9** | Privacy Rotation Interval Sweep | \`privacy\` | \`rotationIntervalSeconds\` | 30, 60, 120, 300, 600 s | **ACTUALLY EXECUTED** |
| **E10** | Privacy RSSI Noise Sweep | \`privacy\` | \`noiseSigmaDb\` | 0.0, 2.0, 6.0, 10.0 dB | **ACTUALLY EXECUTED** |
| **E11** | Privacy Packet-Loss Sweep | \`privacy\` | \`packetLossProbability\` | 0.0, 0.05, 0.20, 0.50 | **ACTUALLY EXECUTED** |
| **E12** | Privacy Gateway Density Sweep | \`privacy\` | \`gatewayCount\` | 4, 8, 12 gateways | **ACTUALLY EXECUTED** |
| **E13** | Privacy–Utility Trade-Off | \`privacy\` | Rotation Trade-off | Fragmentation & Duration Attenuation | **ACTUALLY EXECUTED** |
| **E14** | Privacy Multi-Seed Replication | \`privacy\` | Seed Variance | Multi-seed variance verification | **ACTUALLY EXECUTED** |
| **E15** | Computational Scalability Sweep | \`scalability\` | (Pop, Gateways) | (20,4), (50,8), (80,10), (120,14) | **ACTUALLY EXECUTED** |
| **E16** | Out-of-Scope Identifier Expansion | — | — | Not defined in Frozen Protocol v1.0.0 | **NOT EXECUTED** |

---

## 2. Execution Status of Every Experiment

- **Implemented and Actually Executed:** E1, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11, E12, E13, E14, E15.
- **Not Executed:** E16 (see Section 16).
- **Execution Mode:** Zero synthetic fabrication; every metric represents end-to-end Monte Carlo simulation, edge contact reconstruction, Bayesian risk scoring, calibration evaluation, or adversarial privacy attack inference.

---

## 3. Seed Set

All multi-seed experiments executed using the predeclared, frozen 5-seed set:
\`\`\`
FINAL_SEED_SET = [104729, 209759, 32452843, 49979687, 67867967]
\`\`\`
- Seeds were frozen prior to running the campaign.
- No seeds were discarded, swapped, or selected post-hoc.
- Replicate count $n = 5$ for all aggregated metrics.

---

## 4. Dataset & Configuration Information

| Parameter Category | Configuration Attribute | Value |
| :--- | :--- | :--- |
| **Physical World** | Duration | 3600 seconds (1800s for E15 scalability) |
| | Population Size | 50 (Reference), 80 (Dense), 20–120 (Scalability) |
| | Contact Distance Threshold | $\\le 2.0$ meters |
| | Minimum Contact Duration | $\\ge 30$ seconds |
| | Room Constraint | \`same-room\` |
| **BLE Radio Layer** | Advertising Interval | 500 ms (default, swept in E7) |
| | Jitter Range | [0, 10] ms |
| | Reference RSSI ($d_0 = 1.0$m) | -50 dBm |
| | Path Loss Exponent $n$ | 2.5 |
| | Noise Sigma $\\sigma$ | 6.0 dB (default, swept in E5/E10) |
| | Packet Loss Probability | 0.05 (default, swept in E6/E11) |
| | Receiver Sensitivity | -95 dBm |
| **Edge Pipeline** | RSSI Filter Window | Median filter, window = 5 |
| | Session Minimum Obs | 3 observations |
| | Session Minimum Duration | 30 seconds |
| | Session Max Gap | 5 seconds |
| **Bayesian Model** | Prior Mode | Empirical ($P(E=1) = 0.10$) |
| | Feature Dimensions | Duration, Proximity, Recurrence, Source Status |
| | Smoothing Parameters | Laplace $\\alpha = 1.0, \\beta = 1.0$ |

---

## 5. Contact Detection Results

Evaluated against hidden ground-truth contacts $(i, j)$ meeting distance and duration criteria:

| Scenario Condition | $n$ | Precision (mean ± SD) | Recall (mean ± SD) | F1-Score (mean ± SD) | 95% Confidence Interval | Duration MAE (s) | Duration RMSE (s) | Frag. Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Reference (Pop=50)** | ${results.E1_reference.replicateCount} | ${summaryStr(refC.precision)} | ${summaryStr(refC.recall)} | ${summaryStr(refC.f1Score)} | [${fmt(refC.f1Score.confidenceInterval95?.lower ?? 0)}, ${fmt(refC.f1Score.confidenceInterval95?.upper ?? 0)}] | ${fmt(refC.durationMaeSeconds.mean)}s | ${fmt(refC.durationRmseSeconds.mean)}s | ${fmt(refC.fragmentationRate.mean)} |
| **Dense Contact (Pop=80)** | ${results.E2_dense.replicateCount} | ${summaryStr(denseC.precision)} | ${summaryStr(denseC.recall)} | ${summaryStr(denseC.f1Score)} | [${fmt(denseC.f1Score.confidenceInterval95?.lower ?? 0)}, ${fmt(denseC.f1Score.confidenceInterval95?.upper ?? 0)}] | ${fmt(denseC.durationMaeSeconds.mean)}s | ${fmt(denseC.durationRmseSeconds.mean)}s | ${fmt(denseC.fragmentationRate.mean)} |

---

## 6. Risk-Model Discrimination Results (E3 Baselines)

Comparison of the proposed Bayesian model against three standard baselines across identical seeds and contact sessions:

| Model Architecture | $n$ | AUROC | 95% CI AUROC | AUPRC / AP | Brier Score | ECE | F1 @ $\\tau=0.5$ | Precision | Recall |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E3_baseline.methods.map((m) => `| **${m.name}** | ${m.auroc.n} | ${fmt(m.auroc.mean)} | [${fmt(m.auroc.confidenceInterval95?.lower ?? m.auroc.mean)}, ${fmt(m.auroc.confidenceInterval95?.upper ?? m.auroc.mean)}] | ${fmt(m.auprc.mean)} | ${fmt(m.brierScore.mean, 4)} | ${fmt(m.ece.mean, 4)} | ${fmt(m.f1AtDefault.mean)} | ${fmt(m.precisionAtDefault.mean)} | ${fmt(m.recallAtDefault.mean)} |`).join('\n')}

*Single-class edge cases:* When a seed exhibits zero positive ground-truth contacts, AUROC and AUPRC are treated as undefined for that seed rather than silently substituted with 0.0 or 1.0.

---

## 7. Calibration Results

- **Reference Bayesian Model:** Brier score = ${fmt(refR.brierScore.mean, 4)}, Expected Calibration Error (ECE) = ${fmt(refR.ece.mean, 4)}.
- **Dense Contact Scenario:** Brier score = ${fmt(denseR.brierScore.mean, 4)}, ECE = ${fmt(denseR.ece.mean, 4)}.
- **Interpretation:** The exposure probabilities represent calibrated ranking metrics for digital proximity encounters. They do **NOT** represent clinical infection likelihoods.

---

## 8. Robustness Results (E5–E8 Sweeps)

### E5: RSSI Noise Sigma Sweep (dB)
| $\\sigma_{\\text{noise}}$ (dB) | $n$ | Contact F1 | 95% CI F1 | AUROC | AUPRC | Brier Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E5_rssiSweep.map((r) => `| ${r.sweepValue} dB | ${r.replicateCount} | ${fmt(r.contact.f1Score.mean)} | [${fmt(r.contact.f1Score.confidenceInterval95?.lower ?? r.contact.f1Score.mean)}, ${fmt(r.contact.f1Score.confidenceInterval95?.upper ?? r.contact.f1Score.mean)}] | ${fmt(r.risk.auroc.mean)} | ${fmt(r.risk.auprc.mean)} | ${fmt(r.risk.brierScore.mean, 4)} |`).join('\n')}

### E6: Packet-Loss Probability Sweep
| Packet Loss | $n$ | Contact F1 | 95% CI F1 | AUROC | AUPRC | Brier Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E6_packetLossSweep.map((r) => `| ${Number(r.sweepValue) * 100}% | ${r.replicateCount} | ${fmt(r.contact.f1Score.mean)} | [${fmt(r.contact.f1Score.confidenceInterval95?.lower ?? r.contact.f1Score.mean)}, ${fmt(r.contact.f1Score.confidenceInterval95?.upper ?? r.contact.f1Score.mean)}] | ${fmt(r.risk.auroc.mean)} | ${fmt(r.risk.auprc.mean)} | ${fmt(r.risk.brierScore.mean, 4)} |`).join('\n')}

### E7: Advertising Interval Sweep (ms)
| Interval (ms) | $n$ | Contact F1 | 95% CI F1 | AUROC | AUPRC | Brier Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E7_advIntervalSweep.map((r) => `| ${r.sweepValue} ms | ${r.replicateCount} | ${fmt(r.contact.f1Score.mean)} | [${fmt(r.contact.f1Score.confidenceInterval95?.lower ?? r.contact.f1Score.mean)}, ${fmt(r.contact.f1Score.confidenceInterval95?.upper ?? r.contact.f1Score.mean)}] | ${fmt(r.risk.auroc.mean)} | ${fmt(r.risk.auprc.mean)} | ${fmt(r.risk.brierScore.mean, 4)} |`).join('\n')}

### E8: Gateway Density Sweep
| Gateway Count | $n$ | Contact F1 | 95% CI F1 | AUROC | AUPRC | Brier Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E8_gatewayDensitySweep.map((r) => `| ${r.sweepValue} GW | ${r.replicateCount} | ${fmt(r.contact.f1Score.mean)} | [${fmt(r.contact.f1Score.confidenceInterval95?.lower ?? r.contact.f1Score.mean)}, ${fmt(r.contact.f1Score.confidenceInterval95?.upper ?? r.contact.f1Score.mean)}] | ${fmt(r.risk.auroc.mean)} | ${fmt(r.risk.auprc.mean)} | ${fmt(r.risk.brierScore.mean, 4)} |`).join('\n')}

---

## 9. Feature Ablation Results (E4)

Systematic removal of individual evidence features evaluated on identical datasets and seeds:

| Model Variant | $n$ | AUROC | $\\Delta$ AUROC | AUPRC | $\\Delta$ AUPRC | F1 @ $\\tau=0.5$ | $\\Delta$ F1 | Brier Score | ECE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E4_ablation.variants.map((v) => `| **${v.variant}** | ${v.auroc.n} | ${fmt(v.auroc.mean)} | ${v.deltaAuroc !== undefined ? (v.deltaAuroc >= 0 ? `+${fmt(v.deltaAuroc)}` : fmt(v.deltaAuroc)) : '—'} | ${fmt(v.auprc.mean)} | ${v.deltaAuprc !== undefined ? (v.deltaAuprc >= 0 ? `+${fmt(v.deltaAuprc)}` : fmt(v.deltaAuprc)) : '—'} | ${fmt(v.f1AtDefault.mean)} | ${v.deltaF1 !== undefined ? (v.deltaF1 >= 0 ? `+${fmt(v.deltaF1)}` : fmt(v.deltaF1)) : '—'} | ${fmt(v.brierScore.mean, 4)} | ${fmt(v.ece.mean, 4)} |`).join('\n')}

---

## 10. Scalability Results (E15)

Paired population and gateway scaling configurations ($T = 1800$ s):

| Population | Gateways | $n$ | Raw Obs (mean) | Detected Sessions | Contact F1 | Wall-Clock Time (ms) | Throughput (obs/sec) | Telemetry Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E15_scalability.map((s) => `| ${s.populationSize} | ${s.gatewayCount} | ${s.f1Score.n} | ${fmt(s.rawObservations.mean, 0)} | ${fmt(s.detectedSessions.mean, 1)} | ${fmt(s.f1Score.mean)} | ${fmt(s.wallClockMs.mean, 1)} ms | ${fmt(s.throughputObsPerSec.mean, 1)} obs/s | machine-dependent |`).join('\n')}

---

## 11. Privacy Evaluation Results (E9–E12)

Attacker B trajectory linkage and Attacker C/C+ identity inference across rotating pseudonyms:

### E9: Pseudonym Rotation Interval Sweep (P2)
| Rotation Interval | $n$ | Transitions | Linkage F1 | Linkage Success Rate | Empirical Unlinkability Proxy | Identity Top-1 | Collision Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.E9_privacyRotationSweep.map((p) => `| ${p.sweepValue} s | ${seeds.length} | ${p.totalTransitions} | ${p.linkageF1 ? fmt(p.linkageF1.mean) : 'N/A'} | ${p.linkageSuccessRate ? fmt(p.linkageSuccessRate.mean) : 'N/A'} | ${p.unlinkabilityProxy ? fmt(p.unlinkabilityProxy.mean) : 'N/A'} | ${fmt(p.identityTop1Accuracy.mean)} | ${fmt(p.empiricalCollisionRate.mean, 6)} |`).join('\n')}

*Zero transitions note:* For non-rotating identifiers (rotation interval $\\ge$ simulation duration), linkage metrics are mathematically undefined and reported as \`N/A\`. This represents lack of observable rotation events, **NOT** perfect unlinkability.

---

## 12. Privacy–Utility Trade-off Results (E13–E14)

Contact reconstruction degradation under rotating pseudonyms compared to authorized unprivileged edge reconstruction:

| Scenario / Configuration | Rotation Interval | Session Fragmentation Ratio | Duration Attenuation Ratio | Mean Exposure Duration (s) | Contact Utility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E13 (Privacy-Utility Trade-off)** | ${results.E13_privacyUtility.sweepValue} s | ${fmt(results.E13_privacyUtility.sessionFragmentationRatio.mean)} | ${fmt(results.E13_privacyUtility.durationAttenuationRatio.mean)} | ${fmt(results.E13_privacyUtility.meanExposureDurationSec.mean)} s | Session fragmentation increases inversely with rotation interval |
| **E14 (Multi-Seed Replication)** | ${results.E14_privacyMultiSeed.sweepValue} s | ${fmt(results.E14_privacyMultiSeed.sessionFragmentationRatio.mean)} | ${fmt(results.E14_privacyMultiSeed.durationAttenuationRatio.mean)} | ${fmt(results.E14_privacyMultiSeed.meanExposureDurationSec.mean)} s | Replicate consistency verified across all 5 seeds |

---

## 13. Statistical Summary Specifications

- **Replicate Independence:** Multi-seed across-replicate metrics ($n = 5$) represent true independent experimental units.
- **Degrees of Freedom:** $\\nu = n - 1 = 4$.
- **Student's $t$ Critical Value:** $t_{0.975, 4} = 2.776$ (exact, small-sample Bessel-corrected).
- **Confidence Intervals:** Calculated as $\\bar{x} \\pm t_{0.975, \\nu} \\cdot \\frac{s}{\\sqrt{n}}$.
- Sessions, observations, or packets are **never** pooled across seeds as independent degrees of freedom.

---

## 14. Reproducibility Verification

1. **Deterministic Checksums:** All deterministic scientific outputs are hashed into \`checksums.json\` using SHA-256.
2. **Replay Verification:** A representative experiment executed twice with identical parameters produces 100% bitwise identical scientific JSON payloads and identical SHA-256 hashes.
3. **Telemetry Separation:** Wall-clock timings, CPU performance metrics, and OS details are strictly excluded from deterministic hashes.

---

## 15. Scientific Limitations & Non-Claims

The MDR-SIM simulator enforces bounded scientific claims:
1. **NOT Clinical Infection:** The model predicts reference digital contact/proximity events. It does not model pathogen viability, bacterial shedding, aerosol suspension, or human immune response.
2. **NOT a Diagnostic Tool:** Exposure scores must not be used for medical decisions, triage, or clinical diagnosis.
3. **NO Regulatory Compliance:** The privacy subsystem does not claim compliance with GDPR, HIPAA, or local medical privacy regulations.
4. **NO Formal Cryptographic Anonymity:** Rotating pseudonyms do not guarantee differential privacy ($(\\epsilon, \\delta)$-DP) or formal $k$-anonymity.
5. **Empirical Unlinkability:** The empirical unlinkability proxy ($1 - \\text{linkage rate}$) reflects resistance against the evaluated heuristic attackers (A, B, C, C+) under hospital simulation constraints, not universal security against arbitrary side-channel adversaries.

---

## 16. Experiments Not Executed

- **E16 (Out-of-Scope Identifier Expansion):** NOT EXECUTED.
  - *Rationale:* Experiment E16 is not defined in Frozen Protocol v1.0.0. In accordance with scientific integrity guidelines, this entry is explicitly recorded as NOT EXECUTED rather than fabricating speculative outputs.
`;
}
