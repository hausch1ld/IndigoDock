# Testanleitung

## Automatisiert

`npm test` führt die reinen TypeScript-Tests aus. `npm run build` beinhaltet den vollständigen Typecheck. `npm run test:integration` startet Electron mit Playwright, einem lokalen HTTP-Testdienst und einem isolierten Testprofil. Keine persönlichen Konten werden verwendet. Die Testskripte verändern keine echten IndigoDock-Profile.

Für AppContainer-Terminals, in denen Electron vor dem Start abbricht, liegt zusätzlich `scripts/prepare-desktop-test.mjs` vor. Dieses Skript erstellt außerhalb der Distribution einen separaten Desktop-Teststarter mit `workspace-harness.cjs`. Zweimal aus Windows starten (zweiter Lauf prüft echte Neustart-Persistenz): STRG-Auswahl, Gruppenplätze, Instanzen und native Session-Trennung, Wetter und Farben werden geprüft. Ergebnis: `test-results/workspace-170-*/result.json`. Der Starter beendet jeden Lauf automatisch. Für einen neuen vollständigen Durchlauf die nur im Testverzeichnis liegende Datei workspace-170-stage.json umbenennen. Der alte `desktop-harness.cjs` dokumentiert die Bedienung vor 1.6 und ist nur mit `--legacy` für historische Builds auszuwählen. Kein Teststarter gehört in die Distribution.

## A · Echte Anmeldung

1. Gewünschten Dienst starten und einer Spalte zuordnen.
2. Selbst manuell anmelden, inklusive QR/2FA. Keine Testautomatisierung von Zugangsdaten.
3. Über Tray → Beenden vollständig schließen.
4. IndigoDock erneut starten. Der Dienst muss die gespeicherten Browserdaten wiederverwenden.
5. Ergebnis je Anbieter dokumentieren. Eine vom Anbieter widerrufene Sitzung ist kein Persistenzbeweis gegen IndigoDock; „disallowed_useragent“ separat erfassen.

## B · Drei Spalten / Resize

1. Steam links, Discord in der Mitte, Spotify rechts zuordnen.
2. Trennlinien auf ungefähr 25/45/30 ziehen. Während des Ziehens dürfen Webinhalte nicht neu laden.
3. Vollständig beenden und neu starten. Spalten, Verhältnisse und Tabs vergleichen.
4. Gruppe per Rechtsklick auf einen ausgewählten Dienst speichern; einen anderen Dienst einzeln öffnen und die Gruppe über ihren kleinen Layout-Schalter wieder aufrufen.
5. Fenster auf 640 Pixel Breite und auf einem zweiten Monitor mit anderer DPI testen. Dock, Uhr und Splitter dürfen sich nicht überdecken.

## C · Hintergrundbetrieb

1. Unterstützte YouTube-Wiedergabe starten; Spotify nur bei tatsächlich funktionierender DRM-Wiedergabe zusätzlich prüfen.
2. Einen anderen Dienst in derselben Spalte auswählen.
3. Audio muss weiterlaufen. Zurückwechseln darf nicht neu laden.
4. Layoutmenü und Einstellungen öffnen: eingefrorenes Vorschaubild ist beabsichtigt, Audio muss weiterlaufen.
5. In den Tray minimieren; Wiedergabe und ankommende Nachrichten beobachten.

## D · Explizit stoppen

1. Discord starten, anmelden, dann Rechtsklick → Stoppen.
2. Es darf keine Dienstinstanz weiterlaufen. Ein ausdrücklicher Dock-Klick startet sie wieder in der Einzelansicht; STRG-Klick ergänzt die Mehrfachauswahl.
3. Rechtsklick → Starten: gespeicherte Session wird wiederverwendet.
4. Stoppen, App vollständig neu starten: Dienst muss gestoppt bleiben.

## E · Echtes Maus-Drag-and-drop

1. Vier Spalten einschalten. Gestarteten Dienst aus der Leiste in Spalte 4 ziehen.
2. Zielhervorhebung und richtige Zuordnung prüfen.
3. Dieselbe Instanz nach Spalte 2 ziehen. Keine doppelte Instanz und kein Reload.
4. Icons innerhalb der Leiste sortieren; Reihenfolge nach Neustart prüfen.
5. Drag mit Escape abbrechen. Kein dauerhaft ausgeblendeter Dienst und kein hängen gebliebenes Overlay.

Die automatisierten Desktop-Tests prüfen die HTML-Drag-Handler synthetisch; sie ersetzen diesen realen Maus-/DPI-Test nicht.

## F · Medientasten

1. In einem funktionierenden Player Play/Pause, Next, Previous ausprobieren.
2. Zweiten Player starten, Windows-Medienauswahl beobachten. Nicht beide Player dürfen denselben Tastendruck ausführen.
3. Wiedergabe in IndigoDock beenden und einen externen Player starten. IndigoDock darf dessen Tasten nicht global beanspruchen.
4. Lautstärketasten müssen die Windows-Lautstärke verändern.
5. Ergebnis mit Windows-Version, Tastatur und Anbieter dokumentieren. Native Chromium-Arbitrierung ist die Implementierung; eigene Playerpriorisierung ist nicht vorhanden.

## G · Discord und Geräte

1. In einem eigenen Test-Voice-Channel Mikrofonzugriff ausdrücklich erlauben.
2. Ein-/Ausgabe, Gerätauswahl und Windows-Datenschutzeinstellungen prüfen.
3. Spalten wechseln, Discord verdecken, in Tray minimieren: Verbindung darf dadurch nicht abbrechen.
4. Parallel einen funktionierenden Musikplayer abspielen; Audioverhalten prüfen.
5. Kamera und Bildschirmfreigabe getrennt prüfen. Vor der Freigabe muss die konkrete Quelle ausgewählt werden. Systemaudio nur bewusst freigeben.
6. Berechtigung verweigern: Anfrage muss scheitern. Fremder Ursprung im selben Profil darf keine pauschale Freigabe erben.

## Weitere Abnahme

- Neustart mit Fenstern auf getrennten Monitoren, danach Monitor entfernen: Fenster muss im sichtbaren Arbeitsbereich landen.
- Autostart der installierten/entpackten App einrichten und nach Windows-Anmeldung prüfen. Vor dem Löschen des App-Ordners Autostart deaktivieren.
- Eigenen HTTP-Home-Assistant-Dienst mit WebSockets testen; bei selbstsigniertem HTTPS darf kein automatischer Zertifikats-Bypass stattfinden.
- Netzwerk trennen und wiederherstellen, Dienst wiederholen; andere Dienste müssen bedienbar bleiben.
- Profil abmelden/löschen nur mit Wegwerfaccount testen; geteilte Profile müssen alle betroffenen Dienste nennen.
- Benachrichtigung erlauben/verweigern, globale Sperre und Stummschaltung separat testen.
- NSIS-Installation, Deinstallation, Upgrade und SmartScreen mit signierter Veröffentlichung gesondert abnehmen.
