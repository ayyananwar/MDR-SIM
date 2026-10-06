# Cleanup report — 6 October 2026

## Organization completed

The project is organized around the supplied gateway co-observation paper, with the React demonstration preserved. Original confirmatory evidence remains in `results/confirmatory/`; the historical diagnostic remains in `results/diagnostic/`. Status notes identify their known limitations. The exact supplied manuscript is saved in `docs/PAPER_SUPPLIED.md`; the separate pre-existing `MANUSCRIPT_FINAL.md` remains unchanged.

312 historical files totaling 6,266,678,933 bytes (6.27 GB decimal) were removed from the active tree only after copying and checksum verification. This includes old raw datasets/plots, older campaign packages, overlapping root audit reports, one-off reproduction scripts and the old test log. All remain in the external archive. The individual paths and reasons are covered by `CLEANUP_PLAN.md` and `CLEANUP_REMOVALS.json`. An additional eight test-generated result files and two one-time cleanup helpers were externally archived after verification; their exact destinations are in `CLEANUP_EXTRA_REMOVALS.json`.

The unused `@xyflow/react` dependency was removed after a repository-wide reference check. npm removed 13 installed packages, including its exclusive dependencies, and updated the lockfile. Other UI/runtime/compiler/test dependencies remain. `node_modules/` remains installed and ignored; `dist/` was rebuilt and remains ignored. Neither is unique scientific evidence.

Research source, all tests, UI assets, experiment configurations, legacy source used by tests/app, relevant phase documentation and existing manuscript evidence were retained. Phase documentation is explicitly identified as older background rather than the current paper protocol. Root documentation now points to the paper workflow instead of unsupported claims about preventing infection or predicting infection probabilities.

## Backup and restoration

Verified original snapshot:

`C:/Users/ayyan/.codex/visualizations/2026/10/06/01a10fd2-58ba-7951-8277-e6dcd87384e6/MDR_SIM_backup_1791267443555`

All 477 original files except regenerable dependencies/build outputs were copied, totaling 6,268,763,493 bytes. Each copied file was SHA-256 checked against the source; removal candidates were checked again immediately before deletion. `CLEANUP_INVENTORY.json` and the backup's `BACKUP_INVENTORY.json` record original relative paths, sizes and hashes. The original snapshot includes pre-fix source and old package/lock files. Additional cleanup-generated archives are beneath its `cleanup-generated/` directory.

