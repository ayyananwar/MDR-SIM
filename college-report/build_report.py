"""Build a standalone college report, preserving the supplied heading sequence.

The manuscript and frozen numerical tables remain unchanged. The generated TeX
contains its bibliography and vector diagrams; logos/screenshots are bundled.
"""
from pathlib import Path
import re,json,hashlib

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(__file__).resolve().parent
TEMPLATE=OUT/'ORIGINAL_TEMPLATE.txt'
old=TEMPLATE.read_text(encoding='utf-8')
paper=(ROOT/'paper/manuscript_content.md').read_text(encoding='utf-8')
tables=json.loads((ROOT/'paper/manuscript_tables.json').read_text(encoding='utf-8'))
refs=json.loads((ROOT/'paper/references.json').read_text(encoding='utf-8'))
headings=re.findall(r'\\(chapter\*?|section\*?|subsection\*?)\{([^}]+)\}',old)
headings=[(kind, 'Learned Contact Classification and Probability Calibration' if title=='Exposure Risk Assessment Module' else title) for kind,title in headings]

def source(heading):
    lines=paper.splitlines();start=next(i for i,l in enumerate(lines) if re.match(r'^#{1,3} ',l) and l.split(' ',1)[1]==heading)
    level=len(lines[start].split(' ',1)[0]);end=next((i for i in range(start+1,len(lines)) if re.match(r'^#{1,3} ',lines[i]) and len(lines[i].split(' ',1)[0])<=level),len(lines))
    return '\n'.join(lines[start+1:end]).strip()

