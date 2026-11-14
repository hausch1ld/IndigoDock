# IndigoDock 1.1.0 · Prüfstand 14.11.2026

- TypeScript und Produktionsbuild bestanden.
- 20 automatisierte Logiktests bestanden.
- 16 native Desktopprüfungen bestanden, einschließlich echtem Prozessneustart.
- Neue Prüfungen: Tab-Leiste/native Bounds, aktive/inaktive Gruppierung, Drop startet gestoppten Dienst, Meldung über nativen Ansichten, Sortierung in Einstellungen.
- Cookies und Local Storage des lokalen Testdienstes bleiben beim Stoppen/Starten und Prozessneustart erhalten.
- Installierte EXE und neues Icon auf Windows gestartet; vorhandenes Layout übernommen.
- Discord und Steam verlangten beim realen Profil erneut eine Anmeldung. Ein erhaltener Anbieter-Login ist deshalb nicht bestätigt.
- Discord-Bildschirmfreigabe mit echtem Account noch manuell zu prüfen. Spotify bewusst zurückgestellt.
- Lokaler NSIS-Aufruf scheitert mit spawn UNKNOWN. Der Windows-Installer wird durch GitHub Actions gebaut.

Die Tests verwenden lokale Testseiten und belegen keine uneingeschränkte Drittanbieter-Kompatibilität.
