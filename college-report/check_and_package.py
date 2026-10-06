"""Check source structure/assets and create a recoverable submission ZIP.

These checks cannot replace compiling and visually inspecting the PDF.
"""
from pathlib import Path
import re,json,hashlib,zipfile

OUT=Path(__file__).resolve().parent
ROOT=OUT.parent
tex=OUT/'MDR_SAFE_College_Report.tex'
s=tex.read_text(encoding='utf-8')
original=(OUT/'ORIGINAL_TEMPLATE.txt').read_text(encoding='utf-8')
# A longtable caption is a table row and must terminate before booktabs rules.
assert not re.search(r'\\label\{tab:[^}]+\}\\\n', s), 'Malformed longtable caption row ending'

heading=r'\\(chapter\*?|section\*?|subsection\*?)\{([^}]+)\}'
expected=[(kind, 'Learned Contact Classification and Probability Calibration' if title=='Exposure Risk Assessment Module' else title) for kind,title in re.findall(heading,original)]
assert re.findall(heading,s)==expected
assert s.count(r'\textbf{Keywords:}')==1 and not re.search(r'^Keywords:',s,re.M)
assert not any(value in s for value in ['turnaround of 106 ns', '5 x 105 and 7 x 105 ns', '\\{10-6, 10-3\\}', '[10-6,1-10-6]'])
stack=[]
for m in re.finditer(r'\\(begin|end)\{([^}]+)\}',s):
    kind,name=m.groups()
    if kind=='begin':stack.append(name)
    else:assert stack and stack.pop()==name,(name,stack)
assert not stack
balance=0
for m in re.finditer(r'(?<!\\)[{}]',s):
    balance+=1 if m.group()=='{' else -1
    assert balance>=0
assert balance==0
labels=re.findall(r'\\label\{([^}]+)\}',s)
assert len(labels)==len(set(labels))
for target in re.findall(r'\\(?:ref|eqref)\{([^}]+)\}',s):assert target in labels,target
bib=set(re.findall(r'\\bibitem\{([^}]+)\}',s))
for group in re.findall(r'\\cite\{([^}]+)\}',s):
    for item in group.split(','):assert item in bib,item
assert '@@' not in s and all(ord(c)<128 for c in s)
assets=[p for p in (OUT/'assets').rglob('*') if p.is_file()]
assert len(assets)==7
for name in re.findall(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}',s):
    assert any(p.name==name for p in assets),name
source=json.loads((ROOT/'paper/manuscript_tables.json').read_text(encoding='utf-8'))
for key,t in source.items():
    block=next(b for b in re.findall(r'\\begin\{longtable\}.*?\\end\{longtable\}',s,re.S) if '\\label{tab:'+key+'}' in b)
    assert block.count('\\label{tab:'+key+'}')==1
    for row in t['rows']:
        for v in row:
            if re.fullmatch(r'-?\d+(?:\.\d+)?',str(v)):assert str(v) in block,(key,v)
for name in ['vtu.jpg','sahyadri.png']:
    assert (OUT/'assets/logos'/name).read_bytes()==(Path('C:/Users/ayyan/Downloads/figs')/name).read_bytes()
check={'status':'source-checks-passed','headings':80,'chapters':8,'longtables':s.count('\\begin{longtable}'),'equations':s.count('\\begin{equation}'),'figures':s.count('\\begin{figure}'),'actualScreenshots':5,'bibliographyEntries':len(bib),'uniqueLabels':len(labels),'balancedEnvironmentsAndBraces':True,'crossReferenceTargetsResolved':True,'logoBytesMatchUserOriginals':True,'researchTablesPreserved':len(source),'compilation':'unverified: built-in compiler failed before TeX processing with Unable to find standard directories for platform','pageLayout':'unverified; no compiled PDF'}
(OUT/'SOURCE_CHECKS.json').write_text(json.dumps(check,indent=2)+'\n',encoding='utf-8')
files=[tex,OUT/'README.md',OUT/'CONTENT_VALIDATION.json',OUT/'SOURCE_CHECKS.json']+assets
manifest=[{'file':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
(OUT/'PACKAGE_CHECKSUMS.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
files.append(OUT/'PACKAGE_CHECKSUMS.json')
package=OUT/'MDR_SAFE_College_Report_Package.zip'
with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
    for p in files:archive.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(package) as archive:
    assert archive.testzip() is None
    for entry in manifest:assert hashlib.sha256(archive.read(entry['file'])).hexdigest()==entry['sha256']
print(json.dumps({**check,'packageFiles':len(files),'zipBytes':package.stat().st_size}))
