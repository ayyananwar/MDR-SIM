# Manuscript layout verification

## Review revision and public release

The final review revision is in `qa/public-release-revision`. All 20 pages of this export were inspected directly after the title punctuation, temporal-causality wording, Table 5 note, IEEE-style references, and real GitHub availability links were added. Equation (11) is visibly present on page 15; Appendices A, B, and C occur once on pages 19–20. No clipping, overlap, or broken equation glyphs was found. Outcome tables remain unchanged and `check_manuscript.py` explicitly checks appendix uniqueness/order and the cost-equation content.

## Previous layout pass

The final Word manuscript was exported in a hidden Microsoft Word instance and rendered into 20 full-page images with the document skill's rendering pipeline and bundled Poppler. All 20 pages were visually inspected. Corrections removed title/heading theme-font overrides and decorative title borders, resized the floor-plan figure, separated Figure 2's text from its confidence bars, and prevented fraction-unit labels from breaking across lines.

The final export is retained in `qa/checked-render`. Pages 11, 18, 19, and 20 were inspected after the final figure, bibliography, feature-unit, and partition-wording corrections. Pixel comparison established that the other 16 pages were identical to the preceding fully inspected export. No clipped tables, overlapping text, broken figure labels, or missing equation glyphs were found in the final pages.

`validation.json` records the separate numerical/structural manuscript checks. `checksums.json` binds the final manuscript, generated sources, figures, and key frozen evidence files. These checks establish document consistency and layout, not clinical validity or guaranteed publication acceptance.

The QA previews and intermediate exports are local generated files; the deliverable is the editable Word paper and its source. No research campaign, fitted model, or earlier manuscript was overwritten during paper creation.
