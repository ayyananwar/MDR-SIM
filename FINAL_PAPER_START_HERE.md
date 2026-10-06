# Start the final research paper here

Finalization review: 6 October 2026. Status: **the documented simulation and trained-model evidence is ready for manuscript drafting**. This is a simulation study with explicit assumptions. Passing software checks does not certify scientific novelty, hospital accuracy, clinical usefulness or publication acceptance.

Suggested title: **Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study**.

Use v7 as the main experiment. Its contribution is the matched comparison of observation budgets, causal contact inference and trained models, with reproducible evidence and negative findings. Logistic regression, forests, boosting, Gaussian Bayes, Kalman filtering and Markov filtering are established techniques; do not describe their use alone as a new algorithm. A simplified hospital setting motivates the design, but no real hospital was measured.

## Files to use while writing

| Writing need | Authoritative starting point |
|---|---|
| Main methods, partitions, features, selection and caveats | [ML protocol](docs/ML_V7_PROTOCOL.md) and `research/ml-v7/protocol.mjs` |
| Main numerical tables and all model families | [ML results](results/ml-v7-report/ML_V7_RESULTS.md), `summary.json` and `per-case-metrics.json` in `results/ml-v7-evaluation/` |
| Paired effect intervals and ablations | `results/ml-v7-evaluation/contrasts.json` |
| Exact selected models, settings and candidate search | `results/ml-v7-models-complete/selection.json` |
| Prepared prose for the main methods/results/discussion | [Manuscript section](docs/ML_V7_MANUSCRIPT_DRAFT.md) |
| Scientific figures | `results/ml-v7-report/contact-f1-matrix.pdf`, `generalization.pdf`, `reliability.pdf` |
| Earlier radio/localization and service-load assumptions | [Ranging design](docs/HOSPITAL_RANGING_V6.md), `research/contact-v5/protocol.mjs`, `research/ranging-v6/protocol.mjs` |
| Verified original negative result and corrections | `results/paper-v3/RESULTS.md`, `results/diagnostic-v3/RESULTS.md`, [independent review](INDEPENDENT_PAPER_REVIEW.md) and `CLEANUP_REPORT.md` |
| Final checks and numerical audit | [Final review](docs/FINAL_RESEARCH_REVIEW.md), `results/finalization-v7-20261006/audit.json` |
| Exact environment and execution commands | `README.md` and `research/ml-v7/requirements.txt` |

`MANUSCRIPT_FINAL.md`, `docs/PAPER_SUPPLIED.md` and `docs/FINAL_EXPERIMENTAL_PROTOCOL.md` are historical artifacts of the earlier paper/campaign. Their names do not make them the authority for the extended paper. In particular, the old manuscript's 811-FP diagnostic, logistic ECE .047, causal explanation of inverse ranking and 98.1% “non-recovery” interpretation must not be copied unchanged. The first interrupted `results/ml-v7-models` run is also nonauthoritative. These files remain preserved for provenance.

## Detailed paper structure