b={}
b['Overview']="""This research project is motivated by the difficulty of reconstructing interpersonal encounters from wireless evidence in a hospital setting. The original application combines simulated BLE observations, edge processing, identity-management experiments, and a dashboard. The final research contribution is a reproducible simulation of sustained-contact reconstruction using seven observation configurations and four trained classifier families.

This report presents the research study under the same title as the accompanying manuscript while retaining the supplied college chapter structure. The experimentally validated learning target is instantaneous geometric proximity, and the primary outcome is reconstructed sustained contact. Hospital use motivates the study; privacy mechanisms and the historical MDR-TB dashboard are companion prototype work rather than validated clinical outcomes. No probability in the main study is an infection probability, and the simulation does not establish a deployed privacy guarantee.

Digital contact records can supplement an investigation, but their usefulness depends on whether the sensing pipeline recovers actual encounters. A gateway observing two tags does not prove that the tags are within two metres. Even good individual ranges can fail to produce stable contact intervals when updates are missing or biased. The project therefore evaluates the entire observation-to-session chain rather than relying on a nominal sensor-accuracy claim.

The system is developed in generations. Earlier gateway co-observation results are retained as negative evidence. Angular localization, causal tracking, and phase/timing ranging were added in separately versioned experiments. The main learned study evaluates all unordered pairs before session detection, avoiding the limitation that a downstream scorer can only assess contacts that an earlier stage already found."""
b['Scope']="""The completed work covers synthetic movement generation, radio-observation generation, causal measurement processing, robust localization, Kalman tracking, symmetric observable feature construction, classifier training, separate probability calibration, validation selection, temporal decoding, session matching, and reproducible reporting. Seven configurations include RSSI, RSSI with two or four angular receivers, PBR, RTT, PBR with an RTT consistency gate, and UWB double-sided two-way ranging.

The main environment contains eight moving tags, four anchors, one two-room floor plan, and 360 one-second frames per recording. Training, validation, calibration, primary testing, and unseen-motion testing use separate recording seeds. The study tests declared algorithms and parameter grids, not every possible learning or sensing technique.

The retained demonstration and historical privacy modules are described separately from the main learned experiment. Real BLE/UWB devices, antenna arrays, clinical participants, patient records, complete cryptographic deployment, wearable power measurements, hardware cost quotations, and hospital-wide field validation are outside the completed experimental scope. The public map is available to inference, while hidden true positions are used only for observation generation and reference construction."""
b['Motivation']="""The first motivation is scientific: contact reconstruction must be tested against an independent reference. If the simulator directly turns geometric truth into displayed contacts, it demonstrates a scenario but does not evaluate wireless inference. The revised research generates radio observations and then reconstructs contacts without reading hidden geometry.

The second motivation is temporal reliability. One incorrect frame can split a sustained run; repeated small errors can also create a long false encounter. Frame probability quality, event recovery, interval coverage, and confirmation delay are therefore different concerns.

The third motivation is realistic comparison. Additional angles or ranges should be judged using the same movement and contact definitions. Learned methods should be compared with validation-tuned rules, so a gain is not merely the effect of adjusting a threshold that the baseline was denied.

The fourth motivation is affordability. Reusable hospital tags and infrastructure have acquisition and operating costs. The simulation can identify candidate sensing/accuracy tradeoffs, but choosing a minimum-cost system requires real quotations and measured capacity, energy, calibration, installation, and handling costs. Retaining UWB as a comparator is more informative than excluding it based on an unmeasured price assumption."""
b['Healthcare-Associated TB Transmission and Infection Prevention']="""The World Health Organization presents tuberculosis infection prevention and control through integrated administrative, environmental, and respiratory-protection measures [17]. This project is motivated by the possible value of structured contact histories within that wider setting. It does not replace those measures or infer their effectiveness from radio data.

Proximity is a limited observational construct. It excludes ventilation, aerosol concentration, infectiousness, protective equipment, exposure dose, and biological susceptibility. A two-metre same-room event is the simulator's operational label, not a universal clinical transmission definition. No patients were recruited and no clinical outcomes were collected.

Consequently, this report avoids numerical claims about MDR-TB incidence reduction, infection probability, or clinical risk calibration. Such questions require independent epidemiological data and appropriate institutional approvals. The completed technical evaluation concerns whether synthetic geometric contacts can be recovered from uncertain measurements."""
b['BLE-Based Proximity Sensing']=source('2.1 Measuring proximity and reconstructing contacts')+"\n\n"+source('2.2 Angular and ranging observations')
b['Wearable Contact Monitoring in Healthcare']="""Vanhems et al. studied contact patterns in hospital wards with wearable proximity sensors [1]. Their study establishes an application context, but its sensor technology, participants, time sampling, and aims differ from this simulation. The current project does not reproduce that field study or treat its designed motion patterns as measured hospital routines.

A wearable monitoring system must identify which tags interact and when, while handling missing observations, environmental error, and session boundaries. Device-level radio measurements become useful interpersonal evidence only after estimation and temporal interpretation. This distinction motivates the end-to-end event evaluation in the present work.

The final dataset includes deliberately brief encounters, near-boundary phases, doorway routes, and wall-separated proximity. These fixtures test particular failure modes rather than offering a representative census of hospital behavior."""
b['Edge Computing for Healthcare IoT']="""Edge processing places computation near the acquisition point. In the original TypeScript pipeline, modules validate and normalize packets, remove duplicates, filter RSSI, create temporal pair evidence, and form sessions before downstream evaluation. This modular organization makes input/output dependencies inspectable.

The final research uses an additive offline simulation and learning workflow. Filtering, estimation, feature generation, and temporal decisions are algorithmically suitable for causal processing, but they have not been deployed on a hospital gateway. Desktop CPU time is not equivalent to gateway latency, radio procedure time, or wearable energy.

The design principle is to preserve useful contact evidence while reducing redundant representation. A system can compress a stream efficiently and still reconstruct the wrong contacts. Therefore no communication-reduction percentage is presented as proof of contact quality, and no unverified reduction value from the old report is transferred to the main study."""
b['Privacy-Preserving Digital Contact Tracing']="""The historical source includes pseudonym generation, identifier-rotation schedules, an authorized identity registry, observation rewriting, and linkage/identity-inference experiments. These components distinguish direct identity exposure from behavioral linkability.

There are two implemented generator modes: keyed HMAC-SHA256 and a deterministic simulation-grade pseudo-random mode. The latter supports repeatable experiments but must not be called cryptographically secure. Security in the keyed mode depends on actual key secrecy, entropy, provisioning, and the surrounding deployment, none of which is established by the main v7 experiment.

Changing a broadcast identifier does not erase timing, receiver patterns, or movement continuity. These can remain linkable. The final v7 contact benchmark maintains synthetic stable tag identities for causal histories; it does not jointly evaluate rotating identifiers and its learned contact detector. This is an important integration limitation rather than a privacy result to be inferred from F1."""
b['Probabilistic Exposure-Risk Assessment']=source('2.3 Learning calibrated probabilities and evaluating grouped observations')+"""\n\nThree probability interpretations must be separated. The main models predict instantaneous synthetic same-room proximity. The original downstream scoring task concerns validity of surviving reconstructed records. A biological infection probability would concern a different clinical outcome. Neither of the first two becomes the third merely by using the term risk.

The original fixed-likelihood Bayesian scorer is also different from the learned Gaussian Bayes classifier and the learned Markov extension in v7. These methods use different targets, fitted quantities, and protocols. This report identifies those differences rather than pooling their outcomes into a model hierarchy."""
b['Research Gap']="""The practical research gap is the mismatch between attractive individual sensing measurements and dependable sustained-contact recovery. A position or range can be reasonable on average while a temporal contact detector misses whole events, fragments runs, or generates persistent false sessions.

The project addresses this gap with matched observation budgets, independent geometric labels, all-pair evaluation, grouped partitions, separate calibration, frozen model selection, tuned deterministic controls, temporal extensions, feature ablations, and retained per-recording evidence. It examines both improvement and failure under explicit assumptions.

The contribution is the experimental framework and documented findings. The sensing principles, logistic regression, forests, boosting, and Gaussian Bayes are established methods; the report does not claim to invent them."""
b['Problem Description']=source('3.1 Environment and motion')+"\n\n"+source('3.2 Instantaneous labels and sustained reference sessions')
b['Problem Statement']="""Given a public floor plan, known anchor positions, and a causal sequence of allowed noisy radio observations, reconstruct qualified same-room pair-contact sessions without accessing hidden true coordinates or reference outcomes. Compare declared sensing configurations and trained models against equally validation-tuned geometric controls on independent simulation recordings.

The desired output for each unordered pair is a set of intervals with start, end, and earliest confirmation time. A correct solution must preserve the distinction between instantaneous proximity labels and qualified sessions and must report false sessions and missed contact time alongside an aggregate F1 score."""
b['Objectives']="""1. Construct reproducible movement recordings and an independent sampled contact reference.
2. Compare RSSI, angular, phase, timing, and UWB observations on matched conditions.
3. Keep hidden geometry outside observable prediction interfaces.
4. Train four classifier families with separate calibration and validation selection.
5. Decode causal probabilities into sustained sessions using declared temporal policies.
6. Evaluate event recovery, probability quality, timing, pair-time errors, and unseen motion.
7. Test a learned Markov extension and two feature ablations without suppressing negative findings.
8. Preserve source/data provenance and exact commands for artifact verification and reproduction.
9. Describe cost, privacy, and hospital-deployment limitations without claiming unmeasured outcomes."""
b['Functional Requirements']="""The simulator shall generate movement from declared seeds, verify wall/doorway behavior, and create reference labels independently of radio inference. The observation layer shall produce allowed noisy RSSI, bearing, phase, and timing data, including reception loss. Modality stripping shall prevent a branch from receiving measurements outside its budget.

The estimation layer shall process only current and past data, localize from public anchors, track positions, expire stale estimates, and expose availability. The feature builder shall produce 29 finite symmetric values in fixed order for every pair-frame. It shall not include seed, timestamp, identity, true distance, true room, or outcome as predictor columns.

The fitting layer shall read only development partitions, fit training transformations, calibrate on separate recordings, select models and policies on validation, and save frozen bundles before held-out generation. The evaluation layer shall produce probabilities, decisions, sessions, metrics, and per-seed comparisons. The verifier shall reconstruct labels and outcomes from retained evidence.

The reporting layer shall preserve all families and controls, show adverse outcomes, distinguish pooled counts from seed means, and record artifact authority. Fresh campaigns shall refuse to overwrite existing result directories. The demonstration shall remain separately identifiable and shall not become the authority for paper metrics.

@@TABLE:requirements@@"""
b['Non-Functional Requirements']="""Reproducibility requires fixed protocol values, seed partitions, software versions, manifests, and source checksums. Maintainability requires separation between movement, observation generation, inference, training, evaluation, and presentation. Numerical integrity requires correct units, fixed array ordering, stable session semantics, and explicit handling of undefined metrics.

The implementation should expose rather than silently hide missing data and failed runs. Inference must not depend on labels; raw and per-seed evidence must remain recoverable. A large number of correlated frames must not be described as a large number of independent experimental subjects.

Portability is supported through locked application dependencies and a separate Python environment. The retained training used Python 3.12.3 with NumPy 2.2.6, scikit-learn 1.7.2, SciPy 1.15.3, joblib 1.5.2, and threadpoolctl 3.6.0. Node 22.14.0 was used in project validation. Runtime, throughput, and memory claims must specify hardware and workflow; the report does not assign arbitrary minimum RAM or CPU specifications from unmeasured evidence.

Privacy and security remain explicit design constraints for future deployment. Synthetic identifiers and access-control interfaces do not establish a complete authenticated hospital service or a resistance guarantee against all attackers."""
b['Proposed Project Architecture']="""The architecture separates the retained hospital-facing demonstration from the final research engine. The demonstration explains the intended operational workflow. The research engine supplies the controlled evidence used in this report. Both are described below, but numerical conclusions are taken only from the authoritative campaigns."""
b['Architecture Overview']=source('3.3 Observation budgets and causal interfaces')+"\n\n@@FIG:architecture@@"
b['System Components']="""The main components are the movement generator, independent label constructor, observation generator, modality interface, causal measurement history, robust localizer, tracker, pair-feature builder, classifier/calibrator, temporal decoder, event evaluator, and artifact store. Each has a defined information boundary.

Movement and reference construction know true positions. Observation generation also uses those positions to synthesize measurements. Downstream inference sees measurements, public anchor metadata, and the map. The classifier sees observable features. The evaluator compares predictions with separately retained labels and sessions after prediction.

The original identity registry and dashboard remain companion prototype modules. They are not hidden sources of true room or person status for the main learned detector. A future combined deployment must define how authorized identity continuity is maintained across rotating broadcasts."""
b['Working of the Proposed System']="""For each partition seed, the movement generator creates a continuous sampled trajectory and derives physical pair labels. The observation generator applies the ideal or wall-error setting, including noise and reception loss. Each modality then receives only its permitted evidence.

At each time sample, trailing histories filter measurements, localization estimates tag coordinates, and tracking combines current estimates with movement predictions. The feature builder describes each pair using estimated geometry, telemetry, agreement, diagnostics, and past histories. It also records whether the pair is currently eligible.

A fitted classifier produces a raw positive score, a separately fitted map calibrates that score, and the frozen threshold/decoder creates a binary temporal sequence. Consecutive positive runs spanning at least 30 seconds become predicted sessions. The independent evaluator matches them to reference sessions, calculates errors, and aggregates supported conditions within each seed before averaging seeds.

The report is generated from retained evidence. It does not create final values by editing dashboard displays or by replacing unfavorable test selections with later winners."""
b['High-Level Design']="""The high-level design assigns sensing, estimation, learning, and evaluation distinct responsibilities. The separation is particularly important for a simulator: code that knows the hidden answer must not be reused as an inference shortcut. Figure references and module names below describe the implementation or explicitly marked companion architecture, not unbuilt hardware.

@@FIG:highlevel@@"""
b['Wearable Module']="""The main experiment represents eight moving tags with synthetic identifiers. Tags supply the observation generator with positions internally, while the inference layer receives only generated radio measurements. Pair roles are shuffled so an identifier does not consistently encode a contact role.

The original prototype additionally models rotating pseudonyms. The v7 experiment does not implement a physical wristband, battery circuit, enclosure, secure provisioning service, or real antenna system. Such items are requirements of a future deployment rather than completed components of the simulation."""
b['BLE/RF Observation Module']=source('4.1 RSSI and angular channels')+"\n\n"+source('4.2 Phase-based ranging')+"\n\n"+source('4.3 RTT and UWB timing')+"\n\n"+source('4.4 Matched service and reception assumptions')
b['Edge Processing Module']=source('5.1 Filtering localization and tracking')+"""\n\nThe earlier edge pipeline also includes packet validation, normalization, deduplication, temporal pair evidence, and sessionization. Those functions provide a modular acquisition-processing design. The main trained campaign reuses causal estimation mechanisms from the separately versioned angular/contact/ranging modules and performs offline generation and fitting.

Median filtering suppresses some isolated outliers, while a circular mean respects angular wrapping. Huber loss limits the influence of very large standardized residuals. Kalman tracking maintains a movement estimate between updates, but expires it when it becomes stale. Each is a useful mechanism whose fixed parameters remain part of the experiment's assumptions."""
b['Contact Reconstruction Module']=source('5.2 Observable features and missing information')+"\n\n@@TABLE:features@@\n\n"+source('5.4 Temporal decisions and session extraction')
b['Learned Contact Classification and Probability Calibration']="""The module produces calibrated probabilities of instantaneous synthetic same-room proximity; it is not a clinical exposure or infection-risk model.

"""+source('5.3 Classifier fitting and probability calibration')+"\n\n"+source('5.5 Learned Markov extension and ablations')
b['Privacy Module']="""The companion privacy design separates broadcast pseudonyms from a protected identity mapping. Authorized processing can resolve identifiers to maintain records, while public observations do not need direct personal identities. Rotation experiments consider collision, linkability, and the effect of identifier changes on contact continuity.

The existing authorization context is an application interface; it must not be described as a fully audited authentication service. Deterministic simulation pseudonyms provide reproducibility rather than secrecy. Keyed HMAC generation is implemented, but full key lifecycle, endpoint security, transport security, and institutional governance are not evaluated by the main trained study.

Stable identity association is necessary to build causal histories. The final contact evaluation does not quantify the additional error introduced when that association must be recovered across real rotating identifiers. That remains a separate integration experiment."""
b['Dashboard Module']="""The React demonstration presents simulated movement and project modules through a graphical interface. Its purpose is to help users inspect the intended workflow and understand reconstructed contact records. Historical risk terminology and live heuristics must not be substituted for the main v7 result tables.

A research-facing output view should identify the run version, modality, selected family, threshold, decoder, and contact interval, and should distinguish probability from infection risk. It should display missing evidence and uncertainty rather than silently treating absent observations as physical separation.

The report contains vector views of the frozen research evidence and actual captured screens of the retained demonstration. The two forms of output are explicitly distinguished. The screenshots illustrate the interface, not validated hospital or infection outcomes."""
b['Use-Case Diagram']="""The use-case view distinguishes the implemented research workflow from an eventual hospital workflow. Researchers generate and verify experiments; developers test code boundaries; students inspect the demonstration. A future authorized investigator would review contacts after a separately validated operational deployment.

@@FIG:usecase@@"""
b['Actors and Their Responsibilities']="""The researcher fixes a protocol, generates development data, fits models, freezes selections, evaluates held-out data, and interprets limitations. The developer maintains the information boundaries and runs regression checks. The reviewer checks provenance, numerical consistency, comparator fairness, and whether conclusions exceed the evidence.

The student or demonstration user can inspect project concepts without treating display values as clinical decisions. An authorized infection-control investigator is a proposed operational actor, not a participant in the completed synthetic study. No patient or hospital employee provided personal data for v7."""
b['Major Use Cases']="""Major implemented use cases are creating a fresh simulation partition, training/calibrating/selecting a model, running held-out evaluation, applying feature-only inference, independently verifying saved labels and metrics, restoring release evidence, and generating tables and figures.

Future operational use cases include assigning wearables, managing keys, authorizing identity resolution, reviewing contacts, and integrating with institutional records. These are separated from completed experimental functions to prevent a design diagram from being interpreted as deployment evidence."""
b['Data Flow Diagram']="""The data-flow view makes hidden and observable stores explicit. The reference store feeds fitting labels and post-prediction evaluation; it does not feed inference features. The model store receives fitted development outputs and supplies held-out prediction. The result store preserves per-recording outputs and run metadata."""
b['DFD Level 0']="""At the context level, protocol and synthetic observations enter the reconstruction system, and predicted sessions and evaluation artifacts leave it. Independent reference sessions enter only the evaluation path. A human researcher reviews the resulting evidence and its assumptions.

@@FIG:dfd0@@"""
b['DFD Level 1']="""The expanded data flow begins with protocol-controlled motion and sensor generation. Causal estimation produces positions and diagnostics; the feature builder produces fixed-order arrays; development fitting writes model bundles; held-out inference writes probabilities and sessions; independent evaluation writes metrics and grouped contrasts.

Labels are stored separately from features, even though both originate from one simulated world. The public map and anchor locations are allowed metadata. True rooms, positions, pair distances, contact-role identities, and future status are prohibited predictor inputs.

@@FIG:dfd1@@"""
b['Class Diagram']="""The implementation mixes object-oriented and functional components. The class view therefore includes actual classes alongside explicitly labeled functional modules, rather than inventing a hierarchy of unimplemented services. FeatureBuilder owns telemetry and pair histories; CausalMeasurements owns filtered measurement histories; CausalTracker maintains motion state. Python fitting and metrics are principally module-level functions.

@@FIG:classes@@"""
b['Sequence Diagram']="""For one sampled instant, the generator supplies current allowed measurements to filtering and estimation. The tracker updates available positions, the feature builder emits pair inputs, and the saved bundle produces calibrated probability. The temporal decoder retains state over frames. Once a run qualifies, a session can be confirmed; complete boundaries are known after the run ends.

The evaluator compares stored predictions with independent reference sessions after inference. The sequence is causal at prediction time even though final interval summaries are assembled retrospectively.

@@FIG:sequence@@"""
b['Implementation Details']="""JavaScript modules generate the movement, observations, and features. Python with scikit-learn performs fitting, calibration, held-out evaluation, and numerical reporting. The original application uses TypeScript and React. The environments are intentionally separate so research dependencies and demonstration dependencies are identifiable.

@@TABLE:files@@"""
b['BLE Wearable Simulation']="""The protocol fixes eight tags, 360 frames, the 2 m threshold, and the 30 s minimum span. The scenario module generates ward encounters, doorway rounds, and threshold encounters, while the held-out motion challenge uses independent waypoints. Each tag has a continuous sampled route, and role assignment is shuffled.

There are 28 unordered pairs per frame. The physical label array has shape 360 by 28. A feature array for one condition/modality has shape 360 by 28 by 29. Array order is timestamp-major then pair-major, with fixed predictor columns. Float32 features are rounded to three decimal places before storage; labels are unsigned 0/1 bytes."""
b['BLE/RF Simulation']="""Radio generation is matched across observation budgets: one motion recording supplies the reference for both error conditions and every modality. The sensor modules inject assumed RSSI, bearing, phase, and timing errors and control packet availability. A branch cannot inspect hidden bearing fields unless its budget enables them, and PBR does not receive RTT diagnostics from the combined branch.

The phase sequence is abstract and uniformly spaced. Timing models use nanosecond intervals converted to seconds. UWB uses ideal DS-TWR rather than TDoA. All active branches share the imposed round-robin scheduling and BLE reception mask. These choices enable a controlled algorithm comparison but omit technology-specific RF capacities and real controller behavior.

Raw observations, true trajectories, labels, and feature arrays are retained separately. This permits later verification of the path from observations to results without retroactively relabeling old evidence."""
b['Edge Gateway Processing']="""The processing stages are causal. RSSI and bearings use five-second histories; range filtering uses valid recent values when current links are available. Robust multistart localization estimates coordinates, and constant-velocity tracking bridges limited missing updates. Positions expire after more than three seconds without usable localization.

Features summarize pair geometry, receiver agreement, telemetry age, packet counts, fit residuals, and estimated contact histories. Missing geometry is explicitly gated. Distance zero is a sentinel when unavailable, not proof of zero separation. At least three RSSI/range links or two angular observations are needed by the corresponding localizer.

This implementation is evaluated offline. It does not supply a measured edge-device communication ratio, radio-to-server latency, or power budget in the final benchmark."""
b['Contact Session Reconstruction']="""Training learns instantaneous same-room proximity, including brief encounters. Strict decoding uses current eligibility and the selected probability threshold. Occupancy decoding requires seven threshold-positive eligible samples in the full trailing ten-frame window and current eligibility. The current probability need not itself pass the threshold in occupancy mode.

Maximal consecutive decoded positive runs with end minus start at least 30 seconds become predictions. With one-second samples, 31 consecutive positive samples are the minimum. An unavailable current estimate breaks a run. Earliest confirmation is start plus 30 seconds, and the complete end boundary is later reconstructed from the sequence.

The same physical reference definition is used for all configurations. A tuned estimated-distance threshold of 2.5 or 3 m does not change the true 2 m label; it compensates for estimation error within a validation-selected rule."""
b['Probabilistic Exposure Assessment']="""The four full families each search two hyperparameter candidates per modality. Training samples every fifth second, giving 96,768 fitting rows per modality. Logistic and Gaussian Bayes standardization is fitted only on training data. Balanced weights are applied in logistic regression, forests, and boosted trees; Gaussian Bayes learns natural class priors.

Each candidate receives sigmoid calibration on independent eligible calibration frames and a validation-selected threshold/decoder. The primary full family is selected by validation event F1 and retained unchanged on test. The Markov extension learns training transition frequencies; the two ablations refit the chosen full configuration without history or without the room indicator.

There are 49 retained detector bundles across seven modalities. Some share fitted base classifiers. Outputs describe synthetic instantaneous proximity, while temporal extraction determines qualified sessions. The historical exposure terminology is not a justification for infection-probability claims."""
b['Privacy Implementation']="""The earlier TypeScript privacy directory contains PseudonymGenerator, RotationScheduleModel, IdentityRegistry, observation transformations, and simulated linkage/identity-inference modules. The generator exposes keyed HMAC-SHA256 and explicitly noncryptographic deterministic modes. The registry has authorization-aware resolution interfaces.

Those modules are retained so the broader project design remains inspectable. They are not injected into the authoritative v7 feature interface. The main predictor excludes personal identities, source clinical status, and label information, but maintains synthetic tag associations over time.

This information-minimization boundary is not a proof of anonymity. A real deployment still requires authenticated principals, secure storage and transport, key lifecycle management, access auditing, retention controls, and an empirically evaluated privacy/utility tradeoff."""
b['Evaluation']=source('6.1 Partitions and supervision')+"\n\n"+source('6.2 Deterministic controls and fairness')+"\n\n"+source('6.3 Evaluation metrics and uncertainty')+"\n\n@@REPRO@@"
b['Overview of Results']="""The following results are taken from the authoritative completed v7 artifacts. Model and temporal settings were frozen before primary and unseen-motion test generation. The results compare matched synthetic configurations rather than measured commercial radios.

Primary testing contains 30 independent motion seeds and 176 unique qualified reference sessions. Each motion is repeated under two sensor conditions, so pooled reference support is 352 instances per modality. The main F1 averages supported conditions within seed and then supported seeds. Pooled TP/FP/FN therefore do not generally reproduce the headline F1.

Results include every family, deterministic controls, temporal extensions, ablations, error conditions, and unseen motion. The report does not omit contradictory findings or substitute favorable final-test families for the validation choices."""
b['BLE Proximity Estimation Results']="""The main learned study evaluates sustained contacts rather than presenting a new universal localization-error claim. Its observed outcome depends jointly on sensor models, localization, tracking, missing updates, features, and decisions. Lower assumed range noise alone does not establish better hospital contact monitoring.

"""+source('7.2 Channel conditions and unseen motion')+"""\n\nThe ideal setting is named LOS in artifact identifiers but does not guarantee that every two-room link has physical line of sight. Every selected method has lower primary F1 in the wall setting. The unfamiliar movement challenge retains the same map and radio assumptions; it is not a separate hospital, hardware, or participant evaluation."""
b['Contact Session Reconstruction Results']=source('7.1 Selected models and primary contact recovery')+"\n\n"+source('7.3 Temporal learning and feature ablations')+"\n\n@@TABLE:selections@@"
b['Probabilistic Exposure Risk Assessment']=source('7.4 Probability quality and contact-time burden')+"""\n\nThe section title is retained from the supplied report, but these are probability-quality metrics for instantaneous proximity, not calibrated MDR-TB exposure or infection. The prior-only Brier baseline is 0.077. All selected models improve on it, yet session false alarms and missed time remain substantial.

A frame can be predicted well while a long event is fragmented. Conversely, an event can match under permissive overlap tolerance while its boundaries are wrong. The probability and session tables must therefore be interpreted together."""
b['Edge Processing and Scalability Results']=source('8.2 Service-load stress under a separate controlled fixture')+"\n\n"+source('8.3 Affordability and hospital deployment')
b['Privacy Evaluation Results']="""The main v7 experiment does not provide a numerical anonymity, encryption-strength, or re-identification-resistance result. Its privacy-relevant architectural property is predictor minimization: true identity, source clinical status, seed, time as a predictor, and hidden geometry are excluded from X. Synthetic identifiers remain necessary to maintain histories and outputs.

The retained historical privacy code studies different attacker interfaces and rotation behavior under its own protocols. Its outcomes must remain attached to those settings; they cannot be transferred to the final classifier comparison as a security certificate. This report therefore replaces the old template's unspecified privacy percentages with an explicit evidence-status table.

@@TABLE:privacy@@

A complete deployment assessment would examine authenticated identity resolution, registry compromise, behavioral linkability, radio metadata, access logging, and key management. It would also evaluate whether rotation fragments the histories required by the learned detector."""
b['System Output and Dashboard']="""Authoritative outputs are probability arrays, decoded decisions, predicted session records, per-case metrics, grouped summaries, paired contrasts, and manifests. A session record identifies a synthetic pair and includes start, end, and detectedAt. The detector's threshold and policy are stored with the bundle.

The retained React interface is a separate demonstration. The following screenshots were captured from the existing built application on 6 October 2026. Displayed names and statuses are synthetic. Interface labels such as infection probability, clinical surveillance, bandwidth saved, and gateway CPU/RAM are demonstration terminology or counters, not clinically calibrated outputs or benchmark measurements. The interface's larger population and hospital map are different from the eight-tag research fixture.

@@FIG:output@@

A reviewer should consult results/ml-v7-models-complete for fitted selections, results/ml-v7-evaluation for outcomes, and results/ml-v7-report for readable tables. The interrupted results/ml-v7-models directory is retained but nonauthoritative. Displayed old risk heuristics must not replace these artifacts."""
b['System Output and Dashboard']+='''

@@SCREEN:dashboard|Actual dashboard demonstration. Displayed clinical and performance labels are not verified research outcomes.@@

@@SCREEN:live-simulation|Actual paused live-simulation interface; its synthetic hospital scene differs from the v7 two-room fixture.@@

@@SCREEN:contact-investigation|Actual contact-investigation interface with synthetic records; no clinical action or diagnosis was performed.@@

@@SCREEN:risk-demonstration|Actual historical risk-engine interface. Displayed infection probabilities are heuristic demonstration values, not clinically validated probabilities.@@

@@SCREEN:gateway|Actual gateway interface. Its hardware, bandwidth, CPU/RAM, and packet counters are demonstration displays, not measured hospital deployment evidence.@@
'''
b['Discussion']=source('9.1 Interpretation of learning gains')+"\n\n"+source('9.2 Construct and channel validity')+"\n\n"+source('9.3 Internal and statistical validity')+"\n\n"+source('9.4 External validity and next empirical steps')+"\n\n"+source('8.1 Earlier gateway co-observation result')
b['Project Impact']="""The completed impact is a reproducible technical benchmark and an inspectable project architecture. Potential future hospital value depends on measured deployment validity and cannot be established from synthetic F1 alone. The following subsections distinguish completed research contributions from intended operational benefits."""
b['Improved Contact Monitoring']="""The all-pair learned approach recovers synthetic sustained contacts that declared geometric rules can miss. Angular and ranging budgets improve several primary scores under matched assumptions. The study also exposes substantial false-session and missed-time burdens, preventing optimistic claims based on a single favorable score.

Potential hospital monitoring would require independently measured contact references, device and map calibration, and operational acceptance criteria. The current impact is evidence about an algorithmic comparison, not a demonstrated reduction in disease transmission."""
b['Reduced Data Transmission and Processing Load']="""The original modular edge architecture supports validation, deduplication, filtering, and aggregation before forwarding data. These are reasonable ways to avoid redundant representations. However, no new measured communication-reduction or hospital throughput claim is established by the final study.

The separate load experiment shows how a restrictive update schedule can defeat sustained reconstruction. Future optimization must preserve useful observation availability rather than treating maximum compression as the sole objective."""
b['Privacy-Preserving Monitoring']="""The companion identity architecture demonstrates separation between public pseudonyms and protected mappings. The main predictor also excludes personal identity and clinical source status. These design choices support information minimization but do not establish a complete privacy guarantee.

Real impact depends on properly managed identities, secrets, access, retention, and consent/governance requirements. The deterministic simulation generator cannot be used as a claim of cryptographic protection."""
b['Probabilistic Exposure Assessment']="""The completed probabilistic contribution is calibrated instantaneous proximity estimation with separately measured Brier and ECE outcomes. Reporting these alongside sessions makes uncertainty more visible than a binary display alone.

The outputs must not be promoted to biological exposure or infection probabilities. A later exposure model would need separate targets, relevant environmental and clinical information, and independently held-out empirical validation."""
b['Support for Infection-Control Decision Making']="""A validated future system could offer contact histories for human review as one source among institutional and clinical records. This project provides a technical foundation for studying whether such histories can be recovered reliably.

Its current false-contact burden and limited external validity mean it is not ready to automate infection-control actions. Decisions should not be justified by translating the synthetic classifier's score into a clinical risk category."""
b['Research and Technological Impact']="""The source, protocol, manuscript, and retained evidence are publicly inspectable. The release includes all 3,809 result files in 16 archives, with archive and member checksums. Saved-artifact verification independently checks 826,560 physical labels and 6,468 detector evaluations.

Negative evidence remains identifiable: the original gateway reconstruction performed poorly, the learned Markov extension lowered primary F1 in every modality, and the PBR/RTT gate did not improve the main PBR comparison. Preserving these outcomes improves the project's research value.

The contribution can support hardware-informed follow-up studies. It does not claim all algorithms were trained or that the software has been fully validated for hospital deployment."""
b['Mapped SDGs']="""The United Nations defines SDG 3 around health and well-being, SDG 9 around infrastructure and innovation, and SDG 16 around accountable institutions [18]. The mapping below is a statement of possible research alignment, not a measured contribution to a national indicator.

@@TABLE:sdg@@

The project aligns most directly with reproducible sensing/inference research and responsible interpretation. Claims about health impact or institutional privacy must remain conditional on subsequent empirical validation. Unrelated cultural/dance material from the old template is excluded because it does not describe this project."""
b['Conclusion']=source('11 Conclusion')+"""\n\nThe college project retains its original hospital-monitoring motivation and companion edge/privacy/dashboard modules, while the main experimental report now rests on the frozen trained contact comparison. Organizational cleanup, implementation checks, numerical reproduction, and scientific validity are separate achievements. Passing tests and compiling this report do not establish clinical effectiveness."""
b['Limitations']=source('9.2 Construct and channel validity')+"\n\n"+source('9.3 Internal and statistical validity')+"\n\n"+source('9.4 External validity and next empirical steps')
b['Future Scope']="""Future work should test clear hypotheses rather than add advanced method names without evidence. The priorities below connect the simulator's limitations to measurable next steps. They are planned extensions, not already completed experiments."""
b['Physical Hardware Implementation']="""Collect synchronized radio observations from compatible BLE direction-finding/channel-sounding or UWB devices. Establish independent distance/contact references, measure device-specific biases, and validate timestamp units and phase conventions. Record wearable power, procedure duration, packet availability, and charging/cleaning requirements.

Do not substitute generic BLE compatibility for the capabilities required by AoA or PBR/RTT. Hardware selection must follow the implemented measurement needs and a comparable complete-system cost study."""
b['Realistic Hospital Environment Testing']="""Use independently designed maps, locations, movement routines, and participants after appropriate permissions. Separate people, devices, days, or sites across development and final test. Include walls, doorways, body orientation, near-threshold encounters, short visits, and missing packets.

Fit channel assumptions only on development measurements and freeze them before evaluating untouched recordings. Test whether the observed learning gains survive physical model mismatch."""
b['Advanced Proximity Estimation']="""Investigate improved range/angle fusion, bias-aware localization, measurement uncertainty, and resource-aware observation policies. A robust weighted fusion estimator differs from the current PBR/RTT consistency gate and must receive its own protocol and new results.

Sequence models or learned localization could be compared when sufficient independent data supports them. Current negative Markov findings show that extra temporal complexity is not automatically beneficial. Maintain strong tuned rules and publish ablation and adverse outcomes."""
b['Enhanced Exposure-Risk Modelling']="""Define an independently justified exposure construct before fitting a clinical or epidemiological model. Relevant information might include environmental conditions and protective measures, but must be collected, governed, and evaluated separately from geometric contact labels.

Do not relabel proximity probabilities as infection risk. Any such extension needs suitable outcomes, calibration, held-out validation, and ethical/institutional oversight."""
b['Advanced Privacy and Security']="""Evaluate contact continuity under rotating identifiers together with the learned pipeline. Replace simulation-only authorization assumptions with authenticated principals and secure registry/key management. Test behavioral linkage, compromise scenarios, transport security, access auditing, and retention controls.

Keep a declared threat model and report what each attack evaluation covers. Neither identifier rotation nor a single collision test establishes complete anonymity."""
b['Large-Scale and Real-Time Deployment']="""Extend beyond eight moving tags with physical crowd trajectories, multiple maps, and procedure-specific scheduling/airtime. Measure full sensing-to-server latency and resource use on intended hardware. Compare observation-triggered scheduling, parallel service, and alternative architectures without borrowing capacity claims from the current four-slot fixture.

Evaluate session quality at load alongside cost and battery consumption. The completed v7 comparison has not trained or tested the detectors on 32/128-client moving crowds."""
b['Clinical and Epidemiological Validation']="""Any study relating recorded contacts to biological outcomes requires independent clinical/epidemiological evidence and the relevant approvals. Geometric truth is useful for evaluating sensing but is not a clinical gold standard for infection.

A prospective study should preserve the separation between sensing validity, exposure interpretation, and outcome prediction. Real-world claims must specify participants, settings, uncertainty, and limitations rather than generalizing directly from synthetic seeds."""
b['Integration with Hospital Information Systems']="""A future integration could associate reviewed contact records with authorized institutional information through controlled interfaces. It would need role-based access, secure identity continuity, audit trails, clear retention rules, and a workflow for reviewing false alarms and missing evidence.

The completed reproducibility package is available at https://github.com/ayyananwar/MDR-SIM, with retained evidence in the research-v7-2026-10-06 release. A permanent archive DOI and author-agreed redistribution license have not yet been assigned. The source and report provide a foundation for further technical validation, not a ready clinical service."""

