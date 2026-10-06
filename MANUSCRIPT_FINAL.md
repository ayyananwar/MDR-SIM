# Gateway Co-Observation for BLE Contact Reconstruction: A Reproducible Simulation Evaluation with Seed-Grouped Validation

**Arjun K. V., Nabil Ahmad Khan, Md. Aasim Shaibani, Ayyan Anwar, Alakananda K.**
Department of Computer Science and Engineering
Sahyadri College of Engineering and Management
Mangaluru, India

---

## Abstract

Privacy-preserving digital contact monitoring is widely investigated for infectious disease control. While decentralized Bluetooth Low Energy (BLE) exposure-notification systems rely on direct device-to-device RF measurements, infrastructure-centric architectures often propose using fixed gateways to co-observe nearby wearables. This study evaluates gateway co-observation as a proxy for physical person-to-person geometric contact. Using MDR-SIM, a spatiotemporal simulation framework, we execute a reproducible 30-seed campaign modeling 50 individuals moving within an 8-gateway coverage area. We evaluate upstream contact-reconstruction fidelity (E1) and downstream digital exposure-record validity (E3). 

Under the evaluated configuration, gateway co-observation yielded poor geometric contact reconstruction, recovering only 0.100 mean true positive contacts per hour while generating 5.267 mean false positives (Precision: 0.025, Recall: 0.019). The high false-negative rate of the gateway reconstruction pipeline substantially reduced the prevalence of E3-positive records. A Two-Point RSSI-Derived Gateway Distance Threshold Diagnostic (2.0 m vs 3.0 m) demonstrated that expanding the threshold triggers a sharp rise in false-positive classifications, illustrating a structural sensitivity to the gateway coverage area. Furthermore, strict seed-grouped Leave-One-Seed-Out (LOSO) cross-validation under severe class imbalance caused a fold-specific inverse ranking for logistic regression. We conclude that substituting geometric ground truth with gateway-based co-observation introduces critical upstream reconstruction limitations that severely constrain downstream evaluation under the evaluated configuration, underscoring the necessity of strict spatio-temporal validation methodologies in digital health deployments.

---

## I. INTRODUCTION

Digital contact monitoring systems deploy short-range radio telemetry—predominantly Bluetooth Low Energy (BLE)—to reconstruct the physical proximity of individuals, providing epidemiological intelligence. While many systems employ decentralized device-to-device telemetry [1], infrastructure-centric environments (e.g., hospitals, workplaces) often utilize static gateways to monitor wearable tags [2]. In these architectures, if two tags are simultaneously observed by the same gateway, the system infers that the tags are in proximity to each other.

However, substituting direct device-to-device RF ranging with fixed gateway co-observation introduces significant geometric distortion. In an idealized oracle-radius model, if the true gateway-to-device distances satisfy d(A,G)<=r and d(B,G)<=r, the triangle inequality gives d(A,B)<=2r. In the evaluated system, however, the gateway threshold is applied to RSSI-derived distance estimates, so 2r is an ideal geometric bound rather than a guaranteed bound on actual participant separation. Despite this theoretical limit, literature evaluating the validity of such reconstructed contacts against pure Euclidean ground truth remains sparse.

This paper evaluates the performance of gateway co-observation as a proxy for physical contact. We utilize a reproducible simulation framework to generate deterministic spatiotemporal human mobility, simulate BLE RF propagation [3], apply an upstream edge-filtering pipeline (Option C), and evaluate downstream exposure classification.

### A. Contributions
The primary contributions of this methodological study are:
1. **Separation of Hidden Geometric Ground Truth from Observations:** We formally decouple actual physical location data from the RF signals available to the reconstruction algorithms.
2. **Formal Evaluation of Gateway Co-Observation:** We quantify the contact-reconstruction degradation (TP, FP, FN) observed under a controlled 8-gateway proxy configuration.
3. **Downstream Error Propagation:** We establish how upstream reconstruction errors propagate to downstream digital exposure-record sparsity, structurally starving downstream digital exposure-validity classification models.
4. **Reproducible Negative-Result Methodology:** We detail a strictly seed-grouped Leave-One-Seed-Out (LOSO) validation approach, identifying mathematically observed failure modes when algorithms face evaluation under severe class imbalance and limited positive-class support.

### B. Scope and Limitations
This study evaluates **digital exposure-record validity**, not clinical infection. The simulation framework abstracts 2D mobility and log-distance shadowing. It does **not** model pathogen viability, bacterial shedding, aerosol concentration, inhaled dose, immune response, microbiological diagnosis, or treatment outcomes. Therefore, downstream model outputs indicate either heuristic scores or the probability that a physical distance condition was met ($E=1$), and explicitly do not represent clinical risk or MDR-TB transmission probability.

