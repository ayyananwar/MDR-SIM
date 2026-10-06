"""Deploy a frozen detector on observables; no label or truth file required."""
import argparse
import gzip
from pathlib import Path
import joblib
import numpy as np
from data import read_json,write_json
from model import filtered_probability
from metrics import decode,sessions

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--models',default='results/ml-v7-models');p.add_argument('--modality',required=True)
    p.add_argument('--family');p.add_argument('--features',required=True);p.add_argument('--out',required=True)
    args=p.parse_args();output=Path(args.out)
    if output.exists():raise ValueError('Choose a fresh inference output')
    selected=read_json(Path(args.models)/'selection.json');family=args.family or selected['best_by_validation'][args.modality]
    bundle=joblib.load(Path(args.models)/'models'/f'{args.modality}-{family}.joblib')
    with gzip.open(args.features,'rb') as f:x=np.frombuffer(f.read(),dtype='<f4')
    count=len(selected['features']);pairs=[[f'w{i}',f'w{j}'] for i in range(8) for j in range(i+1,8)]
    x=x.reshape(-1,len(pairs),count);probability=filtered_probability(bundle,x)
    bits=decode(probability,x[:,:,2]>.5,bundle['threshold'],bundle['decoder'])
    write_json(output,{'modality':args.modality,'family':family,'threshold':bundle['threshold'],'decoder':bundle['decoder'],
        'probability':probability,'decisions':bits,'contacts':sessions(bits,pairs)})
    print(f'Saved inference from observable features: {output}')
