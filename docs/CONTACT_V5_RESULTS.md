# Contact reconstruction v5: results and paper implications

Source: `C:\Users\ayyan\Downloads\MDR_SIM\MDR_SIM\results\contact-v5-evaluation`. Mode: evaluation; 30 seeds, three conditions, eight methods, 720 evaluations. Parameters were frozen before held-out execution; no development-based parameter adjustment occurred.

## Full comparison

F1, precision and recall are seed means. Counts are pooled across seeds within each condition. Each evaluation seed has three reference contacts. Precision is coded zero when no contact is predicted, so it differs from pooled precision when only some seeds predict contacts.

| Condition | Method | AoA arrays | TP | FP | FN | Mean F1 | Mean precision | Mean recall |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| independent | gateway-rssi | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| independent | rssi-raw | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| independent | rssi-tracked | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| independent | rssi-temporal | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| independent | rssi-angle2-raw | 2 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| independent | rssi-angle2-tracked | 2 | 3 | 0 | 87 | 0.050 | 0.100 | 0.033 |
| independent | rssi-angle2-temporal | 2 | 20 | 2 | 70 | 0.313 | 0.567 | 0.222 |
| independent | rssi-angle4-temporal | 4 | 88 | 31 | 2 | 0.849 | 0.770 | 0.978 |
| correlated-walls | gateway-rssi | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| correlated-walls | rssi-raw | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| correlated-walls | rssi-tracked | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| correlated-walls | rssi-temporal | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| correlated-walls | rssi-angle2-raw | 2 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| correlated-walls | rssi-angle2-tracked | 2 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| correlated-walls | rssi-angle2-temporal | 2 | 1 | 1 | 89 | 0.017 | 0.033 | 0.011 |
| correlated-walls | rssi-angle4-temporal | 4 | 34 | 11 | 56 | 0.451 | 0.631 | 0.378 |
| stress | gateway-rssi | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-raw | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-tracked | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-temporal | 0 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-angle2-raw | 2 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-angle2-tracked | 2 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-angle2-temporal | 2 | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 |
| stress | rssi-angle4-temporal | 4 | 1 | 1 | 89 | 0.017 | 0.033 | 0.011 |

## Paired seed contrasts

Pointwise 95% percentile intervals from 2000 paired seed resamples; not adjusted for multiple comparisons. A [0,0] interval in a zero-recovery condition is not evidence of universally zero benefit.

| Condition | Contrast | Mean F1 difference | Bootstrap interval |
|---|---|---:|---|
| independent | rssi-temporal minus rssi-raw | 0.000 | [0.000, 0.000] |
| independent | rssi-angle2-temporal minus rssi-temporal | 0.313 | [0.213, 0.407] |
| independent | rssi-angle4-temporal minus rssi-angle2-temporal | 0.536 | [0.432, 0.641] |
| correlated-walls | rssi-temporal minus rssi-raw | 0.000 | [0.000, 0.000] |
| correlated-walls | rssi-angle2-temporal minus rssi-temporal | 0.017 | [0.000, 0.050] |
| correlated-walls | rssi-angle4-temporal minus rssi-angle2-temporal | 0.434 | [0.312, 0.549] |
| stress | rssi-temporal minus rssi-raw | 0.000 | [0.000, 0.000] |
| stress | rssi-angle2-temporal minus rssi-temporal | 0.000 | [0.000, 0.000] |
| stress | rssi-angle4-temporal minus rssi-angle2-temporal | 0.017 | [0.000, 0.050] |

## Time recovery and latency

Event IoU >=.2 can count a substantially incomplete event as detected. The table below also reports the percentage of qualified reference pair-time missed. False-positive rate uses all negative pair-seconds and can look small because negatives are numerous; retain the false-session counts above. Time metrics use final qualified intervals retrospectively. Latency is the mean of per-seed medians among matched detections; its denominator excludes seeds with no match, so low values cannot establish high overall responsiveness.

| Condition | Method | Missed reference pair-time (%) | False-positive negative pair-time (%) | Conditional latency (s) | Latency-supported seeds |
|---|---|---:|---:|---:|---:|
| independent | rssi-temporal | 100.000 | 0.000 | — | 0 |
| independent | rssi-angle2-temporal | 93.171 | 0.032 | 70.500 | 18 |
| independent | rssi-angle4-temporal | 34.382 | 0.078 | 55.367 | 30 |
| correlated-walls | rssi-temporal | 100.000 | 0.000 | — | 0 |
| correlated-walls | rssi-angle2-temporal | 99.691 | 0.013 | 51.000 | 1 |
| correlated-walls | rssi-angle4-temporal | 80.943 | 0.014 | 63.045 | 22 |
| stress | rssi-temporal | 100.000 | 0.000 | — | 0 |
| stress | rssi-angle2-temporal | 100.000 | 0.000 | — | 0 |
| stress | rssi-angle4-temporal | 99.635 | 0.011 | 64.000 | 1 |

## Interpretation for the paper

The strongest observed method used four AoA arrays and both causal measurement/position processing and temporal decisions. It recovered substantially more events in the independent-noise condition than the tested RSSI-only or partial-upgrade methods. Its deterioration under correlated walls and stress conditions means that no deployment-ready accuracy claim is supported. The tested two-array diagonal placement does not establish a successful low-cost design. RSSI-only filtering lowered localization error in the easy condition without recovering qualified contact sessions; persistent bias can resist smoothing.

These methods trade hardware, filtering lag and false contacts against recovery. Neither low monetary cost nor superiority over all RSSI techniques follows: calibrated fingerprints, alternative placement, device-power calibration and learned radio models were not tested. The same-gateway control is not the exact original v3 pipeline. This fixture does not support replacing the hospital/E3 results or comparing them numerically against this campaign.

Keep the full adverse-condition table in the paper. Discuss incomplete duration recovery, false sessions, sparse conditional latency support and the assumed sensor model. Thirty seeds quantify within-fixture variability, not real-world generalization.

## Retained evidence and checks

`manifest.json` identifies the settings, seed split and protocol hash. `truth-*.json.gz` retains trajectories and reference decisions. `seed-*.json.gz` retains all raw received measurements, reconstructed positions, contact decisions and sessions. `per-seed-metrics.json`, `summary.json`, source hashes and artifact hashes remain available. The independent verifier reconstructs reference and predicted sessions and checks event counts, F1, pair-time errors and availability. It does not independently validate antenna physics, optimizer convergence or calibrated covariance.

Recreate this derived report from the same run:

`node research/contact-v5/report.mjs results/contact-v5-evaluation docs/CONTACT_V5_RESULTS_REPLAY.md`
