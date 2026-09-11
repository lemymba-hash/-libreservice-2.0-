// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_moi';

/**
 * Vérifie qu'un token JWT valide est présent (header Authorization: Bearer <token>).
 * Attache l'utilisateur décodé (id, role, email) à req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise. Veuillez vous connecter.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' });
  }
}

/**
 * Comme requireAuth, mais n'échoue pas si aucun token n'est fourni : req.user reste undefined.
 * Utile pour des routes publiques qui affichent des infos supplémentaires si l'utilisateur est connecté.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // token invalide -> on ignore, l'utilisateur est simplement traité comme anonyme
  }
  next();
}

/**
 * Fabrique un middleware qui exige que l'utilisateur ait un des rôles autorisés.
 * A utiliser après requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé : vous n'avez pas les droits nécessaires." });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole, JWT_SECRET };
