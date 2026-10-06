# BLE / RF Observation Model Specification (Phase 2)

## 1. Scientific Role & Architectural Separation

Phase 2 introduces the **BLE Observation Model**, which converts hidden physical simulation states into realistic, noisy, incomplete synthetic sensor observations captured by edge gateways.

```text
┌─────────────────────────────────┐
│     Scenario & Clock Engine     │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      True Physical State        │
│   (Positions, Rooms, Seconds)   │
└────────┬───────────────┬────────┘
         │               │
         ▼               ▼
┌──────────────────┐   ┌────────────────────────────────┐
│   Ground Truth   │   │  Phase 2 BLE Observation Model │
│  Contact Engine  │   │  (Noisy RSSI, Advertisements)  │
└──────────────────┘   └────────────────┬───────────────┘
                                        │
                                        ▼
                       ┌────────────────────────────────┐
                       │  Future Contact Detector       │
                       │  (Phase 3 - Consumes BLE Only) │
                       └────────────────────────────────┘
```

### Critical Observation Boundary Rule
The observation generator uses true metric positions internally to compute distance-dependent path loss and antenna-to-gateway geometry. However, **emitted `BLEObservation` objects strictly omit**:
- `trueDistanceMeters`
- `personId`
- `personName`
- `role`
- `sourceStatus`

The future Phase 3 contact detector must operate strictly on observable data (`wearableId`, `gatewayId`, `timestamp`, `eventIndex`, `rssiDbm`, `advertisementType`).

---

## 2. Advertising Event Model & Timing Jitter

Wearable beacons emit advertising packets at a configured periodic interval perturbed by random delay jitter:

$$t_{k+1} = t_k + T_{\text{interval}} + \Delta_{\text{jitter}}$$

where:
- $T_{\text{interval}} = \text{advertising.intervalMs}$ (e.g., $500\text{ ms}$)
- $\Delta_{\text{jitter}} \sim \text{Uniform}[\text{jitterMinMs}, \text{jitterMaxMs}]$ (e.g., $[0, 10\text{ ms}]$)

This models the Bluetooth advertising event timing perturbation (`advDelay`) designed in the specification to mitigate persistent RF collisions between uncoordinated transmitters.

---

## 3. Log-Distance Path Loss & Shadow Fading Model

The Received Signal Strength Indicator (RSSI) between a wearable at $(x_w, y_w)$ and a gateway at $(x_g, y_g)$ is computed as:

$$d = \sqrt{(x_w - x_g)^2 + (y_w - y_g)^2}$$

$$RSSI(d) = A_0 - 10n \log_{10}\left(\frac{\max(d, d_{\min})}{d_0}\right) + \Delta_{\text{device}} + \Delta_{\text{env}} + X_\sigma$$

where:
- $d_0$: Calibration reference distance (typically $1.0\text{ m}$).
- $A_0$: Reference RSSI at distance $d_0$ (e.g., $-50.0\text{ dBm}$).
- $n$: Path-loss exponent (e.g., $2.5$ for indoor hospital ward clutter).
- $d_{\min}$: Minimum evaluation distance ($0.1\text{ m}$) ensuring finite signal strength and eliminating $\log_{10}(0)$ mathematical singularity.
- $\Delta_{\text{device}}$: Optional hardware antenna calibration offset.
- $\Delta_{\text{env}}$: Optional room-specific attenuation offset.
- $X_\sigma \sim \mathcal{N}(0, \sigma^2)$: Log-normal shadow fading modeled via Box-Muller Gaussian transform using the seeded PRNG.

---

## 4. Reception & Packet Loss Model

A gateway receives an emitted advertising event only if:
1. **Sensitivity Floor**:
   $$RSSI \ge \text{receiverSensitivityDbm} \quad (\text{e.g. } -95.0\text{ dBm})$$
   Signals arriving below the receiver noise floor are discarded.
2. **Stochastic Channel Loss**:
   $$u \sim \text{Uniform}[0, 1) \implies u \ge P_{\text{loss}}$$
   Uncorrelated Bernoulli packet drops model channel interference, CRC checksum failures, and packet collisions.

### Multi-Gateway Reception
Because advertising packets are broadcast omnidirectionally over the air, a single transmission event may be intercepted simultaneously by multiple gateways within line-of-sight or reception range. Each receiving gateway logs an independent observation record tagged with the common `eventIndex`.

---

## 5. Parameter Provenance

| Parameter | Default Value | Source | Scientific Rationale |
|---|---|---|---|
| `referenceDistanceMeters` | $1.0\text{ m}$ | Simulation / Standard | Standard Bluetooth SIG 1m calibrated TX power baseline. |
| `referenceRSSIDbm` | $-50.0\text{ dBm}$ | Simulation / Calibration | Typical 0 dBm EIRP transmitter measured at 1 meter in indoor line-of-sight conditions. |
| `pathLossExponent` | $2.5$ | Literature | Indoor semi-obstructed hospital wards (Rappaport, Wireless Communications). |
| `noiseSigmaDb` | $6.0\text{ dB}$ | Simulation / Literature | Empirical standard deviation of indoor log-normal multipath clutter. |
| `minimumDistanceMeters` | $0.1\text{ m}$ | Simulation | Mathematical boundary clamp to prevent $\log_{10}(0) = -\infty$. |
| `packetLossProbability` | $0.05$ ($5\%$) | Simulation | Baseline unacknowledged broadcast packet loss rate. |
| `receiverSensitivityDbm`| $-95.0\text{ dBm}$ | Hardware Spec | Typical BLE SoC receiver sensitivity floor (e.g. Nordic nRF52840 / ESP32). |

---

## 6. What Is NOT Simulated (Model Limitations)

To preserve scientific rigor, the following physical phenomena are explicitly **not modeled** in Phase 2:
- **No Radio-Frequency Waveforms**: We do not simulate GFSK modulation, carrier frequency offsets, or IQ constellation diagrams.
- **No Channel Hopping Dynamics**: Packets are not explicitly partitioned across primary advertising channels 37, 38, and 39.
- **No 3D Antenna Radiation Patterns**: Transmitter and receiver antennas are modeled as isotropic 2D points without polarization or null zones.
- **No Dynamic Body Shadowing**: The human body is not modeled as a frequency-selective dielectric cylinder.
- **No Real Hardware Measurements**: Parameters are experimental configurations, not empirical measurements from physical hospital ESP32 or Raspberry Pi gateways.