# Standalone bibliography and TikZ figures replace missing external dependencies.
eq={
1:r'y_{ij}(t)=\mathbf{1}\{\lVert z_i(t)-z_j(t)\rVert_2\leq 2\,\mathrm{m}\}\,\mathbf{1}\{r(z_i(t))=r(z_j(t))\}',
2:r'R_{ig}(t)=-50-25\log_{10}(\max\{0.1,d_{ig}(t)\})+6u_{ig}(t)+\beta_i-LW_{ig}(t)',
3:r'\begin{aligned}\phi_k=\operatorname{wrap}\bigl[2\arg\{&\exp(j2\pi f_kd/c)\\&+\alpha\exp(j[2\pi f_k(d+\ell)/c+0.7])\}+\phi_0+\eta_k\bigr]\end{aligned}',
4:r'\widehat d_{\mathrm{PBR}}=\frac{c s_\phi}{4\pi},\qquad c=299\,792\,458\ \mathrm{m/s}',
5:r'\widehat d_{\mathrm{RTT}}=\frac{c}{2}(T_{\mathrm{elapsed}}-T_{\mathrm{turnaround}})',
6:r'\widehat T_{\mathrm{ToF}}=\frac{R_AR_B-D_AD_B}{R_A+R_B+D_A+D_B},\qquad \widehat d_{\mathrm{UWB}}=c\widehat T_{\mathrm{ToF}}',
7:r'p(t)=\sigma\!\left(a\log\frac{q(t)}{1-q(t)}+b\right),\qquad \sigma(v)=\frac{1}{1+\exp(-v)}',
8:r'b(t)=e(t)\,\mathbf{1}\!\left\{\sum_{u=t-9}^{t}e(u)\mathbf{1}[p(u)\geq\tau]\geq7\right\},\quad t\geq9',
9:r's(t)=\sigma\!\left(\operatorname{logit}[s^-(t)]+\operatorname{logit}[p(t)]-\operatorname{logit}[\pi_{\mathrm{cal}}]\right)',
10:r'\mathrm{Precision}=\frac{TP}{TP+FP},\qquad\mathrm{Recall}=\frac{TP}{TP+FN},\qquad F_1=\frac{2TP}{2TP+FP+FN}',
11:r'\begin{aligned}C_{\mathrm{total}}={}&NC_{\mathrm{tag}}+AC_{\mathrm{anchor}}+C_{\mathrm{backhaul}}\\&+C_{\mathrm{calibration}}+C_{\mathrm{spares}}+C_{\mathrm{operations}}+C_{\mathrm{maintenance}}\end{aligned}'
}

