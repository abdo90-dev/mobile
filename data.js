/*******************************************************
 * data.js (INTÉGRAL)
 * avec la gestion de user.lastReadTopics, markTopicAsRead
 * ET la fonction countRepliesAfter (excluant mes réponses)
 *******************************************************/
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from './secureBcrypt'; // ou 'bcryptjs'

/* --------------------------------------------------------------------------
   GESTION DES UTILISATEURS
-------------------------------------------------------------------------- */

/**
 * Vérifie si l’utilisateur "lezardvalethlenneth@gmail.com" existe.
 * Si non, on le crée et on le définit en admin.
 * Sinon, s’il existe déjà, on force son rôle à "admin".
 */
export async function ensureAdminExists() {
  try {
    const users = await loadUsers();
    let adminUser = users.find((u) => u.email === 'lezardvalethlenneth@gmail.com');

    if (!adminUser) {
      // Création de l’utilisateur admin
      const newAdminUser = {
        id: Date.now().toString(),
        username: 'LezardValeth',
        email: 'lezardvalethlenneth@gmail.com',
        password: bcrypt.hashSync('admin123', 10),
        gender: 'Masculin',
        avatar: null,
        about: '',
        topicsCreated: 0,
        totalResponses: 0,
        notificationToken: null,
        messages: [],
        role: 'admin',
        status: 'active',
        // Champs d'amis
        friends: [],
        incomingFriendRequests: [],
        outgoingFriendRequests: [],
        blockedUsers: [],
        // currentGames (jeux du moment)
        currentGames: [],
        // lastReadTopics => initialisation
        lastReadTopics: {},
      };
      users.push(newAdminUser);
      await saveUsers(users);
      console.log('Compte admin créé pour "lezardvalethlenneth@gmail.com".');
    } else {
      // Force role=admin si déjà existant
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        if (!adminUser.lastReadTopics) {
          adminUser.lastReadTopics = {};
        }
        await saveUsers(users);
        console.log('Compte admin mis à jour pour "lezardvalethlenneth@gmail.com".');
      }
    }
  } catch (err) {
    console.error('Erreur ensureAdminExists :', err);
  }
}

/**
 * Crée un utilisateur de test (test@example.com / password123)
 */
