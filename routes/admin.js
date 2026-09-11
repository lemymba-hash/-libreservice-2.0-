// routes/admin.js
// F3 - Validation des prestataires / F9 - Back-office admin

const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes de ce fichier exigent le rôle admin
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/prestataires?statut=en_attente|valide|refuse (par défaut: en_attente)
router.get('/prestataires', (req, res) => {
  const statut = req.query.statut || 'en_attente';
  const rows = db
    .prepare(
      `SELECT p.*, u.nom, u.email, u.telephone, u.quartier, u.date_inscription
       FROM prestataires p JOIN users u ON u.id = p.user_id
       WHERE p.statut = ?
       ORDER BY p.date_creation ASC`
    )
    .all(statut);
  res.json({ prestataires: rows });
});

// PUT /api/admin/prestataires/:id/statut - valider ou refuser un prestataire (F3)
router.put('/prestataires/:id/statut', (req, res) => {
  const { statut } = req.body;
  if (!['valide', 'refuse', 'en_attente'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  const prestataire = db.prepare('SELECT id FROM prestataires WHERE id = ?').get(req.params.id);
  if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable.' });

  db.prepare('UPDATE prestataires SET statut = ? WHERE id = ?').run(statut, req.params.id);
  res.json({ message: `Prestataire mis à jour : ${statut}` });
});

// GET /api/admin/utilisateurs - liste de tous les utilisateurs
router.get('/utilisateurs', (req, res) => {
  const users = db
    .prepare('SELECT id, email, nom, telephone, role, quartier, date_inscription FROM users ORDER BY date_inscription DESC')
    .all();
  res.json({ utilisateurs: users });
});

// GET /api/admin/avis?statut=signale - modération des avis
router.get('/avis', (req, res) => {
  const statut = req.query.statut || 'signale';
  const rows = db
    .prepare(
      `SELECT a.*, u.nom AS client_nom, p.metier
       FROM avis a
       JOIN users u ON u.id = a.client_id
       JOIN prestataires p ON p.id = a.prestataire_id
       WHERE a.statut = ?
       ORDER BY a.date DESC`
    )
    .all(statut);
  res.json({ avis: rows });
});

// PUT /api/admin/avis/:id/statut - modérer un avis (garder visible ou masquer)
router.put('/avis/:id/statut', (req, res) => {
  const { statut } = req.body;
  if (!['visible', 'masque', 'signale'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  const avis = db.prepare('SELECT * FROM avis WHERE id = ?').get(req.params.id);
  if (!avis) return res.status(404).json({ error: 'Avis introuvable.' });

  db.prepare('UPDATE avis SET statut = ? WHERE id = ?').run(statut, req.params.id);

  // Recalcule la moyenne du prestataire concerné (un avis masqué ne compte plus)
  const { recalculerMoyenne } = require('./avis');
  recalculerMoyenne(avis.prestataire_id);

  res.json({ message: 'Avis mis à jour.' });
});

// GET /api/admin/statistiques - indicateurs de base (F9 + section 10 du cahier des charges)
router.get('/statistiques', (req, res) => {
  const nbClients = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'client'`).get().n;
  const nbPrestatairesInscrits = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'prestataire'`).get().n;
  const nbPrestatairesValides = db.prepare(`SELECT COUNT(*) AS n FROM prestataires WHERE statut = 'valide'`).get().n;
  const nbPrestatairesEnAttente = db.prepare(`SELECT COUNT(*) AS n FROM prestataires WHERE statut = 'en_attente'`).get().n;
  const nbMessages = db.prepare('SELECT COUNT(*) AS n FROM messages').get().n;
  const nbConversations = db
    .prepare(
      `SELECT COUNT(DISTINCT CASE WHEN expediteur_id < destinataire_id
        THEN expediteur_id || '-' || destinataire_id ELSE destinataire_id || '-' || expediteur_id END) AS n
       FROM messages`
    )
    .get().n;
  const noteMoyenneGlobale = db
    .prepare(`SELECT AVG(note_moyenne) AS m FROM prestataires WHERE statut = 'valide' AND nombre_avis > 0`)
    .get().m;
  const nbAvis = db.prepare('SELECT COUNT(*) AS n FROM avis').get().n;

  res.json({
    nb_clients: nbClients,
    nb_prestataires_inscrits: nbPrestatairesInscrits,
    nb_prestataires_valides: nbPrestatairesValides,
    nb_prestataires_en_attente: nbPrestatairesEnAttente,
    nb_mises_en_relation: nbConversations,
    nb_messages: nbMessages,
    nb_avis: nbAvis,
    note_moyenne_globale: noteMoyenneGlobale ? Math.round(noteMoyenneGlobale * 10) / 10 : null,
  });
});

module.exports = router;
