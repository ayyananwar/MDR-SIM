# Response to the document review

The Word XML, editable source, and generated Markdown were checked directly.

1. **Appendix duplication:** the actual manuscript contained one Appendix A, B, and C in order. The reported second Appendix A was not found. No legitimate section was deleted. `check_manuscript.py` now explicitly asserts the exact appendix sequence in both Word XML and Markdown.
2. **Title:** changed to “Learning Sustained Contacts from RSSI, Angular Measurements, and Ranging: A Reproducible Simulation Study,” including document metadata.
3. **Causal inference wording:** replaced the ambiguous contribution phrase with an observation-to-decision pipeline using current and past measurements. The introduction now distinguishes temporal processing from treatment-effect estimation/statistical causal identification.
4. **Table 5:** added an adjacent note distinguishing pooled counts, seed-mean F1, and the paired ML-minus-rule interval. No result values changed.
5. **Equation (11):** confirmed in Word's native math XML and in the rendered page. It is a symbolic deployment-cost expression, not a measured price estimate.
6. **Repository:** the user authorized a public MDR-SIM repository. Source and evidence publication use GitHub and versioned release assets, with complete checksum manifests and a safe restorer. No permanent scholarly DOI is invented.
7. **References:** standardized numeric IEEE-style entries, using DOI for the publications with recorded DOIs and consistent online-access formatting for technical/software documentation. Final formatting still depends on the selected venue.

The preceding paper and its authoring assets were copied before edits to `C:\Users\ayyan\.codex\visualizations\2026\10\06\01a10fd2-58ba-7951-8277-e6dcd87384e6\paper_before_review_20261006`. Frozen research evidence was not changed. The revision addresses document presentation and clarity; it does not add empirical hardware or clinical evidence.
