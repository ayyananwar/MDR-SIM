# Research implementation and training completion report

## Completed scope

The simulation research now has separate, versioned stages: corrected original reproduction (v3), angular pilot (v4), causal RSSI/AoA comparison (v5), PBR/RTT/UWB mechanism and capacity comparison (v6), and trained end-to-end contact reconstruction (v7). Each stage remains identifiable. No old results were relabeled as outputs of the new ML code.

Version 7 implements observable feature extraction, randomized continuous encounter scenarios, grouped dataset partitions, four fitted classifier families, probability calibration, validation-only hyperparameter/threshold/decoder selection, equally tuned geometric controls, learned Markov inference, feature ablations, held-out and unseen-motion evaluation, label-free prediction, independent evidence verification, manuscript text, and standard scientific PNG/PDF figures.

All 49 detector bundles trained successfully. The selected configurations reported no training warnings. The 30 primary and 12 unseen-motion evaluation seeds yielded 6,468 detector-recording evaluations. There are 119 unique training sustained contacts, 49 validation contacts, 52 calibration contacts, 176 test contacts and 68 unseen-motion contacts. Repeated channel conditions are not independent ground-truth contacts. The v7 evidence occupies approximately 1.32 GB, retained because it includes raw observations, full features/labels, per-recording outputs and fitted models.

## Authoritative evidence

| Purpose | Location |
|---|---|
| Full ML design and assumptions | `docs/ML_V7_PROTOCOL.md` |
| Raw telemetry, truth, labels, feature matrices and split manifests | `results/ml-v7-data/` |
| Frozen models, search records, calibration and validation predictions | `results/ml-v7-models-complete/` |
| Final predictions, sessions, per-recording metrics, summaries and contrasts | `results/ml-v7-evaluation/` |
| Tables and Matplotlib PNG/PDF figures | `results/ml-v7-report/` |
| Manuscript extension | `docs/ML_V7_MANUSCRIPT_DRAFT.md` |
| Feature-only inference demonstration | `results/ml-v7-inference-demo.json` |
| Exact setup, reproduction and verification commands | `README.md` |

## Validation completed

- Node tests passed for split disjointness, deterministic motion, doorway/speed constraints, causal symmetric features and feature architecture.
- Seven Python unit tests passed for qualifying duration, missing gaps, matching and time-error arithmetic, empty-reference false alarms, causal decoding/Markov filtering, training-only scaling and calibration arithmetic.
- Independent verification passed for all 826,560 unique physical pair-frame labels across every split, plus all 6,468 saved detector evaluations. It reconstructs sessions, decisions, matching counts, F1, pair-time errors and Brier without importing the implementations being verified.
- Feature-only prediction exactly matched retained evaluation probabilities, decisions and reconstructed sessions, without loading truth or labels.
- All 133 frozen original project source hashes matched. All 14 source files snapshotted for successful ML training matched. The retained v6 evaluation's 274 evidence hashes matched. Dataset/model/evaluation evidence checksums passed inside the independent verifier.
- Generated contact-F1 and probability-reliability figures were visually inspected; all figures are provided as PNG and PDF.

The application was preserved. Original source and its earlier passing tests/build remain unchanged, so this additive extension did not require rerunning unrelated application checks.

## Results and limits

Validation-selected primary mean contact F1 was RSSI 0.445, two-angle 0.571, four-angle 0.704, PBR 0.690, RTT 0.561, PBR/RTT 0.664 and UWB 0.763. Equally tuned geometric-rule F1 was respectively 0.000, 0.392, 0.579, 0.575, 0.485, 0.547 and 0.729. RSSI improved numerically but retained many false contacts. The UWB ML-minus-rule pointwise interval includes zero. The learned Markov extension underperformed the selected classifiers; PBR/RTT did not improve primary F1 over PBR. Unseen-motion results and unfavorable ablations are retained.

The first training attempt was interrupted by a Windows sandbox synchronization restriction. `results/ml-v7-models/FAILED_RUN.md` identifies its partial artifacts as nonauthoritative. A fresh complete run, with permission for worker synchronization, produced the final models; no partial model was reused. Node's process-based test runner also required permission. Feature-only inference succeeded with a harmless warning that physical-core discovery fell back to logical-core discovery. No required v7 computation remains incomplete.

No existing research file was removed in this extension. The earlier cleanup backup remains at `C:\Users\ayyan\.codex\visualizations\2026\10\06\01a10fd2-58ba-7951-8277-e6dcd87384e6\MDR_SIM_backup_1791267443555`, with restoration instructions in the cleanup records. The new environment and caches are generated, rebuildable runtime material; raw data and trained results are research evidence.

Organizational cleanup and this simulation/ML implementation are complete for the documented protocol. Numerical consistency checks passed. The manuscript extension is prepared but does not automatically revise every original paper claim. Scientific novelty, empirically calibrated channel models, hardware/hospital validation, clinical interpretation, different floor plans, dense-population ML, actual wearable cost and battery life remain unresolved. UWB TDoA and a complete BLE/UWB protocol stack are not implemented. This report does not certify the paper as publication-ready or the system as ready for hospital deployment.

The subsequent finalization reran the complete project tests/build and extension tests and verified the original, v5, v6 and v7 saved evaluations. A supplementary independent audit checked every final frame metric, grouped summary, paired interval and the primary manuscript table. See [the final review](FINAL_RESEARCH_REVIEW.md) and [the paper-writing starting point](../FINAL_PAPER_START_HERE.md). The frozen research results remain unchanged.
