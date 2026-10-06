# Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study

Arjun K. V., Nabil Ahmad Khan, Md. Aasim Shaibani, Ayyan Anwar, and Alakananda K.

Department of Computer Science and Engineering, Sahyadri College of Engineering and Management, Mangaluru, India

## Abstract

Reconstructing sustained person-to-person contacts from wireless telemetry requires reliable temporal decisions, not merely accurate individual distance estimates. We present a reproducible simulation study motivated by wearable contact monitoring in hospitals. Eight moving tags and four gateways occupy a two-room environment, and all 28 unordered pairs are evaluated each second. Seven observation configurations comprise received signal strength indicator (RSSI), RSSI with two or four angular receivers, RSSI with phase-based ranging (PBR), round-trip time (RTT), PBR with an RTT consistency gate, and ultra-wideband double-sided two-way ranging (UWB DS-TWR). Causal filtering and tracking produce 29 observable features without access to hidden geometry. Logistic regression, random forests, gradient-boosted trees, and Gaussian naive Bayes are fitted using disjoint training, probability-calibration, and validation recordings. Models and decision settings are frozen before 30 primary test recordings and 12 recordings with unseen motion are generated. Against equally validation-tuned geometric rules, selected models attain mean sustained-contact F1 scores of 0.445, 0.571, 0.704, 0.690, 0.561, 0.664, and 0.763, respectively. RSSI improves contact recovery but produces 464 false sessions across matched test conditions. UWB's incremental learned-versus-rule F1 difference is 0.034, with a pointwise seed-paired 95% interval of −0.009 to 0.082. A learned Markov extension does not improve the selected classifiers. The results identify benefits and failure modes of learned contact reconstruction under explicit synthetic channel and scheduling assumptions. They do not establish hardware accuracy, clinical usefulness, battery life, or minimum deployment cost.

Keywords: contact reconstruction; Bluetooth Low Energy; RSSI; angle of arrival; phase-based ranging; round-trip time; ultra-wideband; temporal inference; probability calibration; reproducible simulation.

## 1 Introduction

Wearable contact monitoring can describe who spends time near whom, which is useful when studying interaction patterns in environments such as hospital wards. Field studies have demonstrated the feasibility of recording contacts between patients and healthcare workers using wearable proximity sensors [1]. Such observations describe proximity; they do not by themselves identify transmission, infection, or a clinically meaningful exposure. The sensing architecture and contact definition must therefore be evaluated before their outputs are used in a broader application.

Wireless measurements are imperfect proxies for person-to-person separation. RSSI depends on propagation conditions, orientation, and intervening objects, and measurements can depart from a monotonic relationship with distance [2]. A fixed gateway observing two tags does not establish that the tags are within a specified separation. Even when localization improves, momentary position errors can fragment a long contact, merge separate encounters, or create persistent false proximity. A system intended to reconstruct sustained contacts must be evaluated at the session level as well as at individual frames.

Additional observations provide possible remedies. Bluetooth Direction Finding introduces angular information [3], while Bluetooth Channel Sounding provides phase and timing observations for PBR and RTT [4,5]. UWB supports another timing-based ranging approach; double-sided two-way ranging reduces particular clock-related errors, but timestamping noise, multipath, and non-line-of-sight effects still require modeling [6]. These mechanisms have different tag, gateway, update-budget, and calibration requirements. Comparing them only through nominal range accuracy leaves the downstream contact task unresolved.

This study asks whether learned observable evidence can improve sustained-contact reconstruction over equally tuned geometric decisions, how angular and ranging configurations differ within matched simulations, and whether temporal learning or feature histories produce consistent benefits. Hospital affordability motivates the comparison, but cost-optimal procurement is not an experimental outcome. We use a simplified environment to isolate observation, estimation, and temporal-decision effects and retain the assumptions needed to reproduce the results.

Our contributions are a matched seven-configuration benchmark that includes every pair before detection; an observation-to-decision pipeline using only current and past measurements, with grouped fitting, separate probability calibration, and frozen model selection; and a complete comparison of classifier families, deterministic controls, temporal extensions, ablations, and unseen motion. We also retain per-recording probabilities, decisions, sessions, and raw evidence and check the numerical results using implementations independent of the training and evaluation code. The contribution is the experimental framework and its documented findings rather than a claim that the individual learning algorithms are novel. Here, causal processing refers to the temporal availability of measurements, not treatment-effect estimation or statistical causal identification.

## 2 Related work and positioning

### 2.1 Measuring proximity and reconstructing contacts

Vanhems et al. used wearable proximity sensors to study interaction patterns in a hospital ward [1]. Their work establishes a relevant application context but differs from our simulation in sensor technology, participants, sampling, and objectives. We do not reproduce that study or claim that our trajectories represent measured hospital routines. Leith and Farrell reported that BLE received signal strength is sensitive to handset orientation, body absorption, and the surrounding environment [2]. This supports treating RSSI as uncertain evidence, not assuming that its inversion gives a dependable physical distance.

The present task separates instantaneous proximity from sustained contacts. A frame classifier can obtain useful discrimination while still producing long false sessions or breaking valid contacts into short segments. Conversely, a temporal decision can improve event recovery while extending predicted boundaries beyond the true interval. We therefore report event counts, contact F1, missed pair-time, false-session burden, duration error, and confirmation delay in addition to frame probability metrics.

### 2.2 Angular and ranging observations

