# MVP Test Plan

1. Test login with a `@dimigo.hs.kr` Google account.
2. Confirm non-Dimigo accounts are signed out and shown the unauthorized screen.
3. Register five printer docs: `Printer-1` through `Printer-5`.
4. Upload a mock snapshot for `Printer-1` through `uploadSnapshot`.
5. Confirm dashboard updates and cards sort by severity.
6. Confirm printer detail shows the large current image.
7. Create a mock `printJobs/{jobId}` and assign it to `Printer-1`.
8. Confirm OCR progress updates `displayProgressPercent` when confidence is high.
9. Confirm fallback time progress is used by AI context when duration exists.
10. Simulate `possibleSpaghetti` or `possibleStopped` in `localSignals`.
11. Confirm an `aiAnalyses` document is created.
12. Confirm a suspected or failed result creates an alert.
13. Confirm FCM token writes to `deviceTokens`.
14. Confirm `sendAlertNotification` can send to accessible users.
15. Press feedback buttons and confirm `feedback` writes.
16. Backdate snapshots and run cleanup to confirm old images and docs are removed.
17. Make a printer stale for more than 10 minutes and confirm status becomes `offline`.
18. Open the live stream screen and confirm a `webrtcSessions` offer and caller candidates are written.
19. Run Pi `webrtc_peer.py` and confirm answer and callee candidates are written.
20. Use Mock mode when real Pi WebRTC is unavailable.
