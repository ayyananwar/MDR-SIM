"""Use Word's native layout with the packaged render_docx rasterization stage.

Windows runtime has no bundled LibreOffice. This adapter never uses a user's
LibreOffice. It creates a separate invisible Word instance for PDF export.
"""
import importlib.util
import os
from pathlib import Path
import subprocess

skill=Path('C:/Users/ayyan/.codex/plugins/cache/openai-primary-runtime/documents/26.909.12148/skills/documents')
runtime=Path('C:/Users/ayyan/.cache/codex-runtimes/codex-primary-runtime/dependencies')
os.environ['PATH']=str(runtime/'native/poppler/Library/bin')+os.pathsep+os.environ.get('PATH','')
spec=importlib.util.spec_from_file_location('packaged_document_renderer',skill/'render_docx.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def convert(doc_path,user_profile,convert_tmp_dir,stem,verbose=False):
    output=Path(convert_tmp_dir)/f'{stem}.pdf'
    command=['powershell.exe','-NoProfile','-NonInteractive','-File',str(Path(__file__).with_name('word_export.ps1')),'-InputFile',str(doc_path),'-OutputFile',str(output)]
    process=subprocess.run(command,capture_output=True,text=True)
    log=process.stdout+process.stderr
    if verbose:print(log)
    if process.returncode or not output.exists():return None,log
    return str(output),log
module.convert_to_pdf=convert
module.main()