Bluetooth Direction Finding obtains directional information through suitable radio procedures and antenna configurations [3]. Our angular branch uses noisy two-dimensional bearings; it does not process IQ samples or simulate antenna arrays. Channel Sounding uses phase-based ranging and round-trip timing [4,5], but the specification does not prescribe a single distance-estimation algorithm [4]. Our phase-slope and corrected-timing estimators are simplified algorithmic choices, not implementations of a complete Bluetooth controller or protocol stack.

Rathje and Landsiedel analyze bias and variance in double-sided two-way ranging and related TDoA extraction under multipath and non-line-of-sight conditions [6]. Their analysis motivates explicit timing-error treatment; it does not supply measured parameters for the present simulator. We implement ideal DS-TWR intervals and assumed errors. UWB TDoA, anchor synchronization, real channel impulse responses, and firmware timestamping are outside the implemented scope.

### 2.3 Learning calibrated probabilities and evaluating grouped observations

Niculescu-Mizil and Caruana showed that classifier scores can exhibit model-dependent probability distortions and examined calibration approaches [7]. Guo et al. likewise distinguish predictive performance from confidence calibration [8]. These studies motivate assessing probability quality separately from thresholded contacts; they do not establish that the present probabilities are calibrated for hardware data. We use a sigmoid calibration map fitted to independent simulation recordings and report Brier score and ten-bin expected calibration error (ECE).

Classifiers are implemented with scikit-learn [9]. Recording groups remain disjoint across partitions, following the principle that dependent observations should not be randomly split into nominally independent training and test examples [10]. The histogram-gradient-boosting implementation is documented for the software version used here [11]. We compare established model families under one frozen contact-reconstruction protocol. We do not infer that a family is generally superior from this small synthetic benchmark.

## 3 System model and contact task

### 3.1 Environment and motion

The primary environment is a 24 m by 20 m rectangle divided by a wall at x = 12 m. A doorway spans y = 9–11 m. Four public gateways are located at (2,2), (22,2), (22,18), and (2,18) m, with orientations 0, π/2, π, and −π/2 radians. The two-receiver angular configuration upgrades gateways (2,2) and (22,18); the four-receiver configuration upgrades all four. Eight tags move over 360 one-second frames, yielding 28 unordered pairs and 10,080 pair-frames per motion recording.

Three motion families supply training, calibration, validation, and primary test recordings. Ward encounters randomize pair assignment, encounter location, onset, duration, and separation, with sustained approaches and brief encounters. Doorway rounds use continuous routes through the doorway and varying follower separations. Threshold encounters place close and far phases near the 2 m decision boundary. In the ward and threshold families, an always-close pair separated by the wall tests the importance of the same-room criterion. Tag assignments are shuffled so that pair identity cannot encode an encounter role.

The separately evaluated motion challenge gives each tag independent waypoints, movement speeds of 0.35–0.75 m/s, and pauses, with cross-room routes passing through the doorway. It changes the movement family while retaining the floor plan and radio assumptions. We call it unseen motion, not external hospital validation. The construction maintains continuous movement and verifies wall crossings and a maximum sampled step of 1.2 m.

@@FIGURE:floorplan.png|Figure 1. Public geometry and information separation. The floor plan and gateway coordinates are available to inference. True tag coordinates generate sensor observations and labels but are excluded from the feature and prediction interfaces. The wall has a two-metre doorway.@@

### 3.2 Instantaneous labels and sustained reference sessions

Let zᵢ(t) be the hidden two-dimensional position of tag i at integer time t, and let r(z) identify its room. The instantaneous physical label for an unordered pair is

@@EQUATION:yᵢⱼ(t) = 1{ ‖zᵢ(t) − zⱼ(t)‖₂ ≤ 2 m } · 1{ r(zᵢ(t)) = r(zⱼ(t)) }.|1@@

A sustained reference session is a maximal consecutive run of positive samples with end time b and start time a satisfying b − a ≥ 30 s. Thus samples at t = 0,…,30 qualify, whereas 30 samples spanning t = 0,…,29 do not. This is sampled proximity, not a continuous-time check between samples. Short encounters are retained as positive instantaneous labels but do not qualify as sustained reference sessions.

The learning target is yᵢⱼ(t); the primary evaluation target is the set of qualified reference sessions. The distinction allows models to learn proximity evidence without assigning negative frame labels simply because an encounter later ends before 30 s. It also requires temporal decoding and explicit session evaluation after prediction. The same physical target and matching criteria apply to all observation configurations.

### 3.3 Observation budgets and causal interfaces

All configurations include RSSI telemetry. AoA2 and AoA4 additionally expose bearings from two and four receivers, respectively. PBR, RTT, PBR_RTT, and UWB expose only their corresponding ranging observations; PBR_RTT adds an RTT consistency diagnostic. PBR alone does not receive RTT diagnostics, and nonangular configurations cannot access hidden bearing fields. Table 1 summarizes the budgets.

@@TABLE:budgets@@

Inference receives public gateway metadata, observations available at or before t, and the public floor plan. It does not receive true tag positions, true room membership, true pair separation, reference-session status, seed identifiers, timestamps as predictor columns, or device/pair identifiers as predictors. Tag identifiers are used to maintain causal histories and associate outputs, not to fit role-specific contact predictions. Hidden geometry is restricted to sensor generation and label construction.

## 4 Synthetic observation models

### 4.1 RSSI and angular channels

For tag i and gateway g, define dᵢg(t) as their hidden separation and Wᵢg(t) as an indicator that their connecting segment intersects the wall outside the doorway. RSSI is generated using

