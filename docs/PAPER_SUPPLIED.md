# Gateway Co-Observation for Bluetooth Low Energy Contact Reconstruction: A Seed-Grouped Simulation Evaluation

**Arjun K. V., Md. Aasim Shaibani, Nabil Ahmad Khan, Ayyan Anwar, and Alakananda K.**

Department of Computer Science and Engineering, Sahyadri College of Engineering and Management, Mangaluru, India

**Corresponding author:** Arjun K. V., [arskv7145@gmail.com](mailto:arskv7145@gmail.com)

**Author e-mails:**\
Arjun K. V. — [arskv7145@gmail.com](mailto:arskv7145@gmail.com)\
Md. Aasim Shaibani — [aasimshaibani25@gmail.com](mailto:aasimshaibani25@gmail.com)\
Nabil Ahmad Khan — [nabilkhan1708@gmail.com](mailto:nabilkhan1708@gmail.com)\
Ayyan Anwar — [ayyanq395@gmail.com](mailto:ayyanq395@gmail.com)\
Alakananda K. — [alakanandakvidyan@gmail.com](mailto:alakanandakvidyan@gmail.com)

---

## Abstract

Bluetooth Low Energy (BLE) is widely used for proximity sensing and digital contact-monitoring applications. In infrastructure-assisted deployments, fixed gateways observe wearable devices and may use temporally coincident gateway observations as a proxy for person-to-person contact. This study evaluates the fidelity of that proxy against hidden geometric reference contacts using a controlled simulation framework with seed-grouped validation. A 30-seed campaign was conducted with 50 simulated participants over 3600 s using eight fixed gateways. The evaluation separates upstream gateway-based contact reconstruction from downstream analysis of records that survive the reconstruction pipeline. Gateway reconstruction yielded a mean of 0.100 true-positive matches and 5.267 false-positive matches per seed, with mean seed-level precision of 0.025, recall of 0.019, and F1 score of 0.017. The complement of the mean seed-level recall corresponds to a 98.1% seed-level non-recovery statistic. Downstream evaluation was severely constrained by reconstruction-induced class sparsity: 28 folds contained reconstructed records, but 26 of those were negative-only and only two held-out seeds contained both classes. A targeted two-point diagnostic showed that increasing the RSSI-derived gateway-distance threshold from 2.0 to 3.0 m increased the observed false-positive count from 69 to 811 while the observed true-positive count remained 1. These findings show that gateway co-observation should be treated as a contact-reconstruction mechanism rather than as a direct measurement of pairwise physical proximity, and that reconstruction fidelity must be evaluated before downstream predictive results are interpreted.

**Index Terms—** Bluetooth Low Energy, contact reconstruction, gateway co-observation, RSSI, digital contact monitoring, simulation, seed-grouped validation, class imbalance.

---

# I. INTRODUCTION

Bluetooth Low Energy (BLE) has been investigated extensively for proximity sensing and digital contact-monitoring systems. BLE-based contact-monitoring architectures include decentralized device-to-device approaches as well as infrastructure-assisted deployments involving fixed receivers or gateways [1]. Hospital studies have demonstrated the practical use of BLE wearables and fixed receivers to quantify proximity interactions and contact patterns among healthcare personnel and patients [2], [3].

A central methodological difficulty is that a BLE observation is not a direct measurement of pairwise physical distance. Received Signal Strength Indicator (RSSI) values can vary with propagation conditions, antenna characteristics, device orientation, interference, body obstruction, and temporal effects. Experimental BLE studies have documented substantial fluctuations in RSSI under different environmental and device configurations [4]–[6].

Infrastructure-assisted reconstruction introduces an additional geometric transformation. Consider two wearable devices \\(A\\) and \\(B\\) observed by a common gateway \\(G\\). In an idealized true-distance model,

\\(d(A,G)\leq r\\)

and

\\(d(B,G)\leq r\\)

imply, by the triangle inequality,

\\(d(A,B) \leq d(A,G)+d(G,B) \leq 2r.\\)

This is an upper bound under an ideal true-distance observation model. It does not imply that common observation within a gateway radius \\(r\\) establishes a person-to-person separation of at most \\(r\\).

The implemented system is more indirect. The gateway threshold operates on an RSSI-derived distance estimate rather than on directly observed physical gateway distance. Consequently, the \\(2r\\) expression is an ideal geometric result and is not a guaranteed physical separation bound under noisy RSSI-derived ranging.

This distinction motivates the central methodological question of this study: **how accurately does gateway co-observation reconstruct a separately defined pairwise geometric contact process?**

The problem is important because downstream models operate not on the hidden physical trajectory but on records produced by the reconstruction pipeline. A missed geometric contact cannot subsequently appear as a positive downstream reconstructed-contact record. Conversely, false-positive reconstructed sessions introduce records that have no corresponding geometric contact. Thus, reconstruction errors alter not only measurement fidelity but also the class composition of the downstream evaluation dataset.

Simulation-based contact-tracing research has shown that sensing modality can affect reconstructed contact structures and downstream analyses [7]. BLE indoor-localization research has also explored richer combinations of RSSI, angle of arrival, filtering, and sensor fusion to address uncertainty in radio-based positioning [8], [9].

The present study deliberately isolates the reconstruction problem rather than making clinical or epidemiological claims.

The study addresses two research questions:

**RQ1:** Under the simulation-defined geometric contact criterion, how accurately does gateway co-observation reconstruct person-to-person contact sessions?

**RQ2:** How do upstream contact-reconstruction errors affect the prevalence and evaluability of downstream reconstructed-contact validity records?

The principal contributions of this work are:

1. **Separation of hidden geometric state from observable telemetry:** Participant trajectories used to construct reference contacts remain unavailable to the gateway reconstruction and downstream baseline models.
2. **Quantitative reconstruction evaluation:** Gateway-derived reconstructed sessions are evaluated against geometric reference sessions using true-positive, false-positive, false-negative, precision, recall, and F1 statistics.
3. **Explicit downstream error-propagation analysis:** The study examines how upstream reconstruction changes downstream record availability and class composition.
4. **Seed-grouped validation:** Strict Leave-One-Seed-Out (LOSO) validation prevents records generated by the same simulated trajectory from appearing in both training and test partitions.
5. **Transparent negative-result evaluation:** The gateway reconstruction mechanism, temporal pairing rule, aggregation procedure, validation structure, and downstream baseline configurations are explicitly defined so that the reported failure modes can be independently examined.

The study evaluates **digital reconstructed-contact validity**. It does not model pathogen viability, bacterial shedding, aerosol concentration, inhaled dose, immune response, microbiological diagnosis, clinical infection, treatment, or disease-transmission dynamics.

---

# II. RELATED WORK

## A. BLE-Based Contact Monitoring

Reichert *et al.* surveyed automatic contact-tracing architectures using BLE and described the design space of automated contact-monitoring systems [1]. Hospital feasibility studies demonstrated that wearable BLE tags and fixed receivers can be used to derive proximity networks and contact-duration information [2], [3]. These studies establish the operational feasibility of BLE-based observation but do not imply that a gateway observation is equivalent to direct pairwise ranging.

The distinction is particularly important for infrastructure-centric architectures. The system first observes participant-to-gateway relationships and only subsequently attempts to infer participant-to-participant contact.

## B. RSSI-Based Proximity and Localization

RSSI-based distance estimation is attractive because it can be obtained using standard BLE hardware without dedicated ranging sensors. However, the relationship between received power and physical separation is affected by propagation and hardware conditions.

Moayeri *et al.* provided a BLE RSSI dataset intended for proximity-detection research and investigated the feasibility of BLE proximity detection experimentally at NIST [5], [6]. Flueratoru *et al.* documented substantial RSSI fluctuations and discussed their implications for contact tracing, proximity detection, ranging, and positioning [4].

Indoor BLE localization research has also explored richer approaches. Płaza *et al.* investigated BLE beacon-based real-time location-system design and the relationship between RSSI, temporal parameters, and localization performance [8]. Fabris *et al.* combined RSSI, angle of arrival, Kalman filtering, and data fusion for BLE indoor positioning [9]. Assayag *et al.* released an indoor BLE RSSI dataset containing measurements collected from mobile devices relative to fixed anchors [10].

The present work does not attempt to reproduce these richer localization systems. Instead, it evaluates a deliberately defined gateway co-observation mechanism in isolation.

## C. Simulation-Based Contact Evaluation

Qian *et al.* demonstrated through simulation-driven analysis that Bluetooth- and GPS-derived contact structures can differ and that sensing characteristics can affect downstream analyses [7].

The present study differs in scope and objective. It does not model disease transmission or compare epidemiological interventions. Instead, it explicitly separates the hidden physical state from BLE observations and evaluates the fidelity of gateway-based contact reconstruction before examining downstream reconstructed-record validity.

## D. Structured Validation of Spatiotemporal Data

Observations generated from a common trajectory can share substantial temporal and structural dependence. Random row-wise validation can consequently allow related observations to appear in both training and test partitions. Structure-aware cross-validation has been recommended for data with temporal, spatial, hierarchical, or related dependence structures [14].

The present study therefore treats the complete simulation seed as the validation unit.

---

# III. SYSTEM MODEL AND PROBLEM FORMULATION

## A. Hidden Geometric State

Let the position of participant \\(i\\) at time \\(t\\) be

\\(p_i(t)= \left(x_i(t),y_i(t)\right).\\)

The Euclidean separation between participants \\(i\\) and \\(j\\) is

\\(d\\\_{ij}(t) = \sqrt{ (x_i(t)-x_j(t))^2+ (y_i(t)-y_j(t))^2 }.\\)

A reference contact condition is defined as

\\(d\\\_{ij}(t)\leq2.0\text{ m}.\\)

The condition must hold continuously for at least 30 s for a reference contact session to be generated. A discontinuity terminates the session; separated intervals are not cumulatively combined.

The 2.0-m distance and 30-s duration are fixed operational definitions of the simulation experiment and are not presented as universal definitions of real-world contact.

The hidden coordinates are used only to construct reference contacts and evaluate reconstruction. They are not supplied to the gateway reconstruction or downstream models.

## B. BLE Radio Model

For participant-to-gateway distance \\(d(t)\\), received power is generated using the log-distance model

\\(P_r(t) = A_0 - 10n \log\\\_{10} \left( \frac{d(t)}{d_0} \right) + \epsilon(t),\\)

where

\\(A_0=-50\text{ dBm}, \qquad d_0=1\text{ m}, \qquad n=2.5.\\)

The stochastic RSSI term is modeled as

\\(\epsilon(t)\sim\mathcal{N}(0,6^2)\\)

in decibels.

The configured model does not require an additional claim that every stochastic realization is independent of every other realization.

The edge pipeline estimates gateway distance from received power using

\\(\hat d = d_0 10^{\frac{A_0-P_r}{10n}}.\\)

A BLE observation qualifies for gateway proximity when

\\(\hat d\leq2.0\text{ m}.\\)

The threshold therefore applies to an **RSSI-derived distance estimate**, rather than directly to a measured physical gateway-to-device distance.

## C. Evaluation Layers

The experimental design contains two separate evaluation layers.

**E1 — Reconstruction fidelity:** gateway-derived participant-pair sessions are matched against hidden geometric reference sessions.

**E3 — Reconstructed-contact validity:** only reconstructed records that survive the gateway pipeline are evaluated, and each record is labeled using the hidden geometric reference state.

The dependency structure is therefore

\\(\text{hidden geometry} \rightarrow \text{BLE/RF observation} \rightarrow \text{gateway reconstruction} \rightarrow \text{E1 evaluation} \rightarrow \text{E3 records and labels}.\\)

No coordinate-derived quantity is supplied as a downstream feature.

---

# IV. SIMULATION CONFIGURATION

The primary campaign uses 30 deterministic simulation seeds:

