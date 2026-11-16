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
