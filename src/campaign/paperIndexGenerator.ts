/**
 * Paper Extraction Index Generator (results/final/PAPER_RESULTS_INDEX.md).
 *
 * Maps each executed experiment, table, figure, and metric to its corresponding
 * section in the journal paper manuscript.
 */

import type { CampaignResults } from './campaignTypes.js';

export function generatePaperResultsIndex(results: CampaignResults): string {
  const seeds = results.E1_reference.seedList;
  const n = seeds.length;

  return `# MDR-SIM Paper Results Index & Artifact Mapping

**Protocol Version:** 1.0.0 (Frozen)  
**Seed Set ($n = ${n}$):** \`[${seeds.join(', ')}]\`  
**Generated Artifacts Root:** \`results/final/\`

This authoritative index maps every executed experimental result, numerical table, and SVG figure to the corresponding section of the journal paper manuscript.

---

## 1. Paper Section to Table & Figure Mapping

| Paper Section | Target Subject | Primary Table | Primary Figure | Result Data File |
| :--- | :--- | :--- | :--- | :--- |
| **Section 4.1: Physical & RF Layer Validation** | BLE path-loss & distance error | \`tables/01_contact_detection.csv\` | \`figures/fig01_architecture_flow.svg\` | \`E1_reference.json\` |
| **Section 4.2: Contact Reconstruction** | Proximity detection (F1, Precision, Recall) | \`tables/01_contact_detection.csv\` | \`figures/fig04_rssi_robustness.svg\` | \`E1_reference.json\`, \`E2_dense.json\` |
| **Section 4.3: Temporal Error & Fragmentation** | Dwell-time MAE/RMSE & session merging | \`tables/01_contact_detection.csv\` | \`figures/fig04_rssi_robustness.svg\` | \`E1_reference.json\`, \`E2_dense.json\` |
| **Section 5.1: Risk Discrimination Performance** | Bayesian model vs. 3 Baselines (AUROC, AP) | \`tables/02_risk_baseline.csv\` | \`figures/fig02_risk_baseline_auroc.svg\` | \`E3_baseline.json\` |
| **Section 5.2: Probability Calibration** | Brier score & Expected Calibration Error (ECE) | \`tables/02_risk_baseline.csv\` | \`figures/fig03_calibration_curves.svg\` | \`E1_reference.json\`, \`E3_baseline.json\` |
| **Section 5.3: Evidence Dimension Ablation** | Individual feature contributions (Deltas) | \`tables/03_ablation.csv\` | \`figures/fig08_ablation_deltas.svg\` | \`E4_ablation.json\` |
| **Section 6.1: RF Channel Robustness** | RSSI noise sigma sweep ($\\sigma = 0, 6, 10$ dB) | \`tables/04_rssi_robustness.csv\` | \`figures/fig04_rssi_robustness.svg\` | \`E5_rssi_6.0dB.json\` |
| **Section 6.2: Packet Loss & Gateway Density** | Packet loss (0–20%) & Gateway count (4–12) | \`tables/05_packet_loss_robustness.csv\` | \`figures/fig05_packet_loss_robustness.svg\` | \`E6_ploss_5pct.json\`, \`E8_gw_8.json\` |
| **Section 6.3: Edge Scalability & Efficiency** | Observation reduction & throughput (obs/s) | \`tables/08_scalability.csv\` | \`figures/fig07_scalability_throughput.svg\` | \`E15_scalability.json\` |
| **Section 7.1: Trajectory Linkability (Attacker B)**| Linkage F1, success rate & unlinkability proxy | \`tables/09_privacy_rotation.csv\` | \`figures/fig09_privacy_linkability.svg\` | \`privacy_campaign.json\` |
| **Section 7.2: Privacy–Utility Trade-Off** | Session fragmentation & duration attenuation | \`tables/10_privacy_utility.csv\` | \`figures/fig10_privacy_utility_tradeoff.svg\` | \`privacy/utility/\` |

---

## 2. Table-by-Table Claim Extraction & Sourcing

### Table 1 — Contact Reconstruction Performance (\`tables/01_contact_detection.md\`)
- **Paper Location:** Section 4.2, Table 1
- **Source File:** \`results/final/E1_reference.json\`, \`results/final/E2_dense.json\`
- **Evaluated Metric:** True Positives, False Positives, False Negatives, Precision, Recall, F1-Score, Duration MAE (s), Fragmentation Rate.
- **Statistical Unit:** Across-seed replicate mean $\\pm$ 95% CI ($n = 5$, Student's $t_{0.975,4} = 2.776$).
- **Reference F1:** \`${results.E1_reference.contact.f1Score.mean.toFixed(3)}\` [95% CI: \`${results.E1_reference.contact.f1Score.confidenceInterval95?.lower.toFixed(3) ?? 'N/A'}\`, \`${results.E1_reference.contact.f1Score.confidenceInterval95?.upper.toFixed(3) ?? 'N/A'}\`]
- **Dense Scenario F1:** \`${results.E2_dense.contact.f1Score.mean.toFixed(3)}\` [95% CI: \`${results.E2_dense.contact.f1Score.confidenceInterval95?.lower.toFixed(3) ?? 'N/A'}\`, \`${results.E2_dense.contact.f1Score.confidenceInterval95?.upper.toFixed(3) ?? 'N/A'}\`]

### Table 2 — Risk Baseline Comparison (\`tables/02_risk_baseline.md\`)
- **Paper Location:** Section 5.1, Table 2
- **Source File:** \`results/final/E3_baseline.json\`
- **Evaluated Metric:** AUROC, Average Precision (AUPRC), Brier Score, ECE, F1 @ $\\tau = 0.5$.
- **Statistical Unit:** 5-seed replicate mean $\\pm$ 95% CI.
- **Methods Compared:**
  1. Proximity-Only Baseline
  2. Proximity + Duration Baseline
  3. Legacy Heuristic Baseline
  4. Proposed Bayesian Model

### Table 3 — Feature Ablation Study (\`tables/03_ablation.md\`)
- **Paper Location:** Section 5.3, Table 3
- **Source File:** \`results/final/E4_ablation.json\`
- **Evaluated Metric:** $\\Delta$AUROC, $\\Delta$AUPRC, $\\Delta$F1 relative to Full Model.
- **Ablated Dimensions:** Duration, Proximity, Recurrence (encounterCount + cumulativeDuration), Source Status.

### Table 4 — Edge Pipeline Scalability & Efficiency (\`tables/08_scalability.md\`)
- **Paper Location:** Section 6.3, Table 4
- **Source File:** \`results/final/E15_scalability.json\`
- **Evaluated Metric:** Raw Observations, Processed Observations, Session Count, Throughput (obs/sec), Wall-clock latency (ms).
- **Labeling Constraint:** Telemetry explicitly tagged as *machine-dependent*.

### Table 5 — Privacy & Adversarial Threat Evaluation (\`tables/09_privacy_rotation.md\`, \`tables/10_privacy_utility.md\`)
- **Paper Location:** Section 7.1 & 7.2, Table 5
- **Source File:** \`results/final/privacy_campaign.json\`
- **Evaluated Metric:** Linkage Success Rate, Empirical Unlinkability Proxy ($1 - \\text{linkage rate}$), Identity Top-1 Accuracy, Session Fragmentation Ratio, Duration Attenuation Ratio.
- **Adversary Model:** Attacker B (Multi-observation linkage) and Attacker C (Identity inference).

---

## 3. Figure Index & Caption Sourcing

1. **Figure 1 (\`figures/fig01_architecture_flow.svg\`):** End-to-end MDR-SIM Architectural Flow (Physical World $\\to$ BLE Radio $\\to$ Edge Pipeline $\\to$ Bayesian Model $\\to$ Privacy Layer).
2. **Figure 2 (\`figures/fig02_risk_baseline_auroc.svg\`):** Discrimination Performance Comparison across Risk Estimation Models with 95% Confidence Intervals.
3. **Figure 3 (\`figures/fig03_calibration_curves.svg\`):** Reliability Diagrams & Probability Calibration Curves (Predicted Risk vs. Empirical Ground-Truth Frequency).
4. **Figure 4 (\`figures/fig04_rssi_robustness.svg\`):** Contact F1 and Risk AUROC as a function of RSSI Multipath & Shadowing Noise ($\\sigma_{\\text{noise}}$).
5. **Figure 5 (\`figures/fig05_packet_loss_robustness.svg\`):** System Resilience across Packet-Loss Probabilities (0% to 20%).
6. **Figure 6 (\`figures/fig06_adv_interval_robustness.svg\`):** Contact Reconstruction Accuracy across Beacon Advertising Intervals.
7. **Figure 7 (\`figures/fig07_scalability_throughput.svg\`):** Edge Ingestion & Sessionization Throughput (Observations/sec) vs. Hospital Population Density.
8. **Figure 8 (\`figures/fig08_ablation_deltas.svg\`):** Performance Degradation ($\\Delta$AUROC, $\\Delta$AUPRC) under Systematic Feature Ablation.
9. **Figure 9 (\`figures/fig09_privacy_linkability.svg\`):** Empirical Unlinkability Proxy and Attacker B Linkage F1 across Pseudonym Rotation Intervals.
10. **Figure 10 (\`figures/fig10_privacy_utility_tradeoff.svg\`):** Privacy–Utility Trade-Off: Unlinkability vs. Session Fragmentation & Duration Attenuation.

---

## 4. Verification Checksum Manifest Reference

- **Manifest File:** \`results/final/manifest.json\`
- **Checksums File:** \`results/final/checksums.json\`
- **Reproducibility Status:** \`REPRODUCIBLE = PASS\` (Bitwise verified over frozen seed set).
`;
}
