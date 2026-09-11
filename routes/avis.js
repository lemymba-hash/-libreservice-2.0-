// routes/avis.js
// F8 - Système d'avis et de notation

const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function recalculerMoyenne(prestataireId) {
  const row = db
    .prepare(`SELECT AVG(note) AS moyenne, COUNT(*) AS total FROM avis WHERE prestataire_id = ? AND statut = 'visible'`)
    .get(prestataireId);

  db.prepare('UPDATE prestataires SET note_moyenne = ?, nombre_avis = ? WHERE id = ?').run(
    row.moyenne ? Math.round(row.moyenne * 10) / 10 : 0,
    row.total || 0,
    prestataireId
  );
}

// POST /api/avis - un client laisse un avis sur un prestataire
router.post('/', requireAuth, requireRole('client'), (req, res) => {
  const { prestataire_id, note, commentaire } = req.body;

  if (!prestataire_id || !note) {
    return res.status(400).json({ error: 'prestataire_id et note sont obligatoires.' });
  }
  const noteInt = parseInt(note, 10);
  if (!Number.isInteger(noteInt) || noteInt < 1 || noteInt > 5) {
    return res.status(400).json({ error: 'La note doit être un entier entre 1 et 5.' });
  }

  const prestataire = db.prepare('SELECT id FROM prestataires WHERE id = ?').get(prestataire_id);
  if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable.' });

  const deja = db
    .prepare('SELECT id FROM avis WHERE prestataire_id = ? AND client_id = ?')
    .get(prestataire_id, req.user.id);
  if (deja) {
    return res.status(409).json({ error: 'Vous avez déjà laissé un avis pour ce prestataire.' });
  }

  const info = db
    .prepare(`INSERT INTO avis (prestataire_id, client_id, note, commentaire) VALUES (?, ?, ?, ?)`)
    .run(prestataire_id, req.user.id, noteInt, commentaire || null);

  recalculerMoyenne(prestataire_id);

  const avis = db.prepare('SELECT * FROM avis WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ avis });
});

// POST /api/avis/:id/signaler - un utilisateur signale un avis abusif
router.post('/:id/signaler', requireAuth, (req, res) => {
  const avis = db.prepare('SELECT * FROM avis WHERE id = ?').get(req.params.id);
  if (!avis) return res.status(404).json({ error: 'Avis introuvable.' });

  db.prepare(`UPDATE avis SET statut = 'signale' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Avis signalé, il sera examiné par un administrateur.' });
});

module.exports = router;
module.exports.recalculerMoyenne = recalculerMoyenne;
