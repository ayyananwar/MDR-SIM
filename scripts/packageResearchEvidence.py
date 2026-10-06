"""Package every retained results file and verify recovery byte for byte.

This does not remove/modify evidence. Archives preserve project-relative paths.
Run from the project root with Python 3.12; no third-party packages required.
"""
from pathlib import Path
import hashlib
import json
import tarfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'release/assets'
OUT.mkdir(parents=True,exist_ok=True)
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
groups=[]
results=ROOT/'results'
for item in sorted(results.iterdir()):
    if item.is_dir():groups.append((item.name,sorted(p for p in item.rglob('*') if p.is_file())))
root_files=sorted(p for p in results.iterdir() if p.is_file())
if root_files:groups.append(('results-root',root_files))
manifest={'schema':1,'releaseTag':'research-v7-2026-10-06','archiveFormat':'tar.gz with project-relative paths','archives':[],'files':[],'verification':'all archived file bytes compared with originals'}
for name,files in groups:
    archive=OUT/f'{name}.tar.gz'
    if archive.exists():raise FileExistsError(f'Refusing to overwrite {archive}')
    entries=[]
    with tarfile.open(archive,'w:gz',compresslevel=1) as tar:
        for path in files:
            relative=path.relative_to(ROOT).as_posix()
            entry={'file':relative,'bytes':path.stat().st_size,'sha256':digest(path),'archive':archive.name}
            entries.append(entry);tar.add(path,arcname=relative,recursive=False)
    expected={x['file']:x for x in entries};seen=set()
    with tarfile.open(archive,'r:gz') as tar:
        for member in tar:
            if not member.isfile() or member.name not in expected:raise AssertionError(f'Unexpected member {member.name}')
            h=hashlib.sha256();reader=tar.extractfile(member)
            for block in iter(lambda:reader.read(1024*1024),b''):h.update(block)
            if h.hexdigest()!=expected[member.name]['sha256']:raise AssertionError(member.name)
            seen.add(member.name)
    if seen!=set(expected):raise AssertionError(f'Missing archive entries {name}')
    if archive.stat().st_size>=2*1024**3:raise AssertionError('Archive exceeds GitHub asset limit')
    manifest['files'].extend(entries)
    manifest['archives'].append({'name':archive.name,'bytes':archive.stat().st_size,'sha256':digest(archive),'files':len(files)})
    print(f'Verified {name}: {len(files)} evidence files',flush=True)
manifest['totalFiles']=len(manifest['files']);manifest['totalOriginalBytes']=sum(x['bytes'] for x in manifest['files'])
(ROOT/'RESEARCH_EVIDENCE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified release evidence: {manifest['totalFiles']} files in {len(groups)} archives.")