def esc(s):
    s=str(s).replace('\n',' ')
    s=s.translate(str.maketrans({'−':'-','–':'--','—':'---','≤':'<=','≥':'>=','×':' x ','°':' degrees','π':'pi','ρ':'rho','σ':'sigma','β':'beta','φ':'phi','η':'eta','ℓ':'ell','ᵢ':'i','ⱼ':'j','ₖ':'k','₀':'0','₁':'1','₂':'2','²':' squared','⁻':'-','⁶':'6','⁵':'5','³':'3','α':'alpha','τ':'tau','∈':' in ','“':'``','”':"''",'’':"'",'…':'...','√':'sqrt','ε':'epsilon'}))
    return ''.join({'\\':r'\textbackslash{}','&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','~':r'\textasciitilde{}','^':r'\textasciicircum{}'}.get(c,c) for c in s)

def table(key):
    t=tables[key];n=len(t['headers']);widths=[(.88 if n>=6 else .94)/n]*n
    if key=='features':widths=[.045,.28,.52,.095]
    if n==3:widths=[.20,.40,.34]
    if key=='models':widths=[.18,.30,.46]
    if key=='channel':widths=[.43,.25,.26]
    spec=''.join(r'>{\raggedright\arraybackslash}p{'+f'{w:.3f}\\linewidth'+'}' for w in widths)
    caption=re.sub(r'^Table \d+ ','',t['caption'])
    body='\\begingroup\n\\small\\setstretch{1.05}\\setlength{\\tabcolsep}{3pt}\n'
    body+='\\begin{longtable}{'+spec+'}\n\\caption{'+esc(caption)+r'}\label{tab:'+key+r'}\\'+'\n\\toprule\n'
    header=' & '.join(r'\textbf{'+esc(h)+'}' for h in t['headers'])+r'\\'+'\n\\midrule\n'
    body+=header+'\\endfirsthead\n\\toprule\n'+header+'\\endhead\n\\bottomrule\n\\endfoot\n'
    def cell(v):
        value=esc(v)
        value=re.sub(r'(?<=[a-z])(?=[A-Z])',lambda m:r'\allowbreak{}',value)
        return value.replace('/',r'/\allowbreak{}')
    body+='\n'.join(' & '.join(cell(v) for v in row)+r'\\' for row in t['rows'])
    return body+'\n\\end{longtable}\n\\endgroup\n'

