# Dienstkompatibilität · geprüft am 13.11.2026

Die URL-Prüfung bestätigt Web-Einstiegspunkte oder dokumentiert Fetch-Grenzen. Sie ersetzt keinen Login- oder Funktionstest mit einem Benutzerkonto.

| Dienst | Start-URL | Prüfung / Einschränkung |
|---|---|---|
| Discord | https://discord.com/app | JavaScript-Web-App erreichbar; Voice und Geräte manuell prüfen. |
| Steam Chat | https://steamcommunity.com/chat/ | Weiterleitung zur offiziellen Steam-Anmeldung mit Chat-Rückkehrziel bestätigt. |
| iCloud | https://www.icloud.com/ | Offizieller JavaScript-Einstieg; Apple-ID-/2FA-/Popup-Flows nicht angemeldet getestet. |
| Gmail | https://mail.google.com/ | Weiterleitung zu accounts.google.com bestätigt; Login im eingebetteten Browser kann gesperrt sein. |
| Spotify | https://open.spotify.com/ | Offizieller Web Player erreichbar; geschützte Wiedergabe nicht zugesichert. |
| WhatsApp | https://web.whatsapp.com/ | Offizieller Webclient erreichbar; QR-Kopplung muss der Benutzer durchführen. |
| Home Assistant | Benutzerdefiniert | Kein voreingestelltes Heimnetz-Ziel. HTTPS empfohlen, explizites HTTP unterstützt. WebSockets bleiben unverändert. |
| Facebook | https://www.facebook.com/ | Offizielle Login-Weiterleitung bestätigt; automatisierter Abruf wurde teilweise gedrosselt. |
| Instagram | https://www.instagram.com/ | Automatisierter Abruf HTTP 429; kein Beleg für fehlerhafte URL, keine Login-Aussage. |
| X | https://x.com/ | Automatisierter Abruf HTTP 403; keine erfolgreiche Einbettungs-/Login-Prüfung behauptet. |
| YouTube | https://www.youtube.com/ | Offizielle Weboberfläche erreichbar; tatsächliche Wiedergabe und Media Session manuell prüfen. |

## Login und externer Browser

[Google OAuth-Richtlinien](https://developers.google.com/identity/protocols/oauth2/policies) verbieten kontrollierte eingebettete User Agents für OAuth. Für discord.com, open.spotify.com und web.whatsapp.com entfernt IndigoDock Electron- und App-Kennungen aus dem User-Agent, damit Discord die Browser-Bildschirmfreigabe verwendet. OS und Chromium-Version bleiben erhalten; andere Anbieter bleiben unverändert. Es ist ein Webdienst-Container und besitzt keine OAuth-Clientregistrierungen für diese Anbieter. Ein OAuth-Token für eine native Anwendung erzeugt zudem nicht automatisch eine Gmail-Websitzung. Deshalb existiert kein vorgetäuschter Systembrowser-Login-Rücktransport. „Im Browser öffnen“ ist die sichere eigenständige Alternative, mit eigener Browsersitzung.

Apple, Discord, Spotify und andere Anbieter können zusätzliche Geräte-/Sicherheitsprüfungen durchführen. Persistente Chromium-Sessions halten nur die vom Anbieter akzeptierten Sitzungsdaten. Serverseitig abgelaufene oder widerrufene Anmeldungen werden nicht umgangen.

## Spotify, Widevine und Medien

Die [Spotify-Web-Player-Hilfe](https://support.spotify.com/us/article/web-player-help/) beschreibt unterstützte Browser und geschützte Inhalte. IndigoDock 1.2.0 verwendet Castlabs Electron mit Widevine-Komponentenverwaltung und einer lokal geprüften EVS-Streaming-Signatur. Es werden keine Komponenten aus anderen Browsern extrahiert. Die Spotify-Wiedergabe wurde vom Benutzer bestätigt. Electron allein ist keine Zusage für Spotify-DRM-Wiedergabe. Für diese Version ist der unterstützte Fallback ein von Spotify unterstützter Browser oder der offizielle Spotify-Client.

Eine spätere CDM-Integration benötigt zulässige Komponenten, Updates, passende Host-Unterstützung und Lizenz-/Verteilungsrechte; keine universelle kopierbare DLL wird empfohlen. [Widevine-Übersicht](https://developers.google.com/widevine/drm/overview).

Chromium Media Session und Windows SMTC übernehmen Medientasten. IndigoDock beobachtet Medienaktivität, verwendet aber keine globalen Tastatur-Hooks ; die optionale Spotify-Widget-Steuerung bedient die Player-Schaltflächen und den Lautstärkeregler im isolierten Renderer-Kontext. Eine feste Priorität des zuletzt in IndigoDock angeklickten Players gegenüber anderen Windows-Programmen ist nicht implementiert. Gleichzeitiges Discord Voice und Spotify bleibt ein manueller Test, insbesondere wegen DRM.

## Verwendete offizielle Electron-Dokumentation

- [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [BaseWindow und Lebenszyklus](https://www.electronjs.org/docs/latest/api/base-window)
- [Session, Permission Handler und Display Capture](https://www.electronjs.org/docs/latest/api/session)
- [Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [WebContents](https://www.electronjs.org/docs/latest/api/web-contents)
- [Electron-Releases](https://releases.electronjs.org/)


