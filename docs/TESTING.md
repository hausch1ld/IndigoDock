# Testing

## Automated checks

```powershell
npm test
npm run check:privacy
npm run build
```

Tests cover layout bounds, grouping, profile migration/isolation, input validation, weather payloads, localization and settings defaults. Privacy scanning is restricted to publishable source paths and does not print potentially sensitive matches.

## Native desktop harness

Run `node scripts/prepare-desktop-test.mjs` from the project directory. Launch the printed test executable twice: the first process runs UI/session/capture checks and exits; the second verifies persisted browser data after a real restart. The harness uses a separate profile under `test-results`, local HTTP fixtures and mocked weather responses. It never opens real provider accounts. Source capture is restricted to a synthetic local test window.

The stage marker is `test-results/workspace-180-stage.json`. Rename that marker before starting a completely new run; keep old results for diagnosis. Screenshots, traces and test profiles are local only and excluded from publication.

## Manual verification

- Check all four dock positions and three group modes at normal and increased text sizes.
- Verify group-icon centering and the absence of a selected layout in the creation popup.
- Switch English/German, apply without closing, and reopen settings.
- Open/close the service catalog and custom service editor while preserving unsaved settings.
- Check window and screen sharing in a real Discord call, both with and without optional system audio. Confirm the recipient receives moving video and that stopping ends capture.
- Check microphone/camera permissions, foreground restoration, multi-monitor DPI, notifications and Windows autostart.
- Check Spotify playback in a production-signed build. The widget controls the embedded player, not the Windows application.
- Check provider sign-in across a full quit/restart without clearing profiles.

Do not put real account screenshots, credentials, precise locations or logs into issues, commits or release assets.
