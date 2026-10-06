import { ReceptionConfig } from './bleTypes.js';
import { RandomGenerator } from '../simulation/rng.js';

/**
 * Evaluates whether a transmitted BLE advertising event is successfully intercepted
 * and decoded by a receiver gateway.
 *
 * Models:
 * 1. Hardware receiver sensitivity floor (e.g. -95 dBm)
 * 2. Stochastic packet loss (unreliable wireless channel)
 * 3. Optional RSSI-dependent threshold degradation
 */
export function isPacketReceived(
  rssiDbm: number,
  config: ReceptionConfig,
  rng: RandomGenerator
): boolean {
  // 1. Hardware receiver sensitivity check
  if (
    config.receiverSensitivityDbm !== undefined &&
    rssiDbm < config.receiverSensitivityDbm
  ) {
    return false;
  }

  // 2. Boundary conditions for loss probability
  if (config.packetLossProbability >= 1.0) {
    return false;
  }
  if (config.packetLossProbability <= 0.0 && config.receptionMode !== 'rssi-dependent') {
    return true;
  }

  // 3. Reception probability calculation
  let lossProb = Math.max(0.0, Math.min(1.0, config.packetLossProbability));

  if (config.receptionMode === 'rssi-dependent' && config.receiverSensitivityDbm !== undefined) {
    // Model marginal link budget degradation within 10 dB of sensitivity threshold
    const marginDb = rssiDbm - config.receiverSensitivityDbm;
    if (marginDb < 10.0) {
      // Transition loss probability sharply towards 1.0 as margin vanishes
      const degradation = 1.0 / (1.0 + Math.exp(marginDb - 3.0));
      lossProb = Math.max(lossProb, degradation);
    }
  }

  // 4. Stochastic Bernoulli trial using seeded RNG
  const rand = rng.next();
  return rand >= lossProb;
}
