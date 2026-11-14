# IndigoDock <img src="public/icons/indigodock.png" width="35" alt="IndigoDock" />

One workspace for all your apps. Free and customizable.

Eine lokale Windows-11-App mit Electron 45.3.2, React und TypeScript. Native `WebContentsView`s statt Iframes oder eines UI-Prototyps. Oberfläche auf Deutsch, dunkles Theme, 1–4 Spalten, dauerhaft laufende Dienstprozesse und getrennte Chromium-Profile.

## Direkt starten

Die entpackbare Windows-Version enthält `IndigoDock.exe` und alle benötigten Laufzeitdateien. **Den gesamten Ordner behalten**, nicht nur die EXE kopieren. Die App verwendet `%APPDATA%\multidock` für Konfiguration und Sessions. „Portabel“ bedeutet hier ohne Installation startbar; die Profildaten bleiben im Windows-Benutzerprofil.

Erster Start: Alle elf vordefinierten Dienste sind absichtlich gestoppt. Rechtsklick auf ein Icon → **Starten**, danach Icon anklicken. Bei mehreren Spalten die Zielspalte auswählen. Alternativ das Icon in eine Spalte ziehen; dieser ausdrückliche Drop startet auch einen gestoppten Dienst. Ein gestoppter Dienst startet durch bloße Auswahl oder Layoutwechsel niemals automatisch.

Home Assistant: Rechtsklick → Einstellungen → eigene URL eintragen. Lokales HTTP erfordert die ausdrückliche HTTP-Option. Ungültige Zertifikate werden nicht übergangen.

## Bedienung

- Links unten: 1–4 Spalten auswählen. Trennlinien ziehen; mit Tastaturfokus auf einem Trenner verschieben Pfeiltasten die Grenze um 20 Pixel.
- Mittig: Dienste per Drag-and-drop sortieren. Rechtsklick: Start/Stopp, Reload, Stumm, Start-URL, externer Browser, Einstellungen, Entfernen.
- Oben in jeder Spalte: bereits zugeordnete Dienste als kompakte Tabs. Verdeckte Dienste bleiben aktiv.
- Einstellungen → Dienste → Dienst hinzufügen: eigener Dienst, URL, Icon (PNG/JPEG/WebP, maximal 140 KB), Profil, Startstatus.
- Zahnradsymbol: allgemeine Einstellungen, Layout, Dienstverwaltung, Diagnose.
- `Strg+R`, `Strg++`, `Strg+-`, `Strg+0` gelten im fokussierten Webdienst. `Escape` schließt App-Overlays.
- Schließen blendet die App standardmäßig im Tray aus. Für ein vollständiges Beenden: Tray → Beenden oder Einstellungen → Erweitert → vollständig beenden.
- Uhr: Windows-Systemzeit, 24 Stunden, deutsches Datum; eigener React-Baustein mit minutenweise ausgerichtetem Timer.

## Funktionsumfang und Grenzen

Implementiert: BaseWindow, native Dienstansichten, typisierte und laufzeitvalidierte IPC, einzelne persistente Session-Partition pro Profil, expliziter Start/Stopp, atomare Konfiguration mit Sicherung, 1–4 Layouts mit separaten Zuordnungen, Splitter, Drop-Ziele, Klickauswahl, Dienst-Tabs, eigene Dienste, Reihenfolge, individuelle Zoom-/Audio-/Berechtigungseinstellungen, Tray, Autostart, Fensterposition/Maximierung, Netzwerk-/Prozessfehler und Wiederholung.

**Nicht als vollständig verifiziert zu verstehen:** Anbieter-Logins, Discord Voice, Hardwaremedientasten, Bildschirmfreigabe mit echten Geräten, Spotify-DRM, gemischte DPI-Monitore und Windows-Autostart. Dafür existiert die [manuelle Testanleitung](docs/TESTING.md).

Google kann eingebettete Anmeldungen blockieren. Spotify kann ohne passende Widevine-Integration keine geschützte Musik abspielen. IndigoDock installiert keine DRM-Komponenten und kopiert keine Browser-Cookies. Der externe Browser ist ein eigenständiger Fallback; dessen Login wird **nicht** in IndigoDock übertragen. Einzelheiten und Quellen: [Kompatibilität](docs/COMPATIBILITY.md).

Medientasten laufen über Chromiums native Media-Session-/Windows-SMTC-Integration. IndigoDock installiert keine globalen Hooks und sendet keinen Tastendruck an mehrere Dienste. Eine eigene, deterministische „zuletzt aktiver Dienst“-Umschaltung wird nicht versprochen: Chromium und Windows bestimmen die aktive Sitzung. Die Lautstärketasten bleiben bei Windows.

## Entwicklung und Build

Voraussetzungen: Windows 11 x64, Node.js **24 LTS** mit npm, Internetzugriff bei der ersten Installation. Keine Administratorrechte für die entpackbare App nötig.

