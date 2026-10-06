# MDR-SIM Final Experimental Protocol (Frozen)

**Version:** 1.0.0  
**Frozen At:** Phase 7 — Final Integrated Validation  
**Status:** FROZEN — Do not modify definitions after this point without creating a new version.

> [!IMPORTANT]
> This document freezes all scientific definitions used in the Phase 7 final experimental campaign.
> Any change to these definitions constitutes a new protocol version and requires re-running all affected experiments.

---

## 1. Research Objective

Quantitatively evaluate a hospital BLE contact-tracing simulator pipeline that estimates:

$$P(E = 1 \mid X)$$

where $E$ is a **digital exposure event** as defined in Section 2, and $X$ is the Phase 3-derived session evidence.

This is an **interpretable exposure-prioritization model** for research simulation.

This is **NOT**:
- An infection probability model
- A transmission probability model
- An infectious dose model
- A clinical diagnostic system
- A GDPR/HIPAA-compliant system

---

## 2. Ground-Truth Definition (Phase 1 — Frozen)

### 2.1 Exposure Event $E = 1$

A ground-truth contact pair $(i, j)$ satisfies $E = 1$ if and only if:

1. The Euclidean distance between persons $i$ and $j$ satisfies:
   $$d(i, j, t) \leq \delta_{\text{contact}} = 2.0 \text{ m}$$
2. This condition persists continuously for at least:
   $$\Delta t_{\min} = 30 \text{ s}$$
3. Both persons are co-located in the **same room** (room-constraint: `same-room`).

### 2.2 Physical Simulation

- 2D Cartesian mobility model.
- Population: configurable (50 default, 80 dense, 20–120 scalability sweep).
- Gateways: configurable (8 default).
- Time step: 1 second.
- Duration: 3600 seconds (reference), 1800 seconds (scalability).

### 2.3 Hidden Ground Truth

`GroundTruthContact[]`, `MovementState[]`, and person $\leftrightarrow$ wearable mappings are
**strictly hidden** from `src/ble/`, `src/edge/`, `src/risk/`, and `src/privacy/`.
Only `src/evaluation/` may access hidden truth for post-hoc metric computation.

---

## 3. BLE Observation Model (Phase 2 — Frozen)

### 3.1 Advertising

| Parameter | Value |
|---|---|
| Advertising interval | 500 ms (reference) |
| Jitter minimum | 0 ms |
| Jitter maximum | 10 ms |
| Advertisement type | `legacy` |

### 3.2 RSSI Path-Loss Model

$$\text{RSSI}(d) = \text{RSSI}_{\text{ref}} - 10 \cdot n \cdot \log_{10}\!\left(\frac{d}{d_{\text{ref}}}\right) + \mathcal{N}(0, \sigma_{\text{noise}}^2)$$

| Parameter | Value |
|---|---|
| Reference distance $d_{\text{ref}}$ | 1.0 m |
| Reference RSSI $\text{RSSI}_{\text{ref}}$ | −50 dBm |
| Path-loss exponent $n$ | 2.5 |
| Noise sigma $\sigma_{\text{noise}}$ | 6.0 dB (reference) |

> [!NOTE]
> RSSI-derived distance estimates are **experimental RF path-loss inversions under the configured model**,
> not validated physical ranging. True distance is inaccessible to runtime inference.

### 3.3 Reception

| Parameter | Value |
|---|---|
| Packet-loss probability | 0.05 (reference) |
| Receiver sensitivity | −95 dBm |

---

## 4. Edge Processing Model (Phase 3 — Frozen)

### 4.1 Validation

| Parameter | Value |
|---|---|
| Minimum valid RSSI | −110 dBm |
| Maximum valid RSSI | 0 dBm |
| Maximum timestamp skew | 5000 ms |

### 4.2 Deduplication

Enabled. Time window: 20 ms. Removes redundant observations from the same wearable
received within the deduplication window at the same gateway.

### 4.3 RSSI Filtering

Method: sliding-window median filter. Window size: 5 observations.

### 4.4 Proximity Estimation

Model: log-distance path-loss inversion.
Proximity threshold: 2.0 m (must match contact definition for valid evaluation).

### 4.5 Candidate Pair Generation

Temporal co-observation window: 1000 ms.

### 4.6 Sessionization

| Parameter | Value |
|---|---|
| Minimum observation count | 3 |
| Minimum duration | 30 s |
| Maximum session gap | 5 s |

**Output:** `ContactSession[]` — the exclusive input to Phase 4 risk inference.

---

## 5. Bayesian Exposure-Risk Model (Phase 4 — Frozen)

### 5.1 Target

Estimate $P(E = 1 \mid X)$ for each detected `ContactSession`, where $E$ is defined in Section 2.

### 5.2 Runtime Input Boundary

The risk model at inference time consumes only:

```
ContactSession[] → ExposureRecord → P(E=1|X)
```

It does **NOT** access `Person[]`, `MovementState[]`, `GroundTruthContact[]`,
`trueDistanceMeters`, or `referenceLabel`.

### 5.3 Prior

$$P(E = 1) = 0.1 \quad (\text{empirical mode})$$

### 5.4 Feature Definitions

| Feature | Symbol | Description |
|---|---|---|
| Duration | $d_s$ | Session duration in seconds |
| Proximity | $\rho_s$ | Mean RSSI-estimated proximity |
| Recurrence | $(c_e, d_c)$ | Encounter count, cumulative duration |
| Source status | $\kappa$ | Indicator of suspected/confirmed source wearable |

### 5.5 Inference Equation

$$P(E=1 \mid X) \propto P(E=1) \cdot \prod_{f \in \mathcal{F}} P(X_f \mid E=1)$$

Laplace smoothing: $\alpha = \beta = 1.0$.

