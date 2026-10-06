# Hospital study: BLE phase/timing ranging and UWB

## Why these techniques belong in the comparison

Include every technique requested, but distinguish mechanisms from radio technologies. BLE **Channel Sounding** offers Phase-Based Ranging (PBR) and Round-Trip Timing (RTT), independently or together. PBR estimates distance from phase variation over frequency; RTT uses propagation timing. Ordinary BLE advertisements do not provide these measurements. [Bluetooth SIG Channel Sounding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/) explains the distinction.

**Time-of-flight (ToF)** is a propagation principle, not a separate competing radio. RTT measures a round trip, so the propagation distance is half the corrected round-trip delay times light speed. UWB can implement two-way ToF ranging and other topologies. Comparing RTT against ToF without stating the radio, clock model and protocol is ambiguous. [Qorvo's UWB topology overview](https://www.qorvo.com/resources/d/qorvo-getting-back-to-basics-with-ultra-wideband-uwb-white-paper) distinguishes TWR and TDoA.

UWB is a legitimate hospital candidate; Qorvo lists staff/patient location among its [DWM3001C applications](https://www.qorvo.com/products/p/DWM3001C). There is no scientific reason to exclude it solely because the original project used BLE. Its wearable, infrastructure, power and deployment costs must be included rather than assumed away.

| Candidate | What the wearable needs | What infrastructure needs | Principal research issue |
|---|---|---|---|
| BLE RSSI | Ordinary compatible BLE tag | BLE receivers | Cheap sensing can have substantial orientation, bias and multipath error |
| BLE RSSI + AoA | Direction-finding signals/compatible tag | Array receiver and calibration | Anchor geometry, angular error and array upgrade cost |
| BLE PBR | Channel-Sounding-capable radio and firmware | Compatible ranging counterpart | Phase calibration, multipath, ambiguity and scheduling |
| BLE RTT | Channel-Sounding timing support | Compatible counterpart | Timing precision, exchange count and residual timing errors |
| BLE PBR + RTT | Both capabilities | Same compatible counterpart | Coarse timing consistency does not remove common NLOS bias |
| UWB two-way ToF | UWB radio/tag | UWB ranging anchors/counterparts | Antenna delay, blocked first path, update rate and wearable cost |
| UWB TDoA (future extension) | UWB transmitting tag | Synchronized receiving anchors/backhaul | Clock infrastructure and a different scaling/energy model |

BLE Channel Sounding is not synonymous with AoA. It can operate with a single antenna path, avoiding a mandatory AoA array; multiple antenna paths may improve robustness. Nordic documents an [initiator sample configured for one antenna path](https://nrfconnectdocs.nordicsemi.com/ncs/latest/nrf/samples/bluetooth/channel_sounding/ipt_initiator/README.html) and [Channel Sounding support in nRF54L devices](https://docs.nordicsemi.com/r/bundle/ps_nrf54l15/page/keyfeatures_html5.html?contentId=5PO~hYd6oGhQklDhdO5NwQ). The actual part, supported feature and firmware must be specified, not merely a Bluetooth version number.

## Implemented versioned comparison

`research/ranging-v6/` adds four mechanism branches: `ble-pbr`, `ble-rtt`, `ble-pbr-rtt` and `uwb-ds-twr`. It reruns `rssi-temporal` and `aoa4-temporal` on the same new seeds and trajectories as matched baselines. V3, v4 and v5 outputs remain identified and unchanged.

Five development seeds are 811–815; thirty held-out evaluation seeds are 901–930. Settings were frozen before evaluation, without tuning to either run's result. Each seed compares six methods, two propagation conditions and three service loads: **1080 method evaluations** for the held-out run. These are factors within a seed, not 1080 independent statistical units.

The physical fixture, public floorplan, four anchors, eight scored tags, 2 m same-room reference and 30-second contact span are inherited from v5. Every method uses the same causal ten-second occupancy rule, seven positive decisions required, three-second prediction expiry and contact matching policy. Additional 24 or 120 clients generate scheduled background demand only. Their positions and contacts are not simulated: the 32/128-client cases test service availability, not physical hospital crowd geometry.

### PBR mechanism

The sensor constructs an ideal reciprocal channel with a direct path and optional reflected path. The combined round-trip phase is twice the complex channel phase, plus a constant nuisance offset and noise. It emits 72 wrapped phase samples over synthetic uniformly spaced tones (2402 MHz start, 1 MHz increment). **This is not the exact Bluetooth channel map or controller/IQ implementation.** Actual Channel Sounding uses a defined channel map and procedure; see the [SIG technical overview](https://www.bluetooth.com/channel-sounding-tech-overview/).

Inference unwraps neighboring tone phases and fits a slope. Under the ideal model:

`distance = phase_slope * c / (4*pi)`.

The single-path exact-geometry test verifies wrapping and constant-offset invariance. A persistent assumed calibration bias sigma .15 m is included. Phase noise sigma is .25 rad in LOS and .5 rad in the wall-multipath condition. Blocked wall links in the latter include a reflected path with amplitude 1.4 relative to the direct path and 2 m excess path length. These are assumed examples, not calibrated hospital channels.

This is a **phase-slope PBR baseline**, not an implementation of advanced IFFT, MUSIC or vendor multipath estimators. A failure of this estimator under a dominant reflection does not establish failure of commercial BLE Channel Sounding. Ideal phase reciprocity/offset cancellation is assumed; real oscillator and per-channel hardware errors remain unmodeled.

### RTT mechanism

The sensor emits elapsed and reported-turnaround times in nanoseconds. Inference subtracts the turnaround before conversion:

`distance = c * (elapsed - reported_turnaround) / 2`.

The assumed residual timing sigma is 10 ns, corresponding to approximately 1.5 m range sigma for one corrected RTT observation. Calibration bias sigma is .3 m. Wall links add 1.5 m positive bias in the wall condition. These values are stress-test assumptions, **not the specification's RTT accuracy**. Changing timestamp precision or averaging exchange counts changes performance and service/energy costs. Do not infer that BLE RTT necessarily has the accuracy of this particular baseline.

The combined PBR/RTT branch rejects a PBR range when its difference from RTT exceeds three times the root-sum-square of their nominal range sigmas. It otherwise keeps PBR; it is a consistency gate, not statistically optimized fusion, a multipath correction or a cryptographic security test. Similar reflected-path biases can pass both measurements.

### UWB double-sided two-way ToF mechanism

The sensor emits four measured round/reply intervals with independent clock scales of +20 and -15 ppm and assumed interval noise sigma .4 ns. Inference uses:

`ToF = (roundA*roundB - delayA*delayB) / (roundA + roundB + delayA + delayB)`;

`distance = c * ToF`.

Calibration bias sigma is .1 m; blocked links add .8 m positive bias in the wall condition. Double-sided timing suppresses large first-order clock effects but does not eliminate antenna delay or NLOS bias. Tests check timing units and the noiseless residual with skew. The implementation does not generate UWB pulses, CIR samples, first-path detection, IEEE frames or commercial firmware.

[Rathje and Landsiedel's primary study](https://arxiv.org/abs/2410.12826) analyzes DS-TWR bias/variance and validates it with UWB experiments. Its existence supports studying timing bias, not the assumed numerical values in this prototype. Different assumed PBR/UWB wall errors can drive the comparison; therefore the results cannot rank the technologies without measured or justified parameter distributions and sensitivity analysis.

### Localization and contact reconstruction

At least three current anchor ranges feed robust nonlinear 2-D multilateration. Ranges are causally median-filtered over five seconds; absent measurements are not refreshed from history. Position/velocity Kalman tracking uses the same v5 motion assumptions, with assumed position variance .16 m² for PBR/UWB and 4 m² for RTT. All ranges, positions and uncertainties are observable or fixed engineering settings; no estimator receives true distance, a wall/NLOS flag or the true room label.

Public floorplan geometry classifies the room from estimated coordinates. This is necessary because accurate range alone does not distinguish a genuine encounter from close adjacency across a wall. The physical reference remains unchanged. Event F1, TP/FP/FN, pair-time misses/false positives, availability, conditional position error and conditional latency are retained.

## Hospital scale: do not confuse precision with service availability

The ranging scheduler assumes four completed client exchanges per anchor per second, with the same round-robin batch at all four anchors. A tag's nominal update interval is clients/4 seconds: 2 s for eight clients, 8 s for 32 and 32 s for 128. No future prediction or hidden geometry bridges a long missing update.

**Four exchanges/s is an application assumption, not a measured BLE or UWB capacity limit.** Actual CS procedures, UWB exchanges, collisions, connection setup, RF coexistence and durations differ. The study equalizes the service allocation to expose its effect; it does not equalize airtime, battery energy or protocol efficiency. Eight tags are scored, while the scheduler also accounts for background clients. A measurement failing the common reception mask has no retry.

Passive RSSI/AoA baselines are reused across service loads because their simulated advertisements do not consume this active-ranging queue. Advertisement/CTE congestion and the physical effect of additional people are not modeled, so their apparent load invariance is a control assumption, not proof of unlimited scalability.

At a low configured service rate, all active-ranging methods can fail even when conditional range error is small. Such an outcome argues for scheduling/update-budget experiments, not discarding UWB. UWB TDoA exchanges a different tag/anchor burden: tags broadcast, but anchors need synchronization and backhaul. It is not implemented here and must not inherit TWR scores. Recent [connectionless Channel Sounding research using PAwR](https://arxiv.org/abs/2605.17094v3) also studies more scalable coordination; it is a research architecture, not a capability demonstrated by this simulator.

For a stronger publication, sweep measured service rate and procedure length, implement energy accounting and adaptive scheduling, and test multiple wards/physical crowds. If direct tag-to-tag ranging is added, avoid attempting every pair: pair counts grow as N(N-1)/2. RSSI-triggered candidates should be selected from observations and their missed-candidate rate evaluated, never selected using true contacts.

## Cost for employees and patients

Use complete wearable and infrastructure costs, not just radio IC prices:

`total = N*complete_tag_cost + A*installed_anchor_cost + calibration + backhaul/server + spares + replacement/charging/cleaning labor + maintenance`.

Tag cost includes radio/MCU, antennas, PCB, battery/power, enclosure, assembly, firmware provisioning and relevant product validation. Hospital use adds practical requirements such as a reusable enclosure and handling workflow; these are not simulated. An additional 10 currency units per wearable adds 10,000 for 1000 wearables, before infrastructure. Patients' turnover and lost devices can matter as much as initial purchase cost.

BLE Channel Sounding deserves study as a potentially economical integrated-radio alternative to array gateways or an additional UWB radio. **This is a design hypothesis**, not a cost result. UWB should remain the accuracy/capacity comparator and may be a viable primary technology where its deployment economics work. A hybrid rollout could allocate advanced tags by ward or cohort, but it cannot claim accurate ranging for a pair whose members lack compatible hardware.

As an illustrative procurement snapshot checked 6 October 2026, Qorvo's [DWM3001C store listing](https://store.qorvo.com/products/detail/dwm3001c-qorvo/692453/) quoted USD43.18/module at 100–249 pieces. It integrates UWB and BLE functionality and is not a finished wearable. It is also not the cheapest possible UWB design or a high-volume quote. Nordic's [nRF54L15 distributor listing](https://www.mouser.com/en/ProductDetail/Nordic-Semiconductor/NRF54L15-QFAA-R?qs=QpmGXVUTftHTOlr7aJcAUw%3D%3D) showed USD3.19 for a bare SoC at 100 pieces. **Those prices are not comparable product bills of materials**; do not use their ratio to claim a cost advantage. Obtain matching finished-tag quotes and infrastructure/maintenance costs for a publication cost table.

## Reproduction and paper scope

```powershell
node research/ranging-v6/test.mjs
node research/ranging-v6/run.mjs development results/ranging-v6-development-replay
node research/ranging-v6/run.mjs evaluation results/ranging-v6-evaluation-replay
node research/ranging-v6/verify.mjs results/ranging-v6-evaluation-replay
node scripts/verifyArtifacts.cjs results/ranging-v6-evaluation-replay
node scripts/verifyArtifacts.cjs . results/ranging-v6-evaluation-replay/source-checksums.json
```

Fresh output directories are required. No additional dependency is needed. Raw phase vectors, RTT intervals, DS-TWR intervals, received BLE observations, reference geometry, every predicted position/decision/session and hashes are retained as compact gzip JSON where appropriate. The independent verifier reconstructs sessions and checks contact counts, F1, pair-time errors, availability and the observable scheduler allocation. It does not validate RF hardware, security or standards compliance.

The paper can present this as a controlled comparison of ranging mechanisms and update availability. It must not claim hardware accuracy, validated hospital deployment, an intrinsically poor RTT/UWB capacity, general superiority of UWB over Channel Sounding, or verified minimum cost. Before publication, add justified sensor distributions/sensitivity sweeps, procedure-specific workload/energy measurements, realistic scenario families and either hardware validation or a clearly simulation-only scope.
