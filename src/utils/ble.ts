// ============================================================
// BLE Simulation Helpers
// ============================================================

/**
 * Calculate distance from RSSI using Log-Distance Path Loss Model
 * RSSI = -10 * n * log10(d) + A
 * where n = path loss exponent (2-4), A = RSSI at 1m reference
 */
export function rssiToDistance(rssi: number, txPower: number = -59, pathLoss: number = 2.5): number {
  if (rssi >= 0) return 0;
  const ratio = (txPower - rssi) / (10 * pathLoss);
  return Math.round(Math.pow(10, ratio) * 100) / 100;
}

/**
 * Calculate RSSI from pixel distance on the simulation map
 * Maps screen distance to realistic RSSI values
 */
export function distanceToRSSI(pixelDistance: number, scaleFactor: number = 0.02): number {
  const realDistance = pixelDistance * scaleFactor; // Convert pixels to meters
  if (realDistance <= 0) return -30;
  const rssi = -59 - 25 * Math.log10(realDistance);
  return Math.round(Math.max(-100, Math.min(-30, rssi)));
}

/**
 * Check if two positions are within BLE range
 */
export function isInBLERange(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
  range: number = 120 // pixels
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) <= range;
}

/**
 * Calculate pixel distance between two positions
 */
export function pixelDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate a realistic BLE advertisement type
 */
export function randomAdvertType(): 'ADV_NONCONN_IND' | 'ADV_IND' | 'ADV_SCAN_IND' {
  const r = Math.random();
  if (r < 0.7) return 'ADV_NONCONN_IND';
  if (r < 0.9) return 'ADV_IND';
  return 'ADV_SCAN_IND';
}

/**
 * Simulate battery drain
 */
export function simulateBatteryDrain(currentBattery: number): number {
  const drain = Math.random() * 0.05;
  return Math.max(5, Math.round((currentBattery - drain) * 100) / 100);
}

/**
 * Generate realistic CPU usage
 */
export function simulateCPU(baseLoad: number = 15): number {
  const spike = Math.random() * 30;
  return Math.round(Math.min(95, baseLoad + spike));
}

/**
 * Generate realistic memory usage
 */
export function simulateMemory(baseLoad: number = 40): number {
  const variation = (Math.random() - 0.5) * 10;
  return Math.round(Math.min(90, Math.max(20, baseLoad + variation)));
}
