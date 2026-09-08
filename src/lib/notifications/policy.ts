import type { NotificationType } from "./repository";

export const MAX_NOTIFICATION_DURATION = 7_000;
export const MIN_NOTIFICATION_DURATION = 1_500;
export const MAX_VISIBLE_NOTIFICATIONS = 4;

export const notificationDurations: Record<NotificationType, number> = {
  success: 4_000,
  error: 7_000,
  warning: 6_000,
  info: 4_000,
  automation: 5_000,
  crm: 5_000,
  security: 6_000,
};

export function clampNotificationDuration(value: unknown, type: NotificationType) {
  const requested = Number(value ?? notificationDurations[type]);
  return Math.min(
    MAX_NOTIFICATION_DURATION,
    Math.max(
      MIN_NOTIFICATION_DURATION,
      Number.isFinite(requested) ? requested : notificationDurations[type],
    ),
  );
}
