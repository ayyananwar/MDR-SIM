# Practical contact reconstruction: protocol v5

The objective is to improve sustained-contact recovery at the lowest defensible deployment cost. The comparison progresses from RSSI-only hardware and software improvements to partial and full angle-capable gateway upgrades. It does not assume that adding more named techniques automatically improves detection or lowers cost.

This is a separate, versioned benchmark. The v3 hospital campaign and v4 angular pilot are preserved. Code is in `research/contact-v5/`. Settings are registered in `protocol.mjs`, copied into each run's manifest and hashed before execution. Development seeds are 611–615; evaluation seeds are 701–730. No estimator or decision setting was changed after viewing the development outputs. Evaluation is held out from parameter selection, but this single simulated scenario family is not an external validation dataset.

## What is being tested

| Method | RSSI receivers | AoA receiver arrays | Processing |
|---|---:|---:|---|
| `gateway-rssi` | 4 | 0 | Same-gateway proximity control |
| `rssi-raw` | 4 | 0 | Robust nonlinear RSSI localization |
| `rssi-tracked` | 4 | 0 | Causal five-second median + constant-velocity Kalman tracking |
| `rssi-temporal` | 4 | 0 | Tracking + temporal contact decision |
| `rssi-angle2-raw` | 4 | 2 | Robust RSSI/bearing fusion |
| `rssi-angle2-tracked` | 4 | 2 | Filtered fusion + Kalman tracking |
| `rssi-angle2-temporal` | 4 | 2 | Tracking + temporal contact decision |
| `rssi-angle4-temporal` | 4 | 4 | Tracking + temporal contact decision |

The two-upgrade layout is fixed in advance at diagonal gateways g0 and g2. This is one placement, not a search for the cheapest optimal deployment. RSSI-only methods never receive bearings, even for initialization. The same received packet identities and RSSI measurements are used in every method within a condition. Bearings are exposed only at upgraded gateways. CTE airtime, angle-estimation compute and additional packet losses are not modeled; telemetry matching is an algorithm comparison, not a full radio-budget comparison.

The same-gateway control estimates range from RSSI, requires both devices to be within 2 m of a common gateway at a sampled time, and applies the shared strict session duration. It is **not an exact replay of the v3 edge pipeline**, which has its own event timing, median, gap and rounded-duration rules. Never substitute its values into the original paper table or describe it as the exact original baseline.

Position methods assign estimated room membership from the public floorplan and estimated coordinates. They receive no true room labels. This extra map-based functionality distinguishes them from the same-gateway control; compare RSSI localization against fusion to isolate the angular modality effect.

## Motion, reception and reference

Eight tags move continuously for 360 seconds in a 24 x 20 m space partitioned into two rooms at x=12 m, with a doorway at y=9–11 m. Four gateway poses are public. The controlled encounters include three qualified long contacts, an encounter shorter than 30 seconds, a near miss above 2 m, and two people physically close on opposite sides of the wall. Small shared motion is seed-dependent. No device crosses or teleports through a wall; these trajectories are controlled tests, not a comprehensive human-mobility model. At most one nominal observation per device/gateway/second is modeled.

Reference contacts require true separation <=2 m **and the same room** at consecutive one-second samples, with last minus first >=30 seconds. The reference is identical across methods and sensor conditions for a given seed. Short encounters, near misses and cross-wall adjacency must not become true contacts simply to improve a method's score.

| Condition | RSSI sigma | Bearing sigma | Temporal correlation | Per-tag RSSI bias sigma | Wall RSSI loss / bearing bias | Orientation error sigma | Bursts |
|---|---:|---:|---:|---:|---|---:|---|
| independent | 6 dB | 5° | 0 | 0 | 0 / 0° | 0° | none |
| correlated-walls | 6 dB | 5° | .8 | 2 dB | 6 dB / +8° | 2° | start probability .008/s, 3 s |
| stress | 8 dB | 10° | .9 | 4 dB | 10 dB / +15° | 4° | start probability .015/s, 5 s |

Both RSSI and bearing noise use an AR(1) process per device/gateway link; the listed sigmas are stationary standard deviations. Device and orientation biases persist through a run. Wall effects depend on a segment intersecting the partition outside the doorway. Independent packet loss is .1 and receiver sensitivity is -95 dBm; bursts can restart and extend. All values are assumed stress-test parameters, not fitted to a measured receiver. The inference noise settings remain nominal even in stress conditions; the estimator is not told the actual hidden bias or correlation.

