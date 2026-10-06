# BLE gateway contact-reconstruction simulation

**New to the project?** Read [the complete beginner's guide](docs/PROJECT_BEGINNER_GUIDE.md) for the system, terminology, formulas, all 29 features, learning/evaluation workflow, actual findings, limitations, and reproduction steps.

**Current full manuscript:** [read the detailed research paper](paper/Contact_Reconstruction_Research_Paper.md) or [download the editable Word document](paper/Contact_Reconstruction_Research_Paper.docx). See [the submission checklist](paper/SUBMISSION_CHECKLIST.md) for author and venue decisions. The main study is a simulation-only comparison of seven observation budgets and four calibrated classifier families; real hospital accuracy and procurement cost remain unmeasured.

**Research evidence distribution:** large `results/` artifacts are preserved locally and packaged separately from Git history. Follow [REPRODUCIBILITY_RELEASE.md](REPRODUCIBILITY_RELEASE.md) to restore checksum-verified release archives before running the saved-artifact verifiers. Generating a fresh run uses the commands below and does not require downloading prior results.

**Writing the extended paper:** start with [the manuscript sources and build workflow](paper/README.md) and [the final research review](docs/FINAL_RESEARCH_REVIEW.md). The main extended experiment is the trained v7 comparison. Older files named `MANUSCRIPT_FINAL.md` and `FINAL_EXPERIMENTAL_PROTOCOL.md` describe historical campaigns and contain superseded claims; their names do not make them the current paper authority.

Research code for **Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study**. The earlier gateway co-observation campaign remains identified separately. The simulation compares reconstructed gateway sessions with independently generated, hidden geometric reference contacts. Downstream models score the validity of surviving reconstructed records. These outputs are not infection probabilities or evidence of clinical effectiveness.

The React interface is retained as a separate demonstration. Its hospital/MDR-TB terminology and live heuristics should not be used as the paper's research results. The research commands below use the canonical `src/simulation`, `src/ble`, `src/edge`, and `src/evaluation` pipeline.

## Setup

Use a Node version compatible with the locked Vite release (Node 22.14.0 was used for this cleanup and validation) and npm. Install the locked dependencies with `npm ci`. The unused `@xyflow/react` dependency and its exclusive dependencies were removed after checking source and configuration references. Remaining dependencies support the app, compiler or tests.

```powershell
npm ci
npm run dev
npm run build
npm run test:research
```

`npm run dev` starts the app; use the local URL printed by Vite. `npm run build` compiles TypeScript and creates the ignored `dist/` directory. `npm run test:research` runs the seven phase suites and the paper-specific regressions.

## Paper experiments

```powershell
npm run campaign:paper
npm run campaign:diagnostic
npm run verify:paper
```

The paper campaign runs the exact 30 seeds (101â€“110, 201â€“210, 301â€“310), 50 participants, 3600 seconds and eight gateways. It regenerates E1 and E3 from simulation rather than borrowing old predictions. Logistic training uses the other 29 seeds, including the corrected cumulative-duration feature. Bayesian likelihood tables remain fixed reference tables. The legacy alias `campaign:confirmatory` uses the same corrected paper workflow.

Default output folders are `results/paper-v3/` and `results/diagnostic-v3/`. Runs refuse to overwrite nonempty output folders. To reproduce into fresh folders:

```powershell
npm run campaign:paper -- results/paper-v3-replay
npm run campaign:diagnostic -- results/diagnostic-v3-replay
```

The diagnostic reuses identical movement and raw BLE observations for 2 m and 3 m post-filter gateway distance thresholds. It uses seeds 1â€“3, 30 participants and 1800 seconds. Its newly generated numbers are separate from the unverified historical claim of 811 false positives. `npm run verify:paper` independently recalculates temporal targets, prediction identity alignment and macro metrics from the completed saved run.

For other datasets: `npm run dataset:generate -- --config experiments/phase4.json --out output/dataset`. For the older five-seed E1â€“E15 workflow, use `npm run campaign:legacy`; this writes `results/legacy-current/` and is outside the current paper protocol. Never mix those results with the paper campaign. See [the protocol](docs/PAPER_PROTOCOL.md) before interpreting results.

## Project structure

| Location | Purpose |
|---|---|
| `src/simulation/`, `src/ble/`, `src/edge/` | Hidden geometry, radio observations and observable reconstruction |
| `src/risk/`, `src/evaluation/`, `src/campaign/` | Model inference, independent targets/metrics and experiments |
| `college-report/` | College LaTeX report, diagrams, image assets and report builders |
| Other `src/` modules and `public/` | React demonstration and supporting UI assets |
| `tests/` | Phase tests plus paper regressions |
| `experiments/` | Existing simulation configurations; old protocols remain identified |
| `docs/PAPER_SUPPLIED.md` | Exact supplied manuscript, preserved without silently replacing claims |
| `docs/PAPER_PROTOCOL.md`, `docs/PAPER_ARTIFACTS.md` | Current protocol and result provenance |
| `MANUSCRIPT_FINAL.md` | Pre-existing manuscript version; not automatically the supplied paper |
| `results/confirmatory/`, `results/diagnostic/` | Original evidence retained unchanged; known limitations apply |
| `results/paper-v3/`, `results/diagnostic-v3/` | Newly generated corrected results |
| `scripts/verifyOriginalMetrics.cjs` | Independent arithmetic check of original raw predictions |
| `scripts/verifyArtifacts.cjs` | Validate result-file checksums |
| `scripts/verifyPaper.cjs` | Independently validate corrected targets and metrics |

Historical research results retain their original version identifiers. Large authoritative evidence is available through the checksum-verified release described in [REPRODUCIBILITY_RELEASE.md](REPRODUCIBILITY_RELEASE.md).

## Interpretation limits

Reference contacts require the same room and qualifying distance at each 1-second sample; this is not a continuously checked trajectory. Reconstructed duration is rounded before thresholding. Every session produces two directed E3 records. AUROC/AP need both classes; F1/Brier/ECE exclude empty folds. Ranking support is extremely sparse. Fixed-table Bayesian results and raw-feature logistic optimization do not establish a general ranking of model families. The manuscript must reflect corrected results and disclosed methods before submission.

## Simulation-only angular research extension

The additive prototype in `research/angular-v4/` compares RSSI localization, angle triangulation, nonlinear fusion and Huber-robust fusion on controlled trajectories. It uses simulated bearings, not angles extracted from the existing BLE advertisements. Development artifacts are in `results/angular-v4-pilot/`; they do not replace the corrected hospital results. See [the research plan](docs/ANGULAR_RESEARCH_PLAN.md) for assumptions, prior work, negative results and the proposed confirmatory design.

```powershell
node research/angular-v4/test.mjs
node research/angular-v4/pilot.mjs results/angular-v4-pilot-replay
node research/angular-v4/verify.mjs results/angular-v4-pilot-replay
node scripts/verifyArtifacts.cjs results/angular-v4-pilot-replay
```

The output directory must be fresh. No additional dependency is needed. Better positioning in this pilot does not establish reliable sustained-contact recovery or hardware validity.

## Practical RSSI-to-angle comparison (v5)

`research/contact-v5/` adds causal filtering, Kalman tracking and temporal contact decisions, and compares zero, two and four AoA gateway upgrades. It tests short encounters, near misses, a wall-separated pair, correlated noise, persistent biases and packet-loss bursts. The reference stays fixed. Development and held-out evaluation outputs are separate in `results/contact-v5-development/` and `results/contact-v5-evaluation/`. See [the protocol and deployment-cost limits](docs/CONTACT_RECONSTRUCTION_V5.md).

```powershell
node research/contact-v5/test.mjs
node research/contact-v5/run.mjs evaluation results/contact-v5-evaluation-replay
node research/contact-v5/verify.mjs results/contact-v5-evaluation-replay
node scripts/verifyArtifacts.cjs results/contact-v5-evaluation-replay
```

Use a fresh directory. Raw evidence is retained as gzip JSON. Gateway counts are a hardware-budget comparison; actual monetary cost and real-world accuracy require measurement.

## Phase, timing and UWB comparison (v6)

`research/ranging-v6/` implements a phase-slope BLE PBR model, corrected RTT, PBR with an RTT consistency gate, and UWB double-sided two-way ToF. It compares these against matched RSSI/AoA baselines while testing service demand from 8, 32 and 128 clients (eight tags have simulated contact trajectories; others are background workload). See [the hospital protocol and cost limits](docs/HOSPITAL_RANGING_V6.md). Development/evaluation artifacts remain separate in `results/ranging-v6-development/` and `results/ranging-v6-evaluation/`.

```powershell
node research/ranging-v6/test.mjs
node research/ranging-v6/run.mjs evaluation results/ranging-v6-evaluation-replay
node research/ranging-v6/verify.mjs results/ranging-v6-evaluation-replay
node scripts/verifyArtifacts.cjs results/ranging-v6-evaluation-replay
```

Use a fresh directory. This is an abstract, controlled mechanism/scheduling comparison with assumed error parameters; it does not measure hardware prices, RF capacity, hospital accuracy or battery life. UWB TDoA is discussed separately and is not implemented.

## Trained end-to-end contact reconstruction (v7)

`research/ml-v7/` trains logistic regression, random forest, gradient-boosted trees and Gaussian naive Bayes for each of seven sensor budgets, plus a learned Markov extension and two feature ablations. It learns from all pairs before session detection. See [the complete ML protocol](docs/ML_V7_PROTOCOL.md). The GUI remains the original simulator; these additive research campaigns run from the command line.

Authoritative data are `results/ml-v7-data/{train,validation,calibration,test,external}`. Frozen trained bundles and validation selections are in `results/ml-v7-models-complete`; final probabilities, decisions, sessions and metrics are in `results/ml-v7-evaluation`. Tables and scientific PNG/PDF figures are in `results/ml-v7-report`. The interrupted `results/ml-v7-models` attempt is retained and explicitly nonauthoritative.

Read [the full result tables](results/ml-v7-report/ML_V7_RESULTS.md), [the manuscript extension](docs/ML_V7_MANUSCRIPT_DRAFT.md), and [the completion and validation report](docs/RESEARCH_COMPLETION_REPORT.md). These identify negative findings and the remaining scientific work.

Python 3.12 and the exact package versions in `research/ml-v7/requirements.txt` are required alongside the existing Node environment. The successful run used Python 3.12.3. Set up the separate research environment:

```powershell
python -m venv .research-venv
.\.research-venv\Scripts\python.exe -m pip install -r research/ml-v7/requirements.txt --index-url https://pypi.org/simple
node --test research/ml-v7/test.mjs
.\.research-venv\Scripts\python.exe research/ml-v7/tests.py
```

Exact reproduction into fresh directories follows this order. Generate held-out data only after training completes and `selection.json` says `frozen-before-test`. Existing evidence directories are never overwritten.

```powershell
node research/ml-v7/generate.mjs train results/ml-v7-replay-data/train
node research/ml-v7/generate.mjs validation results/ml-v7-replay-data/validation
node research/ml-v7/generate.mjs calibration results/ml-v7-replay-data/calibration
.\.research-venv\Scripts\python.exe research/ml-v7/train.py results/ml-v7-replay-data results/ml-v7-replay-models
node research/ml-v7/generate.mjs test results/ml-v7-replay-data/test
node research/ml-v7/generate.mjs external results/ml-v7-replay-data/external
.\.research-venv\Scripts\python.exe research/ml-v7/evaluate.py results/ml-v7-replay-data results/ml-v7-replay-models results/ml-v7-replay-evaluation
.\.research-venv\Scripts\python.exe research/ml-v7/verify.py results/ml-v7-replay-data results/ml-v7-replay-models results/ml-v7-replay-evaluation
.\.research-venv\Scripts\python.exe research/ml-v7/report.py results/ml-v7-replay-models results/ml-v7-replay-evaluation results/ml-v7-replay-report --data results/ml-v7-replay-data
```

Validate the retained authoritative run:

```powershell
.\.research-venv\Scripts\python.exe research/ml-v7/verify.py results/ml-v7-data results/ml-v7-models-complete results/ml-v7-evaluation
node scripts/verifyArtifacts.cjs . results/ml-v7-models-complete/source-checksums.json
node scripts/verifyArtifacts.cjs . results/ml-v7-data/train/source-checksums.json
.\.research-venv\Scripts\python.exe research/ml-v7/final_audit.py results/finalization-v7-replay
```

Feature-only prediction needs no truth or label file:

```powershell
.\.research-venv\Scripts\python.exe research/ml-v7/predict.py --models results/ml-v7-models-complete --modality RSSI --features results/ml-v7-data/test/X-2301-LOS-RSSI.f32.gz --out results/ml-v7-inference-replay.json
.\.research-venv\Scripts\python.exe research/ml-v7/check_inference.py results/ml-v7-inference-replay.json results/ml-v7-evaluation
```

All partition seeds, observation assumptions, feature names and selection grids are frozen in `research/ml-v7/protocol.mjs`. The unseen-motion test uses the same map. Calibrated frame proximity is not infection probability. Synthetic results require measured radio calibration and independent hardware/hospital validation before deployment claims. Random-forest workers require Windows process synchronization; a restrictive sandbox may need permission to run training/evaluation/tests. Inference timing is host CPU timing, not wearable battery or end-to-end latency.