\\(\\{101\text{--}110,\\;201\text{--}210,\\;301\text{--}310\\}.\\)

Each seed contains 50 simulated participants over 3600 s and uses eight fixed gateways.

The seeds are treated as **simulation replicates**, not human participants, clinical populations, or epidemiological samples.

### TABLE I

**PRIMARY SIMULATION CONFIGURATION**

| Parameter                               | Value          |
| --------------------------------------- | -------------- |
| Participants                            | 50             |
| Simulation duration                     | 3600 s         |
| Simulation seeds                        | 30             |
| Gateways                                | 8              |
| Reference contact distance              | 2.0 m          |
| Minimum reference duration              | 30 s           |
| BLE advertising interval                | 500 ms         |
| Advertising jitter                      | 0–10 ms        |
| RSSI reference \\(A_0\\)                | −50 dBm at 1 m |
| Path-loss exponent \\(n\\)              | 2.5            |
| RSSI noise standard deviation           | 6 dB           |
| Packet-loss probability                 | 0.05           |
| Receiver sensitivity                    | −95 dBm        |
| RSSI-derived gateway threshold          | 2.0 m          |
| Observation deduplication window        | 20 ms          |
| RSSI median-filter window               | 5 observations |
| Gateway co-observation window           | 1000 ms        |
| Minimum reconstructed observations      | 3              |
| Minimum reconstructed duration          | 30 s           |
| Maximum session gap                     | 5 s            |
| Bayesian prior \\(P(E=1)\\)             | 0.10           |
| Bayesian Laplace smoothing \\(\alpha\\) | 1              |
| Logistic \\(L_2\\) coefficient          | 0.1            |
| Logistic learning rate                  | 0.05           |
| Logistic epochs                         | 200            |

The exact simulation-area geometry, gateway coordinates, trajectory-generation parameters, software/runtime identifiers, and output checksums are part of the intended reproducibility package.

---

# V. BLE OBSERVATION AND GATEWAY RECONSTRUCTION

## A. BLE Advertisement Generation

BLE advertisements are generated at a nominal interval of 500 ms with timing jitter between 0 and 10 ms.

Each generated observation is assigned an RSSI according to the forward log-distance model. A packet-loss probability of 0.05 is then applied.

## B. Receiver Filtering

Observations below the receiver-sensitivity threshold

\\(P_r<-95\text{ dBm}\\)

are discarded.

A downstream edge-validation threshold of \\(-110\\) dBm is also configured. Because the receiver-sensitivity stage is stricter, the \\(-110\\)-dBm condition does not further reduce observations under the evaluated processing order.

## C. Observation Deduplication

The edge-processing stage applies a 20-ms observation deduplication window using the configured wearable, gateway, and event identity.

When duplicate observations satisfy the deduplication condition, the first observation is retained.

No RSSI averaging is performed during this stage.

The 20-ms window is a **deduplication parameter** and is not the temporal coincidence window used for pairing two different wearables.

## D. RSSI Filtering and Distance Estimation

After reception and deduplication, RSSI observations are median-filtered using a five-observation window.

The filtered RSSI value is converted into estimated gateway distance:

\\(\hat d = d_0 10^{\frac{A_0-P_r}{10n}}.\\)

Only observations satisfying

\\(\hat d\leq2.0\text{ m}\\)

enter gateway co-observation processing.

## E. Gateway Co-Observation

Qualifying observations are grouped by gateway and processed in chronological order.

For a current observation occurring at \\(t\\\_{\mathrm{cur}}\\), a prior qualifying observation at \\(t\\\_{\mathrm{prev}}\\) from a distinct wearable is eligible for pairing when

\\(0 \leq t\\\_{\mathrm{cur}}-t\\\_{\mathrm{prev}} \leq1000\text{ ms}.\\)

Thus, the gateway co-observation mechanism uses a **1-s chronological sliding window**.

The 1000-ms co-observation window is separate from the 20-ms observation deduplication window and the subsequent 5-s sessionization gap.

### Algorithm 1

**Gateway Candidate-Pair Generation**

```
Input:
    qualifying observations O

1. Group O by gateway identifier.
2. For each gateway g:
3.     Sort observations chronologically.
4.     Maintain a sliding window of 1000 ms.
5.     For each current observation a at time t_cur:
6.         Identify prior observations b satisfying
              0 <= t_cur - t_prev <= 1000 ms.
7.         Exclude observations originating from the same wearable.
8.         For every remaining observation b:
9.             emit candidate pair
              (wearable_a, wearable_b, gateway_g).
10. Return gateway candidate pairs.
```

## F. Sessionization

Candidate gateway observations are converted into reconstructed participant-pair sessions.

A reconstructed session must satisfy

\\(N\\\_{\mathrm{obs}}\geq3,\\)\\(T\\\_{\mathrm{session}}\geq30\text{ s},\\)

and a maximum gap of

\\(5\text{ s}\\)

between successive qualifying observations.

Every surviving reconstructed session receives

\\(\mathrm{proximityEvidence}=1.0.\\)

Accordingly, the proximity feature is a reconstruction-survival indicator rather than a calibrated continuous proximity probability.

### [FIGURE 1 PLACEHOLDER]

**Fig. 1. System architecture and evaluation pipeline.**\
*[Insert final figure here; figure description to be finalized by authors.]*

---

# VI. E1: REFERENCE-CONTACT MATCHING AND RECONSTRUCTION FIDELITY

## A. Reference Session Construction

A geometric reference session is generated when

\\(d(A,B)\leq2.0\text{ m}\\)

continuously for at least 30 s.

A break terminates the current session. Later qualifying intervals are treated as separate sessions.

## B. Canonical Participant Pair

Participant pairs are represented canonically so that

\\((A,B)\equiv(B,A).\\)

This prevents directional identifier ordering from generating artificial mismatches.

## C. Temporal Matching

For reconstructed interval \\(R\\) and reference interval \\(G\\), temporal Intersection-over-Union is

\\(IoU(R,G) = \frac{|R\cap G|} {|R\cup G|}.\\)

A candidate pair is eligible for matching when

