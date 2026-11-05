# Geschenkeplaner gemeinsam – vorkonfiguriert für x-mas

**Bereits erledigt:** Supabase-Projekt erstellt, Datenbank-SQL ausgeführt, `config.js` mit Projektadresse und dem öffentlichen Publishable Key ausgefüllt. Die SQL-Datei nicht erneut ausführen, sofern nichts schiefgegangen ist.

**Jetzt als Nächstes:** GitHub-Konto erstellen, öffentliches Repository anlegen, Dateien dieses ZIP-Archivs (entpackt) direkt ins Repository hochladen, GitHub Pages aktivieren. Danach die fertige Webadresse in Supabase unter Authentication → URL Configuration als Site URL und Redirect URL eintragen. Zum Schluss zwei Benutzerkonten über die Website erstellen.

**Wichtig:** Ein GitHub-Repository ist für die hier gewählte kostenlose Pages-Bereitstellung öffentlich. Lade keine privaten Daten oder geheimen Zugangsschlüssel hoch. Der verwendete Publishable Key ist ausdrücklich öffentlich.

---


Die Web-App ist vorbereitet. **Der Cloud-Dienst und die öffentliche Adresse müssen einmal in deinen eigenen kostenlosen Konten eingerichtet werden.** Ich habe diese Konten nicht für dich angelegt. Die Einrichtung ist am Computer einfacher, aber grundsätzlich auch auf dem Handy möglich. Anschließend läuft die App im Browser auf beiden iPhones oder Android-Handys.

## 1. Kostenlose Datenbank anlegen

1. Öffne https://supabase.com und registriere dich kostenlos.
2. Erstelle ein neues Projekt im **Free Plan**. Das Datenbankpasswort gut aufbewahren.
3. Öffne im Projekt links **SQL Editor** → **New query**.
4. Öffne die beiliegende Datei **`datenbank.sql`**, kopiere ihren gesamten Inhalt in den Editor und klicke **Run**.
5. Öffne **Project Settings → API Keys** bzw. **Connect**. Notiere dir die **Project URL** und den **publishable key** (oder den alten `anon`-Key). **Niemals** einen `service_role`- oder `secret`-Key verwenden.

Die Datenbank verwendet Authentifizierung und Row Level Security. Jeder Haushalt kann höchstens zwei Mitglieder haben. Der Einladungscode ist lang und zufällig, aber behandle ihn trotzdem vertraulich.

## 2. Anmeldung einstellen

1. Öffne in Supabase **Authentication → Providers → Email**. E-Mail/Passwort-Anmeldung aktiv lassen.
2. **Confirm email** am besten eingeschaltet lassen, damit nur bestätigte E-Mail-Adressen zugelassen werden.
3. Die passende Website-Adresse wird in Schritt 4 unter **Authentication → URL Configuration** als **Site URL** und **Redirect URL** ergänzt.
4. Supabase hat im kostenlosen Tarif Einschränkungen beim Versand von Bestätigungs-E-Mails. Für genau zwei Konten ist das oft ausreichend, aber nicht garantiert. Wenn keine Mail eintrifft, im Spam-Ordner prüfen und die Auth-E-Mail-Einstellungen ansehen. **E-Mail-Bestätigung nicht leichtfertig abschalten.**

## 3. App verbinden

**Bereits erledigt:** `config.js` enthält deine Projektadresse und deinen öffentlichen Publishable Key. Keine Änderung erforderlich.

Beispiel:

```javascript
window.GESCHENKE_CONFIG = {
  supabaseUrl: 'https://abcxyz.supabase.co',
  supabaseKey: 'sb_publishable_...'
};
```

Der Schlüssel ist ausdrücklich **öffentlich** und darf im Website-Quelltext stehen. Die eigentliche Datensicherheit übernehmen die Regeln in `datenbank.sql`.

## 4. Kostenlos im Internet veröffentlichen

1. Melde dich bei https://github.com an.
2. Erstelle ein neues **öffentliches** Repository, z. B. `geschenkeplaner`.
3. Lade **alle Dateien dieses Ordners** über **Add file → Upload files** ins Hauptverzeichnis hoch (einschließlich deiner bearbeiteten `config.js`).
4. Gehe zu **Settings → Pages**. Unter **Build and deployment** wähle **Deploy from a branch** → Branch **main** → **/(root)** → **Save**.
5. Danach erscheint eine HTTPS-Adresse nach dem Muster `https://DEINNAME.github.io/geschenkeplaner/`.
6. Hinterlege genau diese URL in Supabase unter **Authentication → URL Configuration** sowohl als **Site URL** als auch in den erlaubten **Redirect URLs**.

