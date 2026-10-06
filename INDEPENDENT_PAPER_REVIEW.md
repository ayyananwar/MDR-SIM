# Independent review of the supplied manuscript and simulation

Reviewed 6 October 2026. Scope: the pasted manuscript, current research implementation, confirmatory per-seed results, raw E3 predictions, diagnostic source and output, and the existing research tests. Existing audit documents were treated as claims to check, not as independent evidence. Production simulation code and the manuscript were not edited.

## Verdict

The central negative result is supported for this specific simulation configuration: this gateway co-observation pipeline reconstructs very few reference sessions and produces mostly unmatched sessions. The paper's Table III and Table V numbers agree with saved per-seed results and independently recomputed raw-prediction metrics, respectively. However, the paper is not ready to be called fully correct or reproducible. The radius diagnostic lacks supporting executable provenance; the stated logistic feature vector differs from the actual implementation; and the standard campaign uses a different E3 target and aggregation from the manuscript.

This review did not rerun the entire 30-seed campaign. Recomputing metrics from saved outputs establishes arithmetic consistency, not independent verification that every saved prediction was produced by the current simulator. References were not comprehensively verified; attempted DOI lookups did not resolve through the browsing tool.

## Independently checked results

`results/confirmatory/E1_reference/per_seed_results.json` contains 30 replicates with 84 reference sessions, 161 reconstructed sessions, TP=3, FP=158, FN=81. Dividing counts by 30 reproduces 0.100, 5.267, 2.700, and 2.800. The saved per-seed precision, recall, and F1 averages agree with the manuscript's rounded values.

Pooled precision is 3/161=1.86%; pooled recall is 3/84=3.57%; pooled non-recovery is 81/84=96.43%. These differ from macro metrics, as the manuscript correctly acknowledges. Seeds 103 and 110 have no reference sessions; their recall is coded as zero. Consequently, the reported 98.1% complement of macro recall includes a zero-denominator convention. It is not a missed-contact percentage. Report the pooled statistic alongside it and explicitly document this convention. Macro recall restricted to the 28 seeds with reference sessions is approximately 2.02%.

Independent calculations from `results/confirmatory/E3_RAW_PREDICTIONS_V2.csv` reproduce Table V:

| Method | AUROC | AP | F1 | Brier | ECE |
|---|---:|---:|---:|---:|---:|
| Constant proximity | .500 | .379 | .035 | omitted | omitted |
| Proximity + duration | 1.000 | 1.000 | .035 | omitted | omitted |
| Heuristic | .963 | .850 | .000 | omitted | omitted |
| Bayesian | .588 | .419 | .000 | .031 | .055 |
| Logistic | .000 | .326 | .000 | .027 | .047 |
| Prior-only | .500 | .379 | .000 | .032 | .113 |

There are 322 directed records, six positive records, 28 nonempty seeds, and two supported ranking folds: 301 (2/22 positive) and 303 (4/6 positive). Each reconstructed session produces two directed records. Thus six positive records correspond to three reconstructed sessions, not six independent contacts. The supported ranking folds contain only one and two positive sessions, respectively. LOSO keeps these directions together and prevents cross-fold leakage, but their duplication must be disclosed when describing support.

The uninformative always-zero predictor has macro Brier approximately .0270563, slightly better than logistic's .0271481. Small Brier values therefore do not demonstrate useful prediction. Adding this reference would substantially improve interpretation.

## Required corrections

### 1. Radius diagnostic is not reproducible from the supplied script

The manuscript reports 2 m: TP=1, FP=69 and 3 m: TP=1, FP=811. `src/campaign/targetedDiagnostic.ts` only evaluates radii .5, 1, 1.5, and 2 m. It applies a threshold to raw RSSI before median filtering, while retaining the edge distance threshold at 2 m. This is not the manuscript's described change to the post-filter RSSI-derived distance threshold. The saved diagnostic report contains no 3 m row. No matching source or diagnostic record for FP=811 was located in the reviewed text/source files.

The 69-FP experiment uses three seeds (1–3), 30 participants and 1800 seconds, unlike the main campaign. These conditions must be stated. Remove the unsupported 3 m result until the exact experiment and artifacts are supplied, or run a new explicitly labeled diagnostic that changes `edge.proximity.thresholdDistanceMeters` with identical trajectories and radio observations in both conditions. Do not silently substitute a newly produced number for the old claim.

The diagnostic report also contains unsupported statements about exponential/quadratic scaling and improved logistic generalization. Its purported dense check has only two positives, zero training positives in the shown fold, and undefined AUROC. Those statements are not evidence. The pasted manuscript appropriately avoids most of them.

### 2. Logistic cumulative duration is always zero

`extractFeatures` returns `cumulativeDurationSeconds`. `LogisticRegressionBaseline.extractNumericFeatures` reads `features.cumulativeDuration || 0`. The fourth feature is therefore zero for every record. `logistic_audit_v4.ts` repeats this error. The paper's feature vector `[D,P,C,D_c,S]` does not describe the executed model.