export async function createTestUser() {
  try {
    const users = await loadUsers();
    const testUserExists = users.some((user) => user.email === 'test@example.com');
    if (testUserExists) {
      console.log('Utilisateur test déjà existant.');
      return false;
    }
    const newUser = {
      id: Date.now().toString(),
      username: 'TestUser',
      email: 'test@example.com',
      password: bcrypt.hashSync('password123', 10),
      gender: 'Masculin',
      avatar: null,
      about: '',
      topicsCreated: 0,
      totalResponses: 0,
      notificationToken: null,
      messages: [],
      role: 'user',
      status: 'active',
      // Champs pour le système d'amis
      friends: [],
      incomingFriendRequests: [],
      outgoingFriendRequests: [],
      blockedUsers: [],
      // currentGames (jeux du moment)
      currentGames: [],
      // Pour le suivi des topics lus
      lastReadTopics: {},
    };
    users.push(newUser);
    await saveUsers(users);
    console.log('Utilisateur test créé avec succès :', newUser);
    return true;
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur test :", error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   CHARGEMENT / SAUVEGARDE UTILISATEURS
-------------------------------------------------------------------------- */
export async function loadUsers() {
  try {
    const data = await AsyncStorage.getItem('users');
    if (!data) {
      console.log('Aucun utilisateur trouvé dans AsyncStorage.');
      return [];
    }
    const users = JSON.parse(data);
    console.log('Utilisateurs chargés depuis AsyncStorage.');
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs :', error);
    return [];
  }
}

export async function saveUsers(users) {
  try {
    if (!Array.isArray(users)) {
      throw new Error("Les utilisateurs à sauvegarder ne sont pas un tableau valide.");
    }
    await AsyncStorage.setItem('users', JSON.stringify(users));
    console.log('Utilisateurs sauvegardés avec succès.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des utilisateurs :', error);
  }
}

/**
 * setCurrentUser : stocke l’utilisateur courant dans AsyncStorage (pour la session)
 */
export async function setCurrentUser(user) {
  try {
    if (!user) {
      await AsyncStorage.removeItem('currentUser');
      console.log('Utilisateur courant supprimé (déconnexion).');
      return;
    }
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    console.log('Utilisateur courant défini :', user);
  } catch (error) {
    console.error("Erreur lors de la définition de l'utilisateur courant :", error);
  }
}

/**
 * getCurrentUser : récupère l’utilisateur courant depuis AsyncStorage
 */
export async function getCurrentUser() {
  try {
    const data = await AsyncStorage.getItem('currentUser');
    if (data) {
      const user = JSON.parse(data);
      // Normaliser la propriété lastReadTopics si elle n'existe pas
      if (!user.lastReadTopics) {
        user.lastReadTopics = {};
      }
      console.log('Utilisateur actuel :', user);
      return user;
    } else {
      console.warn('Aucun utilisateur courant trouvé (getCurrentUser).');
      return null;
    }
  } catch (error) {
    console.error('Erreur getCurrentUser :', error);
    return null;
  }
}

/* --------------------------------------------------------------------------
   SYSTÈME D'AMIS (AVEC DEMANDE / ACCEPT / REFUS)
-------------------------------------------------------------------------- */
export async function sendFriendRequest(senderId, targetId) {
  try {
    if (senderId === targetId) {
      console.warn("Impossible de s'envoyer une demande à soi-même.");
      return false;
    }
    const users = await loadUsers();
    const sender = users.find((u) => u.id === senderId);
    const target = users.find((u) => u.id === targetId);

    if (!sender || !target) {
      console.warn('Utilisateur introuvable (sender ou target).');
      return false;
    }

    // Normalisations
    if (!Array.isArray(sender.friends)) sender.friends = [];
    if (!Array.isArray(sender.incomingFriendRequests)) sender.incomingFriendRequests = [];
    if (!Array.isArray(sender.outgoingFriendRequests)) sender.outgoingFriendRequests = [];
    if (!Array.isArray(sender.blockedUsers)) sender.blockedUsers = [];

    if (!Array.isArray(target.friends)) target.friends = [];
    if (!Array.isArray(target.incomingFriendRequests)) target.incomingFriendRequests = [];
    if (!Array.isArray(target.outgoingFriendRequests)) target.outgoingFriendRequests = [];
    if (!Array.isArray(target.blockedUsers)) target.blockedUsers = [];

    // Déjà amis ?
    if (sender.friends.includes(targetId) || target.friends.includes(senderId)) {
      console.log('Déjà amis.');
      return false;
    }
    // Déjà envoyé ?
    if (sender.outgoingFriendRequests.includes(targetId)) {
      console.log('Déjà envoyé une demande à cet utilisateur.');
      return false;
    }
    // Bloqué ?
    if (target.blockedUsers.includes(senderId)) {
      console.warn("Vous êtes bloqué par l'utilisateur cible.");
      return false;
    }

    sender.outgoingFriendRequests.push(targetId);
    target.incomingFriendRequests.push(senderId);

    await saveUsers(users);
    console.log(`sendFriendRequest : ${senderId} -> ${targetId} OK`);
    return true;
  } catch (error) {
    console.error('Erreur sendFriendRequest :', error);
    return false;
  }
}

export async function acceptFriendRequest(currentUserId, fromUserId) {
  try {
    currentUserId = String(currentUserId);
    fromUserId = String(fromUserId);

    const users = await loadUsers();
    const me = users.find((u) => String(u.id) === currentUserId);
    const fromUser = users.find((u) => String(u.id) === fromUserId);

    if (!me || !fromUser) {
      console.warn('Utilisateur introuvable (acceptFriendRequest).');
      return false;
    }

    if (!Array.isArray(me.incomingFriendRequests)) me.incomingFriendRequests = [];
    if (!Array.isArray(me.outgoingFriendRequests)) me.outgoingFriendRequests = [];
    if (!Array.isArray(me.friends)) me.friends = [];

    if (!Array.isArray(fromUser.incomingFriendRequests)) fromUser.incomingFriendRequests = [];
    if (!Array.isArray(fromUser.outgoingFriendRequests)) fromUser.outgoingFriendRequests = [];
    if (!Array.isArray(fromUser.friends)) fromUser.friends = [];

    // Vérifie qu'il y a bien une demande
    if (!me.incomingFriendRequests.includes(fromUserId)) {
      console.warn("Aucune demande d'ami reçue de cet utilisateur.");
      return false;
    }

    // Retirer la demande
    me.incomingFriendRequests = me.incomingFriendRequests.filter((id) => id !== fromUserId);
    fromUser.outgoingFriendRequests = fromUser.outgoingFriendRequests.filter((id) => id !== currentUserId);

    // Cas croisé
    if (fromUser.incomingFriendRequests.includes(currentUserId)) {
      fromUser.incomingFriendRequests = fromUser.incomingFriendRequests.filter((id) => id !== currentUserId);
    }
    if (me.outgoingFriendRequests.includes(fromUserId)) {
      me.outgoingFriendRequests = me.outgoingFriendRequests.filter((id) => id !== fromUserId);
    }

    // On s’ajoute mutuellement en amis
    if (!me.friends.includes(fromUserId)) me.friends.push(fromUserId);
    if (!fromUser.friends.includes(currentUserId)) fromUser.friends.push(currentUserId);

    await saveUsers(users);
    // Mise à jour de l'utilisateur courant dans AsyncStorage pour que getCurrentUser() renvoie la version actualisée
    await setCurrentUser(me);
    console.log(`acceptFriendRequest : ${currentUserId} a accepté ${fromUserId}`);
    return true;
  } catch (error) {
    console.error('Erreur acceptFriendRequest :', error);
    return false;
  }
}

export async function declineFriendRequest(currentUserId, fromUserId) {
  try {
    currentUserId = String(currentUserId);
    fromUserId = String(fromUserId);

    const users = await loadUsers();
    const me = users.find((u) => String(u.id) === currentUserId);
    const fromUser = users.find((u) => String(u.id) === fromUserId);

    if (!me || !fromUser) {
      console.warn('Utilisateur introuvable (declineFriendRequest).');
      return false;
    }
    if (!Array.isArray(me.incomingFriendRequests)) me.incomingFriendRequests = [];
    if (!Array.isArray(me.outgoingFriendRequests)) me.outgoingFriendRequests = [];
    if (!Array.isArray(fromUser.incomingFriendRequests)) fromUser.incomingFriendRequests = [];
    if (!Array.isArray(fromUser.outgoingFriendRequests)) fromUser.outgoingFriendRequests = [];

    if (!me.incomingFriendRequests.includes(fromUserId)) {
      console.warn("Aucune demande d'ami à refuser.");
      return false;
    }

    me.incomingFriendRequests = me.incomingFriendRequests.filter((id) => id !== fromUserId);
    fromUser.outgoingFriendRequests = fromUser.outgoingFriendRequests.filter((id) => id !== currentUserId);

    // Cas rare
    if (fromUser.incomingFriendRequests.includes(currentUserId)) {
      fromUser.incomingFriendRequests = fromUser.incomingFriendRequests.filter((id) => id !== currentUserId);
    }
    if (me.outgoingFriendRequests.includes(fromUserId)) {
      me.outgoingFriendRequests = me.outgoingFriendRequests.filter((id) => id !== fromUserId);
    }

    await saveUsers(users);
    // Mise à jour du currentUser dans AsyncStorage
    await setCurrentUser(me);
    console.log(`declineFriendRequest : ${currentUserId} a refusé ${fromUserId}`);
    return true;
  } catch (error) {
    console.error('Erreur declineFriendRequest :', error);
    return false;
  }
}

export async function removeFriend(currentUserId, friendId) {
  try {
    const users = await loadUsers();
    const me = users.find((u) => u.id === currentUserId);
    const friendUser = users.find((u) => u.id === friendId);

    if (!me || !friendUser) {
      console.warn('Utilisateur introuvable (removeFriend).');
      return false;
    }
    if (!Array.isArray(me.friends)) me.friends = [];
    if (!Array.isArray(friendUser.friends)) friendUser.friends = [];

    me.friends = me.friends.filter((id) => id !== friendId);
    friendUser.friends = friendUser.friends.filter((id) => id !== currentUserId);

    await saveUsers(users);
    console.log(`removeFriend : ${currentUserId} n'est plus ami avec ${friendId}`);
    return true;
  } catch (error) {
    console.error('Erreur removeFriend :', error);
    return false;
  }
}

export async function blockUser(currentUserId, blockedId) {
  try {
    if (currentUserId === blockedId) {
      console.warn('Impossible de se bloquer soi-même.');
      return false;
    }
    const users = await loadUsers();
    const me = users.find((u) => u.id === currentUserId);
    const blockedUser = users.find((u) => u.id === blockedId);

    if (!me || !blockedUser) {
      console.warn('Utilisateur introuvable (blockUser).');
      return false;
    }

    if (!Array.isArray(me.blockedUsers)) me.blockedUsers = [];
    if (!Array.isArray(me.friends)) me.friends = [];
    if (!Array.isArray(me.outgoingFriendRequests)) me.outgoingFriendRequests = [];
    if (!Array.isArray(me.incomingFriendRequests)) me.incomingFriendRequests = [];

    if (!Array.isArray(blockedUser.friends)) blockedUser.friends = [];
    if (!Array.isArray(blockedUser.outgoingFriendRequests)) blockedUser.outgoingFriendRequests = [];
    if (!Array.isArray(blockedUser.incomingFriendRequests)) blockedUser.incomingFriendRequests = [];

    if (me.blockedUsers.includes(blockedId)) {
      console.log('Déjà bloqué.');
      return false;
    }

    // Bloquer
    me.blockedUsers.push(blockedId);

    // Retirer l’amitié
    me.friends = me.friends.filter((id) => id !== blockedId);
    blockedUser.friends = blockedUser.friends.filter((id) => id !== currentUserId);

    // Annuler toute demande
    me.outgoingFriendRequests = me.outgoingFriendRequests.filter((id) => id !== blockedId);
    me.incomingFriendRequests = me.incomingFriendRequests.filter((id) => id !== blockedId);

    blockedUser.outgoingFriendRequests = blockedUser.outgoingFriendRequests.filter(
      (id) => id !== currentUserId
    );
    blockedUser.incomingFriendRequests = blockedUser.incomingFriendRequests.filter(
      (id) => id !== currentUserId
    );

    await saveUsers(users);
    console.log(`blockUser : ${currentUserId} a bloqué ${blockedId}`);
    return true;
  } catch (error) {
    console.error('Erreur blockUser :', error);
    return false;
  }
}

export async function unblockUser(currentUserId, blockedId) {
  try {
    const users = await loadUsers();
    const me = users.find((u) => u.id === currentUserId);
    if (!me) {
      console.warn('Utilisateur introuvable (unblockUser).');
      return false;
    }

    if (!Array.isArray(me.blockedUsers)) me.blockedUsers = [];
    if (!me.blockedUsers.includes(blockedId)) {
      console.log("Cet utilisateur n'était pas bloqué.");
      return false;
    }

    me.blockedUsers = me.blockedUsers.filter((id) => id !== blockedId);

    await saveUsers(users);
    console.log(`unblockUser : ${currentUserId} a débloqué ${blockedId}`);
    return true;
  } catch (error) {
    console.error('Erreur unblockUser :', error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   MESSAGERIE PRIVÉE (CONVERSATIONS)
-------------------------------------------------------------------------- */
export async function loadConversations() {
  try {
    const data = await AsyncStorage.getItem('conversations');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lors du chargement des conversations :', error);
    return [];
  }
}

export async function saveConversations(conversations) {
  try {
    await AsyncStorage.setItem('conversations', JSON.stringify(conversations));
    console.log('Conversations sauvegardées avec succès.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des conversations :', error);
  }
}

export async function getAllConversations() {
  return await loadConversations();
}

export async function getOrCreateConversation(user1Id, user2Id) {
  try {
    // Vérifier si l'un des utilisateurs a bloqué l'autre
    const users = await loadUsers();
    const user1 = users.find(u => String(u.id) === String(user1Id));
    const user2 = users.find(u => String(u.id) === String(user2Id));
    if (!user1 || !user2) {
      console.warn("Un des utilisateurs est introuvable.");
      return null;
    }
    if (
      (Array.isArray(user1.blockedUsers) && user1.blockedUsers.includes(String(user2Id))) ||
      (Array.isArray(user2.blockedUsers) && user2.blockedUsers.includes(String(user1Id)))
    ) {
      console.warn("Conversation impossible : l'un des utilisateurs a bloqué l'autre.");
      return null;
    }
    
    const allConversations = await loadConversations();
    let conversation = allConversations.find(
      (c) =>
        (c.user1 === user1Id && c.user2 === user2Id) ||
        (c.user1 === user2Id && c.user2 === user1Id)
    );
    if (!conversation) {
      conversation = {
        id: Date.now().toString(),
        user1: user1Id,
        user2: user2Id,
        messages: [],
      };
      allConversations.push(conversation);
      await saveConversations(allConversations);
      console.log('Nouvelle conversation créée :', conversation);
    }
    return conversation;
  } catch (error) {
    console.error('Erreur getOrCreateConversation :', error);
    return null;
  }
}

export async function sendMessageToConversation(conversationId, senderId, content) {
  try {
    const allConversations = await loadConversations();
    const index = allConversations.findIndex((c) => c.id === conversationId);
    if (index === -1) {
      console.warn('Conversation introuvable pour sendMessageToConversation.');
      return false;
    }
    const conv = allConversations[index];

    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      content,
      timestamp: new Date().toISOString(),
      edited: false,
      read: false,
    };

    conv.messages.push(newMessage);
    allConversations[index] = conv;
    await saveConversations(allConversations);
    console.log('Message envoyé à conversationId =', conversationId, newMessage);
    return true;
  } catch (error) {
    console.error('Erreur sendMessageToConversation :', error);
    return false;
  }
}

export async function editPrivateMessage(conversationId, messageId, newContent, currentUserId) {
  try {
    const allConversations = await loadConversations();
    const convIndex = allConversations.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) return false;

    const conversation = allConversations[convIndex];
    const msgIndex = conversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return false;

    if (conversation.messages[msgIndex].senderId !== currentUserId) {
      console.warn("Pas autorisé à éditer le message d'un autre utilisateur.");
      return false;
    }

    conversation.messages[msgIndex].content = newContent;
    conversation.messages[msgIndex].edited = true;

    allConversations[convIndex] = conversation;
    await saveConversations(allConversations);
    console.log('Message édité :', messageId, 'dans conversation', conversationId);
    return true;
  } catch (error) {
    console.error('Erreur editPrivateMessage :', error);
    return false;
  }
}

export async function deletePrivateMessage(conversationId, messageId, currentUserId) {
  try {
    const allConversations = await loadConversations();
    const convIndex = allConversations.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) return false;

    const conversation = allConversations[convIndex];
    const msgIndex = conversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return false;

    if (conversation.messages[msgIndex].senderId !== currentUserId) {
      console.warn("Pas autorisé à supprimer le message d'un autre utilisateur.");
      return false;
    }

    conversation.messages.splice(msgIndex, 1);
    allConversations[convIndex] = conversation;
    await saveConversations(allConversations);
    console.log('Message supprimé :', messageId, 'dans conversation', conversationId);
    return true;
  } catch (error) {
    console.error('Erreur deletePrivateMessage :', error);
    return false;
  }
}

export async function deleteConversation(conversationId, currentUserId) {
  try {
    const allConversations = await loadConversations();
    const filtered = allConversations.filter((c) => c.id !== conversationId);
    await saveConversations(filtered);
    console.log('Conversation supprimée :', conversationId);
    return true;
  } catch (error) {
    console.error('Erreur deleteConversation :', error);
    return false;
  }
}

/**
 * Marque tous les messages adressés à userId comme "lus" (read = true).
 */
export async function markMessagesAsRead(conversationId, userId) {
  try {
    const allConversations = await loadConversations();
    const idx = allConversations.findIndex((c) => c.id === conversationId);
    if (idx === -1) return false;

    const conv = allConversations[idx];
    let changed = false;
    conv.messages.forEach((msg) => {
      if (!msg.read && msg.senderId !== userId) {
        msg.read = true;
        changed = true;
      }
    });

    if (changed) {
      allConversations[idx] = conv;
      await saveConversations(allConversations);
      console.log(`Messages marqués comme lus pour userId=${userId} dans conv=${conversationId}.`);
    }
    return true;
  } catch (error) {
    console.error('Erreur markMessagesAsRead :', error);
    return false;
  }
}

export async function countUnreadMessages(currentUserId) {
  try {
    const allConversations = await loadConversations();
    let totalUnread = 0;
    allConversations.forEach((conv) => {
      if ([conv.user1, conv.user2].includes(currentUserId)) {
        conv.messages.forEach((msg) => {
          if (!msg.read && msg.senderId !== currentUserId) {
            totalUnread++;
          }
        });
      }
    });
    return totalUnread;
  } catch (error) {
    console.error('Erreur countUnreadMessages :', error);
    return 0;
  }
}

/* --------------------------------------------------------------------------
   (ANCIENS) MESSAGES PRIVÉS (SIMPLISTES)
-------------------------------------------------------------------------- */
export async function loadMessages() {
  try {
    const data = await AsyncStorage.getItem('messages');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lors du chargement des messages (ancien système) :', error);
    return [];
  }
}

export async function saveMessages(messages) {
  try {
    await AsyncStorage.setItem('messages', JSON.stringify(messages));
    console.log('Messages sauvegardés (ancien système).');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde (ancien système) :', error);
  }
}

export async function sendMessage(senderId, recipientId, content) {
  try {
    const messages = await loadMessages();
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      recipientId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    messages.push(newMessage);
    await saveMessages(messages);
    console.log('Message envoyé (ancien système) :', newMessage);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi du message (ancien système) :", error);
    return false;
  }
}

export async function getMessagesForUser(userId) {
  try {
    const messages = await loadMessages();
    return messages.filter(
      (message) => message.senderId === userId || message.recipientId === userId
    );
  } catch (error) {
    console.error('Erreur lors de la récupération (ancien système) :', error);
    return [];
  }
}

/* --------------------------------------------------------------------------
   TOPICS
-------------------------------------------------------------------------- */
export async function saveTopics(topicsObject) {
  try {
    if (typeof topicsObject !== 'object' || topicsObject === null) {
      throw new Error("Les topics à sauvegarder ne sont pas un objet valide.");
    }
    await AsyncStorage.setItem('topics', JSON.stringify(topicsObject));
    console.log('Topics sauvegardés avec succès.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des topics :', error);
  }
}

export async function loadTopics() {
  try {
    const data = await AsyncStorage.getItem('topics');
    if (!data) {
      console.log('Aucun topic trouvé dans AsyncStorage.');
      return {};
    }
    const loadedTopics = JSON.parse(data);
    console.log('Topics chargés depuis AsyncStorage.');
    return loadedTopics;
  } catch (error) {
    console.error('Erreur loadTopics :', error);
    return {};
  }
}

export async function initializeTopics() {
  try {
    const data = await AsyncStorage.getItem('topics');
    if (!data) {
      console.log('Aucun topic trouvé. Initialisation avec un objet vide.');
      await AsyncStorage.setItem('topics', JSON.stringify({}));
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation des topics :", error);
  }
}

/**
 * Ajoute un topic
 */
export async function addTopic(game, platform, topicData, user) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game]) {
      storedTopics[game] = {};
    }
    if (!storedTopics[game][platform]) {
      storedTopics[game][platform] = [];
    }
    const newTopicId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTopic = {
      id: newTopicId,
      title: topicData.title || 'Titre par défaut',
      content: topicData.content || 'Contenu par défaut',
      game,
      platform,
      timestamp: new Date().toISOString(),
      authorId: user?.id || null,
      username: user?.username || 'Anonyme',
      gender: user?.gender || 'Autre',
      avatar: user?.avatar || null,
      role: user?.role || 'user',
      replies: [],
      edited: false,
      status: 'online',
    };
    storedTopics[game][platform].unshift(newTopic);
    await saveTopics(storedTopics);
    console.log('Topic ajouté :', newTopic);
    return true;
  } catch (error) {
    console.error('Erreur addTopic :', error);
    return false;
  }
}

