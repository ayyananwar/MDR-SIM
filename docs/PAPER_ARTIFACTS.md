# Paper artifact and version index

| Artifact | Version and purpose |
|---|---|
| `PAPER_SUPPLIED.md` | Exact manuscript supplied in this chat; historical claims remain visible |
| `../MANUSCRIPT_FINAL.md` | Separate pre-existing draft |
| `../results/confirmatory/E1_reference/per_seed_results.json` | Original E1 supporting evidence: 84 reference sessions, TP=3, FP=158, FN=81 |
| `../results/confirmatory/E3_RAW_PREDICTIONS_V2.csv` | Original E3 predictions; independently reproducible arithmetic after empty-fold exclusion, but logistic cumulative feature was zero |
| `../results/confirmatory/E3_baseline_comparison_v2.json` | Original summary includes empty-fold padding; do not confuse with n=28 table |
| `../results/confirmatory/original_manifest.json` | Exact original manifest copied from project root |
| `../results/diagnostic/DIAGNOSTIC_REPORT.md` | Original diagnostic, including unsupported interpretation; no 3 m condition |
| `../results/paper-v3/` | Newly executed corrected E1/E3 campaign; manifest, per-seed observable records/reference sessions, raw predictions, summary, checksums |
| `../results/diagnostic-v3/` | Newly executed paired 2/3 m diagnostic; 2 m TP=0/FP=2, 3 m TP=0/FP=125 |
| `../INDEPENDENT_PAPER_REVIEW.md` | Initial review of pre-cleanup implementation; not a claim that fixed issues remain unfixed |
| External backup in [original cleanup inventory](https://github.com/ayyananwar/MDR-SIM/blob/e3cc2081414704d66c8e34f87a39858f8a64b3a3/CLEANUP_INVENTORY.json) | Exact original source, all older campaigns, historical reports/scripts and raw datasets |

Protocol v3 fixes cumulative duration, temporal E3 target consistency and empty-fold aggregation. It retains sampled same-room reference contacts, rounded reconstructed durations and fixed Bayesian tables, now explicitly disclosed. All 30 E1 results exactly reproduce the original contact metrics. The corrected E3 table retains the original rounded metrics except logistic ECE, which changes from .047 to .038. Original and corrected predictions remain separately identified. The original 811-FP claim remains unsupported regardless of new diagnostic output.

The paper campaign records all seeds and resolved geometry. Source hashes are captured separately in `results/paper-v3/source-checksums.json`; result hashes are in `checksums.json`. Use `node scripts/verifyArtifacts.cjs results/paper-v3` and the corresponding diagnostic command to verify results. Use `node scripts/verifyArtifacts.cjs . results/paper-v3/source-checksums.json` to verify current source against the frozen version. An exact rerun writes a fresh directory; compare scientific outputs, not filenames alone. The cleanup-added source-provenance metadata is a supplemental capture after execution and may differ from a fresh campaign manifest until that capture is repeated.

No newly generated result should be presented as if it existed in the original evidence package. The corrected-results report and retained historical review identify numerical changes once the run completes.
