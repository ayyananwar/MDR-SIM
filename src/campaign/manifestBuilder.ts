/**
 * Phase 7 Manifest & Checksum Builder.
 *
 * Creates:
 * - manifest.json: Campaign configuration, experiment registry, host environment
 * - checksums.json: SHA-256 hashes of deterministic scientific artifacts
 *
 * CRITICAL: Wall-clock telemetry is EXCLUDED from deterministic checksums.
 * Only scientifically deterministic outputs are included in checksum computation.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import type { CampaignManifest, ChecksumManifest, ChecksumRecord } from './campaignTypes.js';
import type { CampaignResults } from './campaignTypes.js';
import { FINAL_SEED_SET } from './finalCampaign.js';

// ─── Manifest builder ─────────────────────────────────────────────────────────

export function buildManifest(
  results: CampaignResults,
  outputRoot: string
): CampaignManifest {
  const makeEntry = (
    experimentId: string,
    configId: string,
    seeds: number[],
    outputFiles: string[]
  ) => ({
    experimentId,
    configId,
    configVersion: '1.0.0',
    seedList: seeds,
    status: 'completed' as const,
    generatedAt: '2026-01-01T00:00:00.000Z',
    outputFiles,
  });

  const experiments = [
    makeEntry('E1_reference', 'reference-v1.0.0', [...FINAL_SEED_SET], ['E1_reference.json']),
    makeEntry('E2_dense', 'dense-contact-v1.0.0', [...FINAL_SEED_SET], ['E2_dense.json']),
    makeEntry('E3_baseline_comparison', 'reference-v1.0.0', [...FINAL_SEED_SET], ['E3_baseline.json']),
    makeEntry('E4_ablation', 'ablation-v1.0.0', [...FINAL_SEED_SET], ['E4_ablation.json']),
    ...results.E5_rssiSweep.map((r) => makeEntry(r.experimentId, 'robustness-base-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E6_packetLossSweep.map((r) => makeEntry(r.experimentId, 'robustness-base-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E7_advIntervalSweep.map((r) => makeEntry(r.experimentId, 'robustness-base-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E8_gatewayDensitySweep.map((r) => makeEntry(r.experimentId, 'robustness-base-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E9_privacyRotationSweep.map((r) => makeEntry(r.experimentId, 'privacy-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E10_privacyNoiseSweep.map((r) => makeEntry(r.experimentId, 'privacy-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E11_privacyPacketLossSweep.map((r) => makeEntry(r.experimentId, 'privacy-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    ...results.E12_privacyGatewaySweep.map((r) => makeEntry(r.experimentId, 'privacy-v1.0.0', [...FINAL_SEED_SET], [`${r.experimentId}.json`])),
    makeEntry('E13_utility', 'privacy-v1.0.0', [...FINAL_SEED_SET], ['privacy_campaign.json']),
    makeEntry('E14_privacy_multi_seed', 'privacy-v1.0.0', [...FINAL_SEED_SET], ['privacy_campaign.json']),
    ...results.E15_scalability.map((r) => makeEntry(r.experimentId, 'scalability-v1.0.0', [...FINAL_SEED_SET], ['E15_scalability.json'])),
  ];

  return {
    campaignVersion: '7.0.0',
    protocolVersion: '1.0.0',
    seedSet: [...FINAL_SEED_SET],
    frozenConfigIds: [
      'reference-v1.0.0',
      'dense-contact-v1.0.0',
      'robustness-base-v1.0.0',
      'privacy-v1.0.0',
      'scalability-v1.0.0',
      'ablation-v1.0.0',
    ],
    experiments,
    hostEnvironment: {
      platform: `${os.platform()} ${os.release()}`,
      nodeVersion: process.version,
      cpuModel: os.cpus()[0]?.model,
      note: 'machine-dependent — wall-clock timings should not be used for scientific comparison',
    },
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// ─── Checksum builder ─────────────────────────────────────────────────────────

function sha256ofFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Scan the output directory for deterministic JSON files and compute SHA-256 checksums.
 * Wall-clock-containing fields (telemetry) are stripped before hashing.
 */
export function buildChecksums(outputRoot: string): ChecksumManifest {
  const records: ChecksumRecord[] = [];

  // Files that contain deterministic scientific outputs
  const deterministicFiles = [
    'E1_reference.json',
    'E2_dense.json',
    'E3_baseline.json',
    'E4_ablation.json',
    ...['0.0', '3.0', '6.0', '10.0', '15.0'].map((n) => `E5_rssi_${n}dB.json`),
    ...['0', '5', '20', '40', '60'].map((n) => `E6_ploss_${n}pct.json`),
    ...['200', '500', '1000', '2000'].map((ms) => `E7_adv_${ms}ms.json`),
    ...['4', '6', '8', '12'].map((n) => `E8_gw_${n}.json`),
    'E15_scalability.json',
    'privacy_campaign.json',
  ];

  for (const filename of deterministicFiles) {
    const filePath = path.join(outputRoot, filename);
    if (!fs.existsSync(filePath)) continue;

    try {
      // Parse and strip machine-dependent telemetry before hashing
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const sanitized = stripTelemetry(raw);
      const content = JSON.stringify(sanitized);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      records.push({
        artifactId: filename.replace('.json', ''),
        filePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
        sha256: hash,
        isDeterministic: true,
      });
    } catch {
      // If file can't be parsed, still record it with raw hash
      const hash = sha256ofFile(filePath);
      if (hash) {
        records.push({
          artifactId: filename.replace('.json', ''),
          filePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
          sha256: hash,
          isDeterministic: false,
          note: 'raw hash — may include machine-dependent data',
        });
      }
    }
  }

  // Also hash figures (SVG content is deterministic)
  const figuresDir = path.join(outputRoot, 'figures');
  if (fs.existsSync(figuresDir)) {
    for (const fig of fs.readdirSync(figuresDir).filter((f) => f.endsWith('.svg'))) {
      const hash = sha256ofFile(path.join(figuresDir, fig));
      if (hash) {
        records.push({
          artifactId: fig.replace('.svg', ''),
          filePath: `${path.relative(process.cwd(), figuresDir).replace(/\\/g, '/')}/${fig}`,
          sha256: hash,
          isDeterministic: true,
          note: 'SVG figure generated from deterministic experiment data',
        });
      }
    }
  }

  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    records,
  };
}

/**
 * Recursively remove machine-dependent telemetry fields from an object before hashing.
 */
function stripTelemetry(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripTelemetry);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    // Skip telemetry fields
    if (k === 'telemetry' || k === 'hostEnvironment' || k === 'wallClockMs' || k === 'cpuModel') continue;
    result[k] = stripTelemetry(v);
  }
  return result;
}