\\(IoU(R,G)\geq0.2\\)

and

\\(|R\cap G|\geq5\text{ s}.\\)

Candidates are sorted in descending IoU.

Equal-IoU candidates retain deterministic candidate-generation order. No random tie-breaking is used.

Matching is one-to-one and greedy.

A matched reconstructed/reference pair contributes one true positive.

An unmatched reconstructed session contributes one false positive.

An unmatched reference session contributes one false negative.

The IoU and overlap thresholds are fixed operational choices of the evaluation protocol and are not presented as universal contact-matching standards.

## D. Statistical Aggregation

For each seed, TP, FP, FN, precision, recall, and F1 are calculated independently.

Across the 30 seeds, reported means are arithmetic seed-level averages.

The 95% confidence interval is

\\(CI\\\_{95\\%} = \bar{x} \pm t\\\_{0.975,n-1} \frac{s}{\sqrt n},\\)

where \\(s\\) is the sample standard deviation using Bessel's correction.

For non-negative quantities, a negative lower confidence limit resulting from the Student-\\(t\\) interval is truncated to zero for reporting.

The confidence intervals summarize simulation-replicate variation; they are not confidence intervals for an underlying clinical population.

---

# VII. E3: DOWNSTREAM RECONSTRUCTED-CONTACT VALIDITY

E3 is applied after the gateway reconstruction pipeline.

For each reconstructed record,

\\(E=1\\)

if and only if:

1. the canonical reconstructed participant pair matches a hidden geometric reference-contact pair; and
2. the reconstructed and reference intervals overlap by a non-zero duration.

Formally,

\\(Pair\\\_{\mathrm{rec}} = Pair\\\_{\mathrm{gt}}\\)

and

\\(\max (start\\\_{\mathrm{rec}},start\\\_{\mathrm{gt}}) < \min (end\\\_{\mathrm{rec}},end\\\_{\mathrm{gt}}).\\)

No E3 minimum IoU requirement is imposed.

No minimum E3 overlap duration is imposed.

E3 is intentionally more permissive than E1.

The hidden participant coordinates and reference-contact state are used to construct the E3 target and evaluate E1, but no coordinate-derived feature is provided to the downstream models.

E3 is therefore a **post-reconstruction record-validity task**, not an independent clinical exposure or infection-prediction task.

### [FIGURE 2 PLACEHOLDER]

**Fig. 2. Geometric relationship between gateway co-observation and participant-to-participant contact.**\
*[Insert final figure here; figure description to be finalized by authors.]*

---

# VIII. DOWNSTREAM BASELINES

## A. Constant-Score Reconstruction-Survival Baseline

The first baseline computes

\\(s_p = \min \left( 0.99, \max (0.01,\mathrm{proximityEvidence}) \right).\\)

Because every surviving reconstructed session has

\\(\mathrm{proximityEvidence}=1.0,\\)

the output is

\\(s_p=0.99\\)

for every record.

This baseline is therefore a constant-score reconstruction-survival reference rather than a discriminative proximity estimator.

## B. Proximity + Duration Baseline

The second baseline computes

\\(s\\\_{pd} = 0.5\cdot\mathrm{proximityEvidence} + 0.5 \min \left( 1,\frac{D}{300} \right),\\)

where \\(D\\) is reconstructed session duration.

Because proximity evidence is always 1,

\\(s\\\_{pd} = 0.5 + 0.5 \min \left( 1,\frac{D}{300} \right).\\)

Thus, all score variation originates from duration.

The 300-s scale is a fixed baseline parameter and is not optimized using held-out test records.

## C. Rule-Based Heuristic

The rule-based baseline produces an additive score using implementation-defined evidence involving encounter duration, RSSI-related information, repeated observations, and source-status information.

Its output is treated as an uncalibrated score.

Brier score and ECE are therefore not reported for this baseline.

The exact feature transformations and weights should be released in the supplementary reproducibility package.

## D. Bayesian Baseline

The Bayesian baseline uses the fixed prior

\\(P(E=1)=0.10\\)

and

\\(P(E=0)=0.90.\\)

The prior remains fixed across validation folds.

Class-conditional likelihoods use Laplace smoothing with

\\(\alpha=1.\\)

The model uses evidence groups corresponding to reconstructed duration, proximity, recurrence/encounter count, and source status.

The conditional-independence structure is fixed by the implementation.

The complete likelihood tables and feature-state definitions should be distributed in the reproducibility package.

## E. Logistic Regression Baseline

The logistic model uses the raw feature vector

\\(x= [D,P,C,D_c,S],\\)

where:

- \\(D\\) is reconstructed duration;
- \\(P\\) is proximity;
- \\(C\\) is encounter count;
- \\(D_c\\) is cumulative duration;
- \\(S\\) is source status.

Source status is encoded as

\\(1.0=\text{confirmed},\\)\\(0.5=\text{suspected},\\)

and

\\(0.0=\text{non-source}.\\)

No standardization, normalization, or min-max scaling is applied.

Training uses full-batch gradient descent with

\\(\lambda=0.1,\\)\\(\eta=0.05,\\)

and 200 epochs.

The sigmoid probability is

\\(p(y=1\mid x) = \frac{1}{1+e^{-z}}.\\)

Predicted probabilities are bounded to

\\(0.0001\leq p\leq0.9999.\\)

The F1 classification threshold is fixed at

\\(\tau=0.5\\)

and is not optimized against held-out test labels.

## F. Prior-Only Baseline

The Prior-Only baseline assigns

\\(p=0.10\\)

to every test record.

It does not use held-out test-fold prevalence.

---

# IX. SEED-GROUPED VALIDATION

Strict Leave-One-Seed-Out (LOSO) validation is applied to downstream evaluation.

For held-out seed \\(s\\),

\\(D\\\_{\mathrm{test}}=D_s\\)

and

\\(D\\\_{\mathrm{train}} = \bigcup\\\_{j\neq s}D_j.\\)

All records originating from one simulation trajectory therefore remain inside a single validation partition.

