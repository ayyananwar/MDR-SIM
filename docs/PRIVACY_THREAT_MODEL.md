# Privacy Threat Model: Hospital BLE Contact Tracing (Phase 6)

## 1. Scope & Research Testbed Context

This document formalizes the threat model for evaluating privacy-preserving pseudonymization and identification risks in the MDR-SIM research simulator.

> [!WARNING]
> **RESEARCH SIMULATION ONLY — NO REGULATORY COMPLIANCE CLAIMS:**
> This threat model represents an idealized experimental abstraction. It does **NOT** constitute:
> - Compliance with the General Data Protection Regulation (GDPR)
> - Compliance with the Health Insurance Portability and Accountability Act (HIPAA)
> - A formal mathematical proof of differential privacy or universal anonymity
> - Complete protection against physical side-channel observation (e.g. video cameras, directional RF sniffing, hardware fingerprinting).

All privacy evaluations are empirical, conditional on the assumptions and boundaries defined herein.

---

## 2. Core Privacy Concepts & Taxonomy

The system explicitly distinguishes four distinct security/privacy dimensions:

1. **Pseudonym Unlinkability**:
   The degree to which an adversary cannot determine whether two observed pseudonym instances $(P_1, P_2)$ broadcast at different times belong to the same physical wearable device. Measured empirically via linkage attack success rates.
2. **Identity Confidentiality**:
   The degree to which an adversary cannot map an observed pseudonym $P$ to a real-world individual ($P \to \text{Person}$), even if multiple observations of $P$ can be linked.
3. **Data Minimization**:
   The architectural practice of excluding all non-essential metadata (person names, clinical status, roles, true coordinates) from public over-the-air BLE packets.
4. **Access Control**:
   The cryptographic and administrative barriers separating public observers from the authorized identity registry (`Pseudonym` $\to$ `WearableId` $\to$ `PersonId`).

---

## 3. Information Boundaries & Domains

The simulation architecture defines four strictly segregated information domains:

```text
┌────────────────────────────────────────────────────────┐
│                   1. Public Domain                     │
│  - Ephemeral Pseudonyms (PSEUDO-XXXX)                  │
│  - Intercepting Gateway IDs                            │
│  - Observation Timestamps                              │
│  - Signal Strength (RSSI dBm)                          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  2. Attacker Domain                    │
│  - Public Domain Observations                          │
│  - Declared Attacker Side Information Matrix           │
│  - Linkage & Inference Heuristics                      │
│  * ZERO access to Identity Registry or Ground Truth   │
└──────────────────────────┬─────────────────────────────┘
                           │ Attack Predictions (L_hat, I_hat)
                           ▼
┌────────────────────────────────────────────────────────┐
│              3. Evaluation-Only Domain                 │
│  - Ground-Truth Movement & Contacts                    │
│  - True Person-Wearable Identities                     │
│  - Evaluates Attack Precision, Recall, F1              │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ Authorized Identity Lookups
┌──────────────────────────┴─────────────────────────────┐
│                 4. Authorized Domain                   │
│  - Secret Keys for HMAC-SHA256 (if enabled)           │
│  - Identity Registry (Pseudonym -> Wearable -> Person) │
│  - Clinical Source Status Registry                     │
│  - Protected by AuthorizationContext Role Checks       │
└────────────────────────────────────────────────────────┘
```

---

## 4. Attacker Capabilities & Side Information Matrix

To prevent unrealistic evaluation or accidental leakage of hidden simulation state, the exact side information available to each attacker tier is formalized below:

