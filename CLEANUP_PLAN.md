# Paper-focused cleanup plan

The active project will retain the React demonstration, research source, all research tests, experiment configurations, the manuscript, the independent review, and original confirmatory evidence. No AGENTS.md was found in the project inventory.

Before changes, snapshot every project file except regenerable `node_modules/` and `dist/` into a separate authorized directory under `C:/Users/ayyan/.codex/visualizations/2026/10/06/01a10fd2-58ba-7951-8277-e6dcd87384e6/`. Record and verify SHA-256 for every snapshot file. The snapshot includes all original code, results and raw datasets. Never remove a file if its verified backup differs from its current contents.

Proposed removal from the active tree (each individual path will also be listed in CLEANUP_INVENTORY.json):

| Paths | Action and reason |
|---|---|
| `audit.{cjs,js,ts}`, `audit2.cjs`, `audit3.cjs`, `check_records.ts`, `logistic_audit*.ts`, `regenerateE3.ts`, `runSeed.ts`, `generatePhase8Manifest.ts`, `generateSupplementary.ts`, `run_pipeline.ps1` | Archive in the external snapshot. Ad hoc prior-version tools have no active package/import dependencies; replace the paper workflow with a versioned canonical command. Preserve original reproduction tools in the snapshot. |
| Root `FINAL_*.md`, `E1_SESSION_AUDIT.md`, `E3_*.md`, `E3_*AUDIT.csv`, `LOGISTIC_FOLD_AUDIT.csv`, `LOSO_FOLD_AUDIT.csv`, `CLAIM_EVIDENCE_MATRIX.md`, `SUPPLEMENTARY.md`, `REFERENCE_AUDIT.md`, `MANUSCRIPT_CHANGELOG.md`, `PHASE_8_MANIFEST.json`, `INDEPENDENT_REVIEW_METRICS.json` | Archive externally with exact original paths. These are overlapping historical analyses and original provenance; do not treat their claims as current verified truth. Retain independent review and manuscript in the project. |
| `output/` | Archive externally. Prior demo/phase datasets and plots are not runtime inputs; unique raw data remain fully recoverable. The dataset command may create new outputs. |
| `results/final/`, `results/legacy_phase7/`, `results/privacy-benchmark/`, `results/reference-run1/`, `results/reference-run2/` | Archive externally. These older campaigns support other protocols rather than the supplied 30-seed paper. Retain original confirmatory and diagnostic directories for manuscript provenance. |
| `test_output.txt`, `dist/` | Remove regenerable logs/build after preserving the log. Rebuild dist for validation; generated build is ignored. |

Keep source modules, `docs/`, `experiments/`, `scripts/generate_dataset.py`, `scripts/diagnose_features.ts`, UI assets and all dependencies unless actual import/config inspection establishes they are unused. Do not delete legacy source merely because it is outside this paper: it is exercised by the app and tests.

Implementation work: use typed logistic features; unify temporal E3 labels for discrimination/calibration; consistently exclude empty folds; repair the import-boundary test; add targeted regressions. Preserve sampled reference and rounded reconstructed timing as disclosed protocol choices rather than silently changing E1. Document fixed Bayesian tables. Run a new matched-radio radius diagnostic and corrected 30-seed LOSO campaign into a distinct versioned output. Keep unsupported historical 811-FP claim clearly marked.

Final documentation: README, paper protocol, artifact/provenance index, cleanup report, verified backup inventory and restoration instructions. The cleanup report will distinguish changed results from original paper numbers and record all validation limitations.
