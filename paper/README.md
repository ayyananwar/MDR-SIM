# Research manuscript

Open `Contact_Reconstruction_Research_Paper.docx` for the complete editable paper. `Contact_Reconstruction_Research_Paper.md` is its generated text equivalent. `SUBMISSION_CHECKLIST.md` identifies author and venue decisions that remain before submission.

`manuscript_content.md` holds prose; `build_manuscript.py` inserts tables from frozen results. `build_figures.py` generates the four publication figures from recorded evidence. `manuscript_tables.json` and `references.json` preserve the rendered table values and bibliography. `check_manuscript.py` checks them against authoritative artifacts and records `validation.json`.

Scientific authority remains in `results/ml-v7-data`, `results/ml-v7-models-complete`, and `results/ml-v7-evaluation`; manuscript generation does not change them. Earlier papers/results are retained with their original provenance.

Document building requires Python with python-docx and lxml. Figure building uses the pinned research environment with matplotlib. The scripts read paths relative to the project root. `render_with_word.py` and `word_export.ps1` are Windows-specific layout-verification helpers; `qa/` contains generated previews rather than research evidence. They are not required to reproduce the simulation or train models.

Commands from the project root:

```powershell
.\.research-venv\Scripts\python.exe paper/build_figures.py
# Use a document-authoring Python environment containing python-docx and lxml:
python paper/build_manuscript.py
python paper/check_manuscript.py
```

The complete simulation/training commands are in manuscript Appendix B and the project research documentation. Figure and document checks do not establish hardware performance or publication acceptance.