---

## II. METHODS

### A. Simulation Framework
We utilized MDR-SIM to generate 30 independently seeded, deterministically reproducible simulation trajectories (Seeds 101-110, 201-210, 301-310). Each seed modeled 50 individuals moving over a 3600-second duration in an environment monitored by 8 fixed gateways evenly distributed across the simulation grid.

The BLE RF environment uses the forward equation: $P_r(t)=A_0 - 10n \log_{10}(d(t)/d_0) + \epsilon(t)$, where $\epsilon(t)$ represents log-normal shadowing noise sampled prior to applying hardware reception limits. Packets falling below the -95 dBm reception sensitivity floor were subsequently dropped. The downstream edge-validation threshold was set permissively to -110 dBm, ensuring that any packet surviving hardware reception was successfully processed.

### B. Ground Truth Definition
Geometric ground truth ($E=1$) is defined exclusively by actual physical coordinates. A true contact session requires $d(A,B) \le 2.0$ meters for a minimum duration of 30 seconds. The RF reconstruction pipeline operates entirely blinded to these coordinates.

### C. Edge Reconstruction (Option C)
The upstream edge pipeline applies median smoothing over a 5-observation window and relies on gateway co-observation to infer contact. Exposure records are reconstructed when sufficient smoothed advertisements overlap within the temporal proximity of a single gateway.

### D. Downstream Target Definition (E3)
To evaluate the downstream digital exposure validity (E3), each reconstructed `ExposureRecord` is compared against the hidden geometric ground truth. A reconstructed session is labeled valid ($E=1$) if and only if:
1. The canonical participant pair $(A, B)$ is identical to a ground-truth contact pair.
2. The reconstructed session interval and the ground-truth geometric contact interval have a non-zero temporal intersection ($\max(start_{rec}, start_{gt}) < \min(end_{rec}, end_{gt})$). Candidate pairs are sorted in descending IoU. Equal-IoU candidates retain deterministic candidate-generation order; no random tie-breaking is used.

E3 is a post-reconstruction validity task: the target is derived by comparing each reconstructed session with hidden geometric ground truth, while the evaluated features are derived from the reconstructed session itself. E3 performance should therefore be interpreted as validation of reconstructed-record consistency rather than independent prediction of a clinical or epidemiological outcome.

### E. Validation Strategy (LOSO)
We employ a strictly grouped Leave-One-Seed-Out (LOSO) cross-validation strategy. The grouping variable is the simulation seed. All records from a held-out seed remain exclusively in the test fold, and training data is drawn only from the 29 remaining seeds. Preprocessing and model fitting occur strictly on the training data. Standard row-wise splitting can inadvertently place correlated observations from the same continuous trajectory into both training and test partitions; strict seed-grouping avoids this inter-trajectory overlap.

---

## III. RESULTS

### A. Upstream Contact Reconstruction Fidelity (E1)
We evaluated the ability of gateway co-observation to faithfully reconstruct true Euclidean contact sessions (Table I). TP, FP, and FN are arithmetic means of seed-level counts; precision, recall, and F1 are arithmetic means of the corresponding seed-level metrics.

**TABLE I. E1 Contact Reconstruction Metrics (Macro-Averaged over 30 Seeds)**

| Metric | Mean | 95% CI |
| :--- | :--- | :--- |
| True Positives (TP) | 0.100 | [0.000, 0.250] |
| False Positives (FP) | 5.267 | [4.123, 6.410] |
| False Negatives (FN) | 2.700 | [2.110, 3.290] |
| Total GT Contacts | 2.800 | [2.146, 3.454] |
| Precision | 0.025 | [0.000, 0.071] |
| Recall | 0.019 | [0.000, 0.047] |
| F1 Score | 0.017 | [0.000, 0.043] |

Under the evaluated configuration, the mean seed-level recall was 0.019, corresponding to a mean seed-level non-recovery rate of 98.1%. This generated a disproportionate volume of false positives.

### B. TWO-POINT RSSI-DERIVED GATEWAY DISTANCE THRESHOLD DIAGNOSTIC
To investigate the geometric sensitivity of the E1 reconstruction, we performed a targeted diagnostic sweep using a subset of configuration data. 
- At Gateway estimated-distance threshold = 2.0 m: TP = 1, FP = 69
- At Gateway estimated-distance threshold = 3.0 m: TP = 1, FP = 811

This supports the sensitivity of reconstruction quality to the distance threshold under the evaluated setup: expanding the threshold creates a sharp rise in false positive classifications.

