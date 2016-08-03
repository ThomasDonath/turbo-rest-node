# Basis für meine REST Server #

Die Basisklasse AppRestServer liefert die Grundlage für alle Server, indem hier bereits Konfiguration, Authentifizierung etc. erledigt wird. Die echten Server liefern nur noch die Routen (weil da sind die Parameter zu behandeln) sowie die Controller.
Außerdem sind hier die "typischen" API-Exceptions zusammengefasst. Sie liefern jeweils einen HTTP-Response; da sie alle von der gleichen Klasse abgeleitet sind, ist die Prüfung im Express-Router einfach.

Um die Wiederverwendung einfach zu machen, ist das als Node-Module realisiert, dass im Projekt aus dem TAR zu installieren ist.

npm install ....tgz

## Entwickler-Setup ##

siehe ../ProjectConfig

und dann

* npm install
* make whatever

zum debuggen kann die Ausgabe mit export DEBUG="AppRestServer" aktiviert werden.

## Generell offene Aufgaben (TODO Teilprojekt) ##

siehe Issues
