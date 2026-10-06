# Privacy & Pseudonymization Model (Phase 6)

## 1. Executive Summary

Phase 6 introduces a modular, mathematically formal pseudonymization subsystem to the MDR-SIM research simulator. The system models how periodic rotation of broadcast identifiers mitigates tracking and re-identification risks in hospital Bluetooth Low Energy (BLE) networks while quantifying the resulting trade-offs on contact reconstruction and risk modeling utility.

---

## 2. Pseudonym Generation Subsystem

Pseudonyms are ephemeral strings broadcast in place of static hardware identifiers. The subsystem supports two generation modes with distinct operational semantics:

### Mode 1: `hmac-sha256` (Keyed Cryptographic Mode)
- **Mathematical Specification**:
  $$\text{Input} = \text{wearableId} \,\|\, \text{epochIndex} \,\|\, \text{salt}$$
  $$\text{Digest} = \text{HMAC-SHA256}(\text{SecretKey}, \text{Input})$$
  $$\text{Pseudonym} = \text{"PSEUDO-"} \,\|\, \text{Hex}(\text{Digest})[0 \dots 15]$$
- **Security Semantics**:
  - Requires an explicit, high-entropy `secretKey` provisioned exclusively to the authorized identity registry.
  - Security depends strictly on the confidentiality and entropy of that key.
  - An adversary lacking the key cannot compute future pseudonyms or determine whether two pseudonyms from different epochs share the same underlying `wearableId` through cryptographic analysis alone.
- **Scientific Caveat**:
  - Keyed HMAC-SHA256 provides pseudo-random function (PRF) unpredictability against external observers.
  - It does **not** automatically provide formal $k$-anonymity, differential privacy, or protection against behavioral traffic analysis.

### Mode 2: `simulation-grade-prng` (Simulation-Grade Deterministic Mode)
- **Mathematical Specification**:
  $$\text{Seed}_{\text{epoch}} = (\text{BaseSeed} \oplus \text{Hash}(\text{wearableId}) \oplus (\text{epochIndex} \times 0x9E3779B9)) \pmod{2^{32}}$$
  $$\text{PRNG} = \text{SeededRandom}(\text{Seed}_{\text{epoch}})$$
  $$\text{Pseudonym} = \text{"PSEUDO-"} \,\|\, \text{Hex}(\text{PRNG.nextHex}(16))$$
- **Operational Purpose**:
  - Exclusively intended for zero-dependency, reproducible Monte Carlo simulations and bitwise regression testing.
- **Scientific Boundary**:
  - Strictly labeled as **simulation-grade deterministic pseudonym generation**.
  - Must **NOT** be described as cryptographically secure.
  - Does not resist algorithmic inversion if the PRNG state or seed is known.

---

## 3. Pseudonym Collision Quantification & Birthday-Bound Analysis

Rather than loosely describing the identifier space as "collision-safe," the subsystem explicitly quantifies collision probabilities and instruments runtime generation:

### Namespace Specification
- Configurable namespace size $S = 2^b$, where $b$ is the number of bits allocated to the pseudonym suffix.
- Standard configuration: $b = 64$ bits (16 hexadecimal characters), yielding $S = 2^{64} \approx 1.844 \times 10^{19}$ possible identifiers.
- Compact experimental configuration: $b = 32$ bits (8 hexadecimal characters), yielding $S = 2^{32} \approx 4.295 \times 10^9$ identifiers.

### Theoretical Birthday-Bound Collision Approximation
For $k$ independently generated pseudonyms sampled uniformly from namespace $S$, the probability of at least one collision is approximated by:

$$P(\text{collision}) \approx 1 - \exp\left(-\frac{k(k - 1)}{2S}\right)$$

For a typical 1-hour hospital simulation with 50 wearables rotating every 60 seconds ($k \approx 50 \times 60 = 3,000$ pseudonyms):
- Under $b = 64$ bits: $P(\text{collision}) \approx 1 - \exp\left(-\frac{9 \times 10^6}{3.68 \times 10^{19}}\right) \approx 2.44 \times 10^{-13}$ (negligible).
- Under $b = 32$ bits: $P(\text{collision}) \approx 1 - \exp\left(-\frac{9 \times 10^6}{8.59 \times 10^9}\right) \approx 1.04 \times 10^{-3}$ (measurable).

### Runtime Collision Instrumentation
The `PseudonymGenerator` maintains an active collision registry during generation:
- `totalPseudonymsGenerated`: Total count $k$.
- `observedCollisionCount`: Cumulative count of generated identifiers already assigned to a different wearable/epoch.
- `empiricalCollisionRate`: $\frac{\text{observedCollisionCount}}{k}$.
- **Collision Handling**: Collisions are recorded in an explicit collision ledger. If a collision is detected during active simulation, a deterministic disambiguation suffix is appended, and the collision event is flagged in the telemetry rather than silently overwriting the prior mapping.

---

## 4. Rotation Schedule Model

Pseudonym rotation is governed by an explicit temporal schedule:

### Epoch Window Definition
Each wearable $i$ has an ordered sequence of rotation epochs $e = 0, 1, 2, \dots$:
- Baseline window start:
  $$t_{\text{start}}^{(e)} = e \cdot T_{\text{rot}}$$
- With optional randomized jitter $\delta \in [-\Delta_{\text{jitter}}, +\Delta_{\text{jitter}}]$:
  $$t_{\text{switch}}^{(e)} = \max\left(0, e \cdot T_{\text{rot}} + \delta^{(e)}\right)$$
