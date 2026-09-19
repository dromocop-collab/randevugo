export const LIVE_FEATURE_KEYS = [
  "liveFeaturesMaster",
  "liveAvailability",
  "liveQueue",
  "lastMinuteSlots",
  "availabilityAlerts",
  "liveOperations",
] as const;

export type LiveFeatureKey = (typeof LIVE_FEATURE_KEYS)[number];
export type LiveFeatureFlags = Record<LiveFeatureKey, boolean>;

export const DISABLED_LIVE_FEATURE_FLAGS: Readonly<LiveFeatureFlags> = {
  liveFeaturesMaster: false,
  liveAvailability: false,
  liveQueue: false,
  lastMinuteSlots: false,
  availabilityAlerts: false,
  liveOperations: false,
};

export function parseLiveFeatureFlags(value: unknown): LiveFeatureFlags {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DISABLED_LIVE_FEATURE_FLAGS };
  }

  const flags = value as Record<string, unknown>;
  if (LIVE_FEATURE_KEYS.some((key) => typeof flags[key] !== "boolean")) {
    return { ...DISABLED_LIVE_FEATURE_FLAGS };
  }

  return Object.fromEntries(LIVE_FEATURE_KEYS.map((key) => [key, flags[key]])) as LiveFeatureFlags;
}

export function resolveLiveFeatureAvailability(value: unknown) {
  const flags = parseLiveFeatureFlags(value);
  const master = flags.liveFeaturesMaster;
  return {
    isLiveFeaturesEnabled: master,
    isLiveAvailabilityEnabled: master && flags.liveAvailability,
    isLiveQueueEnabled: master && flags.liveQueue,
    isLastMinuteSlotsEnabled: master && flags.lastMinuteSlots,
    isAvailabilityAlertsEnabled: master && flags.availabilityAlerts,
    isLiveOperationsEnabled: master && flags.liveOperations,
  };
}

export function isBusinessLiveOperationsEnabled(
  availability: ReturnType<typeof resolveLiveFeatureAvailability>, businessEnabled: unknown
): boolean {
  return availability.isLiveQueueEnabled && availability.isLiveOperationsEnabled && businessEnabled === true;
}

export async function loadLiveFeatureAvailability(read: () => Promise<unknown>) {
  try {
    return resolveLiveFeatureAvailability(await read());
  } catch {
    return resolveLiveFeatureAvailability(null);
  }
}