@@EQUATION:Rᵢg(t) = −50 − 25 log₁₀(max{0.1,dᵢg(t)}) + 6 uᵢg(t) + βᵢ − L Wᵢg(t).|2@@

Distances are in metres and RSSI is in dBm. The reference value is −50 dBm and path-loss exponent is 2.5. The unit-variance state follows u(t) = ρu(t−1) + √(1−ρ²)ε(t), with independent standard-normal innovations. A separate state generates angular error. In the wall condition, device bias βᵢ is drawn once per recording from a zero-mean Gaussian with 2 dB standard deviation; wall attenuation is 6 dB and ρ = 0.8. The ideal condition sets these biases and correlation to zero.

The bearing is the true gateway-to-tag angle relative to gateway orientation plus a 5° stochastic error, a persistent gateway orientation bias, and a wall angular bias, wrapped into the circular interval. Orientation-bias standard deviation is 2° and wall bias is 8° in the wall condition, and both are zero in the ideal condition. Independent packet loss is 10%; observations below −95 dBm are dropped. The wall condition also draws burst starts with probability 0.008 per link per second and suppresses that link for three seconds. This is an abstract reception process without RF interference or a BLE packet scheduler.

The label LOS denotes the ideal sensor-error setting without modeled wall penalties; it does not assert that every link has physical line of sight in the two-room geometry. The second setting is named wall multipath and introduces correlated errors and biases. These distributions are engineering assumptions chosen for controlled contrasts, not measurements fitted from hospital radios. Table 2 lists the channel parameters so that conclusions can be interpreted conditionally.

@@TABLE:channel@@

### 4.2 Phase-based ranging

The PBR simulator generates 72 synthetic tones fₖ = 2402 MHz + k MHz for k = 0,…,71. This uniform tone sequence is not the exact Bluetooth channel map. A reciprocal two-path channel has a direct component and, on blocked links, a reflected component with excess path length 2 m and relative amplitude 1.4. The reflected component has an additional fixed 0.7 radian phase. The combined round-trip phase is twice the channel phase, plus a link-specific nuisance offset and independent phase noise:

@@EQUATION:φₖ = wrap[ 2 arg{ exp(j2πfₖd/c) + α exp(j[2πfₖ(d+ℓ)/c + 0.7]) } + φ₀ + ηₖ ].|3@@

The amplitude α is zero on unblocked links and in the ideal condition. Phase-noise standard deviation is 0.25 radian in the ideal condition and 0.5 radian in the wall condition. A link-specific distance-calibration bias has standard deviation 0.15 m. Under the simulator's positive-phase convention, the estimator unwraps neighboring phases, fits a least-squares slope sφ against frequency in hertz, and converts that slope to distance:

@@EQUATION:d̂PBR = c sφ / (4π),     c = 299,792,458 m/s.|4@@

The phase-fit residual is observable but is not a truth-based multipath label. Negative or nonfinite estimates are unavailable. Ideal reciprocity and a constant offset across tones simplify oscillator behavior; the simulation does not model real controller measurements or standards compliance.

### 4.3 RTT and UWB timing

Corrected RTT uses an elapsed time and a reported turnaround of 10⁶ ns. Elapsed-time noise has standard deviation 10 ns; link calibration bias has standard deviation 0.3 m; blocked links receive a further assumed 1.5 m bias in the wall condition. With intervals expressed in seconds, the estimator is

@@EQUATION:d̂RTT = (c/2)(Telapsed − Tturnaround).|5@@

UWB uses ideal double-sided two-way timing with clock skews of +20 ppm and −15 ppm, turnaround intervals of 5×10⁵ and 7×10⁵ ns, independent interval noise of 0.4 ns standard deviation, and a link calibration bias of 0.1 m standard deviation. The assumed blocked-link bias is 0.8 m in the wall condition. For round intervals R_A,R_B and reply intervals D_A,D_B in seconds,

@@EQUATION:T̂ToF = (R_A R_B − D_A D_B)/(R_A + R_B + D_A + D_B),     d̂UWB = c T̂ToF.|6@@

The PBR_RTT branch returns the PBR distance only when RTT is valid and the disagreement is at most three times √(0.2² + 1.5²) m. Otherwise, it abstains. This is a coarse consistency gate. It neither combines estimates into a new distance estimator nor establishes resistance to adversarial ranging; a shared bias can pass the gate.

### 4.4 Matched service and reception assumptions

Active ranging follows round-robin service with four client slots per gateway per second. The same selected tag batch is used across gateways and ranging methods. With eight clients, a tag is scheduled every two seconds before reception loss. All radio branches share the received BLE-link mask to control observation availability. Consequently, UWB coverage and Bluetooth Channel Sounding procedure airtime are not independently characterized.

Equalizing slots removes one experimental confound but imposes an application-level service assumption rather than a measured technology capacity. Conditional comparisons must therefore separate distance-error assumptions from update availability. A prior, separately versioned scheduling campaign supplies supporting load observations in Section 8; its additional clients consume slots but have no extra physical trajectories.

## 5 Causal estimation and learned reconstruction

### 5.1 Filtering localization and tracking

RSSI uses a causal five-second median history, and bearings use a causal circular mean over the same period. RSSI/angular localization minimizes a Huber loss [13] on standardized log-distance and circular-bearing residuals. The Huber cutoff is 1.5. The solver uses multiple public-anchor-derived initial positions, at most 30 Gauss–Newton iterations, regularized normal equations, and backtracking. At least three RSSI observations or two angular observations are required. No true room or hidden bounding position constrains this optimization.

Ranging branches use valid current ranging links whose values are median-filtered using their preceding five-second histories. At least three links are needed for robust range localization. The assumed residual scales are 0.2 m for PBR, PBR_RTT and UWB and 1.5 m for RTT; these are estimator parameters, not measured accuracy. The numerical optimizer otherwise uses the same Huber cutoff and multistart principle.

Each coordinate is then tracked with a constant-velocity Kalman filter [14]. Acceleration variance is 0.08. Position-measurement variance is 4 for RSSI and RTT, 0.64 for RSSI/angular fusion, and 0.16 for the other ranging configurations, in squared metre units. Initial velocity is zero with variance 1. Predictions expire when more than three seconds have elapsed since a usable localization measurement. These covariance choices are fixed engineering assumptions, not covariances estimated from held-out truth.

### 5.2 Observable features and missing information

The 29-dimensional pair feature vector describes estimated separation/room, position availability, telemetry age, common receivers, RSSI agreement and counts, angular agreement, range-profile differences, fit diagnostics, and past 10/30-second contact histories. Features are symmetric under exchanging the pair's members. Estimated distance is capped at 30 m. Numeric features are rounded to three decimal places and stored as little-endian float32. Appendix A defines every column and its units.

Availability requires tracked positions for both tags and recent BLE telemetry for each, no older than three seconds. Unavailable pair-distance and room fields are zero with an explicit availability flag, and inference output is forced nonpositive. Missing modality-specific diagnostics also use zero; their interpretation must be considered with the observation budget and availability. The gate prevents a model from declaring contacts when its required geometry is unavailable, but necessarily sacrifices possible recall. It is not evidence that a missing observation means physical separation.

The feature histories include the current sample and never inspect future frames. Ten- and thirty-second positive fractions refer to a fixed estimated 2 m same-room rule, not true labels. The room ablation removes only the estimatedSameRoom column; remaining positions and signal profiles can still encode room-related information. It is therefore not a comprehensive map-free ablation.

### 5.3 Classifier fitting and probability calibration

We fit logistic regression, random forest [15], histogram gradient boosting [11,16], and Gaussian naive Bayes separately for each observation configuration. Table 3 gives the complete search grids. Standardization is fitted on training data for logistic regression and Gaussian Bayes. Balanced class weights are used for logistic regression, random forest, and boosted trees. The Gaussian model learns empirical class priors, conditional means and variances. No synthetic positive oversampling is applied.

@@TABLE:models@@

Every candidate's raw positive probability q is clipped to [10⁻⁶,1−10⁻⁶], transformed to log odds, and passed through a separately fitted sigmoid map. The calibration recordings are disjoint from training and validation. An unweighted logistic map with C = 100 and at most 2,000 iterations preserves their natural class prevalence:

@@EQUATION:p(t) = σ{ a log[q(t)/(1−q(t))] + b },     σ(v) = 1/(1+exp(−v)).|7@@

Calibration is fitted using eligible pair-frames. Candidate classifiers themselves are fitted to all sampled training pair-frames, including those with unavailable estimates; the explicit gate still forces unavailable prediction probabilities to zero. Calibration here concerns instantaneous synthetic proximity, not qualified-session validity. Its performance is measured on full held-out recordings, including gated frames.

### 5.4 Temporal decisions and session extraction

Strict decoding declares a positive frame when p(t) ≥ τ and the pair is eligible. Occupancy decoding requires at least seven eligible threshold-positive samples in the full ten-frame causal window, with eligibility at the current frame. The first nine frames are nonpositive because their windows are incomplete:

@@EQUATION:b(t) = e(t) · 1{ Σᵤ₌ₜ₋₉ᵗ e(u)1[p(u) ≥ τ] ≥ 7 },     t ≥ 9.|8@@

The current sample need not itself exceed the probability threshold if the occupancy requirement is met. Predicted contacts are maximal consecutive positive decoded runs spanning at least 30 s. An unavailable current estimate breaks a run. The earliest confirmation time assigned to a qualified run is its start plus 30 s. Session boundaries are reconstructed retrospectively from causal decisions; they are not available in full at initial confirmation.

Validation searches probability thresholds {0.2,0.35,0.5,0.65,0.8} and both decoders, optimizing reconstructed-contact F1 rather than frame accuracy. Within policy search, ties favor fewer false positives, more matches, a higher threshold, and strict decoding. Candidate hyperparameters and the primary full family are compared using validation F1, then fewer false positives and more matches; a residual exact tie retains earlier enumeration order. The model chosen on validation remains primary even if another family scores higher on the final test.

### 5.5 Learned Markov extension and ablations

A two-state Markov extension estimates transition probabilities from consecutive full training labels, with add-one smoothing. Both matched channel-condition copies of the training labels contribute to these counts. The initial state probability is the training-frame positive prevalence. Let s(t−1) be the previous filtered probability and a₀₁,a₁₁ the learned transition probabilities. The predicted state probability is s⁻(t) = [1−s(t−1)]a₀₁ + s(t−1)a₁₁. We approximate emission log-likelihood evidence by subtracting the eligible calibration prevalence π_cal from the calibrated classifier log odds:

@@EQUATION:s(t) = σ{ logit[s⁻(t)] + logit[p(t)] − logit[π_cal] }.|9@@

For unavailable frames, the emission increment is zero and the output is gated to zero, although the internal state propagates. Threshold and decoder are selected on validation. Overlapping feature histories violate the ideal independent-emission assumption, so this extension is evaluated as an approximation and its outputs are not assumed calibrated.