tables['requirements']={'caption':'Functional requirements and evidence status','headers':['Requirement','Implemented mechanism','Evidence / limit'],'rows':[
['Independent reference','Hidden geometry creates labels and qualified sessions','826,560 labels independently checked'],
['Observable inference','Modality-restricted causal features','Architecture and symmetry checks'],
['Grouped development','Disjoint training/calibration/validation seeds','Frozen selection manifests'],
['Held-out reconstruction','Probabilities, decisions, sessions, and metrics','6,468 detector evaluations checked'],
['Recoverable evidence','Archives, file manifests, SHA-256 restorer','3,809 retained result files'],
['Hospital operation','Design motivation and demonstration','No hardware/clinical deployment validation']]}
tables['files']={'caption':'Implementation modules and responsibilities','headers':['Module','Location','Responsibility'],'rows':[
['Protocol and movement','research/ml-v7/protocol.mjs; scenarios.mjs','Partitions, assumptions, trajectories'],
['Features','research/ml-v7/features.mjs','Symmetric observable input'],
['Observation generation','research/contact-v5; research/ranging-v6','RSSI, bearing, phase, and timing'],
['Training','research/ml-v7/train.py','Fitting, calibration, selection'],
['Decoding and metrics','research/ml-v7/metrics.py','Frames, sessions, matching, metrics'],
['Verification','research/ml-v7/verify.py; final_audit.py','Independent saved-artifact checks'],
['Deployment demo','src/; public/','Retained React interface'],
['Evidence recovery','scripts/restoreResearchEvidence.py','Verified archive restoration']]}
tables['privacy']={'caption':'Privacy evidence boundaries','headers':['Property','Current evidence','Not established'],'rows':[
['Predictor minimization','Identity/clinical status/hidden truth excluded from v7 X','Anonymity of a deployed system'],
['Pseudonym generation','HMAC and simulation-grade modes in historical source','Production key-management security'],
['Authorized resolution','Registry interface with authorization context','Audited authenticated hospital service'],
['Linkability evaluation','Historical attacker-model modules retained','Resistance to all re-identification'],
['Joint rotation/contact inference','Not part of final learned benchmark','Utility under real rotating devices']]}
tables['sdg']={'caption':'Project alignment with Sustainable Development Goals','headers':['SDG','Goal','Research alignment and qualification'],'rows':[
['3','Good Health and Well-Being','Potential foundation for contact-history research; no measured clinical impact.'],
['9','Industry, Innovation and Infrastructure','Reproducible sensing, estimation, and learning benchmark; no deployed infrastructure claim.'],
['16','Peace, Justice and Strong Institutions','Information-minimization and governance-oriented design; no complete privacy/security guarantee.']]}

