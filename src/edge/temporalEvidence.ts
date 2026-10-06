import { ProximityEvidence } from './edgeTypes.js';

export interface AccumulatedEvidenceCluster {
  wearableA: string;
  wearableB: string;
  startTimeMs: number;
  lastTimeMs: number;
  evidenceCount: number;
  supportingGateways: Set<string>;
  rssiSamplesA: number[];
  rssiSamplesB: number[];
  sourceObservationIds: string[];
}

/**
 * Groups raw proximity evidence records into temporal streams partitioned by canonical pair.
 */
export function groupEvidenceByPair(
  evidenceList: readonly ProximityEvidence[]
): Map<string, ProximityEvidence[]> {
  const pairMap = new Map<string, ProximityEvidence[]>();

  for (const ev of evidenceList) {
    const key = `${ev.wearableA}::${ev.wearableB}`;
    let list = pairMap.get(key);
    if (!list) {
      list = [];
      pairMap.set(key, list);
    }
    list.push(ev);
  }

  return pairMap;
}
