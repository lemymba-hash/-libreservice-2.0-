// constants.js
// Donnees de reference partagees par le back-end et exposees a l'API pour le front-end.
// Garder ces listes ici evite de coder en dur les memes valeurs a plusieurs endroits.

const CATEGORIES = [
  { id: 'bricolage', label: 'Bricolage / Réparation', exemples: 'Plomberie, électricité, menuiserie, serrurerie' },
  { id: 'entretien', label: 'Entretien / Ménage', exemples: 'Ménage, repassage, jardinage' },
  { id: 'beaute', label: 'Beauté / Bien-être', exemples: 'Coiffure, manucure, massages' },
  { id: 'cours', label: 'Cours particuliers', exemples: 'Maths, français, langues, musique' },
  { id: 'livraison', label: 'Livreurs / Courses', exemples: 'Livraison de repas, courses, colis' },
  { id: 'divers', label: 'Services divers', exemples: "Garde d'enfants, bricolage, déménagement" },
];

const QUARTIERS_LIBREVILLE = [
  'Akanda', 'Angondjé', 'Batterie IV', 'Charbonnages', 'Glass',
  'IAI / Nzeng-Ayong', 'Lalala', 'Louis', 'Montagne Sainte',
  'Nkembo', 'Nombakélé', 'Okala', 'Oloumi', 'PK5', 'PK8', 'PK9', 'PK12',
  'Plaine Orety', 'Sablière', 'Sotega', 'Sibang', 'Awendjé', 'Cocotiers',
  'Autre / Périphérie',
];

module.exports = { CATEGORIES, QUARTIERS_LIBREVILLE };
