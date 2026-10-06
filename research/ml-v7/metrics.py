import numpy as np
from sklearn.metrics import roc_auc_score, average_precision_score

def decode(probability, eligible, threshold, policy):
    positive = (probability >= threshold) & eligible
    if policy == 'strict': return positive
    if policy != 'occupancy': raise ValueError('Unknown decoder')
    cumulative = np.vstack([np.zeros((1, positive.shape[1]), dtype=int), np.cumsum(positive, axis=0)])
    out = np.zeros_like(positive)
    out[9:] = (cumulative[10:] - cumulative[:-10] >= 7) & eligible[9:]
    return out

def sessions(bits, pairs, minimum=30):
    result = []
    for j, pair in enumerate(pairs):
        times = np.flatnonzero(bits[:, j])
        if not len(times): continue
        cuts = np.flatnonzero(np.diff(times) != 1) + 1
        for segment in np.split(times, cuts):
            start, end = int(segment[0]), int(segment[-1])
            if end - start >= minimum:
                result.append({'pair': '|'.join(pair), 'start': start, 'end': end, 'detectedAt': start + minimum})
    return sorted(result, key=lambda s: (s['pair'], s['start']))

def event_metrics(predicted, reference, frames, pairs):
    candidates = []
    for i, p in enumerate(predicted):
        for j, g in enumerate(reference):
            if p['pair'] != g['pair']: continue
            overlap = max(0, min(p['end'], g['end']) - max(p['start'], g['start']))
            iou = overlap / (max(p['end'], g['end']) - min(p['start'], g['start']))
            if overlap >= 5 and iou >= .2: candidates.append((iou, i, j))
    candidates.sort(key=lambda c: (-c[0], c[1], c[2]))
    used_p, used_g, duration_errors, latency = set(), set(), [], []
    for _, i, j in candidates:
        if i in used_p or j in used_g: continue
        used_p.add(i); used_g.add(j)
        p, g = predicted[i], reference[j]
        duration_errors.append(abs((p['end']-p['start'])-(g['end']-g['start'])))
        latency.append(p['detectedAt']-g['start'])
    tp, fp, fn = len(used_p), len(predicted)-len(used_p), len(reference)-len(used_g)
    pair_index = {'|'.join(pair): j for j, pair in enumerate(pairs)}
    target = np.zeros((frames, len(pairs)), dtype=bool); output = target.copy()
    for s in reference: target[s['start']:s['end']+1, pair_index[s['pair']]] = True
    for s in predicted: output[s['start']:s['end']+1, pair_index[s['pair']]] = True
    positive = int(target.sum()); negative = target.size-positive
    fp_time = int((output & ~target).sum()); fn_time = int((target & ~output).sum())
    return {'tp': tp, 'fp': fp, 'fn': fn, 'referenceContacts': len(reference),
        'precision': tp/(tp+fp) if tp+fp else 0., 'recall': tp/(tp+fn) if tp+fn else None,
        'f1': 2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None,
        'durationMAE': float(np.mean(duration_errors)) if duration_errors else None,
        'medianDetectionLatency': float(np.median(latency)) if latency else None,
        'falsePositivePairSeconds': fp_time, 'falseNegativePairSeconds': fn_time,
        'positivePairSeconds': positive, 'negativePairSeconds': negative,
        'missedContactTimeRate': fn_time/positive if positive else None,
        'falsePositiveTimeRate': fp_time/negative if negative else None,
        'falseSessionsPerPairHour': fp/(frames*len(pairs)/3600)}

def frame_metrics(probability, labels):
    p = np.asarray(probability).ravel(); y = np.asarray(labels).ravel()
    bins = np.minimum((p*10).astype(int), 9); ece = 0.
    for b in range(10):
        selected = bins == b
        if selected.any(): ece += selected.mean()*abs(p[selected].mean()-y[selected].mean())
    supported = len(np.unique(y)) == 2
    return {'frameBrier': float(np.mean((p-y)**2)), 'frameECE': float(ece),
        'frameAUROC': float(roc_auc_score(y,p)) if supported else None,
        'frameAP': float(average_precision_score(y,p)) if supported else None,
        'framePositive': int(y.sum()), 'frameCount': len(y)}

def hmm_filter(probability, eligible, transitions, emission_prior):
    p = np.clip(probability, 1e-6, 1-1e-6); result = np.empty_like(p)
    state = np.full(p.shape[1], transitions['prior'])
    prior_logit = np.log(emission_prior/(1-emission_prior))
    for t in range(len(p)):
        predicted = state*transitions['p11']+(1-state)*transitions['p01']
        likelihood = np.where(eligible[t], np.log(p[t]/(1-p[t]))-prior_logit, 0.)
        z = np.clip(np.log(predicted/(1-predicted))+likelihood, -30, 30)
        state = 1/(1+np.exp(-z)); result[t] = np.where(eligible[t],state,0.)
    return result

def mean_supported(values):
    supported = [v for v in values if v is not None and np.isfinite(v)]
    return float(np.mean(supported)) if supported else None