### TABLE II

**E3 SEED-LEVEL FOLD COMPOSITION**

| Fold category | Number |
| ------------- | ------ |
| Total         | 30     |
| Empty         | 2      |
| Non-empty     | 28     |
| Negative-only | 26     |
| Positive-only | 0      |
| Both classes  | 2      |

The empty folds are seeds 204 and 205.

The only class-supported folds are:

| Held-out seed | Test positive | Test negative | Training positive | Training negative |
| ------------- | ------------- | ------------- | ----------------- | ----------------- |
| 301           | 2             | 20            | 4                 | 296               |
| 303           | 4             | 2             | 2                 | 314               |

AUROC and Average Precision require both classes and are therefore calculated only for seeds 301 and 303.

F1, Brier score, and ECE are calculated separately for the 28 non-empty folds.

Empty folds are excluded rather than converted to zero-valued performance.

---

# X. STATISTICAL METRICS

## A. AUROC

AUROC is calculated independently for seeds 301 and 303.

The reported statistic is their arithmetic macro-average:

\\(AUROC\\\_{\mathrm{macro}} = \frac{ AUROC\\\_{301}+AUROC\\\_{303} }{2}.\\)

Because 28 of the 30 held-out folds do not contain both classes, AUROC is explicitly a two-fold descriptive statistic.

## B. Average Precision

Average Precision (AP), rather than a trapezoidal approximation of PR-AUC, is used to characterize ranking under the severe class imbalance.

Precision-recall analysis is particularly relevant when positive and negative classes are strongly skewed [11].

For a constant scoring function, AP reduces to the positive-class prevalence within each supported fold.

The two supported test-fold prevalences are

\\(\frac{2}{22}\\)

and

\\(\frac{4}{6}.\\)

Their arithmetic average is

\\(\frac{1}{2} \left( \frac{2}{22} + \frac{4}{6} \right) = 0.3788\ldots,\\)

which rounds to

\\(AP=0.379.\\)

## C. F1

At the fixed threshold

\\(\tau=0.5,\\)

precision is

\\(Precision= \frac{TP}{TP+FP},\\)

recall is

\\(Recall= \frac{TP}{TP+FN},\\)

and F1 is

\\(F1= \frac{ 2\\,Precision\\,Recall }{ Precision+Recall }.\\)

Because 26 of the 28 non-empty folds are negative-only, F1 is treated as a descriptive secondary metric.

## D. Brier Score

For seed \\(s\\) containing \\(N_s\\) records,

\\(B_s = \frac{1}{N_s} \sum\\\_{i=1}^{N_s} (p\\\_{si}-y\\\_{si})^2.\\)

The final Brier score is the macro-average

\\(B\\\_{\mathrm{macro}} = \frac{1}{28} \sum\\\_{s\in\mathcal V} B_s.\\)

The Brier score is a standard probabilistic forecast-error measure [12].

## E. Expected Calibration Error

Ten fixed probability bins are used:

\\([0,0.1), [0.1,0.2), \ldots, [0.8,0.9), [0.9,1.0].\\)

The last bin includes the value 1.0.

For seed \\(s\\),

\\(ECE_s = \sum_b \frac{n\\\_{sb}}{N_s} \left| \operatorname{obs}\\\_{sb} - \operatorname{pred}\\\_{sb} \right|,\\)

where \\(n\\\_{sb}\\) is the number of observations in bin \\(b\\), \\(\operatorname{obs}\\\_{sb}\\) is the observed positive frequency, and \\(\operatorname{pred}\\\_{sb}\\) is the mean predicted probability.

The final reported value is

\\(ECE\\\_{\mathrm{macro}} = \frac{1}{28} \sum\\\_{s\in\mathcal V} ECE_s.\\)

Calibration metrics are interpreted as probability-quality diagnostics rather than evidence of clinical utility [13].

---

# XI. RESULTS

## A. E1 Contact-Reconstruction Fidelity

### TABLE III

**E1 CONTACT-RECONSTRUCTION RESULTS**

| Metric                   | Mean  | 95% CI         |
| ------------------------ | ----- | -------------- |
| True Positives           | 0.100 | [0.000, 0.250] |
| False Positives          | 5.267 | [4.123, 6.410] |
| False Negatives          | 2.700 | [2.110, 3.290] |
| Total Reference Contacts | 2.800 | [2.146, 3.454] |
| Precision                | 0.025 | [0.000, 0.071] |
| Recall                   | 0.019 | [0.000, 0.047] |
| F1                       | 0.017 | [0.000, 0.043] |

Gateway reconstruction yielded a mean of 0.100 true-positive matches and 5.267 false-positive matches per seed.

Mean seed-level recall was

\\(0.019.\\)

The corresponding mean seed-level non-recovery statistic was therefore

\\(1-0.019=0.981,\\)

or **98.1%**.

This is a macro-averaged seed-level statistic. It is not a pooled proportion of all reference contacts missed across the complete campaign.

The results indicate substantial reconstruction error in both directions: reference contacts were rarely matched, while unmatched reconstructed sessions substantially exceeded matched sessions.

## B. RSSI-Derived Gateway Distance-Threshold Diagnostic

### TABLE IV

**TWO-POINT RSSI-DERIVED GATEWAY DISTANCE-THRESHOLD DIAGNOSTIC**

| RSSI-derived gateway distance threshold | TP | FP  |
| --------------------------------------- | -- | --- |
| 2.0 m                                   | 1  | 69  |
| 3.0 m                                   | 1  | 811 |

Increasing the RSSI-derived gateway distance threshold from 2.0 to 3.0 m increased the observed false-positive count from 69 to 811 while the observed true-positive count remained 1.

This is a targeted two-point diagnostic. The experiment does not establish a continuous functional relationship between threshold and false-positive count and therefore makes no claim of linear, quadratic, exponential, or other scaling behavior.

## C. E3 Baseline Comparison

### TABLE V

**E3 BASELINE COMPARISON**