1. **Abstract.** State the simulation-only scope, seven observation budgets, causal reconstruction task, disjoint training/calibration/validation/test seeds, main test results and false-alarm limitations. Report contact F1 as F1, not accuracy. Identify the fixed floor plan and assumed channels.
2. **Introduction.** Motivate low-cost sustained-contact monitoring, explain why localization accuracy alone does not establish contact recovery, and formulate the research questions below. Avoid unsupported claims about infection prevention or hospital deployment.
3. **Related work.** Cover gateway co-observation, RSSI/body/multipath effects, AoA, BLE PBR/RTT, UWB TWR/TDoA, causal tracking, probability calibration and grouped validation. Use verified primary papers/specifications. Do not copy the original bibliography without checking titles, authors, venue, year and DOI. Vendor descriptions support mechanisms, not your model's numerical error distributions or a scientific novelty claim.
4. **System and task.** Describe eight moving tags, four gateway coordinates/orientations, the 24×20 m two-room map and doorway, all 28 unordered pairs, one-second sampling, same-room distance at most 2 m, and sustained sessions spanning at least 30 s. State that 31 qualifying samples are required. Separate instantaneous training labels from sustained-session evaluation targets.
5. **Sensor and inference methods.** Specify RSSI, angular and ranging error assumptions in a complete table; distinguish assumed values from measurements. Explain causal median/circular filtering, robust localization, constant-velocity Kalman tracking, three-second prediction expiry, observed features, missing-estimate gating, classifier families, separate sigmoid calibration and temporal decoding. Describe PBR slope inference, corrected RTT and ideal DS-TWR intervals from the code. The PBR/RTT configuration is a consistency gate, not a new fusion algorithm or security experiment.
6. **Experimental design.** State 24 training, eight validation, eight calibration, 30 primary test and 12 unseen-motion seeds; two matched sensor conditions per seed; randomized motion families; five-second training subsampling; exact hyperparameter grids; equal validation privilege for rules; validation-selected primary family; two ablations and learned Markov extension. Explain that unseen motion shares the map/channel assumptions. No held-out tuning or test-winner replacement is allowed.
7. **Evaluation.** Define same-pair temporal matching (overlap ≥5 s, IoU ≥0.2, greedy one-to-one), TP/FP/FN, precision/recall/F1, frame Brier/ECE/AUROC/AP, missed contact time, false sessions per pair-hour, and conditional duration/latency. Give aggregation/support rules and pointwise paired bootstrap construction. Use the independent seed as the resampling unit.
8. **Results.** Present validation-selected primary models, all families and controls, LOS/wall conditions, unseen motion, temporal/room ablations, probability reliability, and adverse outcomes. Do not suppress Markov underperformance, PBR/RTT underperformance or unfavorable false-alarm counts. Keep figures and table rounding consistent with frozen JSON.
9. **Deployment tradeoffs.** Describe compatible radios, tag/anchor counts, assumed service availability and symbolic complete-system cost. v6's additional 32/128 clients are traffic workload, not extra moving people. v7 ML uses only the eight-client setting. Cost, battery life and channel capacity are not measured. Bare-chip and integrated-module prices are not comparable wearable BOMs.
10. **Discussion and validity.** Explain the benefits and limits of learned observable evidence, synthetic channel sensitivity, fixed map, small population, coarse sampling, class imbalance, conditional metrics, one-to-one greedy matching, pointwise comparisons and missing hardware validation. Separate statistical uncertainty within the simulator from uncertainty about the simulator itself.
11. **Conclusion.** State what improved under these assumptions and which failure modes remain. Present a reproducible candidate method, not a validated hospital product or optimal low-cost technology.
12. **Reproducibility appendix.** Include seed ranges, feature names/units, all parameters, software versions, exact commands, archive layout and checksum manifests. Label v3/v4/v5/v6 as earlier separate protocols; do not combine their metrics into one pooled study.

## Research questions and frozen answers

| Question | Result supported by current evidence |
|---|---|
| Can learned observable features improve sustained-contact recovery? | The selected model's primary mean F1 exceeds its tuned rule for all seven modalities. UWB's ML-minus-rule pointwise interval includes zero. |
| Does cheap RSSI alone suffice? | RSSI ML improves F1 to .445, but has 464 false sessions across matched conditions and unseen-motion F1 .290. Sufficiency for hospital use is not established. |
| Do more angular receivers help in this benchmark? | Selected two-/four-angle primary F1 is .571/.704; both include RSSI. The comparison reflects this layout and assumed angular errors. |
| Is one ranging technology universally best? | No. UWB attains the highest selected-model primary F1 (.763) under the chosen errors/service assumptions, which do not establish general hardware superiority or minimum cost. |
| Does adding temporal ML always help? | No. The learned Markov extension underperforms the selected classifier in this test; contact-history benefits vary by modality. |
| Does the PBR/RTT gate improve over PBR alone? | Primary selected-model F1 is .664 versus .690; no primary benefit is demonstrated here. |
| Does a new motion family validate a new hospital? | No. Independent waypoints are an unseen motion family on the same map, not independent hospital or hardware evidence. |

## Definitions that must remain explicit

- “LOS” is the ideal sensor-error setting without a modeled wall penalty. The geometry still has two rooms; links are not classified by physical ray tracing. “Wall multipath” is an assumed bias/noise setting, not measured channel impulse response.
- F1 is mean within-seed across conditions and then across supported seeds. It differs from F1 calculated from pooled TP/FP/FN. Counts repeat each motion reference under two conditions.
- There are 176 unique qualified primary test contacts and 68 unseen-motion contacts. Per-frame samples and the two conditions are correlated; they are not independent subjects.
- Frame-probability calibration is not calibration of sustained-session correctness, infection or clinical exposure risk.
- The unknown-estimate gate sacrifices recall instead of creating positives from missing positions. The room ablation removes one estimated-room feature, not every observable clue about rooms.
- Detection latency is the matched predicted confirmation time minus the reference session's start. It is a signed, conditional measure; early matched predictions can be negative. It is not sensor-to-server or wearable compute latency. Duration/latency omit unmatched contacts, so recall and missed-time must accompany them.
- Radio observations are abstract. AoA IQ extraction, real antenna arrays, full BLE/UWB stacks, interference, complete energy accounting, UWB TDoA and clinical transmission models are not implemented.

## What remains before submission

The remaining writing decisions are venue/format, final title and author metadata, bibliography verification, contribution positioning against prior work, data/code sharing location, and complete paper assembly. These can proceed now without retraining unchanged models. If the paper remains simulation-only, explicitly justify its assumed error distributions and scope; hardware studies cannot be implied. Any change to sensor distributions, geometry, targets, feature extraction, fitting or selection requires a new version and fresh held-out evaluation, not reuse or relabeling of the frozen v7 results.
