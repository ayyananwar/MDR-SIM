"""Inference-only helpers: inputs are numeric observables, never truth files."""
import numpy as np
from scipy.special import logit
from metrics import hmm_filter

def probability(bundle, x):
    shape = x.shape[:2]; full = x.reshape(-1,x.shape[-1]); eligible = full[:,2] > .5
    raw = bundle['estimator'].predict_proba(full[:,bundle['indices']])[:,1]
    calibrated = bundle['calibrator'].predict_proba(logit(np.clip(raw,1e-6,1-1e-6)).reshape(-1,1))[:,1]
    return np.where(eligible,calibrated,0.).astype('f4').reshape(shape)

def filtered_probability(bundle, x):
    p = probability(bundle,x)
    return hmm_filter(p,x[:,:,2]>.5,bundle['transitions'],bundle['emission_prior']) if bundle.get('hmm') else p
