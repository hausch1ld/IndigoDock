# IndigoDock

A customizable Windows workspace for web apps, with persistent profiles, dock groups and a widget sidebar.

## Start

Keep the entire unpacked application folder together and run `IndigoDock.exe`. Configuration and browser sessions are stored separately in `%APPDATA%\multidock`; replacing application files does not remove them. An unpacked build is not a self-contained portable browser profile.

The interface defaults to English. Choose English or German in **Settings → General → Language**, then **Apply**. **Close** dismisses settings; **Apply** saves without closing.

## Workspaces and dock

- Click an app to open it alone. Ctrl-click selects up to four apps and automatically creates the corresponding split view.
- Right-click an ungrouped selection and choose **Save as group**. Alternatively, **Create group** creates empty slots for one to four apps; drag dock apps into the slots.
- Drag dividers to adjust widths. Saved groups retain their widths.
- **Appearance → Group mode** offers **Icon + group**, **Group only**, and **Icon only**. In Group only mode, click a member to open the group and double-click to open just that app.
- Right-click a group or member to choose one of 24 Lucide icons or delete the group. Deleting a group preserves its services.
- Drag apps to reorder them. Right-click for service actions, mute, browser fallback and element hiding.
- Dock position, colors, font size, column tabs and inactive-app visibility are configurable under Appearance.

## Services and profiles

**Settings → Services → Add service** opens the catalog above settings. Closing the catalog returns to the same settings tab and preserves unsaved preferences. You can add known services repeatedly or define a custom URL.

Each instance has a separate persistent Chromium profile by default. **Allow shared profile** explicitly puts an instance into the shared browser profile, allowing same-origin sign-ins to be shared between services such as Gmail and YouTube. Website origin boundaries remain enforced. Switching profile mode preserves the old profile and restarts that service.

Home Assistant has no default private-network address. Configure your own URL; HTTPS is preferred and HTTP requires explicit consent. Certificate errors are not bypassed.

## Sidebar

The persistent sidebar is independent of workspace columns. It contains clock/date, calendar, Spotify controls, system usage, Windows volume mixer, notes and weather widgets. Enable widgets under **Settings → Sidebar** and drag them to reorder.

The Spotify widget controls the first running IndigoDock Spotify web player. It does not directly control the Windows Spotify application. Weather uses Open-Meteo without an API key; location search and forecast requests are sent to Open-Meteo only when the feature is used. Attribution remains beside the displayed data.

## Screen sharing and dialogs

External links, permissions and screen-source selection use themed application dialogs. Screen sharing always requires choosing a window or screen. System audio is optional and disabled by default; enabling it shares all Windows system audio, not just one application's sound. Native file-save dialogs remain provided by Windows.

## Build and test

Windows 11 x64 and Node.js 24 LTS are recommended.

```powershell
npm install
npm test
npm run build
npm run dist:dir
npm run dist
```

Castlabs Electron provides Widevine support. Production playback builds require an appropriate EVS streaming signature; never commit EVS credentials. Keep runtime licensing files in distributions. Packaging alone does not guarantee DRM playback.

See [testing](docs/TESTING.md), [test results](docs/TEST-RESULTS.md), [architecture](docs/ARCHITECTURE.md), [compatibility](docs/COMPATIBILITY.md), and [privacy](docs/PRIVACY.md).

## Version 1.8.0

- English default interface, optional German and adjustable UI font size.
- Themed link/permission dialogs and screen picker with window previews and explicit audio selection.
- Smaller centered group icon, readable group-mode selector and no preselected layout in the new-group popup.
- Nested service catalog, persistent settings drafts and separate Close/Apply actions.
- Weather location displayed beside its widget setting.
- English project documentation and repeatable publication privacy checks.

## Limitations

Providers may restrict embedded sign-in, expire sessions or change their web interfaces. Persistent storage cannot override server-side authentication expiry. Discord calls, account-specific provider behavior and DRM need manual checks with the intended account. Hardware monitoring depends on available Windows drivers; GPU reporting currently uses NVIDIA's `nvidia-smi` when available.

IndigoDock is not affiliated with the services it embeds. See [third-party notices](THIRD-PARTY-NOTICES.md).
