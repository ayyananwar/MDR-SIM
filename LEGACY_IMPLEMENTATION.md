# Legacy Implementation Baseline

This document records the original simulation and dataset generation architecture of the hospital contact-tracing simulator prior to the introduction of the Phase 1 Research Architecture.

## 1. Architectural Role

The legacy implementation was created as an interactive web prototype to demonstrate real-time visual tracking, simulated BLE signal fluctuation, and immediate heuristic contact counting. It is intentionally preserved to serve as a baseline and to maintain full backward compatibility with the existing React dashboard UI.

## 2. Legacy Components

### 2.1 Simulation Loop & Clock
- **Location**: `src/hooks/useSimulationEngine.ts`, `src/stores/useHospitalStore.ts`
- **Clock Mechanism**: Implemented using React `setInterval` timers (`1000 / simulationSpeed` ms).
- **Limitation**: Event timing was intrinsically coupled to browser frame rate, JavaScript event loop latency, and UI rendering speed. It lacked an independent, deterministic simulation clock.

### 2.2 Coordinate System & Room Layout
- **Location**: `src/data/simulation.ts`
- **Coordinate System**: Scaled 2D SVG canvas pixel coordinates ($x \in [0, 800]$, $y \in [0, 600]$).
- **Limitation**: Dimensions represented display pixels rather than physical metric units (meters). Room centers and boundaries were hardcoded display coordinates.

### 2.3 Movement Engine
- **Location**: `src/data/simulation.ts` (`updatePositions`), `src/hooks/useSimulationEngine.ts`
- **Movement Logic**: Ad-hoc jitter towards assigned room centers using uncontrolled `Math.random()`.
- **Limitation**: Movement was non-deterministic, lacked seeded reproducibility, and did not guarantee invariant room boundary containment.

### 2.4 Contact Detection & Ground Truth Conflation
- **Location**: `src/hooks/useSimulationEngine.ts` (instantaneous RSSI thresholding)
- **Mechanism**: Contacts were flagged directly when simulated RSSI was $\ge -75\text{ dBm}$ (or pixel distance was below a pixel threshold).
- **Scientific Issue**: Ground truth was not generated independently from the simulated sensor reading. True physical proximity was conflated with noisy BLE observations.

### 2.5 Duplicate Dataset Generators
- **Legacy Python Generator**: `scripts/generate_dataset.py` produced synthetic CSV/JSON files using arbitrary probabilistic thresholds that did not match the TypeScript UI state machine.
- **UI Generator Stub**: `src/modules/dataset-generator/` contained a frontend interface placeholder without unified export logic.

## 3. Transition to Research Architecture

The legacy components remain intact for visual dashboard rendering, but all research-grade experiments, deterministic scenario evaluations, and dataset pipelines now route through the canonical `src/simulation/` and `src/datasets/` modules introduced in Phase 1.
