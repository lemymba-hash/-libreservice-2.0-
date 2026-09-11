// db.js
// Initialise la base de donnees SQLite et cree les tables si elles n'existent pas.
//
// On utilise le module "node:sqlite", integre nativement a Node.js depuis la
// version 22.5 (aucune installation, aucune compilation native requise - contrairement
// a des paquets comme "better-sqlite3" qui necessitent Visual Studio Build Tools sous
// Windows). Node affiche un avertissement "experimental" au demarrage : c'est normal,
// l'API est stable pour un usage MVP.
//
// Pour passer en production sur PostgreSQL/MySQL plus tard, il suffira de remplacer
// ce fichier par un client vers ces bases ; les requetes SQL utilisees ailleurs dans
// le projet restent tres proches du standard SQL.

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname, 'libreservice.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client', 'prestataire', 'admin')),
  quartier TEXT,
  date_inscription TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prestataires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL,
  metier TEXT NOT NULL,
  description TEXT,
  tarif_indicatif TEXT,
  photo TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente', 'valide', 'refuse')),
  note_moyenne REAL DEFAULT 0,
  nombre_avis INTEGER DEFAULT 0,
  date_creation TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS avis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestataire_id INTEGER NOT NULL REFERENCES prestataires(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note INTEGER NOT NULL CHECK(note BETWEEN 1 AND 5),
  commentaire TEXT,
  statut TEXT NOT NULL DEFAULT 'visible' CHECK(statut IN ('visible', 'signale', 'masque')),
  date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expediteur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destinataire_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  lu INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_prestataires_categorie ON prestataires(categorie);
CREATE INDEX IF NOT EXISTS idx_prestataires_statut ON prestataires(statut);
CREATE INDEX IF NOT EXISTS idx_users_quartier ON users(quartier);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(expediteur_id, destinataire_id);
`);

/**
 * Petit helper de transaction imitant l'API de better-sqlite3 : db.transaction(fn)
 * renvoie une fonction qui, une fois appelee, execute fn() entre BEGIN/COMMIT et
 * annule (ROLLBACK) en cas d'erreur.
 */
db.transaction = function transaction(fn) {
  return function (...args) {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rollbackErr) { /* ignore */ }
      throw err;
    }
  };
};

module.exports = db;
