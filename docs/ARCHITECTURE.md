# Architektur und Sicherheitsmodell

## Native Views und Layout

Eine BaseWindow enthält die lokale UI-WebContentsView und je gestartetem Dienst genau eine zusätzliche WebContentsView. Die `Map<serviceId, WebContentsView>` ist die maßgebliche Instanzverwaltung. Unsichtbare Views bleiben angehängt und werden mit `setVisible(false)` ausgeblendet. `backgroundThrottling: false` verhindert das automatische Drosseln der Dienstseiten. Stoppen entfernt und schließt die View ausdrücklich, einschließlich eines möglichen `beforeunload`-Dialogs. Beim endgültigen Fensterende werden auch die von BaseWindow nicht automatisch zerstörten WebContents geschlossen.

Der Main-Prozess berechnet Bounds aus DIP-Fensterabmessungen und validierten Breitenverhältnissen. Titel 40 DIP, Tabs 34 DIP, Dock 72 DIP, Splitter 6 DIP. React verwendet dieselbe reine Bounds-Funktion für Tabs und Splitter. Eine Größenänderung navigiert keine Seite. Pointer Capture hält den Splitterzug am UI-Element; IPC-Breitenupdates werden pro Animationsframe zusammengefasst. Zwei benachbarte Spalten teilen ihre gemeinsame Breite; bei sehr schmalen Fenstern sinkt die Mindestbreite symmetrisch.

Eine DOM-Ebene kann native Geschwister-Views nicht überzeichnen. Beim Öffnen eines App-Menüs, Dialogs oder Drop-/Auswahl-Overlays werden daher die sichtbaren Dienste aufgenommen und ihre nativen Views vorübergehend ausgeblendet. Die UI zeigt Bildabzüge mit transparenten Zielbereichen. Die WebContents laufen weiter. Wenn eine Aufnahme fehlschlägt, bleibt der Zielbereich bedienbar, jedoch ohne Bildabzug. Beim Schließen werden dieselben Instanzen sichtbar. Die UI serialisiert IPC-Kommandos, sodass eine langsame Aufnahme einen späteren Schließbefehl nicht überholen kann.

Für jede Spaltenanzahl existiert ein eigener Layoutzustand. Beim erstmaligen Reduzieren landen zusätzliche Spalten in der letzten verbleibenden Spalte; der dortige aktive Dienst bleibt vorn. Bei Rückkehr zu einem bekannten Layout wird dessen Zustand wiederhergestellt. Es startet oder stoppt dabei kein Dienst. Innerhalb eines Layouts besitzt jeder Dienst höchstens eine Zuordnung.

## Vertrauensgrenzen

- Main besitzt Dateien, Windows-Integration und Sessions. Renderer und externe Inhalte erhalten keine Node-Rechte.
- Die lokale UI erhält nur `snapshot`, `command` und einen abmeldbaren Zustandslistener.
- IPC prüft konkrete WebContents-Identität, Main-Frame und exakte lokale UI-URL; jede Nutzlast wird mit Zod validiert.
- Externe Ansichten: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`; kein Preload mit App-Bridge.
- Keine JavaScript-Injektion in Produktions-Dienste. JavaScript-Auswertung in Tests betrifft ausschließlich eigene lokale Testseiten.
- Nur Discord erhält einen Browser-User-Agent ohne Electron-/App-Kennung. Keine Umgehung von Anbieter-Logins, keine Zertifikatsausnahmen, keine Passwort-/Tokenextraktion.
- Top-Level-Navigation akzeptiert HTTPS; HTTP nur ausdrücklich und nur zum konfigurierten HTTP-Ursprung. Identitätsanbieter dürfen HTTPS-Redirects verwenden, erhalten aber keine automatisch übertragenen Medienberechtigungen.
- Neue Fenster werden blockiert und nach Bestätigung im Systembrowser geöffnet. Das kann Popup-basierte Login-Flows einschränken.
- Downloads verwenden einen Speichern-Dialog und werden niemals automatisch geöffnet.
- Eigene Icons sind eingebettete PNG/JPEG/WebP-Daten; SVG ist nur für mitgelieferte Icons zulässig.

## Berechtigungen und Benachrichtigungen

Session-Permission-Check und Permission-Request-Handler prüfen Dienstprofil und tatsächlichen Ursprung. Mikrofon, Kamera, Benachrichtigungen und Bildschirmfreigabe starten mit „Nachfragen“. Andere Fähigkeiten sind standardmäßig gesperrt. Bildschirmfreigabe fragt bei jedem Aufruf nach einer konkreten Fenster-/Monitorquelle; Systemaudio wird nur bei entsprechender Anfrage geteilt. Windows-Datenschutzeinstellungen gelten zusätzlich. Geänderte Regeln verhindern neue Freigaben; bereits laufende Kamera-/Mikrofonstreams zuverlässig über Stoppen des Dienstes beenden.

Web-Benachrichtigungen verwendet Chromium/Electron nativ. Die globale Einstellung kann sie unabhängig vom Dienst blockieren. Es gibt keinen künstlichen Ungelesen-Zähler, weil dafür keine zuverlässige gemeinsame Anbieter-API vorliegt. Seiteneigene Töne werden durch Stummschalten der WebContents gesteuert; Windows-Benachrichtigungstöne zusätzlich in Windows verwalten.

## Grenzen der aktuellen Architektur

Das Snapshot-Overlay friert das sichtbare Bild kurzzeitig ein; Audio und Hintergrundprozesse laufen weiter. Es ist keine echte Live-Komposition transparenter Electron-Views. Webseiten-Vollbild wird nicht als eigene IndigoDock-Funktion implementiert. Popups öffnen grundsätzlich extern. Profile sind lokal durch das Windows-Benutzerkonto geschützt; IndigoDock fügt keine eigene Passwortverschlüsselung oder Kontosynchronisierung hinzu.
