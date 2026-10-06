# Angle-assisted contact reconstruction: development extension v4

This is a simulation-only research extension, separate from the supplied manuscript and corrected v3 hospital campaign. Original code and results retain their provenance. The implemented pilot is under `research/angular-v4/`; its results are under `results/angular-v4-pilot/`. It is a development experiment, not a new confirmatory result for the existing paper.

## Research question and related work

Can public gateway locations and noisy angular observations improve **sustained contact reconstruction**, and when does positioning improvement fail to improve contact detection? Evaluate contact recovery, false contacts, duration error and measurement availability, rather than treating localization error as a surrogate for contact accuracy.

Real BLE Angle of Arrival uses direction-finding signals and an antenna array at the receiver. Existing RSSI advertisements do not contain angle measurements that software can recover. The prototype assumes a calibrated gateway position and orientation and directly simulates a noisy bearing; it does not generate IQ samples or implement MUSIC/ESPRIT or antenna switching. This distinction must remain explicit. See the [Bluetooth SIG direction-finding overview](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/) and [Asset Tracking Profile](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/ATP_v1.0/out/en/index-en.html).

| Primary source | Consequence for this project |
|---|---|
| [Cominelli, Patras and Gringoli, 2019](https://arxiv.org/abs/1909.08063) | Experimental angular detection and multi-receiver positioning already exist; angular limitations matter. |
| [Paulino et al., 2022](https://arxiv.org/abs/2204.12188) | Real arrays derive angular information from CTE phase samples; an abstract angle-noise simulator is a different validation level. |
| [Fabris et al., AoA/RSSI/Kalman fusion, 2025](https://ieeexplore.ieee.org/document/10843768/) | Fusion and Kalman filtering are prior art, also cited by the supplied paper. Adding them alone is not a novelty claim. |

The proposed contribution is an evaluation of the relationship between angular uncertainty, gateway geometry, temporal continuity and contact reconstruction. Novelty remains a hypothesis requiring a wider literature comparison. No priority or publication-quality claim follows from this pilot.

## Implemented methods and controls

1. RSSI localization: multi-start damped Gauss-Newton in RSSI space, fixed -50 dBm reference at 1 m, path-loss exponent 2.5 and assumed 6 dB noise. At least three observations are required. Initialization uses public anchors only, never bearings.
2. Angle triangulation: least-squares intersection of bearing lines, at least two nonparallel bearings, rejecting solutions behind a measured ray. This algebraic baseline is not maximum-likelihood angular estimation.
3. Fusion: minimize normalized angular and RSSI residuals with damped Gauss-Newton, backtracking and observable initializations. Angular residuals wrap to [-pi, pi]. No truth bounds or hidden room information constrain solutions.
4. Robust fusion: the same fusion objective with Huber loss (transition 1.5 normalized residual units), isolating the effect of robust weighting. It does not produce calibrated contact probabilities.

Methods receive identical received packets and use identical distance/session decisions. No estimator receives true positions, distances, room membership, source status or contact labels. Truth exists only in sensor generation and evaluation. Measurements retain public anchor coordinates/orientations. RSSI-only never uses angle values, including for initialization; a regression test verifies this isolation.

The controlled fixture contains six moving devices in one 20 x 20 m room with four corner gateways. Three pairs approach, remain close and depart continuously; the reference contains three qualified contacts per seed. This deliberately tests identifiable contact events, without selecting seeds after inspecting outcomes. It is not a hospital scenario or a replacement for original mobility. Steps are 1 second for 240 seconds. All methods qualify <=2 m for at least 30 seconds of consecutive samples, duration last minus first; any negative or missing sample breaks the run. Greedy E1 matching uses IoU >=.2 and overlap >=5 seconds. No doubled directed records are used.

Development seeds are 401–405. Angular standard deviations 2°, 5° and 15° are assumed sensitivity values, not measured hardware specifications. RSSI noise is 6 dB; each gateway packet independently drops with probability .1. A synthetic-outlier condition biases .1 of potential measurements by +20° and -8 dB. It is not a physical multipath model. Paired random streams preserve reception and RSSI noise across angular conditions; each method sees the same measurements. The pilot has no receiver-sensitivity cutoff, advertisement jitter or BLE protocol scheduling.

Saved artifacts include reference trajectories, raw received measurements, every inferred position, detected sessions, per-seed metrics, the manifest and SHA-256 checksums. Localization error is conditional on availability; availability must be reported alongside it. Matched duration MAE excludes missed/false contacts and is null without matches. Primary contact scores still count missing detections as false negatives.

## Pilot findings and manuscript implications

For the LOS-labelled abstract sensor at assumed 2° noise, the mean of per-seed median localization errors is 6.990 m (RSSI), .494 m (angles), .424 m (fusion) and .425 m (robust fusion). Seed-mean contact F1 is respectively 0, .100, .200 and .200. Fusion recalls only .133 of reference contacts on average. Its mean localization availability is .997. Values are descriptive, from five development seeds.

In the 2° synthetic-outlier condition, robust fusion improves the mean per-seed median localization error to .548 m compared with .619 m for ordinary fusion, but **all four methods have zero contact recovery**. At 5° and 15°, contact recovery is also zero in this pilot. Small changes in estimated pair distance and missing observations fragment otherwise sustained events. This is a negative result about this temporal rule, not evidence that BLE AoA cannot work.

The paired seed bootstrap uses 2000 resamples, with fixed resampling seed 81729. It is exploratory: five seeds and zero-heavy outcomes can produce misleading degenerate intervals. The 2° LOS fusion-minus-RSSI F1 interval includes zero. These intervals are not confirmatory significance tests, and no universal superiority claim is supported.

Keep the supplied paper intact. A defensible extension section would explain that localization and contact reconstruction require separate validation, report the full noise/outlier matrix, and treat this experiment as a controlled feasibility study. Do not replace the existing v3 table with these numbers: population, environment, telemetry and temporal rules differ. Do not claim hardware validation, hospital realism, improved infection prediction or a new AoA algorithm.

## Next experiment before a stronger paper claim

Freeze a confirmatory protocol before executing reserved seeds 501–530; they have not been run. Development results may guide design, but cannot be presented as an untouched test set.

- Add the original gateway-co-observation method and a matched RSSI-only baseline on the *same new trajectories and packets*. Also keep the current strict temporal rule as an ablation. Explain any difference in modality or hardware budget.
- Evaluate causal constant-velocity Kalman/EKF tracking and a temporal contact model (hysteresis or a hidden Markov model). Fit noise/transition settings using development seeds only. Test latency and short false encounters, not only recovery of long contacts. Do not smooth with future samples in an online claim.
- Consider uncertainty-aware contact decisions from position covariance or particles, and check their calibration using held-out seeds. Measurement covariance must come from assumed/fitted sensor uncertainty, not actual errors against truth.
- Vary gateway count/layout, collinear geometry, orientation calibration bias, packet loss, angular outliers, contact distance near 2 m, encounter duration, movement speed, density and multi-room walls. Include doorway-constrained movement; never supply the true room label to inference. These dimensions are proposed, not implemented pilot features.
- Register primary contact F1/recall/false-contact rate, paired seed contrasts, availability and detection latency; report median/p95 localization error and duration MAE as secondary outcomes. Use seed-cluster uncertainty and report counts. Seeds, packets and directed records are different sampling units.
- Repeat across independently constructed scenarios. Increase repetitions based on a prespecified precision target rather than choosing favorable seeds. A simulation paper still needs sensitivity to assumptions and an explicit external-validity limit.

Raw IQ simulation/MUSIC, 3-D elevation, channel sounding and learned graph models should be separate future work with appropriate sensor or training data. Adding names without a validated input model and a fair baseline would reduce research quality.

## Reproduction

From the project root, with Node installed:

```powershell
node research/angular-v4/test.mjs
node research/angular-v4/pilot.mjs results/angular-v4-pilot-replay
node research/angular-v4/verify.mjs results/angular-v4-pilot-replay
node scripts/verifyArtifacts.cjs results/angular-v4-pilot-replay
node scripts/verifyArtifacts.cjs . results/angular-v4-pilot-replay/source-checksums.json
```

Use a fresh output directory; the runner refuses overwrite. No new dependency is required. `verify.mjs` independently reconstructs reference and predicted contacts and checks counts/F1/availability; it does not independently validate the entire optimizer or hardware model. Tests cover exact geometry, degenerate bearings, modality isolation, boundary/continuity rules and deterministic paired observations. The original v3 frozen source checksums still verify after this additive prototype.