```powershell
npm install
npm run dev
npm test
npm run build
npm run test:integration
npm run dist
```

`npm run dev` erstellt den Build und startet Electron mit derselben CSP und IPC-Absenderprüfung wie die Veröffentlichung. Nach Quellcodeänderungen neu starten; kein unsicherer Entwicklungs-Webserver, kein HMR.

`npm run build` prüft TypeScript, erstellt den React-Build, bündelt Main und Preload. `npm run dist` erzeugt NSIS-Installer und portable Einzel-EXE. Electron wird im `postinstall` explizit heruntergeladen; die Distribution verwendet diese lokale, versionsfixierte Laufzeit. Unter npm 12 müssen gegebenenfalls von npm gesperrte Installationsskripte nach eigener Prüfung freigegeben werden.

Die Binärdateien sind nicht mit einem Herausgeberzertifikat signiert. Für öffentliche Verteilung ist ein eigenes Code-Signing-Zertifikat notwendig. In dieser Codex-Ausführungsumgebung konnte NSIS nicht gestartet werden (`spawn UNKNOWN`); deshalb wird eine entpackbare Windows-Distribution bereitgestellt. Auf einem regulären Entwicklungs-Windows ist `npm run dist` der vorbereitete Installer-Buildweg.

## Daten und Updates

- `config.json`: Layouts, gewünschte Laufzustände, Diensteinstellungen und Fenstergeometrie.
- `config.json.bak`: letzte gültige Konfiguration. Schreiben über temporäre Datei, `fsync`, atomare Umbenennung.
- `Partitions/persist…`: Chromium verwaltet Cookies, IndexedDB, Local Storage und weitere Profildaten. Konkrete Verzeichnisnamen bestimmt Electron.
- `diagnostics.log`: begrenztes Log ohne Seiteninhalte, URLs, Passwörter oder Tokens.

Aktuelle Seitenpfade werden ohne Query und Fragment gespeichert, damit OAuth-Codes und übliche URL-Tokens nicht in der Konfiguration landen. Dadurch können einzelne URL-basierte Ansichtsfilter beim Neustart verloren gehen. Start-URLs sollten niemals Geheimnisse enthalten.

Gleiche Profilnamen teilen Chromium-Sessions; verschiedene Profilnamen trennen Accounts. Profilwechsel und URL-Wechsel erfordern einen gestoppten Dienst. „Profil abmelden / löschen“ fragt nach, stoppt alle betroffenen Dienste und löscht nur dieses Profil. „Dienst entfernen“ behält die Sessiondaten. Updates und Stoppen löschen keine Anmeldung. Dienstanbieter können Sitzungen jederzeit widerrufen.

## Projektaufbau

```text
src/main/main.ts          Fenster, IPC, Tray, Windows-Integration
src/main/views.ts         Native Views, Navigation, Lebenszyklus, Bounds
src/main/permissions.ts   Ursprungsgebundene Berechtigungen / Bildschirmquellen
src/main/media.ts         Native Media-Session-Beobachtung
src/main/persistence.ts   Atomare Speicherung und Recovery
src/main/registry.ts      Elf vorkonfigurierte Dienste
src/main/preload.ts       Eng begrenzte Context Bridge
src/shared/               Typen, Zod-Schemas, Layoutlogik, URL-Regeln
src/renderer/             React-Oberfläche und Styles
tests/                    Logik-, Persistenz- und Sicherheitstests
scripts/                  Builds und Integrationstests
docs/                     Architektur, Anbietergrenzen und manuelle Tests
```

Weitere Details: [Architektur](docs/ARCHITECTURE.md), [Testbericht](docs/TEST-RESULTS.md), [Drittanbieter](THIRD-PARTY-NOTICES.md).

## Neu in 1.1.0

Neues IndigoDock-Icon, entfernte Slogans, ausblendbare Spalten-Tabs, aktive Dienste gruppieren, inaktive Apps als Popup, Drag-and-drop-Reihenfolge in Leiste und Einstellungen. Meldungen erscheinen über Dienstansichten.

Updates: Einstellungen → Erweitert → Auf Updates prüfen. Download und Installation werden ausdrücklich gestartet. GitHub Actions baut Windows-Installer und portable EXE; eine neue Paketversion erzeugt einen Release mit latest.yml. Bestehende Releases werden nicht überschrieben.

Die lokale Installation liegt unter %LOCALAPPDATA%\Programs\IndigoDock. Der Datenordner bleibt aus Kompatibilitätsgründen %APPDATA%\multidock; bestehende Session-Partitionen bleiben gleich. Updates löschen ihn nicht. Anbieter können trotzdem erneute Anmeldung verlangen.

Spotify/Widevine ist zurückgestellt. Discord-Browserkompatibilität und Quellen-Auswahl sind implementiert; der Live-Bildschirmtest ist noch offen. Beim lokalen Start verlangten Discord und Steam eine erneute Anmeldung.
