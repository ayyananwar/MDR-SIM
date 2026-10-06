# Simulation Reproducibility Guide

## 1. Seed Handling & Determinism

All stochastic processes in the Phase 1 simulation architecture use an isolated, instance-based pseudorandom number generator (`SeededRandom` implementing Mulberry32). 

Key design properties:
- **Zero Global State**: No calls to `Math.random()`. Every stochastic entity generator, movement step, and initial coordinate draws exclusively from the explicitly passed `RandomGenerator`.
- **Seed Invariance**:
  $$\text{Seed } S_0 + \text{Config } C \implies \text{Dataset } D_{\text{identical}}$$
  Running the generator multiple times with the same seed yields byte-for-byte identical coordinate trajectories, room assignments, and ground truth contact sessions.
- **Seed Sensitivity**:
  Changing the seed ($S_1 \neq S_2$) generates a distinct stochastic trajectory while adhering to the same structural and architectural constraints.

---

## 2. Dataset Generation Commands

### Generating the Reference Phase 1 Dataset
Using the default configuration:
```bash
npm run dataset:generate -- --config experiments/phase1.json --out output/dataset
```

### Overriding Seed via Command Line
```bash
npm run dataset:generate -- --config experiments/phase1.json --seed 54321 --out output/experiment_54321
```

### Expected Output Files
The dataset directory contains the following serialized JSON files:
- `metadata.json`: Scenario versions, timestamp, seed, and summary counts.
- `experiment_manifest.json`: Full configuration parameters required to reproduce the run.
- `rooms.json`: Metric geometry and classifications of all hospital rooms.
- `gateways.json`: Fixed receiver coordinates and room links.
- `people.json`: Population entity profiles, roles, and initial coordinates.
- `movement_states.json`: Discrete time-series of physical coordinates $(x, y)$ for all entities.
- `ground_truth_contacts.json`: Verified proximity sessions with duration and distance samples.

---

## 3. Running Automated Research Tests

To verify determinism, Euclidean distance calculations, contact thresholding, pair symmetry, and architectural independence:

```bash
npm run test:research
```

All tests execute synchronously in a node environment using `tsx`.
