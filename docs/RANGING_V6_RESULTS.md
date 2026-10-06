# Phase/timing/UWB comparison: v6 results

Source: `C:\Users\ayyan\Downloads\MDR_SIM\MDR_SIM\results\ranging-v6-evaluation`. 30 evaluation seeds, six methods, two channel conditions, three background service loads: 1080 evaluations. The scored physical fixture has eight moving tags and three reference contacts per seed. Additional clients consume service slots only. See HOSPITAL_RANGING_V6.md for all sensor/scheduler assumptions.

These are **conditional simulation results**, not measured radio accuracy or a verified technology/cost ranking.

## Complete event comparison

Counts are pooled; F1/precision/recall are seed means. Precision is zero for a seed with no predictions. The passive RSSI/AoA branches repeat across service loads by design and are not independent replicates.

| Condition | Scheduled clients | Method | TP | FP | FN | Mean F1 | Mean precision | Mean recall | Availability |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| LOS | 8 | rssi-temporal | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 1.000 |
| LOS | 8 | aoa4-temporal | 88 | 31 | 2 | 0.847 | 0.765 | 0.978 | 1.000 |
| LOS | 8 | ble-pbr | 90 | 14 | 0 | 0.938 | 0.897 | 1.000 | 0.995 |
| LOS | 8 | ble-rtt | 21 | 4 | 69 | 0.306 | 0.489 | 0.233 | 0.995 |
| LOS | 8 | ble-pbr-rtt | 90 | 14 | 0 | 0.939 | 0.900 | 1.000 | 0.995 |
| LOS | 8 | uwb-ds-twr | 90 | 14 | 0 | 0.938 | 0.897 | 1.000 | 0.995 |
| LOS | 32 | rssi-temporal | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 1.000 |
| LOS | 32 | aoa4-temporal | 88 | 31 | 2 | 0.847 | 0.765 | 0.978 | 1.000 |
| LOS | 32 | ble-pbr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.472 |
| LOS | 32 | ble-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.471 |
| LOS | 32 | ble-pbr-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.470 |
| LOS | 32 | uwb-ds-twr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.472 |
| LOS | 128 | rssi-temporal | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 1.000 |
| LOS | 128 | aoa4-temporal | 88 | 31 | 2 | 0.847 | 0.765 | 0.978 | 1.000 |
| LOS | 128 | ble-pbr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.127 |
| LOS | 128 | ble-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.126 |
| LOS | 128 | ble-pbr-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.126 |
| LOS | 128 | uwb-ds-twr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.127 |
| wall-multipath | 8 | rssi-temporal | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.996 |
| wall-multipath | 8 | aoa4-temporal | 32 | 9 | 58 | 0.450 | 0.694 | 0.356 | 1.000 |
| wall-multipath | 8 | ble-pbr | 4 | 7 | 86 | 0.057 | 0.083 | 0.044 | 0.977 |
| wall-multipath | 8 | ble-rtt | 2 | 3 | 88 | 0.033 | 0.067 | 0.022 | 0.976 |
| wall-multipath | 8 | ble-pbr-rtt | 3 | 6 | 87 | 0.043 | 0.067 | 0.033 | 0.973 |
| wall-multipath | 8 | uwb-ds-twr | 79 | 33 | 11 | 0.783 | 0.723 | 0.878 | 0.977 |
| wall-multipath | 32 | rssi-temporal | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.996 |
| wall-multipath | 32 | aoa4-temporal | 32 | 9 | 58 | 0.450 | 0.694 | 0.356 | 1.000 |
| wall-multipath | 32 | ble-pbr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.443 |
| wall-multipath | 32 | ble-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.442 |
| wall-multipath | 32 | ble-pbr-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.436 |
| wall-multipath | 32 | uwb-ds-twr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.443 |
| wall-multipath | 128 | rssi-temporal | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.996 |
| wall-multipath | 128 | aoa4-temporal | 32 | 9 | 58 | 0.450 | 0.694 | 0.356 | 1.000 |
| wall-multipath | 128 | ble-pbr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.119 |
| wall-multipath | 128 | ble-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.119 |
| wall-multipath | 128 | ble-pbr-rtt | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.117 |
| wall-multipath | 128 | uwb-ds-twr | 0 | 0 | 90 | 0.000 | 0.000 | 0.000 | 0.119 |

## Localization and sustained-time recovery at eight clients

Position error is the mean of per-seed medians conditional on an available estimate. Availability is needed to interpret it; a low conditional error while missing most time is not good reconstruction. Time errors use final qualified intervals retrospectively. Latency and duration errors exclude unmatched events; consult per-seed artifacts for their support.

| Condition | Method | Conditional median-error summary (m) | Missed reference pair-time (%) | Conditional latency (s) | Latency-supported seeds |
|---|---|---:|---:|---:|---:|
| LOS | rssi-temporal | 3.196 | 100.000 | — | 0 |
| LOS | aoa4-temporal | 0.457 | 36.375 | 54.967 | 30 |
| LOS | ble-pbr | 0.154 | 8.212 | 38.667 | 30 |
| LOS | ble-rtt | 0.952 | 90.654 | 71.625 | 16 |
| LOS | ble-pbr-rtt | 0.154 | 8.940 | 38.800 | 30 |
| LOS | uwb-ds-twr | 0.102 | 8.258 | 38.733 | 30 |
| wall-multipath | rssi-temporal | 7.880 | 100.000 | — | 0 |
| wall-multipath | aoa4-temporal | 1.250 | 83.460 | 63.125 | 24 |
| wall-multipath | ble-pbr | 2.717 | 97.352 | 77.250 | 4 |
| wall-multipath | ble-rtt | 1.447 | 98.570 | 40.000 | 2 |
| wall-multipath | ble-pbr-rtt | 2.692 | 97.643 | 64.000 | 3 |
| wall-multipath | uwb-ds-twr | 0.635 | 38.443 | 57.033 | 30 |

