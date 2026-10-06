# Research v7 reproducibility release

This release preserves the simulation code, full manuscript, and all 3,809 result files retained in the active project. It compares seven simulated observation budgets using four calibrated classifier families, frozen seed-grouped selection, deterministic controls, Markov modeling, ablations, and an unseen-motion challenge.

The evidence is supplied as 16 `.tar.gz` archives. `RESEARCH_EVIDENCE_MANIFEST.json` lists every file and SHA-256 and identifies its archive. Follow `REPRODUCIBILITY_RELEASE.md` and `scripts/restoreResearchEvidence.py` to recover the project-relative `results/` tree. Every archived byte was verified against the originals; existing conflicting files are never overwritten by the restorer.

The authoritative learned comparison uses `ml-v7-data`, `ml-v7-models-complete`, and `ml-v7-evaluation`. Earlier protocols and adverse results remain separately identifiable, including the interrupted `ml-v7-models` attempt. Local cleanup backups, runtimes, dependencies, caches, and page previews are excluded from the release.

The manuscript now clarifies temporal causality and pooled-count versus seed-mean aggregation, uses consistent numeric references, and includes checked native Word equations and unique Appendices A–C. All 20 revised pages were visually inspected; numerical manuscript checks passed.

This is simulation evidence, not hospital field validation. It does not establish clinical utility, measured deployment cost, hardware accuracy, energy consumption, or a second complete independent training replay. A permanent archive DOI and an author-agreed redistribution license have not yet been assigned.
