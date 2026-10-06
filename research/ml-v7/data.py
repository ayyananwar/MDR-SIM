"""Saved observables are read separately from labels/reference geometry."""
from pathlib import Path
import gzip
import json
import hashlib
import numpy as np

def read_json(path):
    path = Path(path)
    with (gzip.open(path, 'rt', encoding='utf-8') if path.suffix == '.gz' else path.open(encoding='utf-8')) as f:
        return json.load(f)

def write_json(path, value):
    def clean(v):
        if isinstance(v, dict): return {str(k): clean(x) for k, x in v.items()}
        if isinstance(v, (list, tuple)): return [clean(x) for x in v]
        if isinstance(v, np.ndarray): return clean(v.tolist())
        if isinstance(v, np.generic): return clean(v.item())
        if isinstance(v, float) and not np.isfinite(v): return None
        return v
    Path(path).write_text(json.dumps(clean(value), indent=2, allow_nan=False), encoding='utf-8')

def manifest(root, split):
    m = read_json(Path(root) / split / 'manifest.json')
    if m['status'] != 'complete' or m['split'] != split: raise ValueError('Incomplete/mismatched split')
    return m

def load_features(root, split, case, modality, m):
    with gzip.open(Path(root) / split / case['modalities'][modality], 'rb') as f:
        x = np.frombuffer(f.read(), dtype='<f4').reshape(m['shape'])
    if not np.isfinite(x).all(): raise ValueError('Nonfinite observables')
    return x

def load_labels(root, split, case, m):
    with gzip.open(Path(root) / split / f"labels-{case['seed']}.u8.gz", 'rb') as f:
        return np.frombuffer(f.read(), dtype=np.uint8).reshape(m['shape'][:2])

def load_reference(root, split, case):
    return read_json(Path(root) / split / f"truth-{case['seed']}.json.gz")['reference']

def training_matrix(root, split, modality, stride=1):
    m = manifest(root, split)
    x, y = [], []
    for c in m['cases']:
        x.append(load_features(root, split, c, modality, m)[::stride].reshape(-1, len(m['features'])))
        y.append(load_labels(root, split, c, m)[::stride].ravel())
    return np.concatenate(x), np.concatenate(y), m

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def checksums(root):
    root = Path(root)
    write_json(root / 'checksums.json', [{'file': str(p.relative_to(root)).replace('\\', '/'), 'sha256': sha(p)}
        for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'checksums.json'])
