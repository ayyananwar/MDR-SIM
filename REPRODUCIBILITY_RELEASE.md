# Research release and evidence recovery

Repository: https://github.com/ayyananwar/MDR-SIM. Evidence release: https://github.com/ayyananwar/MDR-SIM/releases/tag/research-v7-2026-10-06.

The main publication study is `research/ml-v7/`, with seven simulated sensing budgets, disjoint seed partitions, calibrated classifier families, frozen validation selection, and session-level evaluation. The Word manuscript is in `paper/`; older protocols/results retain their own version identities.

The Git repository contains source, locked dependencies, tests, documentation, manuscript sources, and figures. The retained `results/` tree is distributed through separately verified release archives rather than Git history. This follows GitHub's recommendation to distribute large binaries as release assets: [GitHub large-file documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github). Archives remain below its [2 GiB per-asset limit](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

`RESEARCH_EVIDENCE_MANIFEST.json` records every retained result file's original project-relative path, size, SHA-256, and containing archive, plus archive checksums. `scripts/packageResearchEvidence.py` verifies all archived bytes against the originals before producing the manifest. Packaging never deletes source evidence.

`.gitattributes` disables automatic line-ending conversion so cloned source bytes remain consistent with the frozen source-checksum manifests across platforms.

## Recovering the saved experiment

Download the `.tar.gz` evidence assets for the `research-v7-2026-10-06` release into a directory outside the source checkout. From the checkout root:

```powershell
python scripts/restoreResearchEvidence.py C:\path\to\downloaded-assets
```

The restorer verifies archives and every file, restricts extraction to the project's `results/`, and refuses conflicting existing files. Identical files are retained. Then set up Node/npm and Python as described in README.md and run the saved-artifact verifiers. A fresh experiment can instead be generated using the exact README and manuscript Appendix B commands, into new output directories.

## Authority and retained failures

- Main data: `results/ml-v7-data/{train,validation,calibration,test,external}`.
- Frozen fitted models: `results/ml-v7-models-complete`.
- Predictions, sessions, metrics, intervals: `results/ml-v7-evaluation`.
- Independent audit: `results/finalization-v7-20261006`.
- Earlier angular, contact, ranging, original, and corrected campaigns are retained as separate archives. The interrupted `ml-v7-models` attempt stays explicitly nonauthoritative.

The larger external cleanup backup described in CLEANUP_REPORT.md is a separate local recovery archive; it is not part of these retained `results/` assets. It contains superseded material and is not required to run the current documented research. No permanent archive DOI is assigned merely by publishing a GitHub release.

Public availability does not establish hardware accuracy, clinical utility, minimum cost, or a second independent training replay. No new redistribution license has been selected for the authors' work; authors should agree on an appropriate license before representing it as licensed open-source software.
