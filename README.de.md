# WebDAV-Dateisystem für „.code-workspace“-Dateien

Diese Erweiterung wurde erstellt, um mithilfe einer `.code-workspace`-Datei eine Verbindung zu einem WebDAV-Server herzustellen. Die Konfiguration ist auch in den Benutzereinstellungen möglich.

> ## Sicherheitswarnung
>
> Diese Erweiterung **vertraut JEDER Konfiguration**, auch in **`nicht vertrauenswürdigen Arbeitsbereichen`**. Dies bedeutet, dass diese Erweiterung eine Verbindung zu jedem Server herstellt, der in den aktuellen Arbeitsbereichseinstellungen konfiguriert ist und im akutellen Arbeitsbereich hinzugefügt ist.
>
> **`Passwörter`** werden als **Klartext** gespeichert. Jeder, der auf Ihre Workspace-Konfiguration zugreifen kann, kann auch das Passwort lesen. **Verwenden Sie eine andere Erweiterung, wenn Sie das Passwort sicher speichern möchten.**

## Merkmale

- Stellen Sie eine Verbindung zu einem WebDAV-Server her
- Ändern Sie alle Konfigurationen in den Arbeitsbereichseinstellungen oder Benutzereinstellungen
- Verwenden Sie die `Basic`- oder `Digest`-Authentifizierung mit Benutzername und Passwort
- Anfragen sind standardmäßig über `https` (`http` wird auch unterstützt)
- Dateibearbeitung in nicht vertrauenswürdigen Arbeitsbereichen zulassen
- Unterstützung für mehrere Verbindungen zu verschiedenen Servern/als verschiedene Benutzer gleichzeitig
- Übersetzungen für Englisch und Deutsch.

## Erweiterungseinstellungen

Sie müssen manuell eine Datei `example.code-workspace` erstellen.

### Beispielkonfiguration
Die folgende Konfiguration (`example.code-workspace`) stellt ohne Authentifizierung (kein Benutzername/Passwort) eine Verbindung zu `example.com` über `https` her.
```json
{
	"folders": [
		{
			"uri": "webdav://meine-ordner-nr"
		}
	],
	"settings": {
		"jonpfote.webdav-folders": {
			"meine-ordner-nr": {
				"host": "example.com",
				// authentication is optional (see below)
			}
		}
	}
}
```

Das Objekt `"jonpfote.webdav-folders": { ... }` kann auch in den `Benutzereinstellungen (JSON)` abgelegt werden. Schauen Sie sich dieses Beispiel an:

```json
example.code-workspace
{
	"folders": [
		{
			"uri": "webdav://meine-ordner-nr"
		}
		// Mehrere Ordner gleichzeitig sind möglich
	]
}

settings.json
{
	"settings": {
		"jonpfote.webdav-folders": { ... }
	}
}



### Verwendung der `Basic`- oder `Digest`-Authentifizierung
```json
"meine-ordner-nr": {
	"host": "beispiel.de",
	"authtype": "basic", // "digest" ist auch möglich
	"username": "mein-nutzername",
	"password": "geheimes-passwort-als-klartext"
}
```

### Deaktivieren Sie „https“ / Verwenden Sie eine „http“-Verbindung
```json
"meine-ordner-nr": {
	"host": "beispiel.de",
	"ssl": false, // Standard: true
}
```

### Legen Sie einen benutzerdefinierten Port fest
Verwenden Sie in den Einstellungen `"host": "beispiel.de:1234"`.

## Versionshinweise

Diese Erweiterung verwendet eine JS-Bibliothek namens `webdav` (v4.11.2) von `@perry-mitchell`. Es ist unter MIT lizenziert und kann unter [github.com/perry-mitchell/webdav-client](https://github.com/perry-mitchell/webdav-client) eingesehen werden.