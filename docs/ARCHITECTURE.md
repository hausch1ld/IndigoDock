# Architecture and security model

## Processes and layout

An Electron BaseWindow owns the trusted local UI WebContentsView and one WebContentsView per running service. Hidden services remain alive. Layout changes update bounds without navigating or recreating services. Show, restore, focus and resume refresh native surfaces to prevent blank views.

The main process computes bounds from validated column ratios and dock/sidebar position. React uses the same layout functions. Saved groups keep a layout and icon independently of the active workspace. Ordinary service selection opens a single view; Ctrl selection supports one to four columns.

Menus use temporary local snapshots because DOM overlays cannot cover sibling native views. These images remain in memory and are not uploaded. Service content continues running. Closing a menu restores the existing views. Application prompts use a separate owned, modal BrowserWindow so their controls stay above native service views.

## Trust boundaries

- Main owns local files, native integrations and persistent sessions.
- External services have Node disabled, context isolation, sandboxing and web security enabled, and receive no application preload bridge.
- Trusted UI IPC validates the exact webContents, main frame, local URL and Zod command schema.
- Dialog replies are accepted only from that dialog's main frame. Dialog text is inserted with textContent; remote navigation and new windows are blocked. A restrictive CSP prevents page scripts and external resources.
- Spotify controls and the element picker run small isolated-world adapters. They do not extract passwords, authentication tokens or cookies.
- Only selected compatibility hosts have Electron/app markers removed from their user agent. The actual Chromium and operating-system version remain unchanged.
- URLs cannot include embedded credentials or executable schemes. HTTP requires explicit configuration. Invalid certificates are not bypassed.
- Custom icons accept bounded PNG/JPEG/WebP data; bundled SVG icons are trusted project assets.

## Sessions and permissions

Each private service instance uses a stable persistent session partition. Shared profiles are opt-in and still subject to the browser's same-origin policy. Cookies and storage are checkpointed periodically, after cookie changes and during graceful shutdown. Updates keep the profile path stable. Server-side revocation or expiry cannot be prevented by local persistence.

Permission checks resolve both the service profile and requesting origin. Microphone, camera and notifications require configured permission. Display capture is allowed to proceed to the mandatory source picker unless denied in settings. Every capture requires explicit source selection; optional system audio is unchecked by default. Cancellation, destroyed frames and navigation are rejected. Other permissions are denied by default.

## Storage and network

Configuration is written atomically with a backup in the stable user-data directory. Diagnostics are local and size-limited. Credentials are managed by Chromium, not copied into application configuration. Notes, custom URLs, weather location and cosmetic selectors are personal local settings and must not be published.

Weather requests go to fixed HTTPS Open-Meteo endpoints with timeouts and caching. Update checks occur only on request against GitHub Releases. There is no IndigoDock analytics or account-sync backend. Embedded websites make their own network requests and remain governed by their providers' privacy policies.

See [privacy](PRIVACY.md) for publication checks and residual limitations.
