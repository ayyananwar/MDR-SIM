"""Confirm label-free inference matches the retained evaluation exactly."""
import argparse
from pathlib import Path
import numpy as np
from data import read_json

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('inference');p.add_argument('evaluation');p.add_argument('case',default='2301-LOS',nargs='?');a=p.parse_args()
    result=read_json(a.inference);base=Path(a.evaluation)/'predictions'/f"test-{a.case}-{result['modality']}"
    with np.load(base.with_suffix('.npz')) as archive:
        np.testing.assert_array_equal(result['probability'],archive[f"p_{result['family']}"])
        np.testing.assert_array_equal(result['decisions'],archive[f"d_{result['family']}"])
    assert result['contacts']==read_json(base.with_suffix('.json'))[result['family']]
    print('Feature-only inference matches saved probabilities, decisions and sessions exactly.')