## Paired contrasts against the angular baseline

Bootstrap units are seeds; 2000 paired resamples. Intervals are descriptive and pointwise, without multiplicity correction or a sensor-parameter uncertainty model.

| Condition | Clients | Contrast | Mean F1 difference | 95% percentile interval |
|---|---:|---|---:|---|
| LOS | 8 | ble-pbr minus aoa4-temporal | 0.091 | [0.055, 0.126] |
| LOS | 8 | ble-rtt minus aoa4-temporal | -0.542 | [-0.657, -0.430] |
| LOS | 8 | ble-pbr-rtt minus aoa4-temporal | 0.092 | [0.053, 0.130] |
| LOS | 8 | uwb-ds-twr minus aoa4-temporal | 0.091 | [0.056, 0.125] |
| LOS | 32 | ble-pbr minus aoa4-temporal | -0.847 | [-0.875, -0.821] |
| LOS | 32 | ble-rtt minus aoa4-temporal | -0.847 | [-0.875, -0.820] |
| LOS | 32 | ble-pbr-rtt minus aoa4-temporal | -0.847 | [-0.876, -0.820] |
| LOS | 32 | uwb-ds-twr minus aoa4-temporal | -0.847 | [-0.875, -0.821] |
| LOS | 128 | ble-pbr minus aoa4-temporal | -0.847 | [-0.874, -0.822] |
| LOS | 128 | ble-rtt minus aoa4-temporal | -0.847 | [-0.876, -0.821] |
| LOS | 128 | ble-pbr-rtt minus aoa4-temporal | -0.847 | [-0.873, -0.821] |
| LOS | 128 | uwb-ds-twr minus aoa4-temporal | -0.847 | [-0.875, -0.822] |
| wall-multipath | 8 | ble-pbr minus aoa4-temporal | -0.393 | [-0.493, -0.295] |
| wall-multipath | 8 | ble-rtt minus aoa4-temporal | -0.417 | [-0.523, -0.306] |
| wall-multipath | 8 | ble-pbr-rtt minus aoa4-temporal | -0.407 | [-0.498, -0.312] |
| wall-multipath | 8 | uwb-ds-twr minus aoa4-temporal | 0.333 | [0.238, 0.428] |
| wall-multipath | 32 | ble-pbr minus aoa4-temporal | -0.450 | [-0.537, -0.357] |
| wall-multipath | 32 | ble-rtt minus aoa4-temporal | -0.450 | [-0.538, -0.353] |
| wall-multipath | 32 | ble-pbr-rtt minus aoa4-temporal | -0.450 | [-0.545, -0.359] |
| wall-multipath | 32 | uwb-ds-twr minus aoa4-temporal | -0.450 | [-0.540, -0.356] |
| wall-multipath | 128 | ble-pbr minus aoa4-temporal | -0.450 | [-0.545, -0.357] |
| wall-multipath | 128 | ble-rtt minus aoa4-temporal | -0.450 | [-0.541, -0.360] |
| wall-multipath | 128 | ble-pbr-rtt minus aoa4-temporal | -0.450 | [-0.540, -0.356] |
| wall-multipath | 128 | uwb-ds-twr minus aoa4-temporal | -0.450 | [-0.536, -0.356] |

## Hospital interpretation

PBR and UWB both improve LOS contact recovery in this fixture, while the selected wall/multipath assumptions favor the UWB interval model. This does not demonstrate general UWB superiority: BLE uses a simple phase-slope estimator with dominant reflections, while UWB has an assumed positive wall bias. Neither error distribution was measured, and the commercial estimators/procedure budgets differ. RTT's assumed timing sigma also determines its weaker score.

All active methods lose contact recovery at the configured 32/128-client service loads. This follows from the chosen four clients/s schedule and three-second prediction expiry, not an intrinsic radio capacity. TDoA, faster procedures, additional gateways or adaptive scheduling could change it. Passive baselines do not model added crowd/advertisement congestion.

The defensible outcome is that accurate ranging and sufficient update service are both required. UWB belongs in the comparison; declaring it too expensive without complete wearable and infrastructure quotations is unsupported. BLE Channel Sounding is a candidate for an integrated low-cost wearable, but the simulator does not prove that it is cheapest.

## What can be stated in the manuscript

A controlled simulation compared RSSI/AoA reconstruction against phase-slope PBR, corrected RTT, PBR with timing consistency rejection, and UWB double-sided two-way timing. On 30 untouched seeds, the modeled precise-ranging branches improved LOS contact recovery; persistent reflected-path errors and sparse service harmed recovery. All phase/timing inputs, contact decisions and predictions were saved and independent contact arithmetic checks passed.

The paper must disclose assumed error distributions, the simplified channel/timestamp models, shared reception mask, eight scored tags, background-only service load, fixed fixture and unmeasured costs/energy. It must not turn these numerical results into hardware specifications, universal radio rankings or a hospital deployment recommendation.

## Reproduce this derived report

`node research/ranging-v6/report.mjs results/ranging-v6-evaluation docs/RANGING_V6_RESULTS_REPLAY.md`