### C. Downstream Digital Exposure Validity (E3)
Because Option C dropped a vast majority of true physical contacts, the downstream datasets were severely starved of positive ground-truth examples. The actual fold structure comprised 30 total seeds, which yielded 2 empty folds (204, 205), 26 negative-only folds, 2 class-supported folds (301, 303), and 0 positive-only folds.

Table II presents the baseline comparison. AUROC and AUPRC were calculated separately for seeds 301 and 303 and macro-averaged across the two class-supported folds. F1, Brier score, and ECE were calculated separately for each of the 28 non-empty folds and macro-averaged across those folds. F1 is a descriptive secondary metric under sparse positive-class support, not the principal basis for comparing downstream models. Undefined metrics were explicitly omitted from aggregations.

**TABLE II. E3 Baseline Comparison**

| Model | AUROC (n=2) | AUPRC (n=2) | F1 (n=28) | Brier (n=28) | ECE (n=28) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Proximity-Only Baseline | 0.500 | 0.379 | 0.035 | N/A | N/A |
| Proximity+Duration Baseline | 1.000 | 1.000 | 0.035 | N/A | N/A |
| Legacy Heuristic Baseline | 0.963 | 0.850 | 0.000 | N/A | N/A |
| Bayesian Baseline | 0.588 | 0.419 | 0.000 | 0.031 | 0.055 |
| Logistic Regression Baseline | 0.000 | 0.326 | 0.000 | 0.027 | 0.047 |
| Prior-Only Baseline | 0.500 | 0.379 | 0.000 | 0.032 | 0.113 |

*(Note: N/A indicates the model outputs an uncalibrated heuristic score rather than a probability. The Proximity-Only baseline is a constant-score reconstruction-survival baseline; `proximityEvidence=1.0` for every reconstructed session, producing a constant 0.99 score. The Proximity+Duration baseline is explicitly $0.5 + 0.5 \cdot \min(1, D/300)$ under `proximityEvidence=1.0`.)*

### D. Logistic Regression Inverse Ranking
The Logistic Regression baseline achieved an AUROC of 0.000. In the Leave-One-Seed-Out (LOSO) structure, for held-out seed 301 (2 positive / 20 negative test records), the corresponding training fold contained exactly 4 positive and 296 negative records. For held-out seed 303 (4 positive / 2 negative test records), the training fold contained exactly 2 positive and 314 negative records. In both class-supported folds, the fitted model assigned lower predicted probabilities to positive test records than to negative records, satisfying max(p_positive) < min(p_negative) and producing AUROC = 0.000. This is interpreted as a fold-specific observation under the evaluated class imbalance and optimization configuration. 

---

## IV. CONCLUSION

This reproducible study demonstrates that under the evaluated 8-gateway Option-C configuration, gateway co-observation produced poor geometric contact reconstruction and severe downstream temporal-validity sparsity. The upstream reconstruction algorithm dropped the vast majority of true physical contacts, resulting in extreme class imbalance that substantially constrained downstream model evaluation. We emphasize the necessity of explicitly separating spatial ground truth from algorithmic reconstruction when evaluating proximity-based digital health architectures.

---

## V. REPRODUCIBILITY

To facilitate independent verification, the exact 30 seeds, frozen configuration, gateway placement rules, codebase implementation hash, and output artifact checksums are fully documented in the provided `PHASE_8_MANIFEST.json`. The codebase executes deterministically given the identical configuration and Node.js environment.

---

## VI. LIMITATIONS

1. **Simulation Abstraction:** This study relies on a 2D RF log-distance shadowing simulation without empirical physical validation.
2. **Clinical Scope:** No clinical infection, pathogen viability, or transmission outcomes are modeled. 
3. **Restricted Architecture:** The evaluation targets a specific 8-gateway Option-C configuration; dense antenna arrays may exhibit different profiles.
4. **Extreme Sparsity:** Downstream discrimination metrics (AUROC/AUPRC) were limited to an $n=2$ valid seed subset due to the overwhelming false-negative rate.
5. **No Oracle Geometry Decomposition:** We did not run a comparative oracle evaluation using perfectly reconstructed edges.
6. **No External Validation:** The model was not validated on external empirical clinical datasets.
7. **Privacy Constraints:** No privacy attacker experiments were performed in this scope.

---

## VII. REFERENCES
[1] A Survey of Automatic Contact Tracing Approaches Using Bluetooth Low Energy, *ACM Transactions on Computing for Healthcare*, 2021.
[2] Feasibility of Bluetooth Low Energy wearable tags, *Infection, Disease & Health*, 2022.
[3] Bluetooth Low Energy (BLE) Received Signal Strength Indicator (RSSI) Data, *NIST Public Data Repository*, 2022.
