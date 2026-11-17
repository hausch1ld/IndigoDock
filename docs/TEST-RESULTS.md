# IndigoDock 1.7.0 · Lokaler Prüfstand 17.11.2026

41 Logiktests, Typecheck und Produktionsbuild erfolgreich. 18 native Windows-Prüfungen bestanden, einschließlich echtem Prozessneustart: drei Gruppen-Modi, Doppelklick zur Einzelansicht, Icon-Auswahl (24 Lucide-Symbole), kein redundantes Speichern-Menü bei Gruppenmitgliedern, Rahmen/Platzhalter, wiederhergestellte Fenster ohne Neuladen, private und gemeinsam genutzte Cookies/Local Storage sowie gespeicherte Icons und Breiten. Wetter: kein Zahnrad nach Einrichtung, Quellenhinweis unter dem Standort.

Discord verwendet weiterhin die vorhandene Partition `persist:multidock-discord` mit deaktiviertem globalem Profil. Keine Zugangsdaten ausgelesen oder kopiert. Cookie-Änderungen werden zeitnah, Sitzungsdaten zusätzlich regelmäßig sowie bei Hintergrund-/Ruhemodus gespeichert. Der Test beweist lokale Browserpersistenz, nicht die unbegrenzte Gültigkeit einer echten Discord-Sitzung. Die Ursache der gemeldeten sporadischen Abmeldung ist noch nicht abschließend nachgewiesen.

# IndigoDock 1.6.0 · Lokaler Prüfstand 17.11.2026

39 Logiktests bestanden; Typecheck und Produktionsbuild erfolgreich. Zwölf neue native Windows-Integrationstests prüfen normale Auswahl, STRG-Auswahl mit 2/3/4 Apps, Kontextmenü zum Speichern, leere Gruppen und Drop-Ziel, gespeicherte Breiten, mehrere bekannte Dienste, tatsächliche private/geteilte Chromium-Sessions samt Rückkehr zum privaten Profil, Wetter-Ersteinrichtung, Wetteranzeige mit fünf Folgetagen und alle fünf Farben unter Aussehen.

Wetter und Einstellungen visuell kontrolliert. Echte Open-Meteo-Abfrage mit öffentlichem Testort Berlin erfolgreich (acht Suchtreffer, sechs Tage einschließlich heute). Der automatisierte UI-Test nutzt feste Wetterdaten ohne persönliche Standortdaten. Bisherige 1.5.2-Prüfungen sind unten als historischer Stand dokumentiert, nicht als erneuter vollständiger Durchlauf.

# IndigoDock 1.5.2 · Lokaler Prüfstand 16.11.2026

35 Logiktests und 29 native Windows-Prüfungen bestanden, einschließlich Prozessneustart. Kalender: Montag als Wochenbeginn, Schaltjahre, Monatswechsel und heutiger Tag geprüft. Sidebar-Schalter im Dock; Titelleistenuhr nur bei geschlossener Sidebar. Abstände und Kalenderansicht in der installierten App visuell geprüft.

Spotify-Status berücksichtigt die Play/Pause-Schaltfläche vor ungenutzten Audioelementen; beide Zustände im DOM-Integrationstest geprüft. Live-Wechsel während laufender Wiedergabe noch nicht bestätigt. Bildschirmfreigabetest prüft in diesem Lauf Videoframes ohne Systemaudio; Loopback war auf dem Testhost nicht verfügbar.

Produktionsbuild und EVS-Signatur erfolgreich. Installierte Version und lokale Startkopie ersetzt; app.asar-Hash mit Build identisch. Keine GitHub-Veröffentlichung.

# IndigoDock 1.5.1 · Lokaler Prüfstand 16.11.2026

33 Logiktests und 27 native Windows-Prüfungen bestanden. Neue Prüfungen bestätigen Widget-Auswahl, eigene Widget-/Schriftfarben, zentrierte Uhr und Entfernung des Palettensymbols. Der neue Sidebar-Reiter nutzt denselben festen Dialog-Footer. Produktionsbuild erfolgreich.

Spotify: Shuffle und Repeat bedienen die Webplayer-Schaltflächen. Stummschaltung nutzt den Player-Button mit Regler-Fallback und Wiederherstellung der vorherigen Lautstärke. Lautstärkeregler ohne seitliches Eingabefeld-Padding. Live-Prüfung nach Installation.

# IndigoDock 1.5.0 · Prüfstand 16.11.2026

- TypeScript und Produktionsbuild bestanden; 33 Logiktests bestanden.
- 26 native Windows-Prüfungen bestanden, einschließlich echtem Prozessneustart.
- Sidebar unabhängig von Spalten und Gruppen: korrekte native View-Abstände für alle vier Dock-Positionen; alte Widget-Dienste werden samt Reihenfolge migriert.
- Notizen, Hintergrundfarbe und Widget-Reihenfolge bleiben nach Neustart erhalten.
- Einstellungsfenster über alle Tabs gleich groß; Footer bleibt unten. Dienstkatalog mit Logos und benutzerdefiniertem Eintrag.
- Spotify-Lautstärkeadapter setzt den Webplayer-Regler und löst dessen Eingabeereignisse aus; isolierter DOM-Integrationstest bestanden. Live-Prüfung bestanden: Widget und Webplayer übernehmen denselben Lautstärkewert; ursprüngliche Lautstärke wiederhergestellt.
- Windows-Audiomixer liest und setzt reale Audiositzungen mit UTF-8-Ausgabe. CPU und NVIDIA-GPU liefern Messwerte.
- Bildschirmfreigabe empfängt echte Videoframes eines separaten Testfensters; Discord-Übertragung zu einem Teilnehmer bleibt manuell zu bestätigen.
- Gruppen, persistente Cookies, Local Storage, Element-Auswahl/Wiederherstellung, Menüs und Titelleiste geprüft.
- WhatsApp erhält die echte Chromium-Version ohne Electron/App-Kennung; Live-Prüfung bestanden: angemeldete Chatliste statt Browser-Fehlermeldung.
- Castlabs EVS-Streaming-Signatur der gepackten EXE gültig. Spotify-Wiedergabe war vom Benutzer bestätigt.
- Öffentliche Release-Veröffentlichung bleibt bis zur EVS-Signierung in CI deaktiviert.
