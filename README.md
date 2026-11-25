# MezTravel

Application web installable (PWA) de planification de voyages, en italien, anglais et français.

## Commandes

- `npm install` : installer les dépendances
- `npm run dev` : lancer l'app en local (adresse : `/MezTravel/`)
- `npm run build` : vérifier et construire l'app
- `npm test` : tests des règles de l’itinéraire et de la copie de sécurité
- `npm run icons` : régénérer les icônes

Chaque envoi sur `main` publie l'app sur GitHub Pages.

Carte de l'icône : Natural Earth (domaine public).

## Services externes

- Recherche de lieux : [Nominatim](https://operations.osmfoundation.org/policies/nominatim/), uniquement à la demande, 1 requête par seconde au maximum, résultats gardés en cache. Pas d’autocomplétion.
- Carte : [tuiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/), sans préchargement ni usage hors ligne.
- Météo : [Open-Meteo](https://open-meteo.com/en/terms), usage non commercial, données CC BY 4.0.

## Réservations

Les PDF sont lus sur le téléphone avec pdf.js et gardés dans IndexedDB ; rien n’est envoyé à un service. La copie de sécurité les contient.

## Argent

Taux : [ExchangeRate-API](https://www.exchangerate-api.com/docs/free) (source citée, taux gardés en cache jusqu’à la mise à jour suivante, aucune redistribution). Les montants sont stockés en millièmes entiers ; chaque dépense garde le taux de sa saisie.

## Journal et urgences

Les photos sont réduites sur le téléphone (sans la position GPS) et gardées dans IndexedDB. Les données d’urgence (`src/emergency.ts`) ne contiennent que des informations lues sur des pages officielles, avec source et date : mettre à jour `checkedOn` après chaque nouveau contrôle.

## Traduction de texte

[MyMemory](https://mymemory.translated.net/doc/spec.php) : à la demande seulement, un paragraphe de 500 octets au maximum, sans adresse e-mail (limite anonyme). Ses [conditions](https://mymemory.translated.net/terms-and-conditions) prévoient la conservation des textes envoyés : l’avertissement à l’écran doit rester.

## Itinéraire proposé

Les envies (personnes, rythme, catégories, pour tout le voyage ou pour un jour) sont enregistrées dans le voyage. Sans clé secrète : l’app prépare une demande à coller dans l’application Claude, puis lit la réponse collée, la vérifie et montre un aperçu avant d’ajouter les activités choisies. La demande contient la destination, les dates, le nombre de personnes, le rythme, les envies, et le titre avec l’heure des activités déjà prévues ces jours-là. Rien d’autre, et rien n’est envoyé automatiquement.

Les demandes (parcours et journées) font de Claude un conseiller : une question à la fois, évaluation de l’idée de parcours si l’on en a une, discussion, et résultat à importer seulement après confirmation. La discussion a lieu dans l’application Claude.

Parcours en plusieurs villes : même principe, avec des propositions d’étapes et de nuits (le total doit correspondre aux dates). Les demandes invitent à chercher sur le web en privilégiant les sites officiels et à joindre l’adresse consultée. L’app ne vérifie pas ces sources : elle n’accepte que des adresses http(s), affiche le nom du site et signale les activités sans source. La demande peut aussi contenir les villes, le quartier où l’on dort et les trois champs facultatifs du parcours.

## Guide du Japon et itinéraire dans l’app

`src/guide/japan.json` : destinations, lieux, durées de trajet et informations pratiques, recueillis le 2026-11-25 avec leurs adresses sources (descriptions rédigées pour le projet, sans prix ni horaires). `checked: false` = page non confirmée, signalée « à confirmer ». Les durées de visite, quartiers et nombres de nuits conseillés sont en partie des estimations. Toutes les pages n’ont pas été relues une par une après la recherche. À revérifier avant le voyage de 2027.

`src/planner.ts` propose les parcours et les journées par règles fixes, sur le téléphone, sans service externe. Le guide a la même forme pour tout pays (`src/guide/types.ts`).

## Chercher à proximité

Des boutons ouvrent Google Maps avec la recherche prête (format officiel [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), sans clé). Seul le texte de la recherche est transmis, au moment où l’on touche le bouton ; aucune donnée de Google n’est copiée dans l’app.

## Confidentialité

Ne jamais ajouter au dépôt de réservations, documents personnels ou clés d'API.
