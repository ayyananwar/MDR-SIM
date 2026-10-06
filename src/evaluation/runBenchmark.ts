/**
 * CLI Runner for Phase 5 Research Experiments.
 *
 * Usage:
 * npx tsx src/evaluation/runBenchmark.ts [--config experiments/phase4.json] [--out results/reference-run1] [--seeds 104729]
 */

import fs from 'fs';
import path from 'path';
import type { SimulationConfig } from '../simulation/scenarioTypes.js';
import { runMultiSeedExperiment, runBaselineComparisonExperiment } from './experimentRunner.js';

function run() {
  const args = process.argv.slice(2);
  let configPath = 'experiments/phase4.json';
  let outDir = 'results/reference-benchmark';
  let seeds = [104729];
  let runBaselines = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' && args[i + 1]) {
      configPath = args[++i];
    } else if (arg.startsWith('--config=')) {
      configPath = arg.split('=')[1];
    } else if (arg === '--out' && args[i + 1]) {
      outDir = args[++i];
    } else if (arg.startsWith('--out=')) {
      outDir = arg.split('=')[1];
    } else if (arg === '--seeds' && args[i + 1]) {
      seeds = args[++i].split(',').map(Number);
    } else if (arg.startsWith('--seeds=')) {
      seeds = arg.split('=')[1].split(',').map(Number);
    } else if (arg === '--baselines') {
      runBaselines = true;
    }
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as SimulationConfig;

  console.log(`[Research Benchmark] Loaded config: ${configPath}`);
  console.log(`[Research Benchmark] Output directory: ${outDir}`);
  console.log(`[Research Benchmark] Seeds: [${seeds.join(', ')}]`);

  runMultiSeedExperiment({
    experimentId: path.basename(outDir),
    experimentName: 'Phase 5 Reference Benchmark',
    baseConfig: rawConfig,
    seeds,
    outputDir: outDir,
  });

  if (runBaselines) {
    const baselineOut = path.join(outDir, 'baselines');
    runBaselineComparisonExperiment(rawConfig, baselineOut);
  }
}

run();