| Model                                  | AUROC (\\(n=2\\)) | AP (\\(n=2\\)) | F1 (\\(n=28\\)) | Brier (\\(n=28\\)) | ECE (\\(n=28\\)) |
| -------------------------------------- | ----------------- | -------------- | --------------- | ------------------ | ---------------- |
| Constant-Score Reconstruction-Survival | 0.500             | 0.379          | 0.035           | N/A                | N/A              |
| Proximity + Duration                   | 1.000             | 1.000          | 0.035           | N/A                | N/A              |
| Rule-Based Heuristic                   | 0.963             | 0.850          | 0.000           | N/A                | N/A              |
| Bayesian                               | 0.588             | 0.419          | 0.000           | 0.031              | 0.055            |
| Logistic Regression                    | 0.000             | 0.326          | 0.000           | 0.027              | 0.047            |
| Prior-Only                             | 0.500             | 0.379          | 0.000           | 0.032              | 0.113            |

The constant-score reconstruction baseline has AUROC 0.500 because every reconstructed record receives the same score.

Its AP is 0.379, matching the macro-average of the supported fold positive prevalences.

The Proximity + Duration baseline produces AUROC 1.000 and AP 1.000 over the two class-supported folds. These values are observations from two held-out simulation trajectories rather than stable population-level estimates.

The Bayesian baseline produces AUROC 0.588, AP 0.419, Brier 0.031, and ECE 0.055.

The logistic-regression baseline produces AUROC 0.000, AP 0.326, Brier 0.027, and ECE 0.047.

The limited positive-class support substantially constrains the interpretation of the downstream model comparison.

### [FIGURE 3 PLACEHOLDER]

**Fig. 3. E1 reconstruction-fidelity results.**\
*[Insert final figure here; figure description to be finalized by authors.]*

### [FIGURE 4 PLACEHOLDER]

**Fig. 4. E3 fold composition and baseline comparison.**\
*[Insert final figure here; figure description to be finalized by authors.]*

---

## D. Logistic-Regression Inverse Ranking

The logistic model produces a complete inverse ranking in both class-supported folds.

For held-out seed 301,

\\(N\\\_{\mathrm{train}}^+=4, \qquad N\\\_{\mathrm{train}}^-=296,\\)

and

\\(N\\\_{\mathrm{test}}^+=2, \qquad N\\\_{\mathrm{test}}^-=20.\\)

For held-out seed 303,

\\(N\\\_{\mathrm{train}}^+=2, \qquad N\\\_{\mathrm{train}}^-=314,\\)

and

\\(N\\\_{\mathrm{test}}^+=4, \qquad N\\\_{\mathrm{test}}^-=2.\\)

In both folds,

\\(\max (p\\\_{\mathrm{positive}}) < \min (p\\\_{\mathrm{negative}}).\\)

Consequently, every positive test record receives a lower score than every negative test record, yielding

\\(AUROC=0.000.\\)

The manuscript does not attribute the inverse ranking to a specific learned coefficient.

The observation is interpreted in the context of:

- severe positive-class imbalance;
- raw, unnormalized feature scales;
- regularization;
- the evaluated full-batch optimization configuration;
- the limited number of class-supported folds.

The result is therefore a property of the evaluated configuration and does not establish that logistic regression generally fails under class imbalance.

---

# XII. DISCUSSION

## A. Gateway Co-Observation Is Not Direct Pairwise Ranging

The central finding concerns the distinction between participant-to-gateway sensing and participant-to-participant contact.

The geometric reference process evaluates

\\(d(A,B).\\)

The gateway system instead operates on estimates such as

\\(\hat d(A,G)\\)

and

\\(\hat d(B,G).\\)

Even if the gateway estimates were exact, common observation within radius \\(r\\) would establish only

\\(d(A,B)\leq2r.\\)

Under RSSI-derived ranging, the relationship is further affected by measurement uncertainty and nonlinear inversion.

Therefore, gateway co-observation should be treated as a **contact-reconstruction mechanism**, not as a direct pairwise distance measurement.

The observed E1 performance provides empirical evidence of the distinction under the evaluated simulation configuration.

## B. Reconstruction Error Constrains Downstream Evaluation

The downstream models operate only on reconstructed records that survive the upstream pipeline.

The dependency chain is

\\(\text{physical state} \rightarrow \text{BLE observations} \rightarrow \text{gateway reconstruction} \rightarrow \text{reconstructed records} \rightarrow \text{E3 labels}.\\)

A physical contact that is not reconstructed cannot become a positive E3 observation.

This creates an explicit dependency between sensing/reconstruction behavior and downstream class support.

The E3 fold structure illustrates the consequence directly: only two of the 30 seeds contain both positive and negative test records.

## C. The E3 Dataset Is a Selected Population

E3 is not evaluated on every physically possible pairwise interaction.

A record reaches E3 only after surviving:

- receiver filtering;
- packet loss;
- RSSI estimation;
- RSSI-derived thresholding;
- gateway co-observation;
- sessionization.

Consequently, the E3 population is selected by the upstream measurement architecture.

This means downstream class prevalence cannot be interpreted independently of reconstruction behavior.

## D. Interpretation of Extreme AUROC Values

The E3 results include both AUROC 1.000 and AUROC 0.000.

However, AUROC is defined only for the two class-supported folds.

The two extreme results therefore should not be interpreted as robust evidence of universal model superiority or inferiority.

Instead, they describe behavior on the specific reconstructed records and labels generated in two held-out simulation trajectories.

## E. Importance of Seed-Grouped Validation

A simulation seed controls a complete trajectory realization.

Observations generated from the same seed may share movement patterns, spatial relationships, gateway exposure, radio observations, and reconstruction artifacts.

A random row-wise split could therefore place related records generated from the same trajectory into both training and test sets.

LOSO establishes the validation boundary at the trajectory level.

The present study does not directly benchmark LOSO against random row-wise splitting and therefore does not claim a specific numerical amount of performance inflation from random partitioning.

## F. Interpretation of Calibration Metrics

Brier score and ECE characterize probability quality when outputs are interpreted as probabilities.

