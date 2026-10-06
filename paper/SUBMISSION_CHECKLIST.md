# Before submitting the manuscript

The detailed manuscript is `Contact_Reconstruction_Research_Paper.docx`. The editable source and figure/table builders are retained in this directory. This checklist is separate from the scientific manuscript because these decisions require the authors and a target venue.

## Author decisions

- Confirm the five authors' names, order, affiliation, and consent. The supplied manuscript was the source of the author list; authorship eligibility and contributions need author confirmation.
- Supply the corresponding author's name and email.
- Complete the venue's funding, competing interests, author-contribution, and AI-assistance declarations accurately. No declarations or institutional approvals have been invented.
- Choose the journal or conference and apply its article template, reference style, length limits, and supplementary-material requirements. The current 20-page single-column version is a detailed research manuscript, not a venue-specific typeset submission.

## Scientific scope

- Describe this as a simulation study with assumed radio errors, eight moving tags, and one map. Do not replace that description with hospital field validation.
- Retain adverse findings: substantial false contacts, uncertain incremental UWB ML benefit, the negative Markov extension, and the separate high-load scheduling failures.
- Keep conditional duration/delay metrics and pointwise exploratory intervals qualified as stated in the paper.
- Hardware accuracy, battery life, procurement cost, realistic dense crowds, additional hospital maps, and clinical utility remain unmeasured. A publication does not require pretending these have been established.
- A second complete independent training replay was not performed during finalization. Arithmetic audits and feature-only inference verification are documented separately.

## Code and evidence release

The public implementation is https://github.com/ayyananwar/MDR-SIM, with retained evidence distributed through release research-v7-2026-10-06. Consult REPRODUCIBILITY_RELEASE.md and RESEARCH_EVIDENCE_MANIFEST.json. A public release is distinct from a permanent scholarly archive DOI; before submission, check the venue's availability requirements.

- Confirm rights to release the code and agree on licenses for code and synthetic evidence.
- Publish the research source, pinned dependencies, exact commands, protocol definitions, checksum manifests, and manuscript figures/tables.
- Preserve access to raw observations, labels, per-seed predictions, selected models, and historical results. Large evidence can be hosted in a separate archival data release with the code repository pointing to its actual persistent identifier.
- Exclude local runtimes, caches, temporary previews, backups, and credentials from the public release. Preserve these locally when needed; exclusion from Git is not deletion.
- Test reproduction from the proposed clean release. Identify any separately hosted evidence and record the release's actual commit/version and archive identifier.
- The manuscript identifies the GitHub repository and versioned release. A permanent archival DOI is not assigned; add one only after obtaining it from the chosen archive.

## Document verification

The paper includes 12 tables, four figures, 11 equations, 16 references, and three reproducibility appendices. Tables are populated from frozen artifacts. The final Word export was checked visually page by page; `validation.json` records structural and numerical manuscript checks. Formatting and reference details should be checked again after adapting the paper to a venue.

The retained earlier manuscripts and campaigns document different implementations/protocols. They must not be presented as results of the current trained pipeline.
