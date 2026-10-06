# Phase 4 — Probabilistic Exposure-Risk Model Reference

## 1. Scientific Objective and Target Definition

The goal of Phase 4 is to build an interpretable, mathematically sound probabilistic model that estimates:

$$P(E = 1 \mid X)$$

where:
- **$E \in \{0, 1\}$**: A binary indicator representing whether a **reference digital exposure event** condition has been satisfied for the target wearable during a contact session, according to the research simulation protocol.
- **$X$**: Observed session-level contact evidence reconstructed by the Phase 3 edge processing pipeline.

> [!IMPORTANT]
> **CRITICAL SCIENTIFIC DISTINCTION:**
> This model estimates the probability of satisfying an epidemiological **exposure proximity threshold**. It does **NOT** estimate:
> - $P(\text{MDR-TB infection})$
> - $P(\text{pathogen transmission})$
> - $P(\text{infectious dose})$
> - Clinical diagnosis or disease confirmation.
>
> It is an **exposure prioritization and decision-support model**, not a clinical transmission or diagnostic model.

---

## 2. Runtime Input Boundary

Runtime inference is strictly causal and consumes only Phase 3 edge processing outputs and authorized metadata:

```text
BLE Observations (Phase 2)
       ↓
Edge Processing Pipeline (Phase 3)
       ↓
ContactSession[]
       ↓
Feature Extraction (Phase 4)
       ↓
Fitted Probabilistic Model
       ↓
RiskAssessment[] (P(E=1 | X))
```

### Prohibited Runtime Inputs
Runtime inference must **NEVER** import, access, or infer from:
- `Person[]` coordinates or ground truth status
- `MovementState[]`
- `GroundTruthContact[]`
- `trueDistanceMeters`
- BLE packet-level hidden geometry
- Reference evaluation labels (`referenceLabel`, `isTruePositive`, etc.)

Ground truth is strictly isolated for **offline training, parameter estimation, calibration, and benchmark evaluation**.

---

## 3. Session-Level Evidence vs. Raw Packets

In contrast to naive models that update probabilities per received packet, Phase 4 operates strictly on **reconstructed contact sessions**:
1. **Packet burst immunity**: A wearable emitting 10 packets per second does not generate 10 independent exposure updates.
2. **Multi-gateway corroboration**: Multiple gateways observing the same session provide corroborating spatial evidence rather than multiplying risk events.
3. **Compact feature vectors**: Session-level features summarize the physical interaction cleanly without artificially driving $P(E \mid X) \to 1.0$.

---

## 4. Selected Features

| Feature | Type | Source | Definition |
|---|---|---|---|
| `duration` | Continuous $\to$ Discrete | Session interval | $t_{\text{end}} - t_{\text{start}}$ in seconds |
| `proximity` | Continuous $\to$ Discrete | Filtered RSSI path loss | Summary normalized proximity score in $[0, 1]$ |
| `encounterCount` | Discrete count | Interaction history | Number of prior sessions between this target and source |
| `cumulativeDuration`| Continuous $\to$ Discrete | Interaction history | Total historical contact duration in seconds |
| `sourceStatus` | Categorical | Authorized registry | `'non-source'`, `'suspected'`, `'confirmed'`, `'unknown'` |
| `recencySeconds` | Continuous (optional) | Interaction history | Seconds elapsed since previous contact with this source |

---

## 5. Feature Discretization

To support transparent, robust categorical likelihood estimation, continuous variables are mapped into explicit parameter bins:

### Duration Bins
- `short`: $[0, 60)\text{ s}$
- `medium`: $[60, 300)\text{ s}$
- `long`: $[300, \infty)\text{ s}$

### Proximity Bins
- `weak`: $[0.0, 0.33)$
- `moderate`: $[0.33, 0.66)$
- `strong`: $[0.66, 1.0]$

### Encounter Count Bins
- `single`: $1$
- `few`: $2 - 3$
- `frequent`: $\ge 4$

### Cumulative Duration Bins
- `brief`: $[0, 120)\text{ s}$
- `moderate`: $[120, 600)\text{ s}$
- `extended`: $[600, \infty)\text{ s}$

All bin boundaries are stored in `DiscretizationConfig` as experimental parameters.

---

## 6. Prior Probability and Odds

