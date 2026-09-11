// seed.js
// Cree automatiquement un compte administrateur si aucun n'existe encore.
// Appele au demarrage du serveur (voir server.js).

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@libreservice.ga';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (existing) {
    console.log('Compte admin déjà présent (id=' + existing.id + ').');
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (email, password, nom, telephone, role, quartier)
       VALUES (?, ?, ?, ?, 'admin', NULL)`
    )
    .run(email, hash, 'Administrateur', '000000000');

  console.log('Compte admin créé avec succès.');
  console.log('  Email    : ' + email);
  console.log('  Mot de passe : ' + password);
  console.log('  (id=' + info.lastInsertRowid + ') — changez ce mot de passe en production !');
}

if (require.main === module) {
  ensureAdmin();
}

module.exports = { ensureAdmin };
