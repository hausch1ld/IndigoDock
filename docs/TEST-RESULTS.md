# Validation results — 1.8.0

- TypeScript checking and production compilation passed.
- 43 automated tests passed.
- 24 native desktop checks passed, including a real second-process restart.
- English/German switching, larger UI text, settings Apply without closing, nested service catalog, group-mode width and non-preselected layout creation passed.
- A real `getDisplayMedia` request returned a live video track with decoded, nonzero video dimensions from the chosen synthetic local window. Cancellation rejected the request cleanly. No captured frames were transmitted or saved.
- External-link confirmation used the configured dock background and cancelled without opening a browser.
- Private and explicitly shared browser storage, group icons and column widths survived process restart.
- The source privacy pattern check passed. Historical source review found public dependency metadata and synthetic test fixtures, with no detected private account data. Existing author metadata remains by the owner's choice; see PRIVACY.md.

These tests do not prove provider-specific authentication lifetime or delivery of screen-sharing video to another participant in a real Discord call. Those remain manual integration checks. GPU/driver variations, system-audio capture on every device and publisher-signing behavior are not covered by the synthetic fixture test.
