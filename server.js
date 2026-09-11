// server.js
// Point d'entrée de l'application LibreService (MVP).

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { ensureAdmin } = require('./seed');
const authRoutes = require('./routes/auth');
const prestatairesRoutes = require('./routes/prestataires');
const avisRoutes = require('./routes/avis');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Fichiers uploadés (photos de profil des prestataires)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/prestataires', prestatairesRoutes);
app.use('/api/avis', avisRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'LibreService MVP' }));

// Front-end statique (mobile-first, HTML/CSS/JS vanilla)
app.use(express.static(path.join(__dirname, 'public')));

// Gestion des erreurs multer / autres erreurs non interceptées
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur serveur inattendue.' });
});

// Toute route non-API renvoie index.html (navigation front-end simple par pages statiques)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route API introuvable.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

ensureAdmin();

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  LibreService MVP — serveur démarré');
  console.log('  http://localhost:' + PORT);
  console.log('========================================');
  console.log('');
});