Two ablations refit the validation-selected full family's hyperparameter configuration after removing the nine contact-history columns or the estimated-room column. They receive their own calibration and threshold/decoder selection. Seven detector bundles per observation budget are retained: four full families, the Markov extension, and two ablations. Thus 49 saved bundles include shared base classifiers in the Markov variants; they are not 49 independent datasets.

## 6 Experimental protocol

### 6.1 Partitions and supervision

Table 4 identifies every partition. The 82 independent motion recordings are separated by seed across all observation modalities and both sensor conditions. Training, calibration, validation, primary test, and unseen motion contain 119, 52, 49, 176, and 68 unique sustained reference contacts, respectively. Repeating each reference under two radio conditions does not double its independent contact support.

@@TABLE:partitions@@

The primary motion families are assigned by recording index modulo three. Training uses every fifth second, producing 96,768 rows per configuration after both conditions are included. Calibration and validation use every second. Models are never refitted on the combined development partitions after selection. Hyperparameters, probability calibration and temporal settings are frozen before generation of the primary and unseen-motion test recordings. No final-test early stopping, frame-random partition, feature selection on test data, or favorable-seed selection is performed.

### 6.2 Deterministic controls and fairness

Controls are a fixed 2 m estimated same-room rule with strict decoding, the same rule with occupancy decoding, a validation-tuned geometric rule, and a training-prior-only predictor. The tuned rule searches estimated-distance thresholds {1.5,2,2.5,3} m and both decoders using the same validation contact-F1 objective. The reference remains true separation at most 2 m. Its final tie preference favors the candidate closest to 2 m after F1, false positives and matches are equal. The prior control is a constant frame probability thresholded at 0.5 for session reconstruction.

Equal validation privilege prevents the comparison from attributing an ordinary threshold adjustment entirely to ML. It does not equalize the search-space sizes or computational complexity of different methods, and a limited deterministic grid may omit better hand-engineered rules. Conclusions concern these declared comparators.

### 6.3 Evaluation metrics and uncertainty

Predicted and reference sessions can match only when they share an unordered pair, overlap for at least 5 s, and have interval intersection-over-union (IoU) at least 0.2. Candidate matches are ordered by decreasing IoU and assigned greedily one to one, with stable index ties. This permissive tolerance is fixed across configurations; it recognizes partially recovered intervals but does not establish accurate boundaries or maximize match count globally. Counts define

@@EQUATION:Precision = TP/(TP+FP),     Recall = TP/(TP+FN),     F1 = 2TP/(2TP+FP+FN).|10@@

Precision is zero when no sessions are predicted. Recall is undefined for an empty reference set. F1 is undefined only when both reference and prediction sets are empty; a false-alarm-only recording has F1 zero. Pair-time errors compare sample masks of qualified predicted and reference sessions: missed-contact time divides false-negative pair-seconds by reference-positive pair-seconds, and false-positive time divides false-positive pair-seconds by reference-negative pair-seconds. False sessions per pair-hour use FP divided by 28×360/3600 for each condition recording.

Duration error is the absolute difference between matched predicted and reference interval lengths. Confirmation delay is the predicted start plus 30 s minus the true session start. It is signed and conditional on a match, so an early predicted run can produce a negative value. These summaries exclude unmatched sessions and must accompany recall and missed pair-time. They do not measure radio latency, sensor-to-server delay or embedded computation.

Frame Brier score is the mean squared error between instantaneous labels and predicted probabilities. ECE uses ten equal-width probability bins, weighted by their frame support. AUROC and average precision (AP) require both classes and are otherwise undefined. All pair-frames, including unavailable estimates and negatives, enter Brier/ECE. For primary aggregates, each metric is averaged across supported conditions within seed and then across supported seeds. This produces a seed-mean F1, not F1 from pooled counts. Conditions and successive frames are dependent observations.

Paired effects subtract each seed's tuned-rule F1 from the selected model's F1. We resample these differences with replacement 2,000 times using random seed 1701 and report the 2.5th and 97.5th percentiles. Intervals are exploratory and pointwise, without correction for multiple comparisons. They measure seed variation conditional on the simulator, not uncertainty in real hardware errors or the chosen modeling assumptions.

## 7 Main results

### 7.1 Selected models and primary contact recovery

Table 5 reports models selected exclusively using validation. The selected boosted-tree RSSI detector attains mean contact F1 0.445, compared with zero for the tuned geometric rule. Two and four angular receivers increase selected-model F1 to 0.571 and 0.704. PBR, RTT and PBR_RTT attain 0.690, 0.561 and 0.664, respectively. UWB reaches 0.763 under the assumed UWB timing/bias and service conditions.

@@TABLE:primary@@

Note: TP/FP/FN are pooled session counts across the primary test recordings and both matched sensor conditions. F1 is averaged across supported conditions within each seed and then across seeds; the interval concerns the paired seed-level ML-minus-rule F1 difference. Consequently, F1 calculated directly from these pooled counts is a different aggregation and will not generally equal the reported F1.

The improvement is not equivalent to sufficient reliability. RSSI produces 217 true positives, 464 false positives and 135 false negatives when the matched test conditions are pooled. Four-angle inference produces 285/196/67, and UWB 261/90/91. All configurations miss valid sessions and create false ones. These counts duplicate each underlying motion reference under two sensor settings and should not be interpreted as independent patient encounters.