def diagram(key):
    captions={'architecture':'Research architecture and hidden/observable information separation','highlevel':'High-level component design; the demonstration and privacy companion are separate','usecase':'Use-case view of implemented research activities','dfd0':'Data-flow context diagram','dfd1':'Expanded observable research data flow','classes':'Actual classes and functional modules in the research pipeline','sequence':'Causal observation-to-session sequence with post-prediction evaluation','floorplan':'Public two-room geometry and anchor coordinates','output':'Research-output view of frozen aggregate outcomes; not an application screenshot','generalization':'Selected primary and unseen-motion F1 on the same map','paired-effects':'Exploratory paired selected-ML minus tuned-rule F1 intervals'}
    if key=='floorplan':
        code=r'''\begin{tikzpicture}[x=.23cm,y=.23cm, font=\small]
\draw[thick] (0,0) rectangle (24,20);
\draw[very thick] (12,0)--(12,9);\draw[very thick] (12,11)--(12,20);
\node at (6,10){Room 1};\node at (18,10){Room 2};
\node[below] at (12,9){Doorway};
\foreach \x/\y/\lab in {2/2/g0,22/2/g1,22/18/g2,2/18/g3}{\fill[blue] (\x,\y) circle (.25);\node[above] at (\x,\y){\lab};}
\draw[<->] (0,-2)--node[below]{24 m}(24,-2);\draw[<->] (-2,0)--node[left]{20 m}(-2,20);
\end{tikzpicture}'''
    elif key in ['generalization','paired-effects','output']:
        primary=[.445,.571,.704,.690,.561,.664,.763];external=[.290,.446,.647,.663,.537,.667,.751];rule=[0,.392,.579,.575,.485,.547,.729]
        def coords(vals):return ' '.join(f'({i+1},{v})' for i,v in enumerate(vals))
        axes=r'width=.96\linewidth,height=7cm,xmin=.5,xmax=7.5,xtick={1,2,3,4,5,6,7},xticklabels={RSSI,AoA2,AoA4,PBR,RTT,PBR/RTT,UWB},xticklabel style={font=\small,rotate=25,anchor=east},grid=major,ylabel={Contact F1},ymin=0,ymax=1,legend style={font=\small,at={(.5,1.04)},anchor=south,legend columns=2}'
        if key=='paired-effects':
            axes=axes.replace('Contact F1','ML minus rule F1').replace('ymin=0,ymax=1','ymin=-.05,ymax=.55')
            means=[.445,.179,.125,.115,.076,.117,.034];lo=[.403,.122,.083,.063,.020,.060,-.009];hi=[.488,.236,.171,.168,.128,.172,.082]
            code=r'\begin{tikzpicture}\begin{axis}['+axes+']\n'
            code+=r'\addplot[only marks,mark=*,blue] coordinates {'+coords(means)+r'};\addlegendentry{Paired effect}'+'\n'
            for i in range(7):code+=r'\addplot[blue,thick,forget plot] coordinates {'+f'({i+1},{lo[i]}) ({i+1},{hi[i]})'+r'};'+'\n'
            code+=r'\addplot[dashed,black,forget plot] coordinates {(.5,0)(7.5,0)};'
        else:
            code=r'\begin{tikzpicture}\begin{axis}['+axes+']\n'
            code+=r'\addplot[blue,thick,mark=*] coordinates {'+coords(primary)+r'};\addlegendentry{Selected primary ML}'+'\n'
            code+=r'\addplot[orange,thick,mark=square*] coordinates {'+coords(external if key=='generalization' else rule)+r'};\addlegendentry{'+('Unseen motion' if key=='generalization' else 'Validation-tuned rule')+'}\n'
        code+=r'\end{axis}\end{tikzpicture}'
    elif key=='usecase':
        code=r'''\begin{tikzpicture}[font=\small,>=Stealth,
uc/.style={ellipse,draw,fill=blue!5,align=center,text width=4.5cm,minimum height=.8cm}]
\draw[rounded corners] (0,.8) rectangle (9,-6.5);
\node at (4.5,.45){Contact reconstruction research workflow};
\node[uc] (gen) at (4.5,-.7){Generate matched partitions};
\node[uc] (fit) at (4.5,-2){Fit, calibrate, validate};
\node[uc] (test) at (4.5,-3.3){Freeze and evaluate};
\node[uc] (check) at (4.5,-4.6){Verify and restore evidence};
\node[uc] (report) at (4.5,-5.8){Inspect results and limitations};
\node[align=center] (researcher) at (-1.4,-1.5){Researcher};
\node[align=center] (developer) at (-1.4,-4.5){Developer};
\node[align=center] (reviewer) at (10.4,-4){Reviewer};
\draw (researcher)--(gen);\draw (researcher)--(fit);\draw (researcher)--(test);
\draw (developer)--(check);\draw (reviewer)--(check);\draw (reviewer)--(report);
\end{tikzpicture}'''
    elif key=='dfd0':
        code=r'''\begin{tikzpicture}[font=\small,>=Stealth,
box/.style={draw,align=center,text width=3.2cm,minimum height=.8cm},
process/.style={draw,rounded corners,fill=blue!5,align=center,text width=4cm,minimum height=2cm}]
\node[box] (protocol) at (0,0){Declared protocol};
\node[box] (obs) at (0,-2){Synthetic observations};
\node[box] (reference) at (0,-4){Independent reference};
\node[process] (system) at (5,-2){Research\\contact-reconstruction\\and evaluation system};
\node[box] (contacts) at (10,0){Predicted sessions};
\node[box] (metrics) at (10,-2){Metrics and contrasts};
\node[box] (evidence) at (10,-4){Reproducibility artifacts};
\draw[->] (protocol)--(system);\draw[->] (obs)--(system);
\draw[->,dashed] (reference)--node[below,font=\footnotesize]{evaluation only}(system);
\draw[->] (system)--(contacts);\draw[->] (system)--(metrics);\draw[->] (system)--(evidence);
\end{tikzpicture}'''
    elif key=='highlevel':
        code=r'''\begin{tikzpicture}[font=\small,>=Stealth,
box/.style={draw,rounded corners,fill=blue!5,align=center,text width=5.2cm,minimum height=.85cm}]
\node[box] (obs) at (0,0){Wearable / radio simulation};
\node[box] (infer) at (6.6,0){Causal filtering and localization};
\node[box] (feat) at (0,-1.6){Tracking and pair features};
\node[box] (ml) at (6.6,-1.6){Learned proximity and calibration};
\node[box] (session) at (0,-3.2){Temporal contact reconstruction};
\node[box] (eval) at (6.6,-3.2){Independent evaluation / artifact store};
\node[box,fill=gray!8] (privacy) at (0,-5){Historical privacy companion};
\node[box,fill=gray!8] (ui) at (6.6,-5){Retained demonstration dashboard};
\draw[->] (obs)--(infer);\draw[->] (infer)--(feat);\draw[->] (feat)--(ml);
\draw[->] (ml)--(session);\draw[->] (session)--(eval);
\draw[dashed] (-2.9,-4.2)--(9.5,-4.2);
\node[font=\footnotesize,align=center,text width=12cm] at (3.3,-6.3){Companion privacy/UI modules do not supply hidden labels or clinical outcomes to the main learned benchmark.};
\end{tikzpicture}'''
    elif key in ['architecture','dfd1']:
        code=r'''\begin{tikzpicture}[font=\small,>=Stealth,
box/.style={draw,rounded corners,fill=blue!5,align=center,text width=4.6cm,minimum height=.8cm},
store/.style={draw,fill=orange!8,align=center,text width=4.6cm,minimum height=.8cm}]
\node[store] (truth) at (0,0){Hidden motion / reference store};
\node[box] (obs) at (6.6,0){Allowed noisy radio observations};
\node[box] (estimate) at (6.6,-1.5){Causal estimation and tracking};
\node[box] (features) at (6.6,-3){29 observable pair features};
\node[box] (predict) at (6.6,-4.5){Saved classifier and calibrator};
\node[box] (sessions) at (6.6,-6){Temporal decisions and sessions};
\node[box] (evaluate) at (0,-6){Independent event / frame evaluation};
\node[store] (models) at (0,-3){Development fitting and model store};
\draw[->] (truth)--node[above,font=\footnotesize]{sensor generation}(obs);
\draw[->] (obs)--(estimate);\draw[->] (estimate)--(features);
\draw[->] (features)--(predict);\draw[->] (predict)--(sessions);
\draw[->] (sessions)--(evaluate);
\draw[->] (truth)--node[left,font=\footnotesize]{labels}(models);
\draw[->] (models)--node[above,font=\footnotesize]{frozen bundle}(predict);
\draw[->,dashed] (truth.west) -- ++(-.65,0) |- node[pos=.65,left,font=\footnotesize]{reference}(evaluate.west);
\node[align=center,text width=12cm,font=\footnotesize] at (3.3,-7.25){Hidden truth does not enter held-out inference features. Fitting consumes development labels; evaluation consumes reference after prediction.};
\end{tikzpicture}'''
    elif key=='classes':
        code=r'''\begin{tikzpicture}[font=\small,>=Stealth,
box/.style={draw,rectangle,align=left,text width=5.4cm,minimum height=1.6cm}]
\node[box] (filter) at (0,0){\textbf{CausalMeasurements}\\measurement histories\\update(t, observations)};
\node[box] (tracker) at (6.6,0){\textbf{CausalTracker}\\position / velocity state\\update(t, id, estimate)};
\node[box] (features) at (0,-2.5){\textbf{FeatureBuilder}\\telemetry; pairHistory\\update(t, ble, positions, ranges, diagnostics)};
\node[box] (models) at (6.6,-2.5){\textbf{model.py: functional module}\\saved classifier / calibrator\\probability(bundle, features)};
\node[box] (metrics) at (3.3,-5){\textbf{metrics.py: functional module}\\decode; sessions; event\_metrics\\frame\_metrics; hmm\_filter};
\draw[->] (filter)--node[above,font=\footnotesize]{localization}(tracker);
\draw[->] (filter)--(features);\draw[->] (tracker)--(features);
\draw[->] (features)--node[above,font=\footnotesize]{features}(models);
\draw[->] (models)--(metrics);
\end{tikzpicture}'''
    elif key=='sequence':
        code=r'''\begin{tikzpicture}[font=\footnotesize,>=Stealth]
\foreach \x/\name in {0/Observations,3/Estimator,6/Features,9/Model,12/Decoder}{
\node[draw,fill=blue!5,align=center,minimum width=2.2cm,minimum height=.6cm] at (\x,0){\name};
\draw[dashed] (\x,-.35)--(\x,-6.7);}
\draw[->] (0,-1)--node[above]{current sample}(3,-1);
\draw[->] (3,-2)--node[above]{tracked positions}(6,-2);
\draw[->] (6,-3)--node[above]{29 observable values}(9,-3);
\draw[->] (9,-4)--node[above]{calibrated probability}(12,-4);
\draw[->] (12,-4.8)--(12.5,-4.8)--node[right,align=left]{causal window\\and run history}(12.5,-5.7)--(12,-5.7);
\node[align=center,text width=12cm] at (6,-7.3){A qualified run is confirmed after 30 elapsed seconds. Final boundaries and reference matching are assembled after the sequence.};
\end{tikzpicture}'''
    else:
        setups={
        'architecture':(['Hidden motion','Noisy observations','Causal estimation','Observable features','Calibrated classifier','Temporal sessions'],['Reference labels stored separately','Evaluation compares sessions after inference']),
        'highlevel':(['Observation generator','Filtering/localization','CausalTracker','FeatureBuilder','Python model bundle','Decoder/evaluator'],['Privacy companion: separate historical module','React demonstration: separate presentation']),
        'usecase':(['Researcher','Generate partitions','Fit / calibrate / select','Freeze and test','Verify evidence','Publish reproducible outcomes'],['Developer maintains code boundaries','Reviewer checks claims and provenance']),
        'dfd0':(['Fixed protocol','Synthetic observations','Reconstruction system','Predicted contacts','Independent reference','Evaluation outputs'],['Reference enters evaluation only','Researcher interprets conditional findings']),
        'dfd1':(['Motion and sensors','Raw observation store','Causal features','Fitted model store','Held-out predictions','Metrics and contrasts'],['Label store: fitting and evaluation only','Manifests bind inputs, source, and outputs']),
        'classes':(['CausalMeasurements','CausalTracker','FeatureBuilder','model.py (functions)','metrics.py (functions)','verify.py (functions)'],['Classes own measurement / movement / pair histories','Python modules fit, predict, decode, and verify']),
        'sequence':(['Receive current sample','Update causal history','Localize and track','Build eligible features','Predict and decode','Confirm qualified run'],['Continue until end boundary becomes known','Compare with independent reference afterward'])}
        labels,notes=setups[key]
        code=r'\begin{tikzpicture}[box/.style={draw,rounded corners,fill=blue!5,align=center,text width=5.4cm,minimum height=.85cm,font=\small},>=Stealth]'+'\n'
        for i,label in enumerate(labels):
            col=i%2;row=i//2
            code+=r'\node[box] (n'+str(i)+') at ('+str(col*6.6)+','+str(-row*1.65)+'){'+esc(label)+'};\n'
        for i in range(5):code+=r'\draw[->,thick] (n'+str(i)+') -- (n'+str(i+1)+');\n'
        for i,note in enumerate(notes):code+=r'\node[align=center,font=\footnotesize,text width=12cm] at (3.3,'+str(-5.0-i*.6)+'){'+esc(note)+'};\n'
        code+=r'\end{tikzpicture}'
    return '\n\\begin{figure}[htbp]\n\\centering\n'+code+'\n\\caption{'+esc(captions[key])+r'}\label{fig:'+key+'}\n\\end{figure}\n'

