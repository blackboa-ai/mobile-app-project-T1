# CaseDiary — TODO / deferred verification

Items here are known, tracked, and deliberately deferred. Nothing in the app
should be considered "fully verified" until the corresponding item is checked off.

## Notifications (Phase 4)
- [ ] Verify "day-before reminder" fires immediately when the 9 AM slot has
      already passed (cases added late in the day). Logic exists in
      `src/notifications.ts`; not yet exercised on a real device.
- [ ] Verify a real notification fires when the app is closed/backgrounded.
      Expo Go on iOS may not fire scheduled notifications reliably; needs a
      dev build. Deferred to Phase 6.
- [ ] Verify notifications survive a phone restart (battery optimization may
      kill scheduled notifications on some Android devices). Deferred to Phase 6.

## Polish (Phase 5)
- [ ] Replace deprecated `SafeAreaView` from `react-native` with
      `react-native-safe-area-context` to remove the deprecation warning.
- [ ] Add an empty-state illustration or a prominent "Add your first case"
      button when the list is empty.
- [ ] Review "3 moderate severity vulnerabilities" from `npm install` before
      publishing. Likely build-tool-only; do not run `npm audit fix --force`
      without review.

## Publishing (Phase 6)
- [ ] Create a development build with EAS to verify real notification behavior.
- [ ] Publish to Google Play internal testing track.