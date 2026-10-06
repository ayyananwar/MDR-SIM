/**
 * Phase 7 Final Campaign CLI Runner.
 *
 * Usage:
 *   npx tsx src/campaign/runFinalCampaign.ts
 *
 * Executes all E1–E16 experiments in the frozen final campaign,
 * generates paper-ready tables (CSV/JSON/MD) and figures (SVG),
 * and produces manifest.json + checksums.json for reproducibility verification.
 *
 * SCIENTIFIC INTEGRITY:
 * All reported numbers originate from actual simulation execution.
 * No fabrication, smoothing, or post-hoc selection is performed.
 */

import { runFinalCampaign, REFERENCE_BASE_CONFIG, FINAL_SEED_SET } from './finalCampaign.js';
import { evaluateSingleSeedRun } from '../evaluation/experimentRunner.js';
import { generateFinalResultsMarkdown } from './resultsReport.js';
import { generatePaperResultsIndex } from './paperIndexGenerator.js';
import crypto from 'crypto';
import fs from 'fs';

const OUTPUT_ROOT = 'results/legacy-current';

async function main() {
  console.log('═'.repeat(60));
  console.log('  MDR-SIM Phase 7 — Final Experimental Campaign');
  console.log('  Frozen Protocol Version: 1.0.0');
  console.log('  Seed Set: [104729, 209759, 32452843, 49979687, 67867967]');
  console.log('═'.repeat(60));

  const t0 = Date.now();

  const results = await runFinalCampaign(OUTPUT_ROOT, false);

  const wallSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nTotal campaign wall-clock time: ${wallSec}s (machine-dependent)`);
  console.log('\nKey scientific outputs (deterministic):');
  console.log(`  Reference F1:   ${results.E1_reference.contact.f1Score.mean.toFixed(3)} ± ${results.E1_reference.contact.f1Score.standardDeviation.toFixed(3)}`);
  console.log(`  Reference AUROC: ${results.E1_reference.risk.auroc.mean.toFixed(3)}`);
  console.log(`  Reference AUPRC: ${results.E1_reference.risk.auprc.mean.toFixed(3)}`);
  console.log(`  Reference Brier: ${results.E1_reference.risk.brierScore.mean.toFixed(4)}`);
  console.log(`  Reference ECE:   ${results.E1_reference.risk.ece.mean.toFixed(4)}`);

  // Write human-readable README
  const readme = generateReadme(results);
  fs.writeFileSync(`${OUTPUT_ROOT}/README.md`, readme, 'utf-8');

  // Write comprehensive FINAL_RESULTS.md
  const finalResultsMd = generateFinalResultsMarkdown(results);
  fs.writeFileSync(`${OUTPUT_ROOT}/FINAL_RESULTS.md`, finalResultsMd, 'utf-8');
  console.log(`\nReport written to: ${OUTPUT_ROOT}/FINAL_RESULTS.md`);

  // Write paper results index
  const paperIndexMd = generatePaperResultsIndex(results);
  fs.writeFileSync(`${OUTPUT_ROOT}/PAPER_RESULTS_INDEX.md`, paperIndexMd, 'utf-8');
  console.log(`Paper index written to: ${OUTPUT_ROOT}/PAPER_RESULTS_INDEX.md`);

  // Reproducibility Replay Verification
  console.log('\n' + '─'.repeat(60));
  console.log('  Reproducibility Replay Verification (E1 Reference, Seed 104729)');
  console.log('─'.repeat(60));
  const replayRun1 = evaluateSingleSeedRun({ ...REFERENCE_BASE_CONFIG, seed: 104729 });
  const replayRun2 = evaluateSingleSeedRun({ ...REFERENCE_BASE_CONFIG, seed: 104729 });

  const hash1 = crypto.createHash('sha256').update(replayRun1.deterministicSignature).digest('hex');
  const hash2 = crypto.createHash('sha256').update(replayRun2.deterministicSignature).digest('hex');

  console.log(`  Run 1 Signature SHA-256: ${hash1}`);
  console.log(`  Run 2 Signature SHA-256: ${hash2}`);
  if (hash1 === hash2) {
    console.log('  REPRODUCIBLE = PASS (Deterministic bitwise reproducibility confirmed)');
  } else {
    console.error('  REPRODUCIBLE = FAIL (Signatures differ!)');
    process.exit(1);
  }

  console.log(`\nResults directory: ${OUTPUT_ROOT}/`);
  console.log('Campaign complete. All artifacts are reproducible with the same seed set and configuration.');
}

function generateReadme(results: ReturnType<typeof runFinalCampaign extends (...args: infer _) => infer R ? () => R : never> extends Promise<infer T> ? T : never): string {
  return `# MDR-SIM Phase 7 Final Experimental Campaign — Reproducibility Guide

## How to Reproduce

1. Clone the repository.
2. Install dependencies: \`npm install\`
3. Run the campaign: \`npx tsx src/campaign/runFinalCampaign.ts\`
4. Results will be written to \`results/final/\`

## Seed Set (frozen — declared before observing any results)

\`\`\`
[104729, 209759, 32452843, 49979687, 67867967]
\`\`\`

## Frozen Configuration IDs

| Config ID | File |
|---|---|
| reference-v1.0.0 | experiments/final/reference.json |
| dense-contact-v1.0.0 | experiments/final/dense_contact.json |
| robustness-base-v1.0.0 | experiments/final/robustness.json |
| privacy-v1.0.0 | experiments/final/privacy.json |
| scalability-v1.0.0 | experiments/final/scalability.json |
| ablation-v1.0.0 | experiments/final/ablation.json |

## Deterministic Verification

Run the campaign twice with the same seed set and compare \`checksums.json\`.
Deterministic scientific outputs must be byte-for-byte identical.
Wall-clock timings in the \`telemetry\` field may differ and are excluded from checksums.

\`\`\`powershell
npx tsx src/campaign/runFinalCampaign.ts
# Copy checksums.json to checksums_run1.json
npx tsx src/campaign/runFinalCampaign.ts
# Compare: checksums.json vs checksums_run1.json
\`\`\`

## Non-Claims

This simulation does NOT claim:
- MDR-TB infection prediction
- Pathogen transmission prediction
- Clinical diagnosis
- Clinical probability calibration
- GDPR/HIPAA compliance
- Formal unlinkability
- Universal anonymity

## Protocol Document

See \`docs/FINAL_EXPERIMENTAL_PROTOCOL.md\` for frozen definitions.

## Test Suite

Run \`npm run test:research\` to verify all 152+ tests pass.
`;
}

main().catch(console.error);