- An epoch spans $[t_{\text{switch}}^{(e)}, t_{\text{switch}}^{(e+1)})$.
- At any simulation timestamp $t$, the active pseudonym for wearable $i$ is uniquely determined by finding the active epoch containing $t$.

---

## 5. Simulated Authorization & Identity Registry Boundary

The `IdentityRegistry` encapsulates the authoritative relationship between public broadcasts, hardware tags, and real individuals within the simulated experimental testbed:

$$\text{Pseudonym } P \xrightarrow{\text{valid at time } t} \text{WearableId } W \longrightarrow \text{PersonId } P_{\text{id}}$$

> [!IMPORTANT]
> **SIMULATED AUTHORIZATION BOUNDARY:**
> The `IdentityRegistry` models an idealized, simulated authorization and access-control boundary. It does **NOT** represent a certified, production-grade hardware security module (HSM) or identity management infrastructure.

### Authorization Enforcement
Resolution requires an explicit `AuthorizationContext`:
```ts
interface AuthorizationContext {
  role: 'admin' | 'authorized-investigator' | 'public';
  token?: string;
}
```
- **Authorized Callers** (`admin`, `authorized-investigator`): `resolvePseudonym(pseudonym, timestamp, context)` returns `{ wearableId, personId }`.
- **Unprivileged / Public Callers** (`public`): Resolution is strictly denied and returns `null`.
- Attacker modules are strictly instantiated with unprivileged context and cannot query the registry.

---

## 6. Privacy & Attack Evaluation Metrics

### 1. Empirical Linkability
Evaluates the performance of Attacker B attempting to predict whether observation pairs across pseudonym boundaries share the same physical device:
- $\text{LinkagePrecision} = \frac{TP_{\text{link}}}{TP_{\text{link}} + FP_{\text{link}}}$
- $\text{LinkageRecall} = \frac{TP_{\text{link}}}{TP_{\text{link}} + FN_{\text{link}}}$
- $\text{LinkageF1} = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$
- $\text{LinkageSuccessRate} = \frac{TP_{\text{link}}}{\text{TotalSameDeviceTransitions}}$

### 2. Empirical Unlinkability Proxy
$$\text{UnlinkabilityProxy} = 1 - \text{LinkageSuccessRate}$$
> [!WARNING]
> **ZERO-TRANSITION SEMANTICS (STATIC IDENTIFIERS / P1):**
> When identifiers do not rotate ($T_{\text{rot}} = \infty$ or $T_{\text{rot}} \ge \text{Duration}$), $\text{TotalSameDeviceTransitions} = 0$.
> In this condition, the denominator is zero, and both $\text{LinkageSuccessRate}$ and $\text{UnlinkabilityProxy}$ are **strictly undefined (N/A)**.
> Static identifiers must **NEVER** be reported as having an unlinkability proxy of $1.0000$ (which would falsely imply perfect unlinkability).
> For static conditions, the system reports `totalTransitions = 0`, `unlinkabilityProxy = null / N/A`, and records the **Identifier Persistence Duration** ($\bar{D}_{\text{persist}}$).

### 3. Identity Inference Metrics & Chance Baseline
Evaluates Attacker C attempting to infer underlying person identity $P_k$:
- $\text{Top-1 Accuracy}$: Fraction of pseudonyms whose top-ranked candidate identity matches the true person.
- $\text{Theoretical Uniform-Random Baseline}$:
  $$\text{ChanceBaseline} = \frac{1}{N_{\text{pop}}}$$
  *(e.g., $1 / 50 = 0.0200$ for a population of 50 individuals).*
- Attack performance is evaluated relative to the chance baseline ($\Delta = \text{Top1} - \frac{1}{N_{\text{pop}}}$) across replicate trials.

### 4. Exposure & Persistence Duration
Measures the duration (in seconds) that a single pseudonym remains continuously observable before rotating:
$$\bar{D}_{\text{pseudo}} = \frac{1}{|E|} \sum_{e \in E} (t_{\text{end}}^{(e)} - t_{\text{start}}^{(e)})$$

---

## 7. Privacy–Utility Trade-Off Analysis

Rotating pseudonyms introduces a fundamental tension between tracking protection and contact detection fidelity:

```text
Shorter Rotation Interval (High Privacy)
               ↓
Frequent Identifier Transitions
               ↓
Observed BLE Streams Fragmented Across Pseudonyms
               ↓
Unprivileged Observers See Fragmented Sessions
               ↓
Authorized Observers Require Cryptographic Resolution
```

### The Two Evaluation Views
1. **Authorized View (Full Utility)**:
   The edge contact reconstruction pipeline resolves pseudonyms through the authorized identity registry before sessionization. Contact continuity is preserved across rotation boundaries.
2. **Unprivileged View (Fragmented Utility)**:
   The edge pipeline processes pseudonyms as separate independent devices. Sessions are fragmented whenever an identifier rotates during a contact encounter.
3. **Fragmentation Ratio**:
   $$\text{SessionFragmentationRatio} = \frac{N_{\text{sessions}}^{\text{unprivileged}}}{N_{\text{sessions}}^{\text{authorized}}}$$
4. **Duration Attenuation**:
   Measures the loss in reconstructed contact duration caused by unresolvable identifier rotation.