The baseline exposure probability $P(E=1)$ represents the expected prevalence of qualifying exposure events in the simulated hospital ward.

Prior odds are defined as:
$$O(E) = \frac{P(E)}{1 - P(E)}$$

Prior log-odds:
$$\ln O(E) = \ln P(E) - \ln(1 - P(E))$$

---

## 7. Likelihood Model and Conditional Independence

For each discrete feature value $X_i = x$, the likelihood ratio is:

$$LR_i = \frac{P(X_i = x \mid E = 1)}{P(X_i = x \mid E = 0)}$$

Log-likelihood ratio:
$$\ln LR_i = \ln P(X_i = x \mid E = 1) - \ln P(X_i = x \mid E = 0)$$

### Conditional Independence Assumption
Under the naive conditional-independence formulation:
$$P(X_1, \dots, X_k \mid E) = \prod_{i=1}^k P(X_i \mid E)$$

The posterior odds factorize as:
$$O(E \mid X) = O(E) \prod_{i=1}^k LR_i$$

$$\ln O(E \mid X) = \ln O(E) + \sum_{i=1}^k \ln LR_i$$

> [!NOTE]
> **Correlation Caveat**: In reality, contact duration and cumulative duration are positively correlated. To prevent overconfidence, the feature set is restricted to compact orthogonal dimensions, and parameters are smoothed conservatively.

---

## 8. Bayesian / Dirichlet Smoothing

In sparse training datasets, observing zero occurrences of a feature bin would yield $P(X=x \mid E) = 0$, which would irrevocably collapse the posterior odds to zero or infinity.

To guarantee mathematical robustness, Dirichlet / Laplace smoothing is applied:

$$\hat{P}(X_i = x \mid E = 1) = \frac{\text{count}(X_i = x, E=1) + \alpha}{\sum_{x'} \left(\text{count}(X_i = x', E=1) + \alpha\right)}$$

$$\hat{P}(X_i = x \mid E = 0) = \frac{\text{count}(X_i = x, E=0) + \beta}{\sum_{x'} \left(\text{count}(X_i = x', E=0) + \beta\right)}$$

where $\alpha \ge 1.0, \beta \ge 1.0$. This guarantees $LR_i \in (0, \infty)$ for all possible bins.

---

## 9. Missing Evidence Policy

When an observed feature value is missing or corresponds to an unmodeled category:
- The system returns neutral evidence:
  $$LR_i = 1.0, \quad \ln LR_i = 0.0$$
- Missing evidence does **NOT** default to maximum risk, minimum distance, or confirmed source status.

---

## 10. Posterior Probability Calculation

To prevent numerical overflow or underflow from extreme likelihood ratios, calculations occur in log-odds space:

$$z = \ln O(E \mid X) = \ln O(E) + \sum_{i} \ln LR_i$$

Conversion back to probability:
$$P(E \mid X) = \begin{cases}
1.0 & \text{if } z > 700 \\
0.0 & \text{if } z < -700 \\
\frac{\exp(z)}{1 + \exp(z)} & \text{otherwise}
\end{cases}$$

The result is clamped strictly to $[0.0, 1.0]$ and verified to be finite.

---

## 11. Calibration Support

Post-inference calibration transforms raw probabilities using held-out calibration data:
- **Platt Scaling**: $\sigma(a \cdot \text{logit}(p) + b)$
- **Isotonic Regression**: Piecewise step calibration

Calibration is disabled by default in reference models and strictly evaluated on separate hold-out sets.

---

## 12. Parameter Provenance

Every parameter in `FittedRiskModel` includes explicit provenance metadata:
```typescript
export interface RiskParameterMetadata {
  value: number | number[] | Record<string, unknown>;
  source: 'measured' | 'literature' | 'estimated' | 'calibrated' | 'simulation' | 'derived';
  rationale: string;
  datasetVersion?: string;
  citation?: string;
}
```

No magic numbers or unexplained constants are permitted in runtime code.

---

## 13. Known Limitations

1. **Conditional Independence**: Some mutual information exists between contact duration and observation count.
2. **Discrete Bins**: Step boundaries (e.g. 59s vs 60s) produce discrete jumps in likelihood ratio.
3. **No Direct Pathogen Physics**: The model estimates spatial proximity contact compliance, not airborne droplet dispersion, ventilation ACH, or mask filtration efficiency.