The selected four-angle forest remains the primary method although boosted trees attain slightly higher final F1. Likewise, the selected RTT logistic model is not replaced by the better-scoring final forest. Table 6 exposes all families and controls rather than presenting only whichever test model ranks first.

@@TABLE:families@@

The selected model's pointwise paired interval lies above zero for RSSI, both angular budgets, PBR, RTT and PBR_RTT. For UWB the mean difference is only 0.034 and the interval spans −0.009 to 0.082. Its higher absolute contact F1 therefore does not establish a clear incremental ML benefit over its equally tuned rule. The fixed 2 m temporal UWB rule also performs well, with mean F1 0.742. Figure 2 presents the paired effects; the intervals are not simultaneous significance guarantees.

@@FIGURE:paired-effects.png|Figure 2. Validation-selected learned detector minus the equally tuned geometric rule on primary seed-mean contact F1. Points and pointwise paired bootstrap intervals use 30 seeds and 2,000 resamples. The UWB interval includes zero. Differences describe the declared simulator and comparator grids, not clinical effects or universal technology superiority.@@

### 7.2 Channel conditions and unseen motion

Table 7 separates the ideal and wall conditions and reports the independently generated motion family. Every selected configuration performs worse in the wall condition. Four-angle F1 decreases from 0.766 to 0.642, PBR from 0.768 to 0.611, and UWB from 0.834 to 0.691. Correlated errors and persistent biases remain consequential even after learning and temporal processing.

@@TABLE:conditions@@

Unseen-motion selected-model F1 is 0.290 for RSSI, 0.446 for two angles, 0.647 for four angles, 0.663 for PBR, 0.537 for RTT, 0.667 for PBR_RTT and 0.751 for UWB. RSSI's decline from 0.445 to 0.290 indicates dependence on the training motion distribution. UWB's smaller change is encouraging within this map, but it is not evidence of cross-hospital transportability. All 12 unseen-motion seeds support event F1 under the evaluation convention.

@@FIGURE:generalization.png|Figure 3. Primary and unseen-motion contact F1 for the tuned rule and the validation-selected model. The unseen-motion recordings use independent waypoints on the same map and under the same channel assumptions. Models and thresholds are unchanged between panels.@@

### 7.3 Temporal learning and feature ablations

The learned Markov extension yields lower primary contact F1 than the corresponding selected full classifier in all seven configurations. For RSSI the scores are 0.378 versus 0.445; for four angles, 0.660 versus 0.704; and for UWB, 0.707 versus 0.763. Additional temporal modeling therefore does not automatically improve this pipeline. Correlated feature histories, the approximate emission formulation and validation-selected decoding are plausible contributors, but this experiment does not isolate their causal roles.

@@TABLE:ablations@@

Removing contact history lowers RSSI F1 to 0.279 and four-angle F1 to 0.629. In contrast, the UWB history ablation attains 0.769, slightly above the full model's 0.763. Removing the room feature lowers several configurations but raises PBR_RTT F1 from 0.664 to 0.683. These observations argue against claiming universal benefits for every feature group. Since ablations are refitted and receive independent validation-selected decisions, their effects include fitting and decoding interactions, not a simple feature deletion from one fixed predictor.

The PBR/RTT gate does not improve selected primary F1 over PBR alone. Both raw mechanisms and resulting feature distributions differ, and the models are fitted separately. This comparison demonstrates no benefit under the implemented gate and assumptions; it is not a rejection of standards-based cross-checking or better fusion estimators.

### 7.4 Probability quality and contact-time burden

Table 9 reports instantaneous probability diagnostics together with contact-time and false-session outcomes. The prior-only mean Brier score is 0.077 for every modality. Selected-model Brier values range from 0.024 for UWB to 0.064 for RSSI. ECE ranges from 0.012 to 0.038. These improvements over a prevalence baseline do not establish session-level calibration, especially because per-frame class imbalance and temporal dependence remain substantial.

@@TABLE:quality@@

RSSI misses 44.2% of qualified reference pair-time and produces 2.762 false sessions per pair-hour. Four-angle inference misses 24.1%, and UWB misses 26.3%, despite UWB's higher event F1. Thus event ranking and interval coverage need not agree. The mean conditional duration errors are about 54.0 s, 33.6 s and 30.4 s for these three configurations. Their average per-recording median confirmation delays are about 37.7 s, 41.5 s and 37.8 s. Missing sessions are absent from these conditional delay/error summaries, which should not be interpreted as an end-to-end reliability guarantee.

@@FIGURE:reliability.png|Figure 4. Descriptive reliability of validation-selected classifiers on primary recordings. Bins pool correlated frames and matched conditions; the dashed diagonal indicates ideal instantaneous probability calibration. These plots carry no independent-frame confidence intervals and do not describe infection probabilities.@@

## 8 Supporting studies and deployment tradeoffs

### 8.1 Earlier gateway co-observation result

The corrected original campaign used 50 people, eight gateways and 30 seeds under a different simulation protocol. It reconstructed 161 sessions against 84 reference sessions, with TP = 3, FP = 158 and FN = 81. Pooled precision is 3/161 = 1.86% and pooled recall is 3/84 = 3.57%; these differ from its seed-mean metrics. This negative result motivates evaluating inference before relying on surviving candidate records for learning. It is not a baseline rerun on the present eight-tag recordings and cannot be pooled with Table 5.

