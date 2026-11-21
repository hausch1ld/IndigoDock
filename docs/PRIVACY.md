# Privacy

## Local data

IndigoDock stores its configuration, browser profiles, notes, weather location and bounded diagnostic logs under `%APPDATA%\multidock`. Updating the application does not copy these files into the installation directory or source repository. Browser cookies and other authentication data remain in Chromium's persistent profile storage.

There is no IndigoDock analytics, telemetry upload, cloud backup or account-sync service. Embedded sites still communicate with their own providers. Weather sends the typed location search and selected forecast coordinates to Open-Meteo. Update checks contact GitHub only on request. Castlabs/Widevine component management can contact its upstream services.

## Publication boundaries

Never publish user-data directories, cookies, local storage, account databases, screenshots of signed-in services, diagnostic logs, EVS credentials, signing keys or environment files. The build packages only compiled application files, public assets and package metadata. Test fixtures use synthetic local data; test results and profiles are excluded from source publishing.

Run `npm run check:privacy` before publishing. In a Git checkout, `node scripts/check-privacy.mjs --history` also checks reachable historical blobs. This pattern scan reports paths, not matching secret values. It is a guardrail, not a proof that arbitrary unknown secrets cannot exist.

The November 2026 review checked 145 reachable historical text blobs for credential patterns, personal Windows paths, email addresses and known personal identifiers. Findings were a public dependency-author email and synthetic test fixtures. No account passwords, tokens, cookies, personal weather location or real local user paths were found in those files. Existing commit metadata was separately reviewed: the repository owner chose to retain historical author metadata. New local commits use the neutral name `IndigoDock Contributors`. The public GitHub account and repository ownership remain visible.

Release binaries require a separate check: inspect the packaged application archive and ensure no user-data/profile files or local test outputs are included. The 1.8.0 packaged archive (4,589 files) and the v1.1.0 portable release archive (4,586 files) were additionally scanned for profile filenames, known personal identifiers and credential patterns, with no matches. The historical installer and externally retained Git objects were not independently audited; these checks do not prove the absence of arbitrary unknown secrets.

## Screen sharing

Every request requires selecting a specific source in an app-owned dialog. No source is preselected. Sharing system audio is off by default and explicitly labeled as all Windows system audio. Cancellation grants nothing. The selected origin and live frame are checked again before capture is returned. Tests capture only a local synthetic window and do not transmit captured frames.

## Limits

Sign-in persistence is controlled partly by each provider. Local checkpoints preserve stored sessions but cannot prevent provider-side expiry or revocation. IndigoDock does not extract or replay credentials to bypass a sign-in requirement.
