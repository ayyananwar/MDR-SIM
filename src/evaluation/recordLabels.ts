// Evaluation-only temporal E3 target. Never imported by inference modules.
import { buildIdentityMaps, getCanonicalWearablePair } from './matching.js';
import type { CanonicalDataset } from '../datasets/schema.js';
import type { ExposureRecord } from '../risk/riskTypes.js';

export function getLabelsForRecords(records: ExposureRecord[], dataset: Pick<CanonicalDataset, 'people' | 'groundTruthContacts'>): (0 | 1)[] {
  const { personToWearable } = buildIdentityMaps(dataset.people);
  
  // Group ground-truth contacts by canonical wearable pair
  const gtByPair = new Map<string, { startTime: number, endTime: number }[]>();
  for (const gt of dataset.groundTruthContacts) {
    const w1 = personToWearable.get(gt.personA);
    const w2 = personToWearable.get(gt.personB);
    if (!w1 || !w2) continue;
    
    const { key } = getCanonicalWearablePair(w1, w2);
    const intervals = gtByPair.get(key) ?? [];
    intervals.push({ startTime: gt.startTime, endTime: gt.endTime });
    gtByPair.set(key, intervals);
  }

  return records.map(r => {
    if (!r.targetWearableId || !r.sourceWearableId) return 0;
    const { key } = getCanonicalWearablePair(r.targetWearableId, r.sourceWearableId);
    
    const gtIntervals = gtByPair.get(key);
    if (!gtIntervals) return 0;
    
    // Check if the reconstructed session has ANY non-zero temporal intersection with ANY GT interval
    // Non-zero intersection: max(start1, start2) < min(end1, end2)
    for (const gt of gtIntervals) {
      const interStart = Math.max(r.sessionStartTime, gt.startTime);
      const interEnd = Math.min(r.sessionEndTime, gt.endTime);
      if (interStart < interEnd) {
        return 1;
      }
    }
    
    return 0;
  });
}