A low calibration metric does not by itself establish useful discrimination, particularly when positive events are sparse and the evaluated records have already been selected by an upstream reconstruction process.

Calibration is therefore presented alongside reconstruction and ranking metrics rather than as a substitute for them.

## G. Main Methodological Implication

The results support a general evaluation principle for infrastructure-assisted contact sensing:

> **The sensing and reconstruction layer should be evaluated independently before downstream predictive performance is interpreted.**

This separation makes it possible to distinguish failure arising from the measurement/reconstruction process from behavior arising from the downstream model.

---

# XIII. THREATS TO VALIDITY AND LIMITATIONS

## A. Simulation Construct Validity

The reference contact definition is geometric:

\\(d(A,B)\leq2.0\text{ m}\\)

for at least 30 s.

This construct is not equivalent to infection, pathogen exposure, aerosol transmission, or clinical disease.

## B. RF Model Validity

The simulator uses a log-distance RF abstraction with Gaussian RSSI noise.

Real indoor BLE environments can contain multipath propagation, walls, body attenuation, antenna-pattern effects, interference, heterogeneous hardware, and environmental dynamics that are not represented by the simulator.

Numerical reconstruction rates should therefore not be interpreted as direct field-performance estimates.

## C. Gateway Configuration

The primary experiment uses eight gateways and one fixed placement configuration.

Alternative placement geometries could alter both coverage and reconstructed contact structures.

The findings are therefore configuration-specific.

## D. Threshold Selection

The primary reconstruction uses a 2.0-m RSSI-derived gateway distance threshold.

The diagnostic evaluates only 2.0 and 3.0 m.

The experiment does not characterize a continuous threshold-response curve.

## E. E1 Matching Parameters

The E1 criteria

\\(IoU\geq0.2\\)

and

\\(|R\cap G|\geq5\text{ s}\\)

are operational evaluation choices.

Alternative session-matching criteria could produce different TP, FP, FN, precision, recall, and F1 values.

## F. E3 Temporal Criterion

E3 assigns a positive label whenever the canonical participant pair agrees and the reconstructed/reference intervals have non-zero temporal intersection.

A stricter overlap requirement could alter positive-class prevalence and downstream metrics.

## G. Sparse E3 Class Support

Only seeds 301 and 303 contain both E3 classes.

Consequently, AUROC and AP are based on only two class-supported folds.

This is the principal limitation of the downstream model comparison.

## H. Absence of Oracle Reconstruction Conditions

The primary campaign does not include an oracle gateway-reconstruction condition in which the gateway uses true participant-to-gateway distance instead of RSSI-derived distance. Consequently, the experiment cannot fully separate error caused by the geometry of gateway co-observation from error introduced by RSSI uncertainty and inversion.

The experiment also does not provide downstream models with perfect geometric-contact records. Therefore, the study does not separately quantify how downstream model behavior would change under perfect reconstruction.

## I. Logistic Optimization

The logistic model uses raw features and a fixed optimization configuration.

The inverse ranking should therefore be interpreted as implementation- and dataset-specific.

## J. Clinical Scope

The simulator does not model:

- pathogen viability;
- bacterial shedding;
- aerosol concentration;
- inhaled dose;
- immune response;
- microbiological diagnosis;
- treatment;
- clinical infection;
- disease-transmission dynamics.

No clinical or epidemiological claim is made.

## K. Privacy Scope

The study does not include a privacy-attacker model, re-identification analysis, differential privacy, \\(k\\)-anonymity, or a formal privacy-utility evaluation.

No formal privacy guarantee is claimed.

---

# XIV. REPRODUCIBILITY AND DATA AVAILABILITY

The planned reproducibility package will include the following:

1. frozen experiment manifest;
2. complete 30-seed list;
3. simulation-area definition;
4. gateway coordinates;
5. trajectory-generation parameters;
6. BLE timing configuration;
7. RF parameters;
8. packet-loss configuration;
9. receiver sensitivity;
10. 20-ms observation deduplication configuration;
11. five-observation RSSI median filtering;
12. 2.0-m RSSI-derived gateway threshold;
13. exact 1000-ms gateway co-observation rule;
14. sessionization configuration;
15. E1 matching implementation;
16. E3 target construction;
17. LOSO assignments;
18. Bayesian likelihood tables;
19. rule-based heuristic parameters;
20. logistic-regression configuration;
21. per-seed results;
22. aggregated results;
23. software/runtime versions;
24. output checksums.

The reconstruction sequence is

\\(\boxed{ \text{trajectory} \rightarrow \text{BLE generation} \rightarrow \text{packet loss} \rightarrow \text{reception filtering} \rightarrow \text{deduplication} \rightarrow \text{RSSI filtering} \rightarrow \text{RSSI-derived distance} \rightarrow \text{2.0-m threshold} \rightarrow \text{same-gateway pairing} \rightarrow \text{1-s temporal window} \rightarrow \text{sessionization} }\\)

and the downstream evaluation sequence is

\\(\boxed{ \text{reconstructed records} \rightarrow \text{E3 labeling} \rightarrow \text{LOSO partition} \rightarrow \text{model inference} \rightarrow \text{seed-level metrics} \rightarrow \text{macro aggregation}. }\\)

The source code and reproducibility materials are planned for release through a public repository with the final archival version of the work.

---

# XV. ETHICS STATEMENT

Ethics approval was not required because the study used computational simulation data and did not involve human participants, identifiable personal data, or animal subjects.

---

# XVI. FUNDING

No external funding.

---

# XVII. CONFLICT OF INTEREST

The authors declare no conflict of interest.

---

# XVIII. CONCLUSION

This study evaluated gateway co-observation as a BLE-based proxy for pairwise geometric contact reconstruction using a controlled simulation framework.

Across 30 deterministic simulation replicates, the eight-gateway reconstruction produced a mean of 0.100 true-positive matches and 5.267 false-positive matches per seed. Mean seed-level precision, recall, and F1 were 0.025, 0.019, and 0.017, respectively. The complement of the reported mean seed-level recall corresponds to a 98.1% mean seed-level non-recovery statistic.

