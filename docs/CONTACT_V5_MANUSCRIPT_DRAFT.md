# Draft replacement research direction

Suggested title: **Hardware and Temporal Trade-offs in BLE Contact Reconstruction: A Controlled Simulation Study**.

This is a draft section for a revised or supplementary study. It does not rewrite the supplied manuscript or replace its original evidence. Final claims must incorporate the full protocol and result tables in `CONTACT_RECONSTRUCTION_V5.md` and `CONTACT_V5_RESULTS.md`.

## Study objective

We evaluate a progression from RSSI-only contact reconstruction to causal filtering and tracking, partial angular sensing and full angular sensing. The objective is to identify contact-recovery benefits relative to hardware requirements, rather than optimize localization error alone. Angle measurements and temporal processing are established techniques; the study's proposed contribution is their controlled evaluation against sustained contacts, including false events, duration coverage and sensor failures. A broader literature review remains necessary before claiming novelty.

## Experimental design

A registered simulation protocol used eight continuously moving tags, four fixed gateways and a public two-room floorplan over 360 seconds. Controlled trajectories included long contacts, a short encounter, a near miss and close adjacency across a separating wall. A geometric reference required same-room separation <=2 m for at least 30 seconds of consecutive one-second samples. The reference was held fixed across methods and observation conditions.

We compared eight configurations: same-gateway RSSI co-observation; RSSI localization; RSSI with causal filtering and Kalman tracking; RSSI tracking with a temporal contact rule; RSSI plus bearings at two gateways, with and without tracking and temporal decisions; and temporal fusion with bearings at all four gateways. Angular inputs were removed from RSSI-only methods. All configurations shared matched reception and RSSI observations within a condition, although additional direction-finding airtime was not modeled.

Five development seeds were separate from 30 held-out evaluation seeds. Model parameters were fixed before the evaluation run, without adjustment after inspecting development results. Three observation conditions increased temporal correlation, persistent device/calibration bias, wall effects and burst loss. Bearings were simulated directly; the model did not reproduce IQ processing or an antenna array. Public floorplan geometry was used to assign estimated room membership from inferred positions, without revealing true room labels.

Primary evaluation used seed-mean event F1, with precision, recall and TP/FP/FN reported alongside paired seed bootstrap contrasts. Matching required the same pair, IoU >=.2 and overlap >=5 seconds. Secondary evaluation included missed reference pair-time, false-positive pair-time, position availability, conditional duration error and detection latency. Temporal inference could tolerate brief negative decisions, but the physical reference definition was unchanged.

## Results

In the independent-noise condition, four-gateway angular fusion with causal and temporal processing achieved mean F1 .849 and mean recall .978. Across 90 reference contacts it produced 88 true-positive matches, 31 false-positive sessions and two missed contacts. Two-gateway temporal fusion achieved mean F1 .313 and recall .222, with 20 matches, two false sessions and 70 missed contacts. The tested RSSI-only configurations reconstructed no qualified contacts under the specified settings.

Four-gateway temporal fusion's F1 fell to .451 under correlated noise, wall effects and persistent bias, and to .017 under the stress condition. In the correlated-wall condition it produced 34 matches, 11 false sessions and 56 missed contacts. Thus, the favorable independent-noise result did not establish robustness to deployment-like failures. The complete eight-method matrix and paired contrasts should remain visible in the paper, including negative outcomes.

Event recovery also exceeded duration recovery. Even in the independent-noise condition, the four-gateway method missed about 34.4% of qualified reference pair-time. The mean of per-seed median detection latencies among matched contacts was about 55.4 seconds from reference onset. These quantities prevent the event recall from being interpreted as near-complete recovery of contact duration or immediate detection.

## Deployment and limitations

Software filtering and tracking add no receiving arrays, whereas angular sensing requires compatible direction-finding tags/signals and antenna-array receivers. Gateway upgrade counts are therefore useful hardware-budget indicators, but not measured monetary costs. The two-upgrade configuration did not meet a high-recovery objective in this study. The results do not justify describing that design as both low-cost and accurate.

The model is a controlled simulation, not a hardware validation. Sensor distributions and Kalman covariances are assumed; wall effects are abstract; BLE scheduling, body geometry, interference, calibration labor, power consumption and embedded runtime are not measured. The same-gateway control differs from the original v3 implementation. Repeated seeds in one trajectory family cannot establish hospital generalization or superiority over all RSSI approaches. Further work should assess receiver placement, site-calibrated RSSI methods and measured sensor data, then validate an unchanged reconstruction protocol on untouched devices, locations and days.

The strongest supported conclusion is that the tested temporal angular-fusion configuration improved contact-event recovery under favorable simulated conditions, while sparse angular coverage and persistent radio errors remained substantial obstacles. This is an evidence-based candidate for further evaluation, not a demonstrated minimal-cost deployment.

## Relevant primary sources

- [Bluetooth SIG: Direction Finding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/) — sensor requirements.
- [Nordic: direction-finding central sample](https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/samples/bluetooth/direction_finding_central/README.html) — receiver-array and CTE implementation requirements.
- [Leith and Farrell, BLE RSSI proximity evaluation](https://arxiv.org/abs/2006.06822) — empirical sensitivity to device orientation and environment.
- [Fabris et al., AoA/RSSI/Kalman fusion](https://ieeexplore.ieee.org/document/10843768/) — related work; fusion alone is not a novelty claim.
