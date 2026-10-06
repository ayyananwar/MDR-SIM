# Final research review for paper drafting

Reviewed 6 October 2026. Verdict: **ready to begin the final detailed simulation paper using the frozen, explicitly limited evidence**. No claim is made that every scientific assumption is proven, that the historical manuscript is corrected in place, or that deployment/publication validity is certified.

## Checks completed in this finalization

| Check | Outcome |
|---|---|
| Original research suite, phases 1–7 and paper regressions | Passed |
| TypeScript compilation and production application build | Passed |
| Angular, causal contact, ranging and ML extension tests | All four test files passed |
| Python ML unit tests | Seven passed |
| Original paper's independent target/identity/macro-metric verification | Passed, all 30 seeds |
| Earlier causal-contact and ranging independent verification | 720 v5 and 1,080 v6 evaluations passed |
| Original/ML/dependent simulation source provenance | All 161 source-hash entries checked in the supplementary audit matched |
| Independent v7 geometry/labels/sessions/decisions/matching/time-error/Brier verification | 826,560 physical labels and 6,468 detector evaluations passed |
| Observable feature availability versus saved predictions | Passed for every final artifact |
| Independent frame ECE, AUROC and AP arithmetic | Passed for all 6,468 detector evaluations |
| Condition/seed aggregation, support and pooled counts | All 462 summary rows passed |
| Seed-paired bootstrap arithmetic | All 140 contrast intervals passed |
| Main manuscript table, family choice and unique-contact support | Seven rows passed against frozen artifacts |
| Final ML evaluation and report checksum manifests | 1,180 and 10 artifacts respectively matched |

The machine-readable supplementary audit is `results/finalization-v7-20261006/audit.json`. The audit code is `research/ml-v7/final_audit.py`; it imports no training/model/metric implementation, fits no models and modifies no frozen campaign artifacts. The existing independent session verifier remains separate. Fitted models were not retrained in this review because source/parameters are unchanged. A second complete training replay was not performed; consistency verification is not a claim that retraining has been independently replicated on another machine.

## Findings that affect paper writing

The current v7 selected-model numerical table is consistent with saved test outputs. No result-changing implementation defect was found by these checks. Negative results remain intact. Mean F1 is .445/.571/.704/.690/.561/.664/.763 for RSSI/AoA2/AoA4/PBR/RTT/PBR_RTT/UWB, with the model family selected on validation. UWB's small ML advantage over its tuned rule is uncertain at the pointwise interval level. False sessions and missed contact time remain substantial.

The old `MANUSCRIPT_FINAL.md` is not the current final-paper source. Its unsupported 811-FP diagnostic, outdated logistic calibration metric and causal inverse-ranking explanation must not be carried into the new paper. Original E3's six directed positives correspond to only three independent sessions. The new v7 all-pair task addresses training support in a different benchmark; its larger counts cannot be used to rewrite the original experiment's support. Historical frozen protocol text uses “continuous” language that the original one-second sampled truth does not establish.

The final starting point is [FINAL_PAPER_START_HERE.md](../paper/README.md), which defines the evidence hierarchy, detailed paper structure, frozen answers and required caveats. The extended prose is in `docs/ML_V7_MANUSCRIPT_DRAFT.md`. Historical files are preserved, and new code/results are not substituted into old provenance.

## Scope of correctness

Software tests, source/evidence integrity and independently recomputed arithmetic passed. The documented pipeline is finalized for this version. Synthetic error assumptions, matching tolerances and scenario realism remain modeling choices rather than externally proven truths. Actual hardware accuracy, dense hospital movement, cross-map generalization, clinical utility, complete wearable cost/battery life, standards compliance and novel-algorithm claims are not supported. Bibliography metadata and journal requirements still need checking during final paper preparation. These limits must appear in the paper rather than being treated as problems solved by passing tests.

No frozen model, target or sensor setting was changed and no prior evidence was deleted. Finalization adds a supplemental audit and writing guide, and clarifies README navigation. Future scientific changes require separately versioned experiments.

The official [Bluetooth Channel Sounding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/), [Bluetooth Direction Finding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/), [scikit-learn grouped evaluation documentation](https://scikit-learn.org/stable/modules/cross_validation.html), and [Qorvo DWM3001C product information](https://www.qorvo.com/products/p/DWM3001C) were rechecked during finalization. These support mechanism/evaluation background and hardware descriptions; they do not validate the assumed simulator error distributions. This limited source check does not constitute verification of the entire historical bibliography.
