// ============================================================
// Formatting Utilities
// ============================================================

/**
 * Format a timestamp as HH:MM:SS
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a timestamp as HH:MM
 */
export function formatTimeShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format duration in seconds to human-readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format RSSI value with unit
 */
export function formatRSSI(rssi: number): string {
  return `${rssi} dBm`;
}

/**
 * Format distance in meters
 */
export function formatDistance(meters: number): string {
  return `${meters.toFixed(1)} m`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format large numbers with abbreviations
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Get human-readable room name
 */
export function getRoomName(roomId: string): string {
  const names: Record<string, string> = {
    'reception': 'Reception',
    'waiting-area': 'Waiting Area',
    'ward-a': 'Ward A',
    'ward-b': 'Ward B',
    'icu': 'ICU',
    'laboratory': 'Laboratory',
    'radiology': 'Radiology',
    'doctor-room-1': 'Doctor Room 1',
    'doctor-room-2': 'Doctor Room 2',
    'doctor-room-3': 'Doctor Room 3',
    'doctor-room-4': 'Doctor Room 4',
    'corridor-main': 'Main Corridor',
    'corridor-upper': 'Upper Corridor',
    'nurse-station': 'Nurse Station',
    'cafeteria': 'Cafeteria',
    'pharmacy': 'Pharmacy',
    'exit': 'Exit',
  };
  return names[roomId] || roomId;
}

/**
 * Get role display color
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case 'patient': return '#3B82F6';
    case 'doctor': return '#10B981';
    case 'nurse': return '#8B5CF6';
    case 'visitor': return '#F97316';
    default: return '#6B7280';
  }
}

/**
 * Get role background color (light)
 */
export function getRoleBgColor(role: string): string {
  switch (role) {
    case 'patient': return '#EFF6FF';
    case 'doctor': return '#ECFDF5';
    case 'nurse': return '#F5F3FF';
    case 'visitor': return '#FFF7ED';
    default: return '#F9FAFB';
  }
}
