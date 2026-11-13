import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Case } from './storage/cases';

// Show notifications even when the app is in the foreground (useful for testing).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync();
    return req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  }
  // Android
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function dateAtTime(isoDate: string, hours: number, minutes: number): Date {
  const d = new Date(isoDate + 'T00:00:00');
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Cancel all scheduled notifications and re-schedule from the current case list.
// This is simple and bulletproof: no stale notifications, no drift.
export async function rescheduleAll(cases: Case[]): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    console.log('Notification permission not granted; skipping scheduling.');
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let scheduled = 0;

  for (const c of cases) {
    // Day-before reminder at 9:00 AM.
    // Edge case: if the case is listed tomorrow but it's already past 9 AM today,
    // the "day-before" slot has passed. In that case, fire it immediately so the
    // lawyer still gets a heads-up. Only skip if the hearing itself is in the past.
    const dayBefore = dateAtTime(c.nextHearing, 9, 0);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const hearingStart = dateAtTime(c.nextHearing, 0, 0); // midnight of hearing day
    const isHearingPast = hearingStart.getTime() <= now;

    if (!isHearingPast) {
      let fireAt = dayBefore;
      if (fireAt.getTime() <= now) {
        // Past 9 AM the day before. Fire in 5 seconds.
        fireAt = new Date(now + 5000);
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hearing reminder',
          body: `${c.title} (${c.caseNumber}) is listed on ${c.nextHearing}.`,
          data: { caseId: c.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
      scheduled++;
    }

    // Morning-of reminder at 8:00 AM
    const morningOf = dateAtTime(c.nextHearing, 8, 0);
    if (morningOf.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hearing today',
          body: `${c.title} (${c.caseNumber}) is listed today.`,
          data: { caseId: c.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morningOf,
        },
      });
      scheduled++;
    }
  }

  const all = await Notifications.getAllScheduledNotificationsAsync();
  console.log(`Scheduled ${scheduled} notifications (total in system: ${all.length}).`);
}