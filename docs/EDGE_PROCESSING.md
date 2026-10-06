# Edge Processing & Contact Detection Specification (Phase 3)

## 1. Scientific Role & Detector Boundary

Phase 3 implements the **Edge Processing Pipeline** that reconstructs contact sessions from imperfect, noisy BLE observations captured across edge gateways.

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
│(Evaluation ONLY) │   └────────────────┬───────────────┘
└──────────────────┘                    │
                                        ▼ BLEObservation[]
                       ┌────────────────────────────────┐
                       │  Phase 3 Edge Detector         │
                       │  (Consumes ONLY Observations!) │
                       └────────────────┬───────────────┘
                                        │
                                        ▼ ContactSession[]
                       ┌────────────────────────────────┐
                       │  Future Phase 4 Risk Model     │
                       └────────────────────────────────┘
```

### Critical Architectural Invariant
The edge detector functions as if it were running on an on-premise edge gateway server. It has **zero knowledge** of:
- True $(x, y)$ coordinates
- Room polygon bounds
- Ground-truth distance between entities
- Person identities, medical roles, or infection/source statuses
- Ground-truth contact sessions

---

## 2. Avoidance of Invalid Pairwise Ranging

A crucial scientific requirement of Phase 3 is avoiding the physically false assumption that gateway RSSI directly provides pairwise distance:

$$\text{distance}(A, B) \neq |d(A, \text{gateway}) - d(B, \text{gateway})|$$

Because BLE beacons transmit omnidirectionally to a gateway, two individuals standing on opposite sides of a gateway (e.g. 2 meters north and 2 meters south) will yield identical RSSI values to the gateway despite being 4 meters apart from one another.

### Gateway Co-Location & Proximity Evidence Model
Instead of fabricating an unmeasured pairwise distance, Phase 3 defines an **observation-based proximity evidence model**:
1. **Gateway Locality**: Wearable $A$ and Wearable $B$ are observed by the same gateway (or overlapping adjacent coverage).
2. **Temporal Coincidence**: Both observations occur within a narrow coincidence window ($\Delta t \le \text{temporalWindowMs}$, e.g. $1000\text{ ms}$).
3. **Signal Strength Threshold**: Both filtered signals indicate proximity to that gateway ($RSSI \ge RSSI_{\text{thresh}}$ or estimated distance to gateway $\le d_{\text{thresh}}$).

When these conditions are met, the detector logs a **proximity evidence event** for canonical pair $(A, B)$ with $A < B$.

---

## 3. Sequential Causal Pipeline

```text
BLEObservation[]
       ↓
1. Validation           (Boundary filtering: RSSI range, valid framing, finite timestamp)
       ↓
2. Normalization        (Stable deterministic sorting: timestamp ASC, eventIndex ASC)
       ↓
3. Deduplication        (Filters identical retransmissions within timeWindowMs)
       ↓
4. Causal RSSI Filter   (Online smoothing per wearable/gateway link without look-ahead)
       ↓
5. Proximity Inversion  (Estimates wearable-to-gateway distance from filtered RSSI)
       ↓
6. Candidate Pairs      (Co-location and temporal coincidence detection)
       ↓
7. Temporal Evidence    (Accumulation over time per canonical pair)
       ↓
8. Sessionization       (Gap tolerance maxGapSeconds, min duration, min count)
       ↓
ContactSession[]
```

---

## 4. Causal Online Filtering

To prevent latency cheating, filtering operates in strict chronological sequence without future look-ahead:
- **None**: Pass-through raw RSSI.
- **Moving Average**: Causal trailing window mean over the past $W$ samples $\le t$:
  $$\bar{r}_t = \frac{1}{W} \sum_{k=0}^{W-1} r_{t-k}$$
- **Median Filter**: Causal trailing window median over the past $W$ samples $\le t$, rejecting transient multipath outliers.
- **Exponential Moving Average (EMA)**:
  $$s_t = \alpha r_t + (1 - \alpha) s_{t-1}, \quad 0 < \alpha \le 1$$

State is maintained independently per `(wearableId, gatewayId)` RF link.

---

## 5. Contact Sessionization & Packet Loss Gap Tolerance

Wireless transmission in hospital corridors is inherently lossy. If a contact session were terminated on the first missed packet, contact duration would be severely underestimated.

- **Gap Tolerance (`maxGapSeconds`)**: When evidence for pair $(A, B)$ temporarily ceases, the sessionizer holds the candidate session open for up to `maxGapSeconds` (e.g. $5\text{ s}$). If fresh evidence arrives within this gap, the session seamlessly extends.
- **Session Splitting**: If the gap exceeds `maxGapSeconds`, the current session terminates and is evaluated for qualification. Subsequent evidence initiates a new, separate candidate session.
- **Qualification Criteria**:
  $$\text{durationSeconds} \ge \text{minimumDurationSeconds} \quad \text{AND} \quad \text{observationCount} \ge \text{minimumObservationCount}$$
  Sessions that do not satisfy both thresholds are discarded as transient coincidences.

---

## 6. Multi-Gateway Corroboration

When Wearable $A$ and Wearable $B$ are within overlapping reception zones of multiple gateways (e.g. `GW-WARD-01` and `GW-WARD-02`), both gateways detect coincident proximity evidence.
- The sessionizer fuses evidence from all observing gateways into a single unified `ContactSession`.
- All observing gateways are preserved in `supportingGatewayIds: string[]`.
- This prevents artificial duplicate contact records across gateways.

---

## 7. Configuration Parameters & Provenance

| Parameter | Default | Provenance | Description |
|---|---|---|---|
| `validation.minRssiDbm` | $-110\text{ dBm}$ | Physical floor | Receiver noise floor cutoff. |
| `validation.maxRssiDbm` | $0\text{ dBm}$ | Physical ceiling | Maximum theoretical direct coupling power. |
| `deduplication.timeWindowMs` | $20\text{ ms}$ | Protocol | Filter window for duplicate packet reflections. |
| `rssiFilter.method` | `'median'` | Empirical | Trailing median filter robust against shadow fading spikes. |
| `rssiFilter.windowSize` | $5$ | Operational | Number of preceding observations in sliding window. |
| `proximity.thresholdDistanceMeters` | $2.0\text{ m}$ | Operational | Experimental proximity decision boundary. |
| `candidateGeneration.temporalWindowMs` | $1000\text{ ms}$ | Operational | Maximum time difference between co-located observations. |
| `sessionization.maxGapSeconds` | $5\text{ s}$ | Operational | Maximum tolerable packet loss gap before session splits. |
| `sessionization.minimumDurationSeconds` | $30\text{ s}$ | Experimental | Minimum persistence duration required to qualify contact. |
| `sessionization.minimumObservationCount`| $3$ | Operational | Minimum observation samples required to validate session. |

---

## 8. Explicit Limitations

1. **Digital Proximity vs Clinical Transmission**: Reconstructed contact sessions represent digital co-location within gateway reception range, not microbiological transfer of Mycobacterium tuberculosis.
2. **No Directional Bearing**: BLE RSSI provides radial signal attenuation without angle-of-arrival (AoA) phase vectors.
3. **Indoor RF Distortion**: Multipath reflections and wall penetrations can cause co-located individuals to appear distant or separated individuals to appear adjacent.
