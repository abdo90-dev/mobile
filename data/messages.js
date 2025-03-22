import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Charge les messages pour un utilisateur donné.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @returns {Promise<Array>} Une promesse résolue avec la liste des messages.
 */
export async function loadMessages(userId) {
  try {
    const data = await AsyncStorage.getItem(`messages_${userId}`);
    if (!data) {
      console.log(`Aucun message trouvé pour l'utilisateur ${userId}`);
      return [];
    }
    const messages = JSON.parse(data);
    console.log(`Messages chargés pour l'utilisateur ${userId}`);
    return Array.isArray(messages) ? messages : [];
  } catch (error) {
    console.error(`Erreur lors du chargement des messages pour ${userId} :`, error);
    return [];
  }
}

/**
 * Sauvegarde les messages pour un utilisateur donné.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @param {Array} messages - La liste des messages à sauvegarder.
 */
export async function saveMessages(userId, messages) {
  try {
    await AsyncStorage.setItem(`messages_${userId}`, JSON.stringify(messages));
    console.log(`Messages sauvegardés pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde des messages pour ${userId} :`, error);
  }
}

/**
 * Compte les messages non lus pour un utilisateur donné.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @returns {Promise<number>} Le nombre de messages non lus.
 */
export async function countUnreadMessages(userId) {
  try {
    const messages = await loadMessages(userId);
    const unreadCount = messages.filter((msg) => !msg.read).length;
    return unreadCount;
  } catch (error) {
    console.error(`Erreur lors du comptage des messages non lus pour ${userId} :`, error);
    return 0;
  }
}