The downstream reconstructed-record dataset was highly sparse. Two folds contained no reconstructed test records, 26 additional non-empty folds were negative-only, and only seeds 301 and 303 contained both positive and negative E3 records.

The downstream results consequently differ from a conventional machine-learning benchmark. AUROC and AP are defined for only two class-supported folds, while F1, Brier score, and ECE are macro-averaged over 28 non-empty folds. Downstream model comparisons are therefore descriptive and should not be interpreted as stable population-level estimates.

The central methodological result is that **gateway co-observation is an inferred reconstruction layer, not a direct measurement of pairwise physical proximity**. Under the evaluated configuration, the reconstruction layer produced substantial false-positive and false-negative error, and that upstream behavior sharply constrained the class support available for downstream analysis. Reconstruction fidelity should therefore be established before predictive or risk-model results are interpreted.

The experiment additionally demonstrates that upstream reconstruction behavior affects the prevalence and class support available to downstream evaluation. Seed-grouped validation is consequently important because it preserves the trajectory-level structure of the simulation and prevents observations originating from the same simulation trajectory from appearing in both training and test partitions.

Future work should examine alternative gateway placements, richer RF propagation models, empirical BLE measurement traces, oracle reconstruction conditions using true gateway distances, continuous threshold sweeps, stricter E3 temporal definitions, and larger simulation campaigns capable of providing sufficient positive-class support for statistically informative downstream comparisons.

---

# REFERENCES

[1] L. Reichert, S. Brack, and B. Scheuermann, “A survey of automatic contact tracing approaches using Bluetooth Low Energy,” *ACM Transactions on Computing for Healthcare*, vol. 2, no. 2, Art. no. 18, pp. 1–33, 2021, doi: 10.1145/3444847. [DOI](https://doi.org/10.1145/3444847)

[2] S. J. Curtis *et al.*, “Feasibility of Bluetooth Low Energy wearable tags to quantify healthcare worker proximity networks and patient close contact: A pilot study,” *Infection, Disease & Health*, vol. 27, no. 2, pp. 66–70, 2022, doi: 10.1016/j.idh.2021.10.004. [PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8963530/)

[3] M. C. Vazquez Guillamet *et al.*, “Leveraging Bluetooth low-energy technology to improve contact tracing among healthcare personnel in hospital setting during the coronavirus disease 2019 (COVID-19) pandemic,” *Infection Control & Hospital Epidemiology*, vol. 45, no. 4, pp. 546–548, 2024, doi: 10.1017/ice.2023.227. [PubMed](https://pubmed.ncbi.nlm.nih.gov/37982262/)

[4] L. Flueratoru, V. Shubina, D. Niculescu, and E.-S. Lohan, “On the high fluctuations of received signal strength measurements with BLE signals for contact tracing and proximity detection,” *IEEE Sensors Journal*, vol. 22, no. 6, pp. 5086–5100, 2022, doi: 10.1109/JSEN.2021.3095710.

[5] N. Moayeri, C. Li, and L. Shi, “Bluetooth Low Energy (BLE) Received Signal Strength Indicator (RSSI) Data for Proximity Detection in COVID-19 Electronic Contact Tracing,” NIST Public Data Repository, 2022, doi: 10.18434/mds2-2827.

[6] N. Moayeri, C. Li, and L. Shi, *On the Feasibility of COVID-19 Proximity Detection Using Bluetooth Low Energy Signals*, NIST Interagency/Internal Report NISTIR 8437, National Institute of Standards and Technology, 2022, doi: 10.6028/NIST.IR.8437.

[7] W. Qian, A. Cooke, K. G. Stanley, and N. D. Osgood, “Comparing Contact Tracing Through Bluetooth and GPS Surveillance Data: Simulation-Driven Approach,” *Journal of Medical Internet Research*, vol. 26, e38170, 2024, doi: 10.2196/38170. [PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11025599/)

[8] M. Płaza, M. Kozłowski, M. Łucki, and R. Belka, “RTLS Systems Designing Approach Using Beacon Technology,” *IEEE Internet of Things Journal*, vol. 11, no. 8, pp. 14857–14869, 2024, doi: 10.1109/JIOT.2023.3344820. [IEEE Xplore](https://ieeexplore.ieee.org/document/10366500/)

[9] A. Fabris *et al.*, “AoA and RSSI-Based BLE Indoor Positioning System With Kalman Filter and Data Fusion,” *IEEE Internet of Things Journal*, vol. 12, no. 11, pp. 15348–15359, 2025, doi: 10.1109/JIOT.2025.3530866.

[10] Y. Assayag *et al.*, “Indoor environment dataset based on RSSI collected with Bluetooth devices,” *Data in Brief*, vol. 55, Art. no. 110692, 2024, doi: 10.1016/j.dib.2024.110692. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2352340924006590)

[11] J. Davis and M. Goadrich, “The Relationship Between Precision-Recall and ROC Curves,” in *Proc. 23rd International Conference on Machine Learning*, 2006, pp. 233–240, doi: 10.1145/1143844.1143874. [DOI](https://doi.org/10.1145/1143844.1143874)

[12] G. W. Brier, “Verification of Forecasts Expressed in Terms of Probability,” *Monthly Weather Review*, vol. 78, no. 1, pp. 1–3, 1950, doi: 10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2. [DOI](https://doi.org/10.1175/1520-0493%281950%29078%3C0001%3AVOFEIT%3E3.0.CO%3B2)

[13] C. Guo, G. Pleiss, Y. Sun, and K. Q. Weinberger, “On Calibration of Modern Neural Networks,” in *Proc. 34th International Conference on Machine Learning*, vol. 70, 2017, pp. 1321–1330. [ML Anthology](https://mlanthology.org/icml/2017/guo2017icml-calibration/)

[14] D. R. Roberts *et al.*, “Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure,” *Ecography*, vol. 40, no. 8, pp. 913–929, 2017, doi: 10.1111/ecog.02881.