/**
 * Ajoute une réponse (renvoie l'ID de la nouvelle réponse)
 */
export async function addReply(game, platform, topicId, replyData) {
  try {
    const storedTopics = await loadTopics();
    const topicList = storedTopics[game]?.[platform];
    if (!topicList) return null;

    const topicIndex = topicList.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) return null;

    if (!Array.isArray(topicList[topicIndex].replies)) {
      topicList[topicIndex].replies = [];
    }

    const newReplyId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newReply = {
      id: newReplyId,
      username: replyData.username || 'Anonyme',
      gender: replyData.gender || 'Autre',
      content: replyData.content || '',
      timestamp: new Date().toISOString(),
      avatar: replyData.avatar || null,
      role: replyData.role || 'user',
      edited: false,
      status: 'online',
      authorId: replyData.authorId || null,
    };

    topicList[topicIndex].replies.push(newReply);
    await saveTopics(storedTopics);
    console.log('Réponse ajoutée :', newReply);

    return newReplyId;
  } catch (error) {
    console.error('Erreur addReply :', error);
    return null;
  }
}

/* --------------------------------------------------------------------------
   SUPPRESSION TOPIC / REPLY
-------------------------------------------------------------------------- */
export async function deleteTopic(game, platform, topicId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) {
      return false;
    }
    storedTopics[game][platform] = storedTopics[game][platform].filter(
      (t) => t.id !== topicId
    );
    await saveTopics(storedTopics);
    console.log(`Topic ${topicId} supprimé.`);
    return true;
  } catch (error) {
    console.error('Erreur deleteTopic :', error);
    return false;
  }
}

