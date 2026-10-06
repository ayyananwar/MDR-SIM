# Independent Ground Truth Specification

## 1. Scientific Principle & Architectural Independence

The primary scientific requirement of the Phase 1 architecture is the **absolute separation** between:
1. **Hidden Physical Truth**: Where people actually were, what rooms they occupied, their exact physical distance, and whether their physical proximity met experimental exposure definitions.
2. **Future Sensor Observations**: Noisy BLE advertisements, RSSI fluctuations, path loss, multipath fading, packet drops, edge filtering, and Bayesian inferences.

The future contact detector will evaluate BLE observations and attempt to infer contacts without having access to this hidden geometric truth.

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
│   Ground Truth   │   │  Future BLE Observation Model  │
│  Contact Engine  │   │  (Noisy RSSI, Advertisements)  │
└──────────────────┘   └────────────────┬───────────────┘
                                        │
                                        ▼
                       ┌────────────────────────────────┐
                       │  Future Contact Detector       │
                       │  & Bayesian Risk Engine        │
                       └────────────────────────────────┘
```

The ground truth engine lives entirely on the left branch and has zero dependencies on any RF or Bayesian model.

---

## 2. Mathematical Definition of Proximity

At each simulation timestamp $t_k$, for every pair of active individuals $(i, j)$ with $i < j$:

1. **Room Constraint**:
   $$\text{eligible}(i, j) = \begin{cases} \text{true} & \text{if } \text{roomConstraint} = \text{'none'} \\ \text{room}(i) = \text{room}(j) & \text{if } \text{roomConstraint} = \text{'same-room'} \end{cases}$$

2. **Euclidean Distance**:
   $$d(i, j) = \sqrt{(x_i - x_j)^2 + (y_i - y_j)^2}$$

3. **Instantaneous Proximity Condition**:
   $$\text{activeContact}(i, j, t_k) \iff \text{eligible}(i, j) \land d(i, j) \le d_{\text{threshold}}$$

---

## 3. Sessionization Lifecycle

Ground truth is evaluated as **continuous temporal sessions** rather than isolated per-tick observations.

1. **Session Start**: When $\text{activeContact}(i, j, t_k)$ transitions from false to true, an active candidate session is initialized with:
   - $\text{startTime} = t_k$
   - $\text{lastSampleTime} = t_k$
   - $\text{distanceSamples} = [d(i, j)]$

2. **Session Extension**: On subsequent timesteps where $\text{activeContact}(i, j, t_k)$ remains true:
   - $\text{lastSampleTime} = t_k$
   - Append $d(i, j)$ to $\text{distanceSamples}$

3. **Session Closure & Qualification**: When $\text{activeContact}(i, j, t_k)$ becomes false or the simulation completes:
   - Calculated duration: $\Delta t = \text{lastSampleTime} - \text{startTime}$
   - If $\Delta t \ge T_{\text{min}}$ (configured `minimumDurationSeconds`), the session is committed as a permanent `GroundTruthContact`.
   - If $\Delta t < T_{\text{min}}$, the transient proximity is discarded from the ground truth record.

4. **Pair Invariance**: All pairs are canonically ordered such that $\text{personA} < \text{personB}$. Evaluating $(i, j)$ or $(j, i)$ maps to the same canonical key, preventing duplicate records.

---

## 4. What Ground Truth Does NOT Represent

- **No Clinical Infection Claim**: Ground truth records **physical and spatial proximity intervals** under user-specified geometric rules. It does not model droplet aerodynamics, ventilation airflow (ACH), viral shedding load, or host immune susceptibility.
- **No Diagnostic Ground Truth**: The presence of a contact session indicates spatial co-location, not transmission of Mycobacterium tuberculosis.
