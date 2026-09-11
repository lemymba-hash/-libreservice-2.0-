# LibreService — MVP

Marketplace de mise en relation avec des prestataires de services à la personne
(plombiers, électriciens, coiffeurs, ménage, cours particuliers, etc.) à Libreville.

Ce dépôt implémente le **MVP** décrit dans le cahier des charges : inscription,
validation admin des prestataires, recherche/annuaire, fiche prestataire, avis,
messagerie interne, et back-office administrateur.

## Stack technique

- **Back-end** : Node.js + Express (API REST)
- **Base de données** : SQLite via `node:sqlite`, le module intégré nativement à Node.js depuis la version 22.5 — fichier `libreservice.db` créé automatiquement, **aucune compilation native, aucun outil de build (Visual Studio, Python, etc.) n'est nécessaire**
- **Authentification** : JWT + mots de passe hashés (bcrypt)
- **Front-end** : HTML / CSS / JavaScript vanilla, mobile-first, servi directement par Express (pas de build)

> ⚠️ **Prérequis important** : Node.js **22.5 ou supérieur** (le projet a été testé avec Node 24). `node:sqlite` affiche un avertissement `ExperimentalWarning: SQLite is an experimental feature` au démarrage : c'est normal, l'API est stable pour un usage MVP, ce n'est pas une erreur.

C'est une architecture **monolithique** volontairement simple, conforme à la
section 6.1 du cahier des charges, facile à faire tourner en local dans VS Code
et à déployer ensuite sur un hébergeur cloud.

## Installation (VS Code / terminal)

Prérequis : [Node.js](https://nodejs.org) version **22.5 ou supérieure** (vérifiez avec `node -v`).

```bash
# 1. Ouvrir le dossier dans VS Code, puis dans le terminal intégré :
cd libreservice

# 2. Installer les dépendances
#    (si une tentative précédente a échoué, supprimez d'abord node_modules et package-lock.json)
npm install

# 3. Créer votre fichier de configuration
cp .env.example .env
# (sous Windows PowerShell : copy .env.example .env)

# 4. Lancer le serveur
npm start
```

L'application est accessible sur **http://localhost:3000**.

Pour le développement avec rechargement automatique :

```bash
npm run dev
```

## Compte administrateur

Au premier démarrage, un compte admin est créé automatiquement à partir des
identifiants définis dans `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, valeurs par
défaut : `admin@libreservice.ga` / `admin123`).

Connectez-vous avec ce compte sur `/pages/connexion.html` puis rendez-vous sur
`/pages/admin.html` pour accéder au back-office (validation des prestataires,
modération des avis, statistiques).

**⚠️ Important :** changez ce mot de passe avant tout déploiement public.

## Structure du projet

```
libreservice/
├── server.js              # Point d'entrée du serveur Express
├── db.js                  # Connexion + schéma SQLite
├── seed.js                # Création automatique du compte admin
├── constants.js           # Catégories de services + quartiers de Libreville
├── middleware/
│   └── auth.js            # Middlewares JWT (requireAuth, requireRole...)
├── routes/
│   ├── auth.js             # F1 - Inscription / connexion
│   ├── prestataires.js      # F2, F4, F5, F6 - Profils, recherche, annuaire, fiche
│   ├── avis.js              # F8 - Avis et notation
│   ├── messages.js          # F7, F10 - Contact et messagerie interne
│   └── admin.js             # F3, F9 - Validation, modération, statistiques
├── public/                 # Front-end statique (mobile-first)
│   ├── index.html            # Page d'accueil
│   ├── css/style.css
│   ├── js/app.js              # Fonctions partagées (session, appels API...)
│   └── pages/
│       ├── recherche.html      # F4/F5 - Recherche & annuaire
│       ├── prestataire.html    # F6/F7/F8 - Fiche détaillée, contact, avis
│       ├── inscription.html    # F1/F2 - Inscription client/prestataire
│       ├── connexion.html      # F1 - Connexion
│       ├── profil.html         # F2 - Gestion du profil
│       ├── messages.html       # F7/F10 - Messagerie
│       └── admin.html          # F3/F9 - Back-office
└── uploads/                 # Photos de profil des prestataires (créé automatiquement)
```

## Fonctionnalités couvertes (voir cahier des charges §3.1)

| # | Fonctionnalité | Statut |
|---|---|---|
| F1 | Inscription / Connexion | ✅ |
| F2 | Profils utilisateurs (client & prestataire) | ✅ |
| F3 | Validation des prestataires par l'admin | ✅ |
| F4 | Recherche par catégorie / quartier | ✅ |
| F5 | Annuaire des prestataires validés | ✅ |
| F6 | Fiche prestataire détaillée | ✅ |
| F7 | Prise de contact (messagerie + téléphone) | ✅ |
| F8 | Avis et notation | ✅ |
| F9 | Back-office admin (validation, modération, stats) | ✅ |
| F10 | Messagerie interne | ✅ |

Le paiement en ligne, la géolocalisation automatique, la réservation/agenda,
l'application mobile native, le système de devis/enchères et les notifications
push sont **volontairement exclus** de ce MVP (voir §3.2 du cahier des charges).

## Modèle de données

Le schéma SQL (table `users`, `prestataires`, `avis`, `messages`) suit
exactement le modèle simplifié du §6.3 du cahier des charges. Voir `db.js`.

## Prochaines étapes suggérées

1. Démarcher manuellement les 20-30 premiers prestataires à Libreville (voir §11 — risque "pas assez de prestataires").
2. Ajouter un envoi d'email/SMS lors de la validation d'un profil (actuellement le prestataire doit se reconnecter pour voir le statut).
3. Migrer SQLite vers PostgreSQL si le trafic augmente (le code SQL est déjà très proche).
4. Déployer sur un hébergeur cloud (Render, Railway, OVH...) avec variables d'environnement en production.
5. Suivre les indicateurs du §10 (prestataires inscrits, mises en relation, taux de conversion...) via l'onglet Statistiques du back-office.