export async function deleteReply(game, platform, topicId, replyId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) {
      return false;
    }
    const topicList = storedTopics[game][platform];
    const topicIndex = topicList.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) return false;
    const topic = topicList[topicIndex];
    if (Array.isArray(topic.replies)) {
      topic.replies = topic.replies.filter((r) => r.id !== replyId);
    }
    topicList[topicIndex] = topic;
    await saveTopics(storedTopics);
    console.log(`Réponse ${replyId} supprimée du topic ${topicId}.`);
    return true;
  } catch (error) {
    console.error('Erreur deleteReply :', error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   ÉDITION TOPIC / REPLY
-------------------------------------------------------------------------- */
export async function editTopic(game, platform, topicId, updates, userId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) {
      return false;
    }
    const topicList = storedTopics[game][platform];
    const topicIndex = topicList.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) {
      return false;
    }
    // Vérifier qu’on est l’auteur
    if (topicList[topicIndex].authorId !== userId) {
      console.warn('Utilisateur non autorisé à éditer ce topic.');
      return false;
    }
    if (updates.newTitle !== undefined) {
      topicList[topicIndex].title = updates.newTitle;
    }
    if (updates.newContent !== undefined) {
      topicList[topicIndex].content = updates.newContent;
    }
    topicList[topicIndex].edited = true;
    await saveTopics(storedTopics);
    console.log(`Topic ${topicId} édité avec succès.`);
    return true;
  } catch (error) {
    console.error('Erreur editTopic :', error);
    return false;
  }
}

