// secureBcrypt.js

import bcrypt from 'react-native-bcrypt';

/**
 * Fallback qui génère un tableau d'octets aléatoires cryptographiquement sûrs.
 * Utilise crypto.getRandomValues disponible grâce à react-native-get-random-values.
 *
 * @param {number} size - Nombre d'octets nécessaires.
 * @returns {number[]} - Tableau d'octets aléatoires.
 */
function secureRandomFallback(size) {
  // Crée un Uint8Array de la taille spécifiée
  const byteArray = new Uint8Array(size);
  // Remplit le tableau avec des octets aléatoires sécurisés
  crypto.getRandomValues(byteArray);
  // Convertit le Uint8Array en Array JS classique
  return Array.from(byteArray);
}

/**
 * Configure bcrypt pour utiliser le fallback sécurisé au lieu de Math.random.
 */
bcrypt.setRandomFallback(secureRandomFallback);

// Exportez le bcrypt configuré
export default bcrypt;
