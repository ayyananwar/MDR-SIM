# Paper protocol v3 and disclosure requirements

This protocol corrects target consistency and logistic feature extraction while retaining the original geometry, mobility, radio and E1 session rules. It is a newly executed software version, not a relabeling of older results.

## Physical reference and reconstruction

Thirty seeds: 101–110, 201–210 and 301–310. Fifty participants, 3600 seconds, 1-second physical steps. The nine default rooms and eight gateway coordinates are exported in the paper manifest. Gateways are at the centers of the first eight rooms; consultation room 2 has no gateway. The model uses maximum speed 1.2 m/s, direction-change probability .05/s, pause probability .08/s, pauses of 3–15 seconds and room-transition probability .005/s. A transition selects a room and relocates instantly. BLE positions interpolate between samples. This is abstract mobility, not doorway-constrained human movement.

Ground truth requires same-room membership and Euclidean separation <=2 m at every sampled step. Any failed step closes the session. Duration equals the last qualifying sample timestamp minus the first; it must be >=30 seconds. Continuous-time proximity between samples is not verified. Ground-truth coordinates and labels are unavailable to inference.

BLE uses a nominal 500-ms advertising interval, 0–10-ms jitter, -50 dBm at 1 m, path-loss exponent 2.5, noise sigma 6 dB, packet loss .05 and sensitivity -95 dBm. Movement and BLE RNG streams are separate. The edge pipeline validates (-110 dBm floor), deduplicates exact wearable/gateway/event identities within 20 ms, takes a causal five-observation RSSI median, estimates gateway distance, and qualifies at <=2 m. Distinct-wearable observations are paired within a 1000-ms chronological window.

Pair evidence is fused across gateways and sessionized with maximum successive gap 5 seconds. Qualification counts pair-evidence events (not distinct packets), with >=3 events and rounded endpoint-span duration >=30 seconds. Specifically `round((last-first)/1000)` is checked; a 29.5-second span may qualify. Endpoints are separately rounded to seconds. This convention is retained to preserve original E1 comparison; changing it would require another protocol version. Surviving sessions have confidence 1.

E1 uses greedy one-to-one matches in descending IoU, same canonical pair, IoU >=.2 and overlap >=5 seconds. Unmatched sessions/reference contacts are FP/FN. Seed macro means use all 30 seeds; zero-reference seeds have recall coded as zero. Report pooled recall and pooled missed-contact proportion alongside the complement of macro recall. Student-t confidence intervals use the project's interpolated critical-value table and truncate negative lower limits to zero; sparse bounded outcomes limit their interpretation.

## E3 labels, features and validation

Every session generates two directed records. Both share the same geometric label; they are not independent contacts. Positive means the same canonical wearable pair and strictly nonzero interval intersection with at least one qualified reference session. Endpoint touches are negative. There is no E3 minimum IoU or overlap duration. Use the same target for training, discrimination and calibration.

Logistic uses duration, constant proximity, encounter count, cumulative duration INCLUDING the current session, and encoded source status (confirmed=1, suspected=.5, non-source=0). The cumulative-duration accessor is corrected in v3. Full-batch gradient descent uses 200 epochs, learning rate .05 and L2=.1, with no feature standardization. Scores are bounded to [.0001,.9999]. This is the specified baseline, not evidence of an optimally converged logistic solution. Train exclusively on the other 29 seeds; never optimize against held-out labels.

Bayesian inference uses `DEFAULT_REFERENCE_LIKELIHOODS` from `src/risk/likelihood.ts` and fixed prior .1. The tables are built-in research reference values; this campaign does not establish empirical provenance, fit them on LOSO folds or apply Laplace smoothing to training counts. Alpha=1 is a configuration for the separate parameter-estimation API, not an active campaign fitting step. Do not describe this model as fold-trained or experimentally calibrated.

Heuristic: `.35*min(D/1800,1) + .35*P + .15*min(C/5,1) + sourceBoost`, bounded [.01,.99]; boosts .15 confirmed, .05 suspected, 0 otherwise. Its so-called RSSI factor is `P`, constant for surviving sessions, rather than raw RSSI. Proximity-only is constant .99. Proximity-duration is `.5*P + .5*min(D/300,1)`, also bounded [.01,.99]. Prior-only is constant .1.

AUROC and AP are macro-averaged over folds with both classes. F1 at threshold .5, Brier and ten-bin ECE are macro-averaged over nonempty folds. F1 uses zero when its denominator is zero in a NONEMPTY negative-only fold. No empty-fold zeros are averaged. Brier/ECE are omitted for heuristic scores. An always-zero macro Brier reference is exported to show the effect of imbalance. No model-ranking generalization is justified from only two supported seeds and three positive sessions. The generic JSON summarizer also exports unbounded Student-t intervals, which may exceed 1 for two-fold ranking metrics; these are not credible probability-range uncertainty estimates and must not be presented as reliable E3 ranking intervals. The E3 Markdown table deliberately reports descriptive means only.

## Radius diagnostic

The old 3 m / 811-FP claim has no verified source artifact. V3 runs a NEW paired diagnostic on seeds 1–3, 30 participants and 1800 seconds. Both thresholds use the same raw observations; only `edge.proximity.thresholdDistanceMeters` changes to 2 or 3 AFTER median filtering. Do not conflate this with the old diagnostic, which prefiltered raw RSSI while retaining a 2 m edge threshold. Two points cannot establish a scaling law.

## Reproduction and manuscript status

Use the commands and fresh-output rules in README. Preserve manifests, per-seed inputs/targets, raw predictions and checksums. Original paper results remain separately identified. `docs/PAPER_SUPPLIED.md` is the supplied text; it and `MANUSCRIPT_FINAL.md` were not silently rewritten to match new outputs. Update the paper's logistic table/discussion and diagnostic claims using the new versioned results, and disclose the above definitions. Figures and bibliographic validation still require author review. This software does not simulate infection or disease transmission.
