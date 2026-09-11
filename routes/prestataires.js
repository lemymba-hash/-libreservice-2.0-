// routes/prestataires.js
// F2 (profil prestataire), F4 (recherche), F5 (annuaire), F6 (fiche détaillée)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { CATEGORIES, QUARTIERS_LIBREVILLE } = require('../constants');

const router = express.Router();

// --- Upload de photo de profil (stockage local simple pour le MVP) ---
const uploadDir = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..'), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `prestataire_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 Mo max, pages légères pour connexions instables
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Seules les images sont acceptées.'));
    cb(null, true);
  },
});

// GET /api/prestataires/reference - catégories + quartiers (pour remplir les formulaires/filtres)
router.get('/reference', (req, res) => {
  res.json({ categories: CATEGORIES, quartiers: QUARTIERS_LIBREVILLE });
});

// GET /api/prestataires - F4 recherche + F5 annuaire
// Query params optionnels : categorie, quartier, q (texte libre sur métier/description)
router.get('/', (req, res) => {
  const { categorie, quartier, q } = req.query;

  let sql = `
    SELECT p.id, p.categorie, p.metier, p.description, p.tarif_indicatif, p.photo,
           p.note_moyenne, p.nombre_avis, u.nom, u.quartier, u.telephone
    FROM prestataires p
    JOIN users u ON u.id = p.user_id
    WHERE p.statut = 'valide'
  `;
  const params = [];

  if (categorie) {
    sql += ' AND p.categorie = ?';
    params.push(categorie);
  }
  if (quartier) {
    sql += ' AND u.quartier = ?';
    params.push(quartier);
  }
  if (q) {
    sql += ' AND (p.metier LIKE ? OR p.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += ' ORDER BY p.note_moyenne DESC, p.nombre_avis DESC';

  const results = db.prepare(sql).all(...params);
  res.json({ resultats: results, total: results.length });
});

// GET /api/prestataires/:id - F6 fiche détaillée (+ avis)
router.get('/:id', (req, res) => {
  const prestataire = db
    .prepare(
      `SELECT p.*, u.nom, u.quartier, u.telephone, u.email
       FROM prestataires p JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`
    )
    .get(req.params.id);

  if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable.' });

  const avis = db
    .prepare(
      `SELECT a.id, a.note, a.commentaire, a.date, u.nom AS client_nom
       FROM avis a JOIN users u ON u.id = a.client_id
       WHERE a.prestataire_id = ? AND a.statut = 'visible'
       ORDER BY a.date DESC`
    )
    .all(req.params.id);

  res.json({ prestataire, avis });
});

// PUT /api/prestataires/moi - le prestataire connecté modifie sa propre fiche (F2)
router.put('/moi/profil', requireAuth, requireRole('prestataire'), (req, res) => {
  const { categorie, metier, description, tarif_indicatif, quartier } = req.body;

  const prestataire = db.prepare('SELECT * FROM prestataires WHERE user_id = ?').get(req.user.id);
  if (!prestataire) return res.status(404).json({ error: 'Fiche prestataire introuvable.' });

  db.prepare(
    `UPDATE prestataires SET categorie = COALESCE(?, categorie), metier = COALESCE(?, metier),
     description = COALESCE(?, description), tarif_indicatif = COALESCE(?, tarif_indicatif)
     WHERE user_id = ?`
  ).run(categorie || null, metier || null, description || null, tarif_indicatif || null, req.user.id);

  if (quartier) {
    db.prepare('UPDATE users SET quartier = ? WHERE id = ?').run(quartier, req.user.id);
  }

  const updated = db.prepare('SELECT * FROM prestataires WHERE user_id = ?').get(req.user.id);
  res.json({ prestataire: updated });
});

// POST /api/prestataires/moi/photo - upload de la photo de profil
router.post('/moi/photo', requireAuth, requireRole('prestataire'), upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });

  const relativePath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE prestataires SET photo = ? WHERE user_id = ?').run(relativePath, req.user.id);

  res.json({ photo: relativePath });
});

module.exports = router;
