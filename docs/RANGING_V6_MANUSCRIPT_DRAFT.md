# Draft paper section: hospital ranging mechanisms

This draft supplements the earlier reconstruction study. It uses newly versioned simulations and must not relabel old results. Read `HOSPITAL_RANGING_V6.md` and the complete `RANGING_V6_RESULTS.md` before incorporating it.

## Objective and design

We compare BLE RSSI and angular reconstruction against phase-based ranging (PBR), round-trip timing (RTT), PBR with a timing consistency check, and UWB double-sided two-way ranging. The objective is to evaluate contact recovery alongside measurement availability and the hardware requirements relevant to wearable deployment in hospitals. ToF denotes propagation time; UWB is a radio technology implementing timing-based ranging, rather than a separate principle competing with RTT.

Eight moving tags in a controlled two-room fixture generated three sustained reference contacts per seed, with additional short, near-miss and cross-wall encounters. Reference contacts required consecutive sampled same-room separation <=2 m for at least 30 seconds. Thirty held-out seeds were separate from five development seeds, and settings were not changed after viewing either run's outputs. All methods used the same causal tracking/contact-decision framework and reference target.

The PBR sensor emitted wrapped phase over 72 synthetic tones through an ideal reciprocal direct/reflected channel, and inference fitted an unwrapped phase slope. RTT subtracted a reported response delay before propagation conversion. UWB inference estimated ToF from double-sided round/reply intervals with clock scale and timestamp noise. These are simplified mechanism models, not standards-compliant radio/controller or commercial algorithm implementations. The PBR/RTT branch applied a gross consistency gate and was not a security validation.

Two assumed propagation conditions represented LOS and wall/multipath effects. Additional client workloads produced service loads of 8, 32 or 128 clients, but only eight tags had simulated positions and contact labels. A common round-robin budget of four clients per second per anchor isolated update-availability effects. Actual technology-specific airtime, interference, connection overhead and energy were not measured.

## Results under stated assumptions

At eight clients in the LOS model, mean contact F1 was .847 for angular fusion, .938 for PBR, .306 for RTT, .939 for PBR/RTT, and .938 for UWB DS-TWR. The tested RSSI-only reconstruction recovered no qualified contacts. PBR and UWB each matched all 90 reference contacts but produced 14 false sessions. Mean per-seed median position errors were approximately .154 m for PBR and .102 m for UWB, conditional on availability. These numbers are model outcomes, not hardware accuracy claims.

In the wall/multipath condition, mean F1 was .450 for the angular baseline, .057 for PBR, .033 for RTT, .043 for PBR/RTT and .783 for UWB DS-TWR. UWB produced 79 matches, 33 false sessions and 11 missed contacts. This difference is conditional on the assumed reflected-path and timing-bias models. It does not establish that UWB outperforms advanced commercial PBR estimators or a calibrated BLE deployment.

At 32 and 128 scheduled clients, all active-ranging branches reconstructed zero sustained contacts under the deliberately limited service budget. In LOS, UWB's position availability fell from about .995 at eight clients to .472 and .127. The passive baselines remained unchanged because added advertisement congestion was not modeled. These outcomes illustrate the importance of update service and cannot be interpreted as intrinsic device-count limits of either radio.

## Hospital cost and implications

Accurate distance sensing alone did not establish accurate contact duration or an economical hospital deployment. Ranging wearable cost applies to every participating employee or patient, while anchor, calibration, backhaul, charging, handling and replacement costs apply to the system. Radio IC prices and integrated-module prices cannot substitute for comparable complete-wearable bills of materials.

BLE Channel Sounding is a plausible integrated-radio candidate for low-cost wearables; UWB remains a valid hospital comparator and potential primary technology. The selected simulator does not establish the lowest-cost option. Large-scale UWB TDoA and alternative CS scheduling architectures have different infrastructure and service burdens and were not evaluated by the TWR branch. Pairwise direct ranging would also require explicit candidate selection and workload analysis.

The supported contribution is a reproducible contact-level comparison of observable ranging mechanisms and update availability. Publication claims should remain simulation-conditional until the sensor distributions, procedure budgets and costs are justified with measurements or extensive sensitivity tests. Multiple realistic ward scenarios and untouched hardware/device/day validation are required before a deployment recommendation.

## Sources to integrate into the related-work section

- [Bluetooth SIG: Channel Sounding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/).
- [Bluetooth SIG: technical overview](https://www.bluetooth.com/channel-sounding-tech-overview/).
- [Qorvo: UWB topologies](https://www.qorvo.com/resources/d/qorvo-getting-back-to-basics-with-ultra-wideband-uwb-white-paper).
- [Rathje and Landsiedel: DS-TWR under multipath/NLOS](https://arxiv.org/abs/2410.12826).
- [Schex, Cremer and Dettmar: connectionless CS/PAwR](https://arxiv.org/abs/2605.17094v3).

Novelty cannot be based merely on adding established ranging methods. The full literature review, bibliographic formatting and the manuscript's final scope still require author decisions.
