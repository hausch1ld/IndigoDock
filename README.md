# IndigoDock <img src="public/icons/indigodock.png" width="35" alt="IndigoDock" />

One workspace for all your apps. Free and customizable.

Eine lokale Windows-11-App mit Castlabs Electron 45.2.1+wvcus, React und TypeScript. Native `WebContentsView`s statt Iframes oder eines UI-Prototyps. Oberfläche auf Deutsch, dunkles Theme, 1–4 Spalten, dauerhaft laufende Dienstprozesse und getrennte Chromium-Profile.

## Direkt starten

Die entpackbare Windows-Version enthält `IndigoDock.exe` und alle benötigten Laufzeitdateien. **Den gesamten Ordner behalten**, nicht nur die EXE kopieren. Die App verwendet `%APPDATA%\multidock` für Konfiguration und Sessions. „Portabel“ bedeutet hier ohne Installation startbar; die Profildaten bleiben im Windows-Benutzerprofil.

Erster Start: Alle elf vordefinierten Dienste sind absichtlich gestoppt. Rechtsklick auf ein Icon → **Starten**, danach Icon anklicken. Bei mehreren Spalten die Zielspalte auswählen. Alternativ das Icon in eine Spalte ziehen; dieser ausdrückliche Drop startet auch einen gestoppten Dienst. Gespeicherte Gruppen starten ihre Dienste beim Aktivieren; die Einzelansicht außerhalb einer aktiven Gruppe startet den ausgewählten Dienst ebenfalls.

Home Assistant: Rechtsklick → Einstellungen → eigene URL eintragen. Lokales HTTP erfordert die ausdrückliche HTTP-Option. Ungültige Zertifikate werden nicht übergangen.

## Bedienung

- Spaltenmenü → **Als Gruppe speichern** speichert zugewiesene Dienste und Spaltenbreiten. Der Rahmen im Dock ruft die Gruppe auf. Ein anderer Dienst öffnet sich anschließend in einer Einzelansicht. Rechtsklick auf den Rahmen → **Gruppe löschen** behält die Dienste. Ein Dienst gehört jeweils zu einer Gruppe; erneutes Gruppieren ersetzt überlappende Gruppen.

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

Google kann eingebettete Anmeldungen blockieren. Spotify kann ohne passende Widevine-Integration keine geschützte Musik abspielen. IndigoDock verwendet ab 1.2.0 Castlabs Electron mit Widevine-Komponentenverwaltung. Die lokale Windows-Laufzeit ist mit EVS für Streaming signiert. Die Spotify-Wiedergabe wurde vom Benutzer bestätigt. Browser-Cookies werden nicht kopiert. Der externe Browser ist ein eigenständiger Fallback; dessen Login wird **nicht** in IndigoDock übertragen. Einzelheiten und Quellen: [Kompatibilität](docs/COMPATIBILITY.md).

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

Updates: Einstellungen → Erweitert → Auf Updates prüfen. Download und Installation werden ausdrücklich gestartet. GitHub Actions baut Windows-Installer und portable EXE als Artefakte. Öffentliche Releases und damit neue Auto-Updates bleiben bis zur Einrichtung der EVS-Signierung in CI deaktiviert.

Die lokale Installation liegt unter %LOCALAPPDATA%\Programs\IndigoDock. Der Datenordner bleibt aus Kompatibilitätsgründen %APPDATA%\multidock; bestehende Session-Partitionen bleiben gleich. Updates löschen ihn nicht. Anbieter können trotzdem erneute Anmeldung verlangen.

Spotify verwendet die EVS-signierte Castlabs-Laufzeit. Die Bildschirmfreigabe wurde mit echten Videoframes eines lokalen Testfensters geprüft; die Übertragung an einen Discord-Teilnehmer muss separat bestätigt werden.


## Neu in 1.4.0

Unter Einstellungen → Layout lässt sich das Dock unten, oben, links oder rechts platzieren. Menüs erscheinen ohne Abdunklung und ohne Standbildwechsel. Layout-Gruppen speichern nur die sichtbaren Dienste.

Rechtsklick auf ein Dienst-Icon → **Element ausblenden**. Ein Element anklicken, mit dem Slider den Elterncontainer wählen und ausblenden. **Wiederherstellen** entfernt alle Ausblendregeln dieses Dienstes. Die Kopfzeile des Auswahlfensters lässt sich ziehen. Einzelne Regeln können weiterhin in den Diensteinstellungen deaktiviert oder gelöscht werden. Regeln gelten für die jeweilige Website-Origin; Website-Umbauten können neue Auswahl erfordern. Fremde Iframes und geschlossene Shadow-DOMs werden nicht durchdrungen.

Einstellungen → Dienste → **Dienst hinzufügen** öffnet die mitgelieferten Dienste mit Logos; **Benutzerdefinierter Dienst** steht oben. **Katalog bearbeiten** öffnet `%APPDATA%\multidock\known-services.json`. Ein Eintrag benötigt `id`, `name`, `url` und `profile`; optional `icon` und `allowHttp`. Nach Änderungen **Neu laden** wählen. IDs müssen eindeutig sein. Zum Beispiel:

```json
{"id":"example","name":"Example","url":"https://example.com","profile":"example"}
```

Die Widget-Sidebar enthält Uhr, Spotify-Titel/Cover/Steuerung/Lautstärke, CPU/RAM/NVIDIA-GPU-Auslastung, Windows-App-Lautstärken und Notizen. Spotify muss in IndigoDock gestartet sein. Der Widget-Adapter bedient den Webplayer und kann bei Änderungen an dessen Oberfläche eine Anpassung benötigen. Spielübergreifende FPS sind nicht enthalten.

Der Windows-Audiohelfer wird aus `native/AudioMixer.cs` beim Build mit dem in Windows enthaltenen .NET-Framework-Compiler gebaut. Er verwendet die dokumentierte Core-Audio-Schnittstelle, läuft ohne Administratorrechte und wird aus dem ASAR-Archiv ausgepackt. GPU-Abfragen verwenden das mit dem NVIDIA-Treiber installierte `nvidia-smi`; fehlt es, zeigt das Widget keine GPU-Messung.



## Neu in 1.5.0

Die Widget-Sidebar wird über das Symbol zwischen Einstellungen und Minimieren ein- oder ausgeklappt. Sie bleibt unabhängig vom Workspace-Layout. Alte Widget-Dienste werden automatisch aus Gruppen herausgelöst. Widgets lassen sich auf ihrer Fläche verschieben; Eingabefelder und Regler bleiben bedienbar. Das Palettensymbol ändert die Hintergrundfarbe. Ein Notizenfeld speichert mehrzeiligen Text lokal.

Die Einstellungen sind schmaler und haben einen festen Footer. **Dienst hinzufügen** öffnet die bekannten Dienste mit Logos; **Benutzerdefinierter Dienst** steht zuerst. Datum im Dock ohne Jahreszahl, runde Musiksteuerung, UTF-8 für den Windows-Mixer und verbesserte WhatsApp-Browsererkennung.