Das Repository ist öffentlich und damit auch der App-Code. **Keine privaten Informationen oder geheimen API-Schlüssel hochladen!** Die Geschenkedaten selbst liegen ausschließlich in deiner zugriffsgeschützten Cloud-Datenbank, nicht im Repository.

## 5. Auf zwei Handys starten

**Handy 1:** Website öffnen → **Konto erstellen** → gegebenenfalls E-Mail bestätigen → anmelden → **Gemeinsame Liste erstellen** → **Einladung** öffnen → den Code per privater Nachricht an Handy 2 senden.

**Handy 2:** dieselbe Website öffnen → mit **eigener** E-Mail-Adresse ein Konto erstellen → bestätigen → anmelden → Einladungscode einfügen → **Liste beitreten**.

**iPhone:** Website in Safari öffnen → Teilen-Symbol → **Zum Home-Bildschirm** → **Hinzufügen**.

**Android:** Website in Chrome öffnen → Menü (⋮) → **Zum Startbildschirm hinzufügen** / **App installieren**.

Ab jetzt können beide Personen Geschenke, Budgets und Status bearbeiten. Änderungen werden online gespeichert und normalerweise direkt auf dem anderen Handy sichtbar. Falls eine Live-Verbindung unterbrochen wird, die Seite neu öffnen. **Ohne Internet sind keine Änderungen möglich.**

## Vorhandene Liste übernehmen

Im alten Geschenkeplaner auf **Sicherung** klicken. Danach in der neuen gemeinsamen App über **Import** die alte JSON-Datei auswählen. Der Import **ergänzt** die vorhandene Liste; er löscht nichts. Wenn du mehrmals importierst, entstehen Duplikate. Bei einem Netzfehler während des Imports können bereits einige Einträge angelegt sein.

## Wichtige Hinweise

- **Kosten:** Für zwei private Nutzer typischerweise 0 € in den kostenlosen Tarifen. Hosting über GitHub Pages, Datenbank/Authentifizierung über Supabase. Die Nutzungsgrenzen und Konditionen können sich ändern.
- **Inaktivität:** Supabase kann Free-Projekte nach rund einer Woche geringer Nutzung pausieren. Dann muss der Projektinhaber das Projekt im Supabase-Dashboard wieder aktivieren.
- **Backups:** Im Menü **Sicherung** regelmäßig JSON-Dateien herunterladen. Die kostenlose Supabase-Stufe bietet keine garantierten täglichen Backups. Eine Wiederherstellung erfolgt aktuell durch **Import** in die Liste (mit möglicher Duplizierung bestehender Daten).
- **Privatsphäre:** Beide Mitglieder sehen immer die gesamte Liste, einschließlich eigener Geschenke. Nicht als Überraschungsverwaltung zwischen zwei Partnern benutzen.
- **Gleichzeitige Bearbeitung desselben Eintrags:** Die zuletzt beim Server eintreffende Änderung gewinnt. Es gibt keine Konfliktanzeige.
- **Sicherheit:** Langes einzigartiges Passwort verwenden, Einladungslink privat behandeln und Code nach erfolgreicher Einladung über **Code erneuern** rotieren. Nur den `publishable`/`anon`-Key im Frontend verwenden.
- **Optional:** `index.html` ist die Startdatei. Das Projekt benötigt keine kostenpflichtige App, keinen eigenen Server und keinen Installationsprozess für Endnutzer.

## Dateien

- `index.html` – Oberfläche
- `styles.css` – Design für Mobilgeräte
- `app.js` – Anmeldung, Bearbeitung, Live-Synchronisierung, Sicherung/Import
- `config.js` – deine Projektadresse und dein öffentlicher Schlüssel (bereits eingetragen)
- `datenbank.sql` – Datenbanktabellen, Datenschutzregeln, Einladungsfunktionen
- `manifest.webmanifest`, `sw.js`, `icon-*.png` – App-Symbol und Home-Bildschirm