repro=r'''\subsubsection*{Fresh-run reproduction workflow}
The commands below are run from the project root. Use fresh output directories and do not generate held-out data until training completes and selection.json says frozen-before-test.
\begin{lstlisting}[language={},caption={Development generation and frozen training}]
python -m venv .research-venv
.\.research-venv\Scripts\python.exe -m pip install -r research/ml-v7/requirements.txt
node research/ml-v7/generate.mjs train results/ml-v7-replay-data/train
node research/ml-v7/generate.mjs validation results/ml-v7-replay-data/validation
node research/ml-v7/generate.mjs calibration results/ml-v7-replay-data/calibration
.\.research-venv\Scripts\python.exe research/ml-v7/train.py results/ml-v7-replay-data results/ml-v7-replay-models
\end{lstlisting}
\begin{lstlisting}[language={},caption={Held-out evaluation and verification}]
node research/ml-v7/generate.mjs test results/ml-v7-replay-data/test
node research/ml-v7/generate.mjs external results/ml-v7-replay-data/external
.\.research-venv\Scripts\python.exe research/ml-v7/evaluate.py results/ml-v7-replay-data results/ml-v7-replay-models results/ml-v7-replay-evaluation
.\.research-venv\Scripts\python.exe research/ml-v7/verify.py results/ml-v7-replay-data results/ml-v7-replay-models results/ml-v7-replay-evaluation
.\.research-venv\Scripts\python.exe research/ml-v7/report.py results/ml-v7-replay-models results/ml-v7-replay-evaluation results/ml-v7-replay-report --data results/ml-v7-replay-data
\end{lstlisting}
The source and exact workflow are public at \url{https://github.com/ayyananwar/MDR-SIM}. Retained results are distributed at \url{https://github.com/ayyananwar/MDR-SIM/releases/tag/research-v7-2026-10-06}. Download the 16 archives and use scripts/restoreResearchEvidence.py as documented in REPRODUCIBILITY\_RELEASE.md. Archive/member SHA-256 verification protects bytes and provenance, not scientific realism.

Independent saved-artifact checks reconstruct 826,560 physical pair-frame labels and 6,468 detector evaluations. Supplementary checks cover feature availability, probability metrics, 462 grouped summary rows, 140 paired intervals, and manuscript tables. These checks are not a second complete independent training replay.
'''

def paragraph(text):
    # Preserve inline citations and emphasis without importing raw user commands.
    tokens={}
    table_keys=['budgets','channel','models','partitions','primary','families','conditions','ablations','quality','service','features','selections']
    def crossref(m):
        key=f'ZZTOKEN{len(tokens)}ZZ';tokens[key]='Table~'+r'\ref{tab:'+table_keys[int(m.group(1))-1]+'}';return key
    text=re.sub(r'Table (1[0-2]|[1-9])\b',crossref,text)
    fig_keys=['floorplan','paired-effects','generalization']
    def figure_ref(m):
        key=f'ZZTOKEN{len(tokens)}ZZ';tokens[key]='Figure~'+r'\ref{fig:'+fig_keys[int(m.group(1))-1]+'}';return key
    text=re.sub(r'Figure ([1-3])\b',figure_ref,text)
    text=text.replace('Appendix A defines every column and its units.','The feature-schema table defines every column and its units.')
    text=text.replace('Section 8','the supporting-results section')
    def protect(m):
        key=f'ZZTOKEN{len(tokens)}ZZ';tokens[key]=r'\cite{ref'+m.group(1)+'}';return key
    text=re.sub(r'\[(\d+)\]',protect,text)
    text=esc(text)
    def url(m):
        raw=m.group(0);clean=raw.rstrip('.,;')
        return r'\url{'+clean.replace(r'\_','_')+'}'+raw[len(clean):]
    text=re.sub(r'https://[^\s]+',url,text)
    for k,v in tokens.items():text=text.replace(k,v)
    text=re.sub(r'\*\*([^*]+)\*\*',r'\textbf{\1}',text)
    return text

def convert(text):
    chunks=[]
    for block in re.split(r'\n\s*\n',text.strip()):
        block=block.strip()
        if block.startswith('@@TABLE:'):chunks.append(table(block.split(':',1)[1].split('@@')[0]));continue
        if block.startswith('@@EQUATION:'):
            num=int(block.rsplit('|',1)[1].split('@@')[0]);chunks.append('\\begin{equation}\n'+eq[num]+'\n\\label{eq:source'+str(num)+'}\n\\end{equation}');continue
        if block.startswith('@@FIGURE:'):
            key=block.split(':',1)[1].split('.png')[0]
            if key!='reliability':chunks.append(diagram(key))
            else:chunks.append(paragraph('Probability reliability is summarized by the retained Brier/ECE table. The original scientific plots remain in the research artifacts; no infection-calibration inference is drawn from them.'))
            continue
        if block.startswith('@@FIG:'):chunks.append(diagram(block.split(':',1)[1].split('@@')[0]));continue
        if block.startswith('@@SCREEN:'):
            name,caption=block.split(':',1)[1].split('@@')[0].split('|',1)
            chunks.append(r'\begin{figure}[p]\centering\includegraphics[width=\linewidth,height=.74\textheight,keepaspectratio]{'+name+'.jpg}'+r'\caption{'+esc(caption)+r'}\label{fig:screen-'+name+r'}\end{figure}')
            continue
        if block=='@@REPRO@@':chunks.append(repro);continue
        if block.startswith('### '):chunks.append(r'\subsubsection*{'+esc(block.split('\n')[0][4:])+'}\n'+convert('\n'.join(block.splitlines()[1:])));continue
        if re.match(r'^\d+\. ',block):
            chunks.append('\\begin{enumerate}\n'+'\n'.join(r'\item '+paragraph(re.sub(r'^\d+\. ','',line)) for line in block.splitlines())+'\n\\end{enumerate}');continue
        chunks.append(paragraph(block))
    return '\n\n'.join(chunks)+'\n'

