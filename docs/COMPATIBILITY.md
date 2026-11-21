# Service compatibility

IndigoDock embeds official web interfaces. A reachable URL is not proof that all account, media or device features work.

| Service | Default address | Notes |
| --- | --- | --- |
| Discord | https://discord.com/app | Browser voice and display capture; account-specific calls require manual verification. |
| Steam Chat | https://steamcommunity.com/chat/ | Uses the official Steam sign-in flow. |
| iCloud | https://www.icloud.com/ | Apple sign-in and multi-factor authentication are handled by the provider. |
| Gmail | https://mail.google.com/ | Google can reject embedded-browser sign-in. |
| Spotify | https://open.spotify.com/ | Protected playback requires supported Widevine and production signing. |
| WhatsApp | https://web.whatsapp.com/ | Pairing is performed by the user. |
| Home Assistant | User configured | No private-network address is shipped. |
| Facebook | https://www.facebook.com/ | Provider restrictions may apply. |
| Instagram | https://www.instagram.com/ | Provider restrictions may apply. |
| X | https://x.com/ | Provider restrictions may apply. |
| YouTube | https://www.youtube.com/ | Playback and account behavior depend on provider support. |

Discord, Spotify and WhatsApp receive a browser user agent without Electron/app markers, retaining the real Chromium version. Identity providers are not impersonated. External links use the system browser with a separate browser profile; authentication is not copied back into IndigoDock.

Sessions remain stored locally across updates, but providers can revoke or expire them. There is no token extraction, session refresh bypass or promise of permanent sign-in.

Spotify widget controls target IndigoDock's embedded web player, not the installed Spotify desktop app. Windows Media Session handles hardware keys; IndigoDock does not use global keyboard hooks. Simultaneous voice and music playback should be checked with the intended audio devices.

## Upstream documentation

- [Electron session and display capture](https://www.electronjs.org/docs/latest/api/session)
- [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer)
- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Spotify web player help](https://support.spotify.com/us/article/web-player-help/)
- [Widevine overview](https://developers.google.com/widevine/drm/overview)
