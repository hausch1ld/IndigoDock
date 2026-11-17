# IndigoDock <img src="public/icons/indigodock.png" width="35" alt="IndigoDock" />

One workspace for all your apps. Free and customizable.

Eine lokale Windows-11-App mit Castlabs Electron 45.2.1+wvcus, React und TypeScript. Native `WebContentsView`s statt Iframes oder eines UI-Prototyps. Oberfläche auf Deutsch, dunkles Theme, 1–4 Spalten, dauerhaft laufende Dienstprozesse und getrennte Chromium-Profile.

## Direkt starten

Die entpackbare Windows-Version enthält `IndigoDock.exe` und alle benötigten Laufzeitdateien. **Den gesamten Ordner behalten**, nicht nur die EXE kopieren. Die App verwendet `%APPDATA%\multidock` für Konfiguration und Sessions. „Portabel“ bedeutet hier ohne Installation startbar; die Profildaten bleiben im Windows-Benutzerprofil.

Ein Klick auf einen Dienst startet ihn in der Einzelansicht. STRG-Klick ergänzt oder entfernt Apps in einer Auswahl von bis zu vier Diensten; die Spaltenanzahl passt sich automatisch an. Rechtsklick auf eine noch nicht gruppierte ausgewählte App → **Als Gruppe speichern** speichert die Auswahl samt Breiten. **Gruppe erstellen** erzeugt alternativ einen Workspace mit leeren Dock-Plätzen, in die Apps gezogen werden können.

Home Assistant: Rechtsklick → Einstellungen → eigene URL eintragen. Lokales HTTP erfordert die ausdrückliche HTTP-Option. Ungültige Zertifikate werden nicht übergangen.

## Bedienung

- Einstellungen → **Aussehen → Gruppen-Modus**: **Icon + Gruppe** zeigt Symbol und eingerahmte Apps; **Nur Gruppe** öffnet bei einfachem Klick die Gruppe, bei Doppelklick die einzelne App; **Nur Icon** zeigt ein Gruppensymbol und lässt die Apps zusätzlich einzeln im Dock.
- Rechtsklick auf Gruppe oder Gruppenmitglied → **Gruppen-Icon wählen**: 24 Lucide-Symbole. **Gruppe löschen** behält die Dienste. In **Icon + Gruppe** öffnet das Gruppensymbol den gespeicherten Split, ein App-Symbol die Einzelansicht.
- Der Layout-Schalter heißt **Gruppe erstellen**. Trennlinien ändern Spaltenbreiten; die aktive Gruppe speichert diese mit.
- Mittig: Dienste per Drag-and-drop sortieren. Rechtsklick: Start/Stopp, Reload, Stumm, Start-URL, externer Browser, Einstellungen, Entfernen.
- Oben in jeder Spalte: bereits zugeordnete Dienste als kompakte Tabs. Verdeckte Dienste bleiben aktiv.
- Einstellungen → Dienste → Dienst hinzufügen: eigener Dienst, URL, Icon (PNG/JPEG/WebP, maximal 140 KB), gemeinsames Browserprofil, Startstatus.
- Zahnradsymbol: Allgemein, Aussehen, Dienste, Sidebar und Erweitert.
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

Die Widget-Sidebar bleibt unabhängig vom Workspace-Layout. Alte Widget-Dienste werden automatisch aus Gruppen herausgelöst. Widgets lassen sich auf ihrer Fläche verschieben; Eingabefelder und Regler bleiben bedienbar. Ein Notizenfeld speichert mehrzeiligen Text lokal.

## Neu in 1.5.2 (einschließlich 1.5.1)

- Sidebar-Schalter rechts im Dock im Stil des Layout-Schalters. Bei geschlossener Sidebar erscheint die Uhr mittig in der Titelleiste.
- Kalenderwidget mit Monatsansicht, Montag als Wochenbeginn, hervorgehobenem heutigen Datum und Navigation zwischen Monaten.
- Ausgeglichene Abstände bei Uhr/Datum und Spotify-Steuerung; korrigierte Play/Pause-Erkennung.
- Spotify: kleinere Shuffle-/Repeat-Tasten, Stummschaltung mit Lautstärke-Wiederherstellung und korrigierter Lautstärkeregler.
- Einstellungen → Sidebar: Widgets hinzufügen/entfernen sowie Sidebar-, Widget- und Schriftfarbe anpassen.
- 35 Logiktests und 29 native Windows-Prüfungen bestanden. Der Live-Wechsel der Spotify-Anzeige während laufender Musik ist noch nicht bestätigt.

Das Windows-x64-ZIP im Release enthält den lokal mit Castlabs EVS signierten Build. Vollständig entpacken und `IndigoDock.exe` starten. Bestehende Profildaten bleiben unter `%APPDATA%\\multidock`. Dieses ZIP wird manuell aktualisiert; es ist kein NSIS-Installer und kein automatisches In-App-Update. Eine Windows-Herausgebersignatur ist nicht enthalten. Das Wetterwidget ist ab 1.6.0 verfügbar.

Die Einstellungen sind schmaler und haben einen festen Footer. **Dienst hinzufügen** öffnet die bekannten Dienste mit Logos; **Benutzerdefinierter Dienst** steht zuerst. Datum im Dock ohne Jahreszahl, runde Musiksteuerung, UTF-8 für den Windows-Mixer und verbesserte WhatsApp-Browsererkennung.


## Neu in 1.7.0 (einschließlich 1.6.0)

- Drei Gruppen-Darstellungen, auswählbare Symbole, größere Icon-Abstände und farblich abgesetzter Gruppenbereich.
- Neue Auswahl per Klick/STRG-Klick sowie Gruppenplätze per Drag & Drop.
- Bekannte Dienste mehrfach hinzufügen: jede Instanz erhält zunächst ein eigenes dauerhaftes Browserprofil. **Globalen Zugriff erlauben** verbindet ausdrücklich aktivierte Dienste mit dem gemeinsamen Profil. Gmail und YouTube müssen beide global aktiviert sein, um ihre Browseranmeldung zu teilen. Website-Zugriffsgrenzen bleiben erhalten; Google kann eingebettete Anmeldungen weiterhin einschränken. Beim Profilwechsel bleibt das private Profil erhalten.
- **Aussehen** enthält Sidebar-, Widget-, Schrift-, Akzent- und Dockfarbe. Größere Einstellungsschrift.
- Wetterwidget mit Ortssuche, aktuellem Wetter, Tagesminimum/-maximum, Regenwahrscheinlichkeit und fünf Folgetagen. Unter **Sidebar** aktivieren und über das Zahnrad konfigurieren; beim ersten Einsatz auch direkt im Widget. Keine Registrierung oder API-Schlüssel nötig. Open-Meteo wird online abgefragt, mit 15 Minuten Zwischenspeicherung. Quellenlink direkt unter dem Standort.
- Wiederhergestellte Fenster aktualisieren ihre nativen Oberflächen ohne Website-Reload. Browserdaten werden regelmäßig sowie bei Hintergrund-/Ruhemodus gesichert. Eine dauerhafte Discord-Anmeldung kann nicht garantiert werden; der genaue Grund der gemeldeten Abmeldungen ist noch offen.
- 41 Logiktests und 18 Windows-Prüfungen bestanden, einschließlich echtem Neustart und Session-Persistenz.
