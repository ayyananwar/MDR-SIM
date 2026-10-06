# Contact reconstruction college report

Main file: **MDR_SAFE_College_Report.tex**.

The source preserves the 80-heading college structure, with the approved classifier-module heading renamed to Learned Contact Classification and Probability Calibration, including eight numbered chapters. It retains the supplied institutional details, student names/USNs, academic year, front matter, headers/footers, and margin settings. The certificate has unsigned endorsement lines; it does not invent institutional approval or signatures.

The title matches the research manuscript: Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study.

The report updates the content to the verified simulation and distinguishes the historical privacy/exposure/demo modules from the final contact-reconstruction experiment. It includes 16 numerical/design tables, 11 displayed equations, vector architecture/use-case/DFD/class/sequence diagrams, scientific result plots, five actual interface screenshots, and 18 references. The old unrelated classical-dance paragraph and duplicate discussion text are excluded.

## Compile the submission package

Extract **MDR_SAFE_College_Report_Package.zip**, retaining its asset folders. Set `MDR_SAFE_College_Report.tex` as the main document in a LaTeX environment with standard `amsmath`, `longtable`, `tikz`, `pgfplots`, `listings`, and `hyperref` packages. The bibliography is inline, so no separate `.bib` file or BibTeX pass is required.

From the extracted directory, a conventional local workflow is:

```powershell
pdflatex -interaction=nonstopmode MDR_SAFE_College_Report.tex
pdflatex -interaction=nonstopmode MDR_SAFE_College_Report.tex
```

Run another pass if the compiler asks for it to settle cross-references. Inspect the resulting PDF before submission. Page count and final layout are not claimed as verified here.

The built-in Codex compiler was attempted and returned `Unable to find standard directories for platform` before processing the document. No terminal LaTeX compiler was found. No LaTeX installation was performed. Consequently **PDF compilation and page-layout verification remain unverified**, although content, heading sequence, asset references, cross-reference targets, and balanced source structure were checked.

## Assets and provenance

- `assets/logos/`: original VTU and Sahyadri logo bytes copied from the user-supplied `C:/Users/ayyan/Downloads/figs` folder.
- `assets/screenshots/`: actual captures of the existing locally served built application on 6 October 2026. They are demonstration screens, with synthetic records and unvalidated clinical/performance wording, not v7 research results.
- Vector technical diagrams and numerical charts are embedded in the TeX source.
- `CONTENT_VALIDATION.json` and `SOURCE_CHECKS.json` record structure/content checks; `PACKAGE_CHECKSUMS.json` records included file bytes.
- The numerical tables come from the unchanged `paper/manuscript_tables.json`. Main outcomes remain attached to the completed v7 protocol.

The authoring directory additionally retains `ORIGINAL_TEMPLATE.txt` and `build_report.py`. The builder uses the project manuscript/table/reference sources; it is not required to compile the extracted submission package.

Before signing/submitting, the students should verify institutional names/designations, semester/year, and the declaration against their college's current requirements. Administrative signatures are intentionally blank. Real clinical/hardware accuracy, deployment cost, battery life, and complete privacy/security guarantees are not asserted.