An empirical measurement study reports substantial dependence of BLE RSSI on handset orientation, body absorption and environment ([Leith and Farrell, 2020](https://arxiv.org/abs/2006.06822)). This motivates testing bias and correlation; it does not empirically validate the numerical parameters above. A physical deployment needs measurements to calibrate them.

## Causal reconstruction

Raw localization minimizes Huber-weighted RSSI residuals and optional wrapped angular residuals using multi-start damped Gauss-Newton. Public anchor positions initialize the optimizer. No true position bounds, room membership or distance enters the objective. RSSI requires at least three receivers; with bearings, two receivers with angles suffice. These checks do not prove good geometric observability in every layout.

Filtered branches use a causal five-second median for RSSI and circular mean for angles. An absent packet does not become a fresh measurement merely because it remains in a filter history. Two independent position/velocity Kalman filters track x and y with acceleration variance .08 and position measurement variance 4 m² for RSSI or .64 m² for fusion. These are fixed engineering assumptions, not calibrated covariance estimates; coordinate errors can be correlated. Prediction expires after three seconds without a location measurement. The algorithm never reads future frames.

Strict decisions require estimated separation <=2 m and estimated same-room membership. The temporal branch instead decides contact when at least 70% of the previous ten one-second decisions, including the present one, are positive. It requires a full window and a current known pair estimate. Unknown decisions count as nonpositive; they cannot maintain a current contact. This is a causal occupancy rule, not an alteration of the reference contact definition. It can bridge brief negative decisions, but can also create false or delayed contacts. Those errors must be scored.

Every predicted contact requires at least 30 seconds of consecutive *output decisions*. Its earliest detection time is estimated start +30 s. Retrospective session intervals are reported separately from this online detection latency. Greedy one-to-one matching uses the same pair, IoU >=.2 and overlap >=5 seconds. A liberal event match can conceal incomplete duration recovery; therefore matched duration error and pair-time errors must accompany event F1.

Primary comparisons are paired seed F1 differences: RSSI temporal minus RSSI raw; two-angle temporal minus RSSI temporal; four-angle temporal minus two-angle temporal. Bootstrap intervals use 2000 paired seed resamples. They are pointwise descriptive intervals, with no multiple-comparison correction. Zero-heavy outcomes can yield degenerate intervals; never interpret those as universal certainty.

Report per-seed and pooled TP/FP/FN, precision/recall/F1, false-positive pair seconds, missed contact pair seconds, localization availability and error, conditional matched duration MAE and conditional latency. Latency is relative to reference start and can be negative for an early false onset; it is not wall-clock processing time. Pair-time metrics compare final qualified predicted sessions against final qualified reference sessions; they are retrospective, not streaming risk predictions. Missed contacts remain false negatives rather than being omitted when no location is available.

## Cost and practical deployment

Software filtering/tracking needs no added radio hardware, but has compute, maintenance and calibration costs. Angle measurements require direction-finding tags/signals and receiving arrays. An ordinary single-antenna RSSI gateway cannot gain AoA through a software update alone. Bluetooth's [direction-finding overview](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/) and Nordic's [direction-finding sample requirements](https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/samples/bluetooth/direction_finding_central/README.html) establish this distinction.

Use a symbolic budget until actual vendor quotations and a site survey exist:

`total = 8 * tag_cost + (4 - upgraded) * RSSI_gateway_cost + upgraded * AoA_gateway_cost + installation + calibration + compute + maintenance`.

The AoA tag cost may differ from the RSSI-only tag cost. An upgrade includes the array, switching, compatible receiver, firmware and angle processing; whether existing equipment can be reused must be established. Gateway counts alone do not prove monetary savings. This benchmark does not measure battery life, radio airtime, embedded runtime, required cabling or purchase prices.

Choose a deployment only after defining an acceptable recall, false-contact rate and latency under measured site conditions. The least expensive candidate that meets those constraints is the objective; a cheaper method that misses contacts is not a successful result. If two upgrades fail while four work, report that outcome rather than calling the two-gateway design low-cost and accurate.

## Reproduction and retained evidence

```powershell
node research/contact-v5/test.mjs
node research/contact-v5/run.mjs development results/contact-v5-development-replay
node research/contact-v5/run.mjs evaluation results/contact-v5-evaluation-replay
node research/contact-v5/verify.mjs results/contact-v5-evaluation-replay
node scripts/verifyArtifacts.cjs results/contact-v5-evaluation-replay
node scripts/verifyArtifacts.cjs . results/contact-v5-evaluation-replay/source-checksums.json
```

No new dependency is required. Output directories must be fresh. Per-seed artifacts use gzip JSON to preserve every received measurement, inferred position and contact decision without unnecessary duplication. The independent verifier reads them directly. Manifests, per-seed metrics, summaries and checksums remain plain JSON. A complete evaluation is 30 seeds x 3 conditions x 8 methods =720 method evaluations.

## What is still required for a stronger paper

This benchmark tests software and simulated sensor assumptions, not reality itself. It lacks real IQ data, antenna-array physics, real calibration measurements, device orientation/body geometry, interference and a BLE packet scheduler. It also lacks multiple independently designed scenario families, a receiver-count/layout search, a map/no-map ablation, and an exact matched replay of the original edge algorithm. Thirty seeds reduce sampling uncertainty within this fixture but cannot correct an unrealistic model.

The defensible paper contribution is a reproducible modality/software/cost progression and evidence of where improved localization does or does not recover contacts. Before recommending deployment, collect a small labelled hardware dataset with known separations, wall barriers, brief encounters, tag orientations and packet timestamps. Fit sensor/calibration settings using training sessions; validate contact performance on untouched people, devices, locations or days. Until then, describe the method as a simulation-tested candidate and report adverse conditions prominently.