The original downstream task contained 322 directed records but only six positive directions, corresponding to three distinct matched sessions. A corrected accessor and temporal-label path produced newly versioned outputs; the fixed likelihood-table Bayesian score in that campaign is distinct from our learned Gaussian Bayes and Markov models. We retain this study as supporting provenance rather than using its sparse ranking outcomes to establish a general model hierarchy. The earlier unverified 811-FP diagnostic is not a result of this paper.

### 8.2 Service-load stress under a separate controlled fixture

A separate ranging campaign used 30 seeds, eight scored moving tags, three scheduled-client loads, and six methods. Additional 32/128-client settings introduced background service demand without adding physical crowd trajectories. Table 10 shows the UWB branch as an illustrative scheduling comparison. Active-ranging event F1 collapsed at higher loads for all ranging branches under four slots per second and the three-second estimate-expiry rule. The passive branches repeated unchanged across those loads by design.

@@TABLE:service@@

This outcome demonstrates that an imposed low update budget can prevent temporal reconstruction even when available range estimates are comparatively accurate. It does not identify the maximum capacity of BLE Channel Sounding or UWB, and it does not predict performance of optimized device scheduling or UWB TDoA. Procedure-specific airtime, concurrent measurements and energy accounting require additional modeling or measurements. The v7 learned detectors were not trained or evaluated on these higher-load settings.

### 8.3 Affordability and hospital deployment

A practical cost comparison must account for complete wearables and infrastructure. We express deployment cost symbolically as

@@EQUATION:Ctotal = N Ctag + A Canchor + Cbackhaul + Ccalibration + Cspares + Coperations + Cmaintenance.|11@@

Here N is the wearable count and A the installed gateway/anchor count. Tag cost includes radio/processor, antenna, board, power system, enclosure, assembly, provisioning and product validation. Infrastructure cost includes installation and the appropriate receiver capabilities. Reusable hospital deployments also involve charging, cleaning, replacement and handling labor. No term was measured in this study, and the equation does not establish a minimum-cost configuration.

RSSI-only observations minimize added sensing capabilities in the benchmark but currently produce a high false-contact burden. Angular receivers require compatible direction-finding tags and receiver arrays. PBR/RTT requires compatible channel-sounding radios; compatibility cannot be inferred from generic BLE support. UWB introduces its own compatible radio and infrastructure requirements, although integrated UWB/BLE modules exist [12]. A higher tag cost can sometimes be offset by lower infrastructure or operational costs; only comparable complete-system quotations can test that hypothesis.

The present results therefore support retaining UWB as a comparator rather than discarding it on an assumed cost basis. They also support studying lower-cost integrated ranging options and observation-triggered scheduling. They do not support declaring BLE always cheaper, UWB always more accurate, or a hybrid rollout adequate for devices that lack the required measurements. Energy, capacity, accuracy and operational burden must be assessed together in a hardware-informed follow-up.

## 9 Discussion and threats to validity

### 9.1 Interpretation of learning gains

Learned decisions combine noisy estimates with signal agreement and causal history, recovering sustained contacts that strict geometry can miss. The strongest RSSI relative improvement occurs against a comparator that reconstructs no qualified sessions, so its magnitude should be read with absolute error counts. Additional angular/ranging observations improve the selected-model event scores under the declared assumptions, but the improvement depends on map, trajectories, covariance choices and error distributions.

The best full family differs across modalities. This is compatible with different feature/error structures, but the small validation population and finite candidate grids also contribute to selection variability. We deliberately retain test underperformance relative to other families rather than selecting test winners. A neural sequence model, learned localization network or more elaborate ranging fusion could be investigated, but this dataset does not establish that added model complexity would help, and no such unimplemented model is credited in the results.

### 9.2 Construct and channel validity

Same-room 2 m proximity for 30 elapsed seconds is an operational simulation target. It excludes contacts across a wall and does not represent ventilation, pathogens, susceptibility, protective equipment, face orientation or exposure dose. The one-second sampling cannot guarantee continuous physical proximity between samples. Treating geometric contacts as infection events would change the construct and require independent clinical evidence.

The radio models use assumed Gaussian noise, link/device biases and a simplified wall intersection. The reciprocal two-path PBR channel, ideal timing intervals and common BLE reception mask omit real antenna patterns, device orientation dynamics, frequency-dependent calibration, hardware timestamp errors, body geometry, interference and radio stack behavior. Nominal error parameters are neither measured technology specifications nor vendor guarantees. Conclusions about relative technology performance are conditional on these assumptions.

### 9.3 Internal and statistical validity

Seed-grouped partitions, frozen selection, current-time features and modality stripping reduce several leakage risks. Independent arithmetic and geometry checks establish consistency of the saved evidence; they do not prove the simulator itself is a faithful physical model. The public map supplies useful information, and removing one room indicator does not remove all map-related effects. Missing-estimate gating changes the attainable recall and the frame probability distribution.

Temporal matching tolerances are fixed and permissive, and greedy matching may differ from optimal assignment in complex overlapping predictions. Conditional duration and delay omit misses. F1 does not capture every operational tradeoff; false sessions and missed contact time may dominate a real monitoring workflow. Sensitivity to matching tolerance, time step, map layout and decision penalties is not quantified by the present main experiment.

The primary study has 30 independent test motion seeds, and only eight validation and calibration seeds. Frame counts do not provide independent sample size. Both sensor settings repeat each motion, and bootstrap intervals cover within-simulator seed variability only. Pointwise comparisons across seven modalities and multiple ablations lack multiplicity adjustment; exploratory positive intervals are not confirmatory clinical hypothesis tests. Calibration curves pool correlated observations and should not be interpreted as independent-frame confidence evidence.