Either describe the legacy executed model with a zero fourth feature, or correct the accessor, use the typed feature interface instead of `any`, and rerun downstream results as a new version. Current AUROC=0 is confirmed in the saved scores, but imbalance alone is not an established cause. Feature scaling, convergence and regularization need controlled checks before causal attribution. The pasted paper's cautious interpretation is preferable to the older audit documents' asserted explanation.

### 3. Standard campaign E3 labels contradict the manuscript

`getLabelsForRecords` correctly implements matching pair AND nonzero temporal overlap. `regenerateE3.ts` uses this target. However, `runBaselineComparisonExperiment` evaluates discrimination through `evaluateRiskAssessments`, which uses pair membership anywhere in the simulation, ignoring interval overlap. Its calibration labels also use pair-only membership. `campaign:confirmatory` calls this path.

The normal campaign therefore does not implement the manuscript's E3 target. Additionally, its aggregator and `regenerateE3.ts` include empty-fold zero metrics, producing n=30 for F1/Brier/ECE. The paper's n=28 results are arithmetically recoverable from raw predictions, but require a separate exclusion step. Consolidate target construction and nonempty-fold aggregation in the documented executable path. Freeze the corrected outputs and record the exact command and checksums.

### 4. Reference contacts are sampled and room-constrained

The main configuration uses `timeStepSeconds=1` and `roomConstraint='same-room'`. `GroundTruthTracker` checks sampled positions, not all continuous-time positions. It uses last qualifying sample minus first qualifying sample as duration. A run spanning t=0 through t=30 qualifies; the first failing sample is not included. The tracker does not independently enforce timestamp continuity if callers skip steps, although the current generator supplies every step.

Replace the unqualified 'continuously for at least 30 s' definition with the actual sampled rule and same-room condition. BLE positions are interpolated between samples, so its time representation differs from the reference tracker. Quantify timestep sensitivity if claiming continuous physical accuracy.

### 5. Reconstructed duration is rounded before qualification

`sessionizer.ts` applies `Math.round((last-first)/1000)` before checking minimum duration. A 29.5-second span can pass the stated 30-second requirement. Start/end times are separately rounded. Document this convention or enforce duration on unrounded timestamps and rerun affected results. `observationCount` counts generated pair-evidence events, not necessarily distinct packets; the same packet may support multiple pair events. Define that quantity precisely.

### 6. Bayesian likelihood provenance needs clarification

`createDefaultRiskModel` installs `DEFAULT_REFERENCE_LIKELIHOODS`; the reviewed E3 regeneration path does not fit Bayesian likelihood tables on the other 29 seeds. A smoothing configuration of alpha=1 is present, but this is not evidence that the campaign estimates Laplace-smoothed likelihoods from its training folds. Describe the Bayesian baseline as a fixed reference-table model, disclose table provenance and construction, and distinguish it from the trained logistic model. If fold-wise estimation is intended, implement it and rerun.

The heuristic's 'RSSI-related' factor is actually a scaled `proximityEvidence` feature, which is constant on surviving sessions; it does not directly use the session RSSI values. Give the exact formula rather than implying additional RSSI discrimination.

## Simulation interpretation and reproducibility

The actual default geometry has nine rooms and gateways at the centers of the first eight rooms. Consultation room 2 has no gateway. This is not the uniformly spaced grid claimed in an older source-of-truth audit. Room transitions select an arbitrary room and immediately relocate the participant; BLE interpolation then traverses the displacement between samples. This is an abstract mobility model, not realistic doorway-constrained hospital movement. The paper must specify geometry, positions and mobility parameters rather than promise them as an intended package.

Coverage is a plausible contributor to low recall: eight ideal 2 m disks have total area at most 100.5 square meters before overlap, whereas the default rooms total 1613 square meters. This calculation is an oracle-geometric illustration, not the actual noisy RF coverage. An oracle true-gateway-distance condition would help distinguish coverage, co-observation geometry, RF noise and sessionization as causes. Current results support failure of this configured pipeline, not all gateway-assisted contact reconstruction systems.

The research test command executes phases 1–6 successfully, then phase 7 reports 123 passing assertions and one failure. Its failed architecture assertion scans source text for the substring `groundTruthContacts`; evaluation-only use triggers it. This is a brittle test and does not itself demonstrate inference leakage. Tests do not cover the cumulative-duration mismatch or ensure that the standard campaign implements the manuscript's temporal E3 labels. No claim of a fully passing suite is justified.

Before submission: resolve the diagnostic provenance, align feature and target definitions, freeze one reproducible campaign path, disclose sampled/rounded timing and directed duplication, include geometry/mobility details, and replace figure placeholders. Treat E3 rankings as descriptive outcomes from three positive sessions across two seeds. No current evidence establishes a stable model ranking or a general failure of logistic regression.

## Review artifacts

`independent_review_metrics.cjs` independently recomputes metrics from saved E3 predictions without importing the project's metric implementation. `INDEPENDENT_REVIEW_METRICS.json` records full numerical output and supported-fold results. Brier/ECE calculations for heuristic scores in that diagnostic file are arithmetic checks only; the manuscript appropriately omits them as probability-quality claims.
