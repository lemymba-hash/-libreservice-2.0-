// routes/messages.js
// F7 - Prise de contact / F10 - Messagerie interne

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations - liste des conversations de l'utilisateur connecté
router.get('/conversations', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         CASE WHEN m.expediteur_id = ? THEN m.destinataire_id ELSE m.expediteur_id END AS contact_id,
         MAX(m.date) AS dernier_message_date
       FROM messages m
       WHERE m.expediteur_id = ? OR m.destinataire_id = ?
       GROUP BY contact_id
       ORDER BY dernier_message_date DESC`
    )
    .all(req.user.id, req.user.id, req.user.id);

  const conversations = rows.map((row) => {
    const contact = db.prepare('SELECT id, nom, role FROM users WHERE id = ?').get(row.contact_id);
    const dernier = db
      .prepare(
        `SELECT contenu, date, expediteur_id, lu FROM messages
         WHERE (expediteur_id = ? AND destinataire_id = ?) OR (expediteur_id = ? AND destinataire_id = ?)
         ORDER BY date DESC LIMIT 1`
      )
      .get(req.user.id, row.contact_id, row.contact_id, req.user.id);
    const nonLus = db
      .prepare(
        `SELECT COUNT(*) AS n FROM messages WHERE expediteur_id = ? AND destinataire_id = ? AND lu = 0`
      )
      .get(row.contact_id, req.user.id).n;

    return { contact, dernier_message: dernier, non_lus: nonLus };
  });

  res.json({ conversations });
});

// GET /api/messages/:contactId - historique des messages avec un contact donné
router.get('/:contactId', requireAuth, (req, res) => {
  const contactId = parseInt(req.params.contactId, 10);

  const messages = db
    .prepare(
      `SELECT * FROM messages
       WHERE (expediteur_id = ? AND destinataire_id = ?) OR (expediteur_id = ? AND destinataire_id = ?)
       ORDER BY date ASC`
    )
    .all(req.user.id, contactId, contactId, req.user.id);

  // Marquer comme lus les messages reçus dans cette conversation
  db.prepare(`UPDATE messages SET lu = 1 WHERE expediteur_id = ? AND destinataire_id = ? AND lu = 0`).run(
    contactId,
    req.user.id
  );

  res.json({ messages });
});

// POST /api/messages - envoyer un message
router.post('/', requireAuth, (req, res) => {
  const { destinataire_id, contenu } = req.body;
  if (!destinataire_id || !contenu || !contenu.trim()) {
    return res.status(400).json({ error: 'destinataire_id et contenu sont obligatoires.' });
  }

  const destinataire = db.prepare('SELECT id FROM users WHERE id = ?').get(destinataire_id);
  if (!destinataire) return res.status(404).json({ error: 'Destinataire introuvable.' });

  const info = db
    .prepare(`INSERT INTO messages (expediteur_id, destinataire_id, contenu) VALUES (?, ?, ?)`)
    .run(req.user.id, destinataire_id, contenu.trim());

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ message });
});

module.exports = router;
