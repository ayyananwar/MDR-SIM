// ============================================================
// MedTrace Smart Hospital - Client-Side Synthetic Dataset & DBN CPT Generator
// IEEE Publication Suite & WHO/CDC Transmission Model
// ============================================================

export interface ContactRecord {
  Contact_ID: string;
  Timestamp_Start: string;
  Timestamp_End: string;
  Contact_Duration: number;
  Patient_A_ID: string;
  Patient_B_ID: string;
  Ward_Type: 'General' | 'ICU' | 'Isolation' | 'OPD';
  RSSI: number;
  Estimated_Distance: number;
  Distance_Category: 'Close' | 'Moderate' | 'Far';
  Contact_Recurrence: number;
  Temporal_Decay: number;
  Infectious_Source: 'Yes' | 'No';
  Ventilation_Level: 'Poor' | 'Moderate' | 'Good';
  Mask_Compliance: 'None' | 'Partial' | 'Full';
  Gateway_ID: string;
  Time_of_Day: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  Ground_Truth_Risk: 'Low' | 'Medium' | 'High';
}

export interface SummaryStat {
  variable: string;
  count: number;
  mean: number | string;
  std: number | string;
  min: number | string;
  median: number | string;
  max: number | string;
  mode: string;
}

export interface PriorProbability {
  variable: string;
  state: string;
  probability: number;
}

export interface CPTEntry {
  condition: string;
  lowProb: number;
  mediumProb: number;
  highProb: number;
}

// Simple Linear Congruential Generator (LCG) for reproducible pseudo-random numbers
class SeededRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  exponential(rate: number): number {
    return -Math.log(1.0 - this.next()) / rate;
  }

  normal(mean: number = 0, std: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 === 0) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * std + mean;
  }

  choice<T>(arr: T[], weights?: number[]): T {
    if (!weights) {
      const idx = Math.floor(this.next() * arr.length);
      return arr[idx];
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * totalWeight;
    for (let i = 0; i < arr.length; i++) {
      if (r < weights[i]) return arr[i];
      r -= weights[i];
    }
    return arr[arr.length - 1];
  }
}

