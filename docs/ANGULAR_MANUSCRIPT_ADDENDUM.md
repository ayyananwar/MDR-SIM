# Draft manuscript extension: angle-assisted reconstruction

**Status:** supplementary development study. These results are separate from the corrected v3 hospital campaign. Incorporate this section only with its assumptions and limitations; it does not validate the original manuscript's broader claims.

## Objective and relation to prior work

We investigate whether lower localization error translates into improved reconstruction of sustained proximity contacts. BLE direction finding supports angular measurement using specialized receiver arrays and direction-finding signals [1]. Multi-receiver angular positioning and AoA/RSSI fusion are established research directions [2–4]. Our development study therefore evaluates the interaction between sensor uncertainty and contact-session continuity, rather than claiming a new angular measurement or fusion principle.

## Methods

We generated continuous controlled trajectories for six devices in a single 20 x 20 m room, observed by four corner gateways over 240 seconds at 1-second intervals. Three pairs approached, remained within 2 m and separated, producing three reference contacts per seed. Five development seeds (401–405) were specified before execution. Reference sessions required consecutive qualifying samples for a last-to-first span of at least 30 seconds.

Synthetic bearings were perturbed by zero-mean Gaussian errors with assumed standard deviations of 2°, 5° or 15°. RSSI followed a log-distance model with reference power -50 dBm at 1 m, exponent 2.5 and Gaussian noise of 6 dB. Potential gateway observations were independently dropped with probability .1. An additional synthetic-outlier condition biased .1 of observations by +20° and -8 dB. These assumptions describe an abstract sensor model, not measured hardware performance or physical multipath propagation.

We compared RSSI-only nonlinear localization, bearing-line triangulation, normalized angular/RSSI nonlinear fusion and Huber-robust fusion. Received observations were matched across methods, and random draws were paired across sensor conditions. Inference used only measurements and calibrated public gateway poses. Hidden coordinates were reserved for measurement generation and evaluation. No temporal smoothing, room oracle or truth-based position constraint was used.

All methods applied the same 2 m decision and 30-second continuity rule; missing or negative samples interrupted a session. Contact matching required the same pair, interval IoU >=.2 and overlap >=5 seconds, using greedy one-to-one matching. We retained per-seed trajectories, measurements, predictions, detected contacts and checksum manifests. Localization error was evaluated conditional on a position estimate, with availability reported separately.

## Development results

At assumed 2° angular noise, results were as follows. Localization values are means of per-seed median errors, not a pooled median. Contact values are seed means.

| Method | LOS-labelled median-error summary (m) | Contact F1 | Contact recall | Synthetic-outlier median-error summary (m) | Outlier contact F1 |
|---|---:|---:|---:|---:|---:|
| RSSI | 6.990 | .000 | .000 | 8.181 | .000 |
| Angle triangulation | .494 | .100 | .067 | .696 | .000 |
| Fusion | .424 | .200 | .133 | .619 | .000 |
| Robust fusion | .425 | .200 | .133 | .548 | .000 |

Mean position availability in the 2° LOS-labelled condition was .950 for RSSI, .996 for triangulation and .997 for either fusion method. At 5° and 15°, all methods recovered zero qualified contacts in both conditions. Full results, including per-seed TP/FP/FN, p95 localization errors and conditional matched-duration errors, are preserved in `results/angular-v4-pilot/`.

Exploratory paired seed bootstrap resampling (2000 resamples) gave a fusion-minus-RSSI F1 difference of .200 with percentile interval [0, .400] in the 2° LOS-labelled condition. Five development seeds and sparse detections do not support confirmatory inference. Degenerate intervals in zero-recovery conditions should not be interpreted as certainty about population performance.

## Interpretation and next validation

Angular information substantially reduced localization error under these assumptions, while sustained-contact recovery remained low. Even robust fusion's lower localization error under synthetic outliers did not yield qualified contacts. Instantaneous distance errors and missing estimates can fragment a sustained event when every sampled decision must be positive. These findings motivate evaluating causal tracking and uncertainty-aware temporal contact decisions, together with their false-contact rate and latency.

The controlled trajectories are not representative hospital mobility, and the model omits IQ processing, antenna geometry, receiver sensitivity, advertisement scheduling and physical multipath. The comparison also lacks the original gateway-co-observation baseline on matched trajectories. Accordingly, these numbers cannot replace the original campaign or establish clinical utility, hardware accuracy, universal fusion superiority or algorithmic novelty. A locked multi-scenario protocol with untouched seeds and matched baselines is required before making stronger claims.

## Primary sources

1. Bluetooth SIG, [Direction Finding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/).
2. Cominelli, Patras and Gringoli, [Dead on Arrival: An Empirical Study of the Bluetooth 5.1 Positioning System](https://arxiv.org/abs/1909.08063), 2019.
3. Paulino et al., [Design and Experimental Evaluation of a Bluetooth 5.1 Antenna Array for Angle-of-Arrival Estimation](https://arxiv.org/abs/2204.12188), 2022.
4. Fabris et al., [AoA and RSSI-Based BLE Indoor Positioning System With Kalman Filter and Data Fusion](https://ieeexplore.ieee.org/document/10843768/), 2025.

Check final bibliographic metadata and journal formatting before submission. These sources establish related work and the sensor distinction; they do not establish this prototype's numerical validity.