### 9.4 External validity and next empirical steps

All main experiments use eight moving tags and one map. Independent waypoints change the motion family but not hospital, hardware, location, channel assumptions or participant population. The service-load study adds virtual traffic rather than crowds. The trajectories are deliberately constructed research scenarios, not measured staffing, patient, visitor or workflow distributions. Generalizing them to a dense hospital needs separately designed maps, populations and movement patterns.

A practical next study would collect labeled distance/contact sequences with independent people, devices, locations or days, fit channel and calibration parameters using development recordings, and freeze inference before evaluating untouched recordings. It should include wall barriers, short encounters, orientation changes, missing packets and sustained contacts, while measuring radio update rate, procedure duration, wearable power and comparable complete-system cost. Such data would test whether the observed learning gains survive model mismatch; that empirical question remains open.

## 10 Reproducibility and data availability

The reproducibility package contains Node simulation code, Python fitting/inference code, fixed protocol definitions, raw radio observations, hidden labels, float32 feature matrices, fitted model bundles, per-recording predictions/decisions/sessions, summary metrics, bootstrap contrasts and checksum manifests. Python 3.12.3, NumPy 2.2.6, scikit-learn 1.7.2, SciPy 1.15.3, joblib 1.5.2 and threadpoolctl 3.6.0 were used for training; the exact dependency set and commands are provided in Appendix B. CPU timing is host-specific and excludes sensing/feature extraction, so it is not presented as embedded-system performance.

Independent verification reconstructs all 826,560 unique physical pair-frame labels across the five partitions and checks 6,468 final detector evaluations. A supplementary auditor checks feature availability, Brier/ECE/AUROC/AP arithmetic, 462 grouped summary rows, 140 paired intervals and the primary numerical manuscript table. A feature-only inference entry point reproduces saved decisions without reading truth/label files. Source hashes bind the outputs to the recorded implementations. These audits do not constitute a second full independent training replay or hardware validation.

All data generated for this experiment are synthetic. No human participants were recruited and no patient records were used. Source code, the manuscript and reproduction instructions are hosted at https://github.com/ayyananwar/MDR-SIM. Retained research evidence is distributed in the versioned research-v7-2026-10-06 release at https://github.com/ayyananwar/MDR-SIM/releases/tag/research-v7-2026-10-06. The repository's RESEARCH_EVIDENCE_MANIFEST.json records file and archive SHA-256 checksums; its restoration script verifies evidence before recovery. A permanent archival DOI has not yet been assigned. Reproduction does not depend on the interactive demonstration interface. Older studies, their configurations and their adverse findings remain versioned and distinguishable from the main trained comparison.

## 11 Conclusion

We evaluated sustained-contact reconstruction using seven matched observation budgets and four calibrated classifier families with causal features, grouped partitions and frozen model selection. The selected models improve mean event F1 relative to declared validation-tuned geometric comparators, with scores ranging from 0.445 for RSSI to 0.763 for UWB under the chosen synthetic assumptions. RSSI remains vulnerable to false contacts and unseen-motion degradation. UWB's incremental ML advantage is uncertain, and the learned Markov and PBR/RTT gate extensions provide no consistent primary improvement.

The findings support evaluating sensing, temporal contact inference and probability quality as separate components. They also show why localization accuracy, a large relative F1 gain or a low frame calibration error cannot alone establish a dependable low-cost hospital system. The resulting benchmark and retained evidence offer a reproducible foundation for hardware-informed contact research, while real deployment accuracy, cost, energy and clinical interpretation remain subjects for empirical validation.

## References

@@REFERENCES@@

## Appendix A Feature schema and implementation conventions

@@TABLE:features@@

History means of distance use available estimates only; occupancy/availability fractions use all samples present in the causal window. Startup histories are shorter than their nominal window, whereas occupancy decoding requires the full ten samples. The RSSI profile comparison first computes a common-receiver mean signed offset and removes it before taking absolute differences. The range-fit residual compares observed range with the estimated gateway-to-tag distance; phase residual is an unwrapped phase-slope fit in tone-index units, which is equivalent up to frequency scaling for the uniform tones. PBR/RTT disagreement is exposed only in its combined budget. Upper-middle medians are used in the pair-feature and range-history summaries; the RSSI localization prefilter averages the middle two when its history length is even. Zero sentinels must be read alongside availability and modality.

## Appendix B Exact reproduction and artifact authority

The authoritative trained bundles are in results/ml-v7-models-complete, with selection.json and checksums.json. The interrupted results/ml-v7-models attempt is nonauthoritative. Main data are in results/ml-v7-data/{train,validation,calibration,test,external}; final evidence is in results/ml-v7-evaluation. Readable tables and original plot files are in results/ml-v7-report. Fresh output directories are required, and existing campaign outputs are never overwritten.

@@CODE:reproduction@@

After a successful training command, selection.json must say frozen-before-test before the test/external data are generated. Each partition uses its declared, disjoint seed range under a shared protocol hash. The replay workflow retains new artifact paths rather than relabeling an existing result. The research environment is separate from the application dependencies; system-specific process permissions may be required for the Windows test runner and random-forest workers.

## Appendix C Frozen validation selections

@@TABLE:selections@@

These configurations are selected from validation contact F1. The primary outcome table uses them unchanged. The complete candidate grids, validation counts and separate ablation/Markov policies remain in selection.json; reported primary model choices are not replaced with the highest-scoring final test family.
