import { RSSIFilterConfig } from './edgeTypes.js';

/**
 * Online Causal RSSI Filter.
 *
 * Maintains independent sliding state per (wearableId, gatewayId) stream.
 * Strictly causal: a filtered value at time t depends only on samples <= t,
 * with zero look-ahead into future observations.
 */
export class CausalRSSIFilter {
  private config: RSSIFilterConfig;
  private history: Map<string, number[]> = new Map();
  private emaState: Map<string, number> = new Map();

  constructor(config: RSSIFilterConfig) {
    this.config = config;
  }

  /**
   * Process a single incoming sample for a specific receiver link in real time.
   *
   * @param wearableId Emitting beacon ID
   * @param gatewayId Receiving gateway ID
   * @param rawRssi Raw observed signal strength in dBm
   * @returns Causally smoothed RSSI in dBm
   */
  filter(wearableId: string, gatewayId: string, rawRssi: number): number {
    if (this.config.method === 'none') {
      return rawRssi;
    }

    const key = `${wearableId}::${gatewayId}`;

    if (this.config.method === 'ema') {
      const alpha = Math.max(0.01, Math.min(1.0, this.config.alpha ?? 0.3));
      const prev = this.emaState.get(key);
      if (prev === undefined) {
        this.emaState.set(key, rawRssi);
        return rawRssi;
      }
      const smoothed = alpha * rawRssi + (1 - alpha) * prev;
      this.emaState.set(key, smoothed);
      return Math.round(smoothed * 100) / 100;
    }

    // Moving average or Median
    let window = this.history.get(key);
    if (!window) {
      window = [];
      this.history.set(key, window);
    }

    window.push(rawRssi);
    const windowSize = Math.max(1, this.config.windowSize);
    if (window.length > windowSize) {
      window.shift();
    }

    if (this.config.method === 'moving-average') {
      const sum = window.reduce((acc, v) => acc + v, 0);
      const mean = sum / window.length;
      return Math.round(mean * 100) / 100;
    }

    if (this.config.method === 'median') {
      const sorted = [...window].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
      return Math.round(median * 100) / 100;
    }

    return rawRssi;
  }

  reset(): void {
    this.history.clear();
    this.emaState.clear();
  }
}
