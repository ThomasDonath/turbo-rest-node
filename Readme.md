# Basis für meine REST Server #

Die Basisklasse BaseAppRestServer liefert die Grundlage für alle Server, indem hier bereits Konfiguration, Authentifizierung etc. erledigt wird. Die echten Server liefern nur noch die Routen (weil da sind die Parameter zu behandeln) sowie die Controller.
Außerdem sind hier die "typischen" API-Exceptions zusammengefasst. Sie liefern jeweils einen HTTP-Response; da sie alle von der gleichen Klasse abgeleitet sind, ist die Prüfung im Express-Router einfach.

Um die Wiederverwendung einfach zu machen, ist das als Node-Module realisiert, dass im Projekt aus dem TAR zu installieren ist.

```shell
npm install ....tgz
bzw.
npm install https://thomdo:Passw@bitbucket.org/thomasdonathcom/hww-tdrestserver/raw/38a82b1742d74e837a544de827a27b966c3d7630/td-rest-server-0.8.0.tgz
```

Alternativ wird die URL direkt im konsumierenden package.json angegeben.

Die URL findet man, indem man im Source Browser auf Raw-Ansicht geht - dahinter verbirgt sich diese URL.

**Das fertige TGZ wird nach Dropbox-public kopiert (manuell) und von dort aus in den konsumierenden Projekten installiert.**

## Entwickler-Setup ##

siehe ../ProjectConfig

und dann

* npm install
* make whatever

zum debuggen kann die Ausgabe mit export DEBUG="AppRestServer" aktiviert werden.

Einen dedizierten Test habe ich (noch) nicht - wird mit dem Integrationstest der api.geschaeftspartner getestet.

Konzept Genric Handler: <https://visualstudiomagazine.com/articles/2015/09/01/managing-functions-in-typescript.aspx>

## Generell offene Aufgaben (TODO Teilprojekt) ##

* nach GitHub (package.json anpassen) und NPM (dann GitHub auch in WordPress und XING verlinken)
* JavaDoc in allen Files und in englisch
* Test für die Kombinationen: noLock | markDeleted; siehe: <https://ian_lin.gitbooks.io/javascript-testing/content/chapter6.html> als Testsuite ausführen(?)
* Formatierung Logger (Timestamp + Quelle, Re)quest-ID (ECID), Per-Request-Logging, Log Level zur Laufzeit setzen?
* Authentifizierung: Die Middleware wird bereits aufgerufen, muss aber noch ausprogrammiert werden. Ziel ist, ein JWT vom Client zu kriegen, dieses zu verifizieren und daraus den Mandanten abzuleiten.
* echten Usernamen (aus Authentifizierung) in den AuditRecord schreiben (RestPersistenceAbstract.getAuditData)
* für alle DML wenn das Format nicht passt (JSON-Parse Fehler fängt Express ab - Pflichtfelder muss ich selber testen) ebenso, wenn der Body kein JSON sein sollte(?)
* Security: check/add Helmet, Express-validation See <https://github.com/KunalKapadia/express-mongoose-es6-rest-api?utm_source=microserviceweekly.com&utm_medium=email>
* *später*
* Das "Connection holen" in eine Funktion auslagern; diese Funktion könnte Connections je Mandant vorhalten (FIFO-Array(10))
* Löschen: => neue Methode queryAll (als "Papierkorb" im UI) und PapierkorbLeeren()
* alle Texte (insbes. Exceptions mehrsprachig)
* Logging als Aspekt

* siehe Issues