export function generateSyntheticDataset(
  numRecords: number = 10000,
  seed: number = 42,
  pathLossN: Record<string, number> = { General: 2.4, ICU: 2.2, Isolation: 3.0, OPD: 2.6 }
): { records: ContactRecord[]; summaryStats: SummaryStat[]; priors: PriorProbability[] } {
  const rng = new SeededRandom(seed);

  const wards: Array<'General' | 'ICU' | 'Isolation' | 'OPD'> = ['General', 'ICU', 'Isolation', 'OPD'];
  const wardProbs = [0.45, 0.20, 0.10, 0.25];

  const gateways: Record<string, string[]> = {
    General: ['GW-GEN-01', 'GW-GEN-02', 'GW-GEN-03'],
    ICU: ['GW-ICU-01', 'GW-ICU-02'],
    Isolation: ['GW-ISO-01'],
    OPD: ['GW-OPD-01', 'GW-OPD-02', 'GW-OPD-03'],
  };

  const patientIds = Array.from({ length: 200 }, (_, i) => `PAT-${String(i + 1).padStart(4, '0')}`);
  const doctorIds = Array.from({ length: 30 }, (_, i) => `DOC-${String(i + 1).padStart(3, '0')}`);
  const nurseIds = Array.from({ length: 50 }, (_, i) => `NUR-${String(i + 1).padStart(3, '0')}`);
  const allSubjects = [...patientIds, ...doctorIds, ...nurseIds];

  const infectiousSubjects = new Set(patientIds.slice(0, 20)); // ~10% infectious index patients

  const records: ContactRecord[] = [];
  const baseTime = new Date('2026-08-01T08:00:00Z').getTime();

  for (let i = 1; i <= numRecords; i++) {
    const contactId = `CNT-${String(i).padStart(6, '0')}`;
    const ward = rng.choice(wards, wardProbs);
    const gateway = rng.choice(gateways[ward]);

    const subjA = rng.choice(allSubjects);
    let subjB = rng.choice(allSubjects);
    while (subjB === subjA) subjB = rng.choice(allSubjects);

    const offsetMins = Math.floor(rng.next() * 14 * 24 * 60);
    const startTimeMs = baseTime + offsetMins * 60 * 1000;
    const startDate = new Date(startTimeMs);
    const hour = startDate.getUTCHours();

    let tod: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
    if (hour >= 6 && hour < 12) tod = 'Morning';
    else if (hour >= 12 && hour < 17) tod = 'Afternoon';
    else if (hour >= 17 && hour < 22) tod = 'Evening';
    else tod = 'Night';

    const meanDur = ward === 'Isolation' ? 15.0 : ward === 'ICU' ? 25.0 : ward === 'OPD' ? 12.0 : 20.0;
    let duration = Number((rng.exponential(1.0 / meanDur) + 1.0).toFixed(2));
    duration = Math.min(duration, 240.0);

    const endDate = new Date(startTimeMs + Math.round(duration * 60 * 1000));

    // Log distance distribution
    const distRaw = Math.exp(rng.normal(0.8, 0.6));
    const distance = Number(Math.max(0.3, Math.min(distRaw, 12.0)).toFixed(2));

    let distCat: 'Close' | 'Moderate' | 'Far';
    if (distance < 1.5) distCat = 'Close';
    else if (distance <= 4.0) distCat = 'Moderate';
    else distCat = 'Far';

    // BLE RSSI Path Loss
    const n = pathLossN[ward] || 2.4;
    const rssiTheo = -59.0 - 10.0 * n * Math.log10(distance);
    const noise = rng.normal(0, 3.5);
    const bodyAtten = distCat === 'Close' && rng.next() < 0.6 ? -4.0 : 0.0;
    let rssi = Number((rssiTheo + noise + bodyAtten).toFixed(1));
    rssi = Math.max(-98.0, Math.min(-30.0, rssi));

    const estDistance = Number(Math.pow(10, (-59.0 - rssi) / (10.0 * n)).toFixed(2));

    const isStaff = subjA.startsWith('DOC') || subjA.startsWith('NUR') || subjB.startsWith('DOC') || subjB.startsWith('NUR');
    const recurrence = Math.min(30, Math.round(rng.exponential(1.0 / (isStaff ? 5.5 : 1.2))));

    const daysAgo = rng.next() * 7.0;
    const decayLambda = Math.LN2 / 7.0;
    const temporalDecay = Number(Math.exp(-decayLambda * daysAgo).toFixed(4));

    const isInfectious: 'Yes' | 'No' = infectiousSubjects.has(subjA) || infectiousSubjects.has(subjB) ? 'Yes' : 'No';

    const ventProbs = ward === 'Isolation' ? [0.02, 0.18, 0.8] : ward === 'ICU' ? [0.1, 0.4, 0.5] : [0.35, 0.45, 0.2];
    const ventLevel = rng.choice(['Poor', 'Moderate', 'Good'] as Array<'Poor' | 'Moderate' | 'Good'>, ventProbs);

    const maskProbs = ward === 'Isolation' ? [0.02, 0.08, 0.9] : ward === 'ICU' ? [0.15, 0.35, 0.5] : [0.4, 0.45, 0.15];
    const maskComp = rng.choice(['None', 'Partial', 'Full'] as Array<'None' | 'Partial' | 'Full'>, maskProbs);

    let risk: 'Low' | 'Medium' | 'High';
    if (isInfectious === 'No') {
      risk = 'Low';
    } else {
      const durWeight = Math.min(1.0, duration / 60.0);
      const distFactor = distCat === 'Close' ? 1.0 : distCat === 'Moderate' ? 0.45 : 0.1;
      const ventFactor = ventLevel === 'Poor' ? 1.0 : ventLevel === 'Moderate' ? 0.5 : 0.2;
      const maskFactor = maskComp === 'None' ? 1.0 : maskComp === 'Partial' ? 0.5 : 0.1;
      const recurMult = 1.0 + 0.12 * Math.min(5, recurrence);

      const exposureScore = durWeight * distFactor * ventFactor * maskFactor * recurMult * temporalDecay;

      if (exposureScore >= 0.18) risk = 'High';
      else if (exposureScore >= 0.04) risk = 'Medium';
      else risk = 'Low';
    }

    records.push({
      Contact_ID: contactId,
      Timestamp_Start: startDate.toISOString().replace('T', ' ').substring(0, 19),
      Timestamp_End: endDate.toISOString().replace('T', ' ').substring(0, 19),
      Contact_Duration: duration,
      Patient_A_ID: subjA,
      Patient_B_ID: subjB,
      Ward_Type: ward,
      RSSI: rssi,
      Estimated_Distance: estDistance,
      Distance_Category: distCat,
      Contact_Recurrence: recurrence,
      Temporal_Decay: temporalDecay,
      Infectious_Source: isInfectious,
      Ventilation_Level: ventLevel,
      Mask_Compliance: maskComp,
      Gateway_ID: gateway,
      Time_of_Day: tod,
      Ground_Truth_Risk: risk,
    });
  }

  // Summary statistics computation
  const numericKeys: Array<keyof ContactRecord> = ['Contact_Duration', 'RSSI', 'Estimated_Distance', 'Contact_Recurrence', 'Temporal_Decay'];
  const summaryStats: SummaryStat[] = Object.keys(records[0]).map((key) => {
    const field = key as keyof ContactRecord;
    if (numericKeys.includes(field)) {
      const vals = records.map((r) => Number(r[field])).sort((a, b) => a - b);
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const sqDiffs = vals.map((v) => Math.pow(v - mean, 2));
      const std = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / vals.length);
      const median = vals[Math.floor(vals.length * 0.5)];
      return {
        variable: key,
        count: vals.length,
        mean: Number(mean.toFixed(2)),
        std: Number(std.toFixed(2)),
        min: Number(vals[0].toFixed(2)),
        median: Number(median.toFixed(2)),
        max: Number(vals[vals.length - 1].toFixed(2)),
        mode: `${vals[Math.floor(vals.length * 0.3)]}`,
      };
    } else {
      const counts: Record<string, number> = {};
      records.forEach((r) => {
        const val = String(r[field]);
        counts[val] = (counts[val] || 0) + 1;
      });
      let mode = '';
      let maxC = 0;
      Object.entries(counts).forEach(([k, v]) => {
        if (v > maxC) {
          maxC = v;
          mode = k;
        }
      });
      return {
        variable: key,
        count: records.length,
        mean: 'N/A',
        std: 'N/A',
        min: 'N/A',
        median: 'N/A',
        max: 'N/A',
        mode: `${mode} (${((maxC / records.length) * 100).toFixed(1)}%)`,
      };
    }
  });

  // Prior probabilities computation
  const catFields: Array<keyof ContactRecord> = ['Ward_Type', 'Distance_Category', 'Infectious_Source', 'Ventilation_Level', 'Mask_Compliance', 'Ground_Truth_Risk'];
  const priors: PriorProbability[] = [];
  catFields.forEach((field) => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      const val = String(r[field]);
      counts[val] = (counts[val] || 0) + 1;
    });
    Object.entries(counts).forEach(([st, c]) => {
      priors.push({
        variable: String(field),
        state: st,
        probability: Number((c / records.length).toFixed(4)),
      });
    });
  });

  return { records, summaryStats, priors };
}

export function convertToCSV(records: ContactRecord[]): string {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]).join(',');
  const rows = records.map((r) => Object.values(r).join(',')).join('\n');
  return `${headers}\n${rows}`;
}
