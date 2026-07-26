export interface OnlineStatus {
  isOnline: boolean;
  lastSeenText: string;
  lastSeenMinutes?: number;
}

/**
 * Calculate online status based on lastActiveAt timestamp
 * - Online: active within last 5 minutes
 * - Recently active: 5-60 minutes ago
 * - Hours ago: 1-24 hours ago
 * - Days ago: more than 24 hours
 */
export function getOnlineStatus(lastActiveAt: Date | null): OnlineStatus {
  if (!lastActiveAt) {
    return {
      isOnline: false,
      lastSeenText: 'Belum pernah aktif',
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - new Date(lastActiveAt).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Online if active within last 5 minutes
  if (diffMinutes < 5) {
    return {
      isOnline: true,
      lastSeenText: 'Online',
      lastSeenMinutes: diffMinutes,
    };
  }

  // Recently active (5-60 minutes)
  if (diffMinutes < 60) {
    return {
      isOnline: false,
      lastSeenText: `Aktif ${diffMinutes} menit yang lalu`,
      lastSeenMinutes: diffMinutes,
    };
  }

  // Hours ago (1-24 hours)
  if (diffHours < 24) {
    return {
      isOnline: false,
      lastSeenText: `Aktif ${diffHours} jam yang lalu`,
      lastSeenMinutes: diffMinutes,
    };
  }

  // Days ago
  if (diffDays === 1) {
    return {
      isOnline: false,
      lastSeenText: 'Aktif kemarin',
      lastSeenMinutes: diffMinutes,
    };
  }

  if (diffDays < 7) {
    return {
      isOnline: false,
      lastSeenText: `Aktif ${diffDays} hari yang lalu`,
      lastSeenMinutes: diffMinutes,
    };
  }

  // More than a week
  return {
    isOnline: false,
    lastSeenText: 'Tidak aktif',
    lastSeenMinutes: diffMinutes,
  };
}