| Information / Capability Dimension | Attacker A: Passive Local Observer | Attacker B: Multi-Observation Linkage Attacker | Attacker C: Baseline Unauthorized Resolver | Attacker C+: Profile-Informed Resolver (Scenario) |
| :--- | :--- | :--- | :--- | :--- |
| **Observable BLE Fields** | `pseudonym`, `eventIndex`, `advertisementType` | `pseudonym`, `eventIndex`, `advertisementType` | `pseudonym`, `eventIndex`, `advertisementType` | `pseudonym`, `eventIndex`, `advertisementType` |
| **Temporal Granularity** | Packet intercept timestamp | Intercept timestamps across windows | Intercept timestamps | Intercept timestamps |
| **Spatial Interception Coverage** | Single fixed gateway | All deployed edge gateways | All deployed edge gateways | All deployed edge gateways |
| **Signal Strength (RSSI)** | Observed RSSI at single gateway | Multi-gateway RSSI trajectories | Multi-gateway RSSI trajectories | Multi-gateway RSSI trajectories |
| **Facility Gateway Layout** | No | Yes (2D coordinates of gateways) | Yes (2D coordinates of gateways) | Yes (2D coordinates & room types) |
| **Population Membership** | No | Total population count $N_{\text{pop}}$ | Total population count $N_{\text{pop}}$ | Candidate person ID set $\{P_1, \dots, P_N\}$ |
| **Clinical Role Distributions** | No | No | No (Uniform prior) | Role proportions (e.g. 35% staff, 45% patient) |
| **Individual Movement Agendas** | No | No | No | General role-based dwell time priors |
| **Authorized Identity Registry** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** |
| **Private HMAC Secret Key** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** |
| **Phase 1 Hidden Ground Truth** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** | **STRICTLY FORBIDDEN** |

---

## 5. Formal Attacker Specifications

### Attacker A: Passive Local Observer
- **Objective**: Intercept and record raw BLE packets at a single location (e.g. a public hallway or cafeteria gateway).
- **Surface**: Observes active pseudonyms broadcast within range of gateway $G_k$.
- **Capability**: Cannot correlate observations across different rooms. If pseudonyms do not rotate, Attacker A detects recurring presence. When pseudonyms rotate, continuity is broken unless combined with external tracking.

### Attacker B: Multi-Observation Linkage Attacker
- **Objective**: Reconstruct the movement trajectory of a single physical device across pseudonym rotation boundaries.
- **Surface**: Intercepts BLE traffic across all edge gateways in the facility.
- **Linkage Signals**:
  1. *Temporal Continuity*: Pseudonym $P_1$ stops broadcasting at $t_{\text{end}}$; pseudonym $P_2$ begins broadcasting at $t_{\text{start}} \approx t_{\text{end}}$.
  2. *Spatial / Gateway Consistency*: $P_1$ was last seen at gateway $G_A$; $P_2$ is first seen at gateway $G_B$. The physical distance $d(G_A, G_B)$ must be traversable within $\Delta t = |t_{\text{start}} - t_{\text{end}}|$.
  3. *RSSI Profile Similarity*: Continuity in signal power or trajectory velocity.
- **Constraint**: Must generate binary linkage predictions $\hat{L}_{i,j} \in \{0, 1\}$ without accessing the identity registry.

### Attacker C: Baseline Unauthorized Identity Resolver
- **Objective**: Map an observed pseudonym trajectory to a specific person ID $P_k \in \{P_1, \dots, P_N\}$ without authorized registry credentials.
- **Baseline Capabilities**: Operates strictly under the conservative side-information set: knows the facility gateway layout, public observations, and total population count $N_{\text{pop}}$.
- **Methodology**: Builds empirical dwell-time and activity vectors from observed pseudonyms and ranks candidate identities under a uniform prior.
- **Reporting**: Evaluated via Top-1 accuracy, Top-$k$ accuracy, and coverage.

### Attacker C+: Profile-Informed Identity Resolver (Advanced Scenario)
- **Objective**: Advanced inference when public role profiles (e.g. healthcare worker mobility patterns vs patient bed-bound patterns) are known.
- **Methodology**: Computes Bayesian likelihood of observed spatial dispersion given role-based movement priors.
- **Boundary**: Kept strictly separate from Baseline Attacker C to avoid over-claiming attacker capabilities.

---

## 6. Non-Goals & Out-of-Scope Attacks

The following attack vectors are explicitly out of scope for the current simulation testbed:
1. **Radio Frequency Fingerprinting**: Distinguishing hardware via physical RF transmitter imperfections (carrier frequency offset, transient spectral characteristics).
2. **Acoustic or Visual Side-Channels**: Correlating BLE packets with external surveillance cameras or acoustic sensors.
3. **Malicious Wearable Firmware / Malware**: Exploits compromising the internal microcontroller or dumping cryptographic keys from device RAM.
4. **Active Gateway Impersonation / Man-in-the-Middle (MitM)**: Rogue gateways injecting fraudulent packets into the edge infrastructure.
