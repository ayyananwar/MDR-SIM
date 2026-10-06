# End-to-end learned contact reconstruction, version 7

This extension learns proximity evidence before session reconstruction. It includes all 28 unordered pairs at each sampled second, including pairs that never triggered a rule-based detector. It does not reuse the small, detection-conditioned original E3 dataset as adequate training evidence. All prior campaigns and manuscript files retain their original provenance.

## Task and observations

The physical frame label is distance at most 2 m in the same room, sampled once per second. Short encounters remain positive frame labels. The primary outcome is reconstruction of true consecutive sessions with at least 30 s elapsed duration: 31 consecutive samples qualify. This measures proximity, not infection, exposure dose or clinical risk. Session evaluation uses the same unordered pair and temporal overlap for every method: at least 5 s overlap and interval IoU at least 0.2, with greedy descending-IoU one-to-one matching. Boundaries, duration error, detection latency, missed pair-time and false sessions per pair-hour supplement F1.

Eight moving devices, four gateways and a two-room floor plan are shared across modalities. Randomized encounter positions, onset/duration, device assignment and paths produce ward encounters, doorway rounds and near-threshold encounters. Independent waypoints form a separately reported unseen-motion challenge on the same map. A wall-separated close pair is included. Motion is continuous and crosses the separating wall only through its doorway.

The seven observation budgets are RSSI; RSSI plus two angular receivers; RSSI plus four angular receivers; RSSI plus PBR; RSSI plus RTT; RSSI plus PBR with an RTT consistency gate; and RSSI plus UWB DS-TWR. The radio error assumptions and causal localization/tracking are inherited from v5/v6. Active ranging uses the eight-client load with four assumed service slots per anchor per second. The earlier 32/128-client capacity stress results remain separate; v7 does not establish crowded-hospital ML performance.

The 29 numerical features describe estimated distance/room, estimate availability, telemetry age, receiver/RSSI/angle/range agreement, range-fit diagnostics, and causal 10/30-second histories. The schema excludes seed, timestamp, device/pair identity, true positions, true room, true distance and outcome. Modality-specific features cannot receive another modality's hidden observations. Public anchor positions and floor plan are allowed. True geometry generates observations and evaluation labels only. Unavailable pair estimates force a nonpositive output.

## Frozen data partitions

| Partition | Seeds | Recordings | Purpose |
|---|---|---:|---|
| Training | 2001–2024 | 24 | Fit classifiers and transition counts |
| Validation | 2101–2108 | 8 | Hyperparameters, classifier threshold, decoder and rule threshold |
| Probability calibration | 2201–2208 | 8 | Platt calibration on separate recordings |
| Primary test | 2301–2330 | 30 | Final evaluation, no model fitting or selection |
| Unseen motion | 2401–2412 | 12 | Independent waypoints on the same map |

Each recording has two matched sensor-error conditions, LOS and wall multipath. These are repeated conditions of one motion seed, not independent subjects. Every seed remains in one partition across all modalities and conditions. Primary test and unseen-motion recordings were generated only after the complete fitted-model and decision-settings checksum manifest was frozen. Training samples every fifth second; all calibration, validation and evaluation seconds are retained. Training preprocessing is fitted on training data only. There is no random frame-wise train/test split, future-history feature, synthetic oversampling or test-set early stopping.

## Fitted models and comparators

- Standardized logistic regression: C 0.1 or 1, balanced training weights.
- Random forest: 64 trees, depth 8 or 12, minimum leaf 25, balanced training weights.
- Histogram gradient boosting: 80 iterations, 15 or 31 leaves, minimum leaf 50, L2 0.1, balanced training weights, no internal frame-wise early stopping.
- Standardized Gaussian naive Bayes: variance smoothing 1e-6 or 1e-3; means, variances and priors fitted from data.

Each candidate receives probability calibration using separate calibration recordings. Validation selects candidate and threshold from 0.2, 0.35, 0.5, 0.65 and 0.8, with either strict decisions or causal occupancy (at least seven positive observations in a full ten-second window, and a currently available estimate). Selection maximizes seed-mean reconstructed-contact F1; predefined ties prefer fewer false positives, more true positives, a higher probability threshold and strict decoding. A tuned geometric rule selects a 1.5/2/2.5/3 m estimated-distance threshold with the same decoder options on validation. Fixed 2 m strict/temporal rules and a training-prior baseline are also evaluated. The 3 m rule changes estimated-distance decisions; it does not change the 2 m physical target.

The best full classifier family per modality is chosen by validation, never test performance. A causal Markov filter learns transition probabilities from complete training-label sequences with add-one smoothing. Calibrated classifier odds are adjusted by calibration prevalence as an approximate emission likelihood. Overlapping feature histories violate ideal independent-emission assumptions; Markov output calibration is therefore measured rather than guaranteed. Two ablations refit the validation-selected family/configuration after removing contact-history features or the estimated-room feature. The latter retains observable RSSI/range/position evidence and is not a complete removal of all information about rooms.

There are 49 saved fitted detector bundles: seven per observation modality (four classifier families, Markov extension, two ablations). Candidate searches and equally tuned rule settings are retained. The original fixed Bayesian likelihood tables remain clearly distinct from the newly fitted Gaussian Bayes and Markov models.

## Reporting and validation

Primary means first average conditions within each seed and then seeds. Event F1 is undefined only if both reference and prediction sets are empty; false-alarm-only cases retain F1 zero. Frame Brier/ECE include all sampled pairs, including negatives and unavailable observations. AUROC/AP require both classes and report support. Conditional duration/latency metrics exclude unmatched contacts and must be read alongside recall. Seed-paired bootstrap intervals (2,000 draws, fixed random seed) are exploratory pointwise intervals without multiplicity correction. Every model, probability, decision, reconstructed session, raw observation, label, manifest and checksum is retained.

The independent verifier imports no classifier/training/metric implementation. It reconstructs physical labels, doorway/movement validity, qualified sessions, decisions, matching counts, F1, time errors and Brier from saved evidence. A feature-only inference entry point demonstrates that truth files are unnecessary at prediction time. Unit tests cover causal histories, temporal gaps, boundary durations, missing observations, matching, calibration arithmetic and fitted-preprocessing isolation.

This is a reproducible simulation comparison under explicit synthetic error distributions. It does not prove hardware accuracy, clinical usefulness, standards compliance, optimal wearable cost, radio capacity, battery life, or performance in a different hospital. Publication claims must retain these limits. Group-separated evaluation and training-only preprocessing follow the principles in [scikit-learn cross-validation documentation](https://scikit-learn.org/stable/modules/cross_validation.html) and [common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html).