export async function editReply(game, platform, topicId, replyId, newContent, userId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) {
      return false;
    }
    const topicList = storedTopics[game][platform];
    const topicIndex = topicList.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) {
      return false;
    }
    const replies = topicList[topicIndex].replies || [];
    const replyIndex = replies.findIndex((r) => r.id === replyId);
    if (replyIndex === -1) {
      return false;
    }
    // Vérifier l’auteur
    if (replies[replyIndex].authorId !== userId) {
      console.warn('Utilisateur non autorisé à éditer cette réponse.');
      return false;
    }
    replies[replyIndex].content = newContent;
    replies[replyIndex].edited = true;
    await saveTopics(storedTopics);
    console.log(`Réponse ${replyId} éditée avec succès.`);
    return true;
  } catch (error) {
    console.error('Erreur editReply :', error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   GESTION DES RÔLES ET DU STATUT (admin, mod, user) + suspend/active
-------------------------------------------------------------------------- */
export async function updateUserRole(userId, newRole) {
  try {
    const users = await loadUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    });
    await saveUsers(updated);
    console.log(`Rôle de l'utilisateur ${userId} => ${newRole}`);
    return true;
  } catch (error) {
    console.error('Erreur updateUserRole :', error);
    return false;
  }
}

export async function suspendUser(userId) {
  try {
    const users = await loadUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, status: 'suspended' };
      }
      return u;
    });
    await saveUsers(updated);
    console.log(`Utilisateur ${userId} suspendu.`);
    return true;
  } catch (error) {
    console.error('Erreur suspendUser :', error);
    return false;
  }
}

