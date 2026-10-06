"""Restore trusted release archives after validating every archived byte.

python scripts/restoreResearchEvidence.py PATH_TO_DOWNLOADED_ASSETS
No existing result is overwritten. Conflicting files cause an error.
"""
from pathlib import Path,PurePosixPath
import hashlib
import json
import tarfile
import sys
import shutil
import tempfile

ROOT=Path(__file__).resolve().parents[1]
assets=Path(sys.argv[1]).resolve()
manifest=json.loads((ROOT/'RESEARCH_EVIDENCE_MANIFEST.json').read_text(encoding='utf-8'))
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as reader:
        for block in iter(lambda:reader.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
for info in manifest['archives']:
    path=assets/info['name']
    if digest(path)!=info['sha256']:raise ValueError(f'Archive checksum mismatch: {path.name}')
    expected={r['file']:r for r in manifest['files'] if r['archive']==info['name']};seen=set()
    with tarfile.open(path,'r|gz') as archive:
        for member in archive:
            relative=PurePosixPath(member.name)
            if not member.isfile() or relative.is_absolute() or '..' in relative.parts or member.name not in expected:
                raise ValueError(f'Unsafe/unexpected member: {member.name}')
            target=(ROOT/Path(*relative.parts)).resolve()
            if not target.is_relative_to(ROOT/'results'):raise ValueError('Member escapes results')
            source=archive.extractfile(member);h=hashlib.sha256()
            with tempfile.SpooledTemporaryFile(max_size=8*1024*1024) as verified:
                for block in iter(lambda:source.read(1024*1024),b''):
                    h.update(block);verified.write(block)
                if h.hexdigest()!=expected[member.name]['sha256']:raise ValueError(f'File mismatch {member.name}')
                if target.exists():
                    if digest(target)!=expected[member.name]['sha256']:raise FileExistsError(f'Conflicting evidence: {target}')
                else:
                    target.parent.mkdir(parents=True,exist_ok=True);verified.seek(0)
                    with target.open('xb') as writer:shutil.copyfileobj(verified,writer)
            seen.add(member.name)
    if seen!=set(expected):raise ValueError(f'Missing evidence in {path.name}')
    print(f'Verified/restored {path.name}',flush=True)
