// routes/auth.js
// F1 - Inscription / Connexion

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, nom: user.nom },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// POST /api/auth/inscription
// role attendu : "client" ou "prestataire" (le rôle admin n'est jamais créé via cette route)
router.post('/inscription', (req, res) => {
  const { email, password, nom, telephone, role, quartier } = req.body;

  if (!email || !password || !nom || !telephone || !role) {
    return res.status(400).json({ error: 'Tous les champs (email, mot de passe, nom, téléphone, rôle) sont obligatoires.' });
  }
  if (!['client', 'prestataire'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
  }

  const hash = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare(
    `INSERT INTO users (email, password, nom, telephone, role, quartier)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    const info = insertUser.run(email.toLowerCase().trim(), hash, nom.trim(), telephone.trim(), role, quartier || null);
    const userId = Number(info.lastInsertRowid);

    // Si l'utilisateur s'inscrit comme prestataire, on crée aussi sa fiche prestataire (statut en_attente).
    if (role === 'prestataire') {
      const { categorie, metier, description, tarif_indicatif } = req.body;
      if (!categorie || !metier) {
        throw Object.assign(new Error('Catégorie et métier obligatoires pour un prestataire.'), { statusCode: 400 });
      }
      db.prepare(
        `INSERT INTO prestataires (user_id, categorie, metier, description, tarif_indicatif, statut)
         VALUES (?, ?, ?, ?, ?, 'en_attente')`
      ).run(userId, categorie, metier, description || null, tarif_indicatif || null);
    }

    return userId;
  });

  let userId;
  try {
    userId = transaction();
  } catch (err) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message || "Erreur lors de l'inscription." });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/connexion
router.post('/connexion', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/moi - récupère les infos de l'utilisateur connecté
router.get('/moi', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  let prestataire = null;
  if (user.role === 'prestataire') {
    prestataire = db.prepare('SELECT * FROM prestataires WHERE user_id = ?').get(user.id);
  }

  res.json({ user: publicUser(user), prestataire });
});

module.exports = router;
