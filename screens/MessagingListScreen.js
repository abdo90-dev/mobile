import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ListItem, Avatar, Icon } from 'react-native-elements';

import { UserContext } from '../UserContext';
import {
  loadConversations,
  deleteConversation,
  loadUsers,
} from '../data';

// Ton dictionnaire d'avatars par défaut
const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

/** Récupère la bonne source pour l'avatar */
function getAvatarSource(userObj) {
  if (!userObj) {
    // On n'a pas du tout d'utilisateur => fallback "Autre"
    return defaultAvatars.Autre;
  }

  // 1) S'il a un avatar personnalisé
  if (userObj.avatar) {
    return { uri: userObj.avatar };
  }

  // 2) Sinon, on se base sur le gender
  const genderKey = userObj.gender || 'Autre';
  if (defaultAvatars[genderKey]) {
    return defaultAvatars[genderKey];
  }

  // 3) Fallback final
  return defaultAvatars.Autre;
}

/** Retourne la date du dernier message */
function getLastTimestamp(conv) {
  if (!conv.messages || conv.messages.length === 0) return 0;
  const lastMsg = conv.messages[conv.messages.length - 1];
  return new Date(lastMsg.timestamp).getTime();
}

/** Vérifie s'il y a des messages non lus */
function hasUnreadMessages(conv, currentUserId) {
  return conv.messages.some(
    (m) => !m.read && m.senderId !== currentUserId
  );
}

export default function MessagingListScreen() {
  const navigation = useNavigation();
  const { currentUser } = useContext(UserContext);

  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  async function fetchData() {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);

      // Charger la liste des utilisateurs
      const usersFromStorage = await loadUsers();
      setAllUsers(usersFromStorage || []);

      // Charger toutes les conversations
      const allConvos = await loadConversations();
      // Filtrer celles où le currentUser participe
      const userConvos = allConvos.filter(
        (c) => c.user1 === currentUser.id || c.user2 === currentUser.id
      );

      // Trier par date du dernier message
      userConvos.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));
      setConversations(userConvos);

    } catch (err) {
      console.error('Erreur fetchData (MessagingList):', err);
      Alert.alert('Erreur', 'Impossible de charger les conversations.');
    } finally {
      setIsLoading(false);
    }
  }

  function findUserById(id) {
    // Compare en string si jamais id est un nombre
    return allUsers.find((u) => String(u.id) === String(id));
  }

  async function handleDeleteConversation(conversationId) {
    Alert.alert(
      'Supprimer la conversation',
      'Voulez-vous vraiment supprimer cette conversation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteConversation(conversationId, currentUser.id);
            if (success) {
              setConversations((prev) => prev.filter((c) => c.id !== conversationId));
              Alert.alert('Succès', 'Conversation supprimée.');
            } else {
              Alert.alert('Erreur', 'Impossible de supprimer la conversation.');
            }
          },
        },
      ]
    );
  }

  function renderConversationItem({ item }) {
    // Déterminer l'ID de l'autre participant
    const otherUserId = (item.user1 === currentUser.id) ? item.user2 : item.user1;
    // Récupérer cet autre user
    const otherUser = findUserById(otherUserId);

    // Savoir si la conv est non lue
    const unread = hasUnreadMessages(item, currentUser.id);
    const titleStyle = unread ? styles.conversationTitleUnread : styles.conversationTitleRead;

    return (
      <ListItem
        bottomDivider
        containerStyle={styles.listItemContainer}
        onPress={() => {
          navigation.navigate('MessagingScreen', { conversationId: item.id });
        }}
      >
        <Avatar
          rounded
          source={getAvatarSource(otherUser)}
          size="medium"
        />
        <ListItem.Content>
          <ListItem.Title style={titleStyle}>
            {otherUser ? otherUser.username : 'Utilisateur inconnu'}
            {unread ? ' (non lu)' : ''}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.subtitle}>
            {/* Optionnel : Aperçu du dernier message */}
          </ListItem.Subtitle>
        </ListItem.Content>

        <Icon
          name="delete"
          type="material"
          color="red"
          onPress={() => handleDeleteConversation(item.id)}
        />
      </ListItem>
    );
  }

  // État de chargement
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  // Si pas connecté
  if (!currentUser) {
    return (
      <View style={styles.center}>
        <Text>Vous n'êtes pas connecté.</Text>
      </View>
    );
  }

  // Si aucune conversation
  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Aucune conversation pour le moment.</Text>
      </View>
    );
  }

  // Rendu final
  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContainer: {
    backgroundColor: '#fff',
  },
  conversationTitleRead: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
  },
  conversationTitleUnread: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
});