preamble=r'''\documentclass[12pt,a4paper]{report}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath,amsfonts,amssymb,setspace,graphicx,array,fancyhdr,geometry,booktabs,float,longtable,tabularx}
\usepackage[table]{xcolor}
\usepackage{tikz,pgfplots,listings,url,hyperref}
\usetikzlibrary{arrows.meta,positioning,shapes.geometric}
\pgfplotsset{compat=1.18}
\geometry{a4paper,left=1.25in,right=.75in,top=.75in,bottom=.75in}
\setlength{\headheight}{15pt}
\setlength{\emergencystretch}{3em}
\hypersetup{hidelinks,pdftitle={Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study},pdfauthor={Arjun KV, Ayyan Anwar, Md Aasim Shaibani, Nabil Ahmad Khan}}
\urlstyle{same}
\graphicspath{{assets/logos/}{assets/screenshots/}}
\lstset{basicstyle=\ttfamily\footnotesize,breaklines=true,breakatwhitespace=false,columns=fullflexible,frame=single,keepspaces=true}
\linespread{1.4}
\newcommand{\projecttitle}{Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study}
\newcommand{\collegeheading}{\begin{center}{\LARGE\bfseries SAHYADRI}\par\vspace{5pt}{\Large\bfseries College of Engineering \& Management}\par\vspace{3pt}{\large Adyar, Mangaluru -- 575 007}\par\vspace{14pt}{\large\bfseries Department of Computer Science \& Engineering}\par\vspace{6pt}\includegraphics[height=.85in]{sahyadri.png}\end{center}}
\begin{document}
\pagestyle{empty}
\begin{titlepage}
\begin{center}
{\large\bfseries VISVESVARAYA TECHNOLOGICAL UNIVERSITY}\par
{\large\bfseries ``JNANA SANGAMA'', BELAGAVI -- 590 018}\par
\vspace{6pt}\includegraphics[height=.7in]{vtu.jpg}\par\vspace{6pt}
{\Large\bfseries PROJECT PHASE II REPORT}\par
\vspace{4pt}on\par\vspace{7pt}
{\large\bfseries ``\projecttitle''}\par
\vspace{8pt}
{\small Simulation-Based Study of Sustained Contacts Using RSSI, Angular Measurements, and Ranging}\par
\vspace{12pt}\textit{Submitted by}\par\vspace{8pt}
\begin{tabular}{lr}
\textbf{Arjun KV}&\textbf{4SF23CS032}\\
\textbf{Ayyan Anwar}&\textbf{4SF23CS042}\\
\textbf{Md Aasim Shaibani}&\textbf{4SF23CS103}\\
\textbf{Nabil Ahmad Khan}&\textbf{4SF23CS123}
\end{tabular}\par
\vspace{12pt}
\textit{In partial fulfillment of the requirements for the VII semester}\par
\textbf{BACHELOR OF ENGINEERING}\par in\par
\textbf{COMPUTER SCIENCE \& ENGINEERING}\par
\vspace{10pt}\textit{Under the Guidance of}\par
\textbf{Ms. Alakananda K}\par
{\small Assistant Professor, Department of CSE}\par
\vspace{8pt}\includegraphics[height=.65in]{sahyadri.png}\par
\vspace{5pt}{\Large\bfseries SAHYADRI}\par
{\large\bfseries College of Engineering \& Management}\par
{\large An Autonomous Institution}\par
{\large MANGALURU}\par
\vspace{8pt}{\large\bfseries 2026 -- 27}
\end{center}
\end{titlepage}
\collegeheading
\begin{center}\vspace{8pt}{\Large\bfseries CERTIFICATE}\end{center}
\setstretch{1.5}
\noindent This is to certify that the Project Phase II work entitled \textbf{``\projecttitle''} has been carried out by \textbf{Arjun KV (4SF23CS032), Ayyan Anwar (4SF23CS042), Md Aasim Shaibani (4SF23CS103), and Nabil Ahmad Khan (4SF23CS123)}, bonafide students of Sahyadri College of Engineering and Management, under the guidance of \textbf{Ms. Alakananda K}, in partial fulfillment of the requirements for the VII semester of Bachelor of Engineering in Computer Science and Engineering of Visvesvaraya Technological University, Belagavi, during the academic year 2026--27.

\noindent The report documents the project architecture, implementation, and simulation-based experimental evaluation. Institutional endorsement and approval are recorded through the signatures below.
\vspace{.85in}
\setstretch{1.1}
\begin{center}\small
\begin{tabularx}{\textwidth}{>{\centering\arraybackslash}X >{\centering\arraybackslash}X >{\centering\arraybackslash}X}
\rule{.27\textwidth}{.4pt}&\rule{.27\textwidth}{.4pt}&\rule{.27\textwidth}{.4pt}\\[6pt]
\textbf{Project Guide}&\textbf{Project Coordinator}&\textbf{HOD}\\
Ms. Alakananda K&Dr. Poornima B V&Dr. Mustafa Basthikodi\\
Assistant Professor&Associate Professor&Professor \& Head\\
Dept. of CSE&Dept. of CSE&Dept. of CSE
\end{tabularx}\end{center}
\clearpage
\collegeheading
\begin{center}\vspace{8pt}{\Large\bfseries DECLARATION}\end{center}
\setstretch{1.5}
\noindent We hereby declare that the work embodied in this Project Phase II report entitled \textbf{``\projecttitle''} has been carried out by us at Sahyadri College of Engineering and Management, Mangaluru, under the supervision of \textbf{Ms. Alakananda K}, in partial fulfillment of the requirements for the VII semester of Bachelor of Engineering in Computer Science and Engineering.

\noindent This report has not been submitted to this or any other university for the award of another degree. The implementation, references, experimental assumptions, and limitations are identified in the report. The results are synthetic contact-reconstruction outcomes and do not constitute clinical or hospital hardware validation.
\vspace{.4in}
\begin{flushleft}
\textbf{Arjun KV (4SF23CS032)}\\[12pt]
\textbf{Ayyan Anwar (4SF23CS042)}\\[12pt]
\textbf{Md Aasim Shaibani (4SF23CS103)}\\[12pt]
\textbf{Nabil Ahmad Khan (4SF23CS123)}\\[12pt]
Dept. of CSE, SCEM, Mangaluru
\end{flushleft}
\clearpage
\pagestyle{plain}\pagenumbering{roman}
'''
abstract=source('Abstract')
ack="""We express our sincere gratitude to our guide, Ms. Alakananda K, Assistant Professor, Department of Computer Science and Engineering, for her guidance and support throughout this project.

We thank Dr. Poornima B V and Dr. Deepti Rai, Project Coordinators, and Dr. Mustafa Basthikodi, Professor and Head of the Department of Computer Science and Engineering, for their encouragement and departmental support. We also thank Dr. S. S. Injaganeri, Principal, Sahyadri College of Engineering and Management.

We acknowledge the published research, technical documentation, and open-source software cited in this report. Their contributions support the sensing models, learning implementations, and reproducibility workflow. Finally, we thank our families and friends for their encouragement during the work."""
body=preamble+r'\chapter*{Abstract}\addcontentsline{toc}{chapter}{Abstract}'+'\n'+convert(abstract)
body+=r'\noindent\textbf{Keywords:} contact reconstruction; BLE; RSSI; angle of arrival; phase-based ranging; RTT; UWB; probability calibration; reproducible simulation.'+'\n'
body+=r'\chapter*{Acknowledgement}\addcontentsline{toc}{chapter}{Acknowledgement}'+'\n'+convert(ack)
body+=r'''\begin{flushright}\textbf{Arjun KV (4SF23CS032)}\\\textbf{Ayyan Anwar (4SF23CS042)}\\\textbf{Md Aasim Shaibani (4SF23CS103)}\\\textbf{Nabil Ahmad Khan (4SF23CS123)}\end{flushright}
\setstretch{1.4}
\renewcommand{\contentsname}{Table of Contents}
\tableofcontents\addcontentsline{toc}{chapter}{Table of Contents}
\listoffigures\addcontentsline{toc}{chapter}{List of Figures}
\listoftables\addcontentsline{toc}{chapter}{List of Tables}
\clearpage\pagestyle{fancy}\fancyhf{}
\lhead{\fontsize{10}{12}\selectfont Sustained Contact Reconstruction}
\rhead{\fontsize{10}{12}\selectfont Chapter \thechapter}
\lfoot{\fontsize{8}{10}\selectfont Department of Computer Science and Engineering, SCEM, Mangaluru}
\rfoot{\fontsize{10}{12}\selectfont Page \thepage}
\renewcommand{\headrulewidth}{.5pt}\renewcommand{\footrulewidth}{.5pt}
\setstretch{1.5}\pagenumbering{arabic}
'''
for kind,title in headings:
    if kind=='chapter*':continue
    body+='\n\\'+kind+'{'+esc(title)+'}\n'
    if kind=='chapter':continue
    assert title in b,title
    body+=convert(b[title])
body+='\n\\clearpage\\pagestyle{plain}\n\\renewcommand{\\bibname}{References}\n\\phantomsection\\addcontentsline{toc}{chapter}{References}\n\\begin{thebibliography}{99}\n'
for ref in refs:
    value=re.sub(r'^\[\d+\]\s*','',ref['formatted'])
    body+=r'\bibitem{ref'+str(ref['number'])+'} '+paragraph(value)+'\n\n'
body+=r'''\bibitem{ref17} World Health Organization, \textit{WHO guidelines on tuberculosis infection prevention and control}, 2019. [Online]. Available: \url{https://www.who.int/publications/b/47487}. See also \url{https://www.who.int/news/item/31-08-2023-who-s-operational-handbook-on-tuberculosis-infection-prevention-and-control}. Accessed: Oct. 6, 2026.
\bibitem{ref18} United Nations, ``The 17 Goals,'' Department of Economic and Social Affairs. [Online]. Available: \url{https://sdgs.un.org/goals}. Accessed: Oct. 6, 2026.
\end{thebibliography}
\end{document}
'''
body=body.replace('turnaround of 106 ns','turnaround of \\(10^6\\) ns')
body=body.replace('5 x 105 and 7 x 105 ns','\\(5\\times10^5\\) and \\(7\\times10^5\\) ns')
body=body.replace('\\{10-6, 10-3\\}','\\(\\{10^{-6},10^{-3}\\}\\)')
body=body.replace('[10-6,1-10-6]','\\([10^{-6},1-10^{-6}]\\)')
body=re.sub(r'^Keywords:.*\n', '', body, flags=re.M)
assert '@@' not in body
assert all(ord(c)<128 for c in body),'Unmapped Unicode remains in generated TeX.'
tex=OUT/'MDR_SAFE_College_Report.tex';tex.write_text(body,encoding='utf-8')
actual=re.findall(r'\\(chapter\*?|section\*?|subsection\*?)\{([^}]+)\}',body)
assert actual==headings,(actual,headings)
report={'status':'passed','numberedChapters':sum(k=='chapter' for k,t in headings),'headingSequenceMatchesSuppliedTemplateExceptApprovedModuleRename':True,'headings':len(headings),'references':18,'externalLogoFiles':2,'sourceSha256':hashlib.sha256(tex.read_bytes()).hexdigest(),'templateSha256':hashlib.sha256(TEMPLATE.read_bytes()).hexdigest(),'researchSources':[{'file':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [ROOT/'paper/manuscript_content.md',ROOT/'paper/manuscript_tables.json',ROOT/'paper/references.json']],'scope':'Content/structure checks; compile and layout status recorded separately.'}
(OUT/'CONTENT_VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'file':str(tex),'bytes':tex.stat().st_size,'headings':len(headings),'chapters':8,'structure':'exact heading sequence retained'}))