### 5.6 Calibration

Default: **disabled**. When enabled, Platt scaling is fitted on a dedicated calibration
split **before** test evaluation. Test data remains untouched during calibration fitting.

---

## 6. Evaluation Protocol (Phase 5 — Frozen)

### 6.1 Contact Matching

A detected session $\hat{s}$ matches ground-truth contact $c$ if and only if:

1. Wearable pair identity matches (via evaluation-only mapping).
2. Temporal Intersection-over-Union:
   $$\text{IoU} = \frac{|\hat{s} \cap c|}{|\hat{s} \cup c|} \geq \tau_{\text{IoU}} = 0.3$$

Each ground-truth contact is matched to at most one detected session (greedy, best-IoU-first).

### 6.2 Contact Detection Metrics

$$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} \qquad
\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}} \qquad
\text{F1} = \frac{2 \cdot P \cdot R}{P + R}$$

Duration error:
- MAE = mean absolute duration error (seconds)
- RMSE = root mean squared duration error (seconds)

Temporal error: start-time MAE, end-time MAE (detected minus ground-truth).

Fragmentation: fraction of ground-truth contacts for which more than one detected session was matched.

Merging: fraction of detected sessions that subsume more than one ground-truth contact.

### 6.3 Risk Discrimination Metrics

**AUROC:** Area under ROC curve (trapezoidal integration). Undefined if only one class present.

**Average Precision (AP/AUPRC):** Step-wise precision-recall integral:
$$\text{AP} = \sum_k (R_k - R_{k-1}) \cdot P_k$$

**F1 at threshold $\tau$:** Classification metrics at predeclared threshold $\tau = 0.5$.
Post-hoc threshold analysis is explicitly labeled as exploratory.

### 6.4 Calibration Metrics

**Brier Score:**
$$\text{BS} = \frac{1}{N} \sum_i (p_i - y_i)^2$$

**Expected Calibration Error (ECE):**
$$\text{ECE} = \sum_{b=1}^{B} \frac{|B_b|}{N} \cdot |\text{acc}(B_b) - \text{conf}(B_b)|$$

with $B = 10$ bins of equal width in $[0, 1]$.

> [!CAUTION]
> Low Brier score or ECE does NOT constitute clinical probability calibration.
> Calibration applies to the simulated digital exposure target only.

### 6.5 Statistical Aggregation

Across $n$ independent seeds:

$$\bar{x} \pm t_{0.975, n-1} \cdot \frac{s}{\sqrt{n}}$$

For $n < 2$: CI = N/A.

Only independent seeds are treated as experimental replicates.
Sessions and packets are NOT replicates.

---

## 7. Privacy & Pseudonymization Protocol (Phase 6 — Frozen)

### 7.1 Threat Model

Four formalized attacker profiles (see `docs/PRIVACY_THREAT_MODEL.md`):
- **Attacker A:** Passive local observer (single gateway)
- **Attacker B:** Multi-observation linkage attacker (temporal/spatial continuity)
- **Attacker C:** Baseline unauthorized identity resolver (conservative prior)
- **Attacker C+:** Profile-informed resolver (role-transition priors)

### 7.2 Pseudonym Generation Modes

**Mode 1: `hmac-sha256`** — Keyed cryptographic mode. Security depends on key secrecy.

**Mode 2: `simulation-grade-prng`** — Simulation-grade deterministic mode.
Must NOT be described as cryptographically secure.

Final campaign uses: `simulation-grade-prng` (reproducibility requirement).

### 7.3 Rotation Schedule

Fixed-interval rotation. Default interval: 60 s (P2 sweeps vary this).
Jitter: 0 s (unless explicitly varied).

### 7.4 Privacy Metrics (Frozen Definitions)

| Metric | Formula |
|---|---|
| Linkage precision | $\text{TP}_L / (\text{TP}_L + \text{FP}_L)$ |
| Linkage recall | $\text{TP}_L / (\text{TP}_L + \text{FN}_L)$ |
| Linkage F1 | Harmonic mean of above |
| Linkage success rate | $\text{TP}_L / N_{\text{transitions}}$ |
| Empirical unlinkability proxy | $1 - \text{linkage success rate}$ |
| Identity Top-1 accuracy | Fraction of wearables correctly resolved |
| Session fragmentation ratio | Unprivileged sessions / authorized sessions |
| Duration attenuation ratio | Mean unprivileged duration / mean authorized duration |

**P1 special case:** When no pseudonym transitions occur (rotation interval ≥ simulation
duration), linkage metrics are undefined and must be reported as `null` / N/A.
Absence of transitions does NOT imply perfect unlinkability.

### 7.5 Non-Claims

The privacy subsystem does NOT claim:
- GDPR compliance
- HIPAA compliance
- Formal $k$-anonymity
- Differential privacy
- Universal unlinkability
- Perfect identity protection

---

## 8. Experiment Execution Protocol

### 8.1 Declared Seed Set (frozen)

```
[104729, 209759, 32452843, 49979687, 67867967]
```

Seeds are declared before any results are observed. Seeds are not added or removed
based on performance observations.

### 8.2 Reproducibility Requirement

All deterministic scientific outputs must be byte-for-byte identical across repeated
executions with the same seed and configuration.

Machine-dependent telemetry (wall-clock timing, memory) is excluded from deterministic checksums.

### 8.3 Forbidden Post-Hoc Actions

- Selecting seeds that improve reported metrics
- Tuning model parameters using final test-set results
- Selecting thresholds by inspecting final test labels
- Smoothing or interpolating figure data beyond what was recorded

---

## 9. Version History

| Version | Date | Change |
|---|---|---|
| 1.0.0 | Phase 7 | Initial frozen protocol |