export async function reactivateUser(userId) {
  try {
    const users = await loadUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, status: 'active' };
      }
      return u;
    });
    await saveUsers(updated);
    console.log(`Utilisateur ${userId} réactivé.`);
    return true;
  } catch (error) {
    console.error('Erreur reactivateUser :', error);
    return false;
  }
}

export async function deleteUserAccount(userId) {
  try {
    const users = await loadUsers();
    const filtered = users.filter((u) => u.id !== userId);
    await saveUsers(filtered);
    console.log(`Utilisateur ${userId} supprimé définitivement.`);
    return true;
  } catch (error) {
    console.error('Erreur deleteUserAccount :', error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   MODÉRATION (ONLINE/OFFLINE) pour Topics & Replies
-------------------------------------------------------------------------- */
export async function setTopicOffline(game, platform, topicId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) return false;
    const topicList = storedTopics[game][platform];
    const idx = topicList.findIndex((t) => t.id === topicId);
    if (idx === -1) return false;
    topicList[idx].status = 'offline';
    await saveTopics(storedTopics);
    console.log(`Topic ${topicId} => OFFLINE`);
    return true;
  } catch (error) {
    console.error('Erreur setTopicOffline :', error);
    return false;
  }
}

export async function setTopicOnline(game, platform, topicId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) return false;
    const topicList = storedTopics[game][platform];
    const idx = topicList.findIndex((t) => t.id === topicId);
    if (idx === -1) return false;
    topicList[idx].status = 'online';
    await saveTopics(storedTopics);
    console.log(`Topic ${topicId} => ONLINE`);
    return true;
  } catch (error) {
    console.error('Erreur setTopicOnline :', error);
    return false;
  }
}