To restore ONE absent original file into the active workspace:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restoreArchive.ps1 -RelativePath FINAL_COMPUTATIONAL_AUDIT.md
```

The restoration utility verifies the source checksum, enforces project/backup boundaries and refuses to overwrite an existing file. Choose exact paths from the inventory. To recover an entire pre-cleanup project, copy the snapshot's original tree to a new directory and install dependencies from its original lockfile; do not overlay it onto corrected source. The archive is local and must be copied along with the project if distributing historical artifacts elsewhere.

## Implementation corrections

- Typed logistic feature extraction now reads `cumulativeDurationSeconds`; cumulative history influences predictions in a targeted regression.
- One evaluation-only temporal target module implements canonical pair matching plus positive interval overlap. Single-seed, baseline-comparison, ablation and diagnostic feature-reporting paths use it for labels. Discrimination and calibration now agree. Assessment/record identities are checked for alignment.
- Single-seed campaign aggregates, baseline comparison and ablation exclude empty folds for F1/Brier/ECE; E1 still treats every seed as a simulation replicate.
- The brittle campaign ground-truth substring assertion now checks imports. A TypeScript-parser test independently prevents inference/edge imports from hidden movement generation and evaluation modules.
- Phase 7 test outputs use a unique temporary directory, avoiding scientific-result pollution.
- A canonical 30-seed paper command exports per-seed records, reference sessions, raw predictions, fold support, metrics, manifest and result checksums. New runs refuse to overwrite existing output folders.
- A matched-radio diagnostic changes the actual post-filter distance threshold. Old scripts and contradictory claims remain available in the external snapshot.

Reference sampling, same-room checks, rounded session-duration qualification, two directed records per session and fixed Bayesian likelihood tables were preserved as disclosed protocol choices. They were not silently altered to improve E1 or model rankings.

## Validation and results

`npm run test:research`: passes all seven phase suites and paper regressions. Phase 7 passes 126 assertions. New checks cover temporal labels, record identity alignment, cumulative-feature influence, empty-fold exclusion and inference import boundaries.

`npm run build`: passes after unused-dependency removal. Vite reports a large JavaScript bundle warning; this is a UI performance limitation, not a failed build or evidence of scientific correctness.

The new `results/diagnostic-v3/` run completes and its two output checksums verify. With seeds 1–3, 30 participants and 1800 seconds: 2 m gives TP=0, FP=2, FN=3; 3 m gives TP=0, FP=125, FN=3. This does not verify or silently replace the historical TP=1/FP=69 and TP=1/FP=811 table. Its processing intervention differs from the old raw-RSSI prefilter experiment.

The corrected 30-seed campaign completed in `results/paper-v3/`. All 30 per-seed E1 contact-metric objects exactly match their original counterparts: 84 reference sessions, 161 reconstructed sessions, TP=3, FP=158, FN=81. Thus the original E1 table remains numerically supported.

The corrected E3 campaign still has 322 directed records and six positive records (three sessions), empty seeds 204/205 and class-supported seeds 301/303. Rounded Table V metrics match the supplied paper except logistic ECE, which changes from .047 to .038. Logistic AUROC remains .000 and AP .326; this persistence does not establish a specific causal explanation for inverse ranking. The final probabilities and cumulative-history inputs are newly generated and not identical to the original buggy run even when rounded summary values coincide.

`npm run verify:paper` independently verifies temporal targets, prediction identities and macro AUROC/AP/F1/Brier/ECE across all 30 seeds, without importing the project's metric implementations. Result checksums and frozen source/configuration hashes are verified. All 15 original confirmatory/diagnostic evidence files are unchanged compared with the backup. See `results/paper-v3/RESULTS.md` for the new comparison and `docs/PAPER_ARTIFACTS.md` for version/provenance details.

The main and diagnostic campaigns were each executed once after fixes; a second full 30-seed rerun was not performed. Existing deterministic replay tests pass, and every regenerated E1 seed matches the saved original. The corrected raw predictions have independent arithmetic/label checks, but neither those checks nor software tests establish external validity of the mobility/radio assumptions.

## Remaining scientific work

File cleanup does not establish scientific validity. The original 811-FP claim remains unverified; update the manuscript's diagnostic section to identify the new experiment or remove the unsupported claim. Describe sampled/room-constrained truth, rounded reconstructed timing, directional duplication and the Bayesian table provenance accurately. The manuscript's figure placeholders and bibliography still require author review. The UI retains legacy hospital/MDR-TB demonstration language and is not the scientific results source. Sparse positive-session support and raw-feature logistic optimization limit model interpretation. No clinical claim is justified.

## Subsequent research extensions and trained ML

The additive v4–v7 work retains the cleaned application's frozen source and all earlier evidence. The v7 end-to-end dataset includes all pairs before detection and therefore addresses the original E3 training-support limitation through a new, explicitly different protocol. Four classifier families, a learned Markov extension and two ablations were fitted for seven observation budgets. There are 49 frozen detector bundles and 6,468 verified held-out detector-recording evaluations. The earlier fixed Bayesian model remains distinct from the newly learned Bayes/Markov models.

No evidence was removed during these extensions. The interrupted first ML training directory is marked nonauthoritative, and the successful models reside in `results/ml-v7-models-complete`. The earlier verified backup and restoration instructions remain valid. See [the research completion report](docs/RESEARCH_COMPLETION_REPORT.md) for retained evidence, validation outcomes, changed results and unresolved scientific limits, and [the manuscript extension](docs/ML_V7_MANUSCRIPT_DRAFT.md) for the new methods and results. The new simulation results do not retroactively verify unsupported original-paper claims or establish hospital deployment validity.