export async function setReplyOffline(game, platform, topicId, replyId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) return false;
    const topicList = storedTopics[game][platform];
    const idx = topicList.findIndex((t) => t.id === topicId);
    if (idx === -1) return false;
    const replies = topicList[idx].replies || [];
    const repIdx = replies.findIndex((r) => r.id === replyId);
    if (repIdx === -1) return false;
    replies[repIdx].status = 'offline';
    await saveTopics(storedTopics);
    console.log(`Réponse ${replyId} => OFFLINE`);
    return true;
  } catch (error) {
    console.error('Erreur setReplyOffline :', error);
    return false;
  }
}

export async function setReplyOnline(game, platform, topicId, replyId) {
  try {
    const storedTopics = await loadTopics();
    if (!storedTopics[game] || !storedTopics[game][platform]) return false;
    const topicList = storedTopics[game][platform];
    const idx = topicList.findIndex((t) => t.id === topicId);
    if (idx === -1) return false;
    const replies = topicList[idx].replies || [];
    const repIdx = replies.findIndex((r) => r.id === replyId);
    if (repIdx === -1) return false;
    replies[repIdx].status = 'online';
    await saveTopics(storedTopics);
    console.log(`Réponse ${replyId} => ONLINE`);
    return true;
  } catch (error) {
    console.error('Erreur setReplyOnline :', error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   NOUVELLES FONCTIONS : RÉCUPÉRER TOPICS / REPLIES D'UN UTILISATEUR
-------------------------------------------------------------------------- */
/**
 * Retourne tous les topics dont authorId === userId,
 * avec { ...topic, game, platform } pour naviguer vers TopicDetails.
 */
export async function getUserTopics(userId) {
  const allTopics = await loadTopics();
  let userTopics = [];
  for (const [game, platformsObj] of Object.entries(allTopics)) {
    for (const [platform, topicsArr] of Object.entries(platformsObj)) {
      const found = topicsArr.filter((t) => t.authorId === userId);
      // Enrichit chaque topic
      const enriched = found.map((t) => ({ ...t, game, platform }));
      userTopics.push(...enriched);
    }
  }
  return userTopics;
}

/**
 * Retourne toutes les réponses dont authorId === userId,
 * enrichies avec game, platform, topicId, topicTitle.
 */
export async function getUserReplies(userId) {
  const allTopics = await loadTopics();
  let userReplies = [];
  for (const [game, platformsObj] of Object.entries(allTopics)) {
    for (const [platform, topicsArr] of Object.entries(platformsObj)) {
      topicsArr.forEach((topic) => {
        if (Array.isArray(topic.replies)) {
          const foundReplies = topic.replies
            .filter((r) => r.authorId === userId)
            .map((r) => ({
              ...r,
              game,
              platform,
              topicId: topic.id,
              topicTitle: topic.title,
            }));
          userReplies.push(...foundReplies);
        }
      });
    }
  }
  return userReplies;
}

/**
 * Marquer un topic comme lu : user.lastReadTopics[topicId] = new Date().toISOString()
 */
export async function markTopicAsRead(userId, topicId) {
  try {
    const users = await loadUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    const me = users[index];
    if (!me.lastReadTopics) {
      me.lastReadTopics = {};
    }

    me.lastReadTopics[topicId] = new Date().toISOString();

    users[index] = me;
    await saveUsers(users);
    // Mise à jour de l'utilisateur courant pour que getCurrentUser() retourne la version actualisée
    await setCurrentUser(me);
    console.log(`markTopicAsRead : user=${userId} topic=${topicId} => now`);
    return true;
  } catch (error) {
    console.error('Erreur markTopicAsRead :', error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   countRepliesAfter : compter le nombre de réponses non lues,
   en excluant éventuellement mes propres réponses (excludeUserId)
-------------------------------------------------------------------------- */
export function countRepliesAfter(topic, lastReadTimestamp, excludeUserId = null) {
  if (!topic || !Array.isArray(topic.replies)) {
    return 0;
  }
  // lastReadTimestamp null => aucune lecture => toutes non lues (sauf si on exclut mes messages)
  const lastTS = lastReadTimestamp ? new Date(lastReadTimestamp).getTime() : 0;

  let count = 0;
  for (const rep of topic.replies) {
    // Ignorer mes propres réponses, si excludeUserId est fourni
    if (excludeUserId && String(rep.authorId) === String(excludeUserId)) {
      continue;
    }

    if (!rep.timestamp) continue; // pas de date => on ignore
    const repTime = new Date(rep.timestamp).getTime();

    if (repTime > lastTS) {
      count++;
    }
  }
  return count;
}
