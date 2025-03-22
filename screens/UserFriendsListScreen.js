// UserFriendsListScreen.js

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, ListItem, Avatar, Icon } from 'react-native-elements';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  getCurrentUser,
  loadUsers,
  removeFriend,
  getOrCreateConversation,
  getAllConversations,
  setCurrentUser as setGlobalCurrentUser,
} from '../data';

// Avatars par défaut
const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

// Retourne la source d'avatar pour un utilisateur
function getAvatarSource(userObj) {
  if (!userObj) return defaultAvatars['Autre'];
  if (userObj.avatar) return { uri: userObj.avatar };
  const gender = userObj.gender || 'Autre';
  return defaultAvatars[gender] || defaultAvatars['Autre'];
}

export default function UserFriendsListScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // On récupère l'ID de l'utilisateur dont on souhaite afficher la liste d'amis
  const { userId } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [displayUser, setDisplayUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);

  // Charge les données (currentUser, utilisateurs, conversations, utilisateur ciblé)
  const loadData = async () => {
    setIsLoading(true);
    try {
      const me = await getCurrentUser();
      const users = await loadUsers();
      const convs = await getAllConversations();

      setCurrentUser(me || null);
      setAllUsers(users || []);
      setConversations(convs || []);

      if (me) {
        await setGlobalCurrentUser(me);
      }

      // Recherche l'utilisateur dont on veut voir la liste d'amis
      const targetUser = users.find((u) => String(u.id) === String(userId));
      if (!targetUser) {
        Alert.alert('Erreur', 'Utilisateur introuvable.');
        navigation.goBack();
        return;
      }
      setDisplayUser(targetUser);
    } catch (err) {
      console.error('Erreur loadData (UserFriendsListScreen) :', err);
      Alert.alert('Erreur', 'Impossible de charger la liste d’amis.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  // Recharge les données à chaque fois que l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Vérifie si c'est la propre liste de l'utilisateur connecté
  function isOwnerOfProfile() {
    return currentUser && displayUser && currentUser.id === displayUser.id;
  }

  // Envoie un message privé à un ami
  async function handleSendMessage(friendId) {
    if (!currentUser) return;
    try {
      const conv = await getOrCreateConversation(
        String(currentUser.id),
        String(friendId)
      );
      if (!conv) {
        Alert.alert('Erreur', 'Impossible de démarrer la conversation.');
        return;
      }
      navigation.navigate('MessagingScreen', { conversationId: conv.id });
    } catch (err) {
      console.error('Erreur handleSendMessage :', err);
      Alert.alert('Erreur', 'Impossible de démarrer la conversation.');
    }
  }

  // Retire un ami après confirmation
  async function handleRemoveFriend(friendId) {
    if (!currentUser) return;
    Alert.alert(
      'Retirer cet ami',
      'Voulez-vous retirer cet utilisateur de vos amis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await removeFriend(
                String(currentUser.id),
                String(friendId)
              );
              if (!ok) {
                Alert.alert('Erreur', 'Impossible de retirer cet ami.');
              } else {
                Alert.alert('Info', 'Ami retiré.');
              }
              // Recharge la liste
              await loadData();
            } catch (error) {
              console.error('Erreur handleRemoveFriend :', error);
              Alert.alert('Erreur', 'Problème lors du retrait de l’ami.');
            }
          },
        },
      ]
    );
  }

  // Retourne la date du dernier message échangé avec un ami
  function getLastMessageDate(friendId) {
    if (!conversations || !currentUser) return 0;
    // Recherche la conversation en utilisant [user1, user2] convertis en chaînes
    const conv = conversations.find((c) => {
      return (
        [String(c.user1), String(c.user2)].includes(String(currentUser.id)) &&
        [String(c.user1), String(c.user2)].includes(String(friendId))
      );
    });
    if (!conv || !conv.messages || conv.messages.length === 0) {
      return 0;
    }
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (!lastMsg.timestamp) {
      return 0;
    }
    return new Date(lastMsg.timestamp).getTime();
  }

  // Tri les amis par date de dernier message (le plus récent en premier)
  function getSortedFriendsByLastMessage(friendArray) {
    return [...friendArray].sort((a, b) => {
      const dateA = getLastMessageDate(a.id);
      const dateB = getLastMessageDate(b.id);
      return dateB - dateA;
    });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!displayUser) {
    return (
      <View style={styles.center}>
        <Text>Utilisateur introuvable.</Text>
      </View>
    );
  }

  // Vérifie que c'est bien le profil de l'utilisateur connecté
  const isMyProfile = isOwnerOfProfile();
  if (!isMyProfile) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', margin: 10 }}>
          Vous n'êtes pas autorisé à consulter cette liste d'amis.
        </Text>
      </View>
    );
  }

  // Optimisation : construit un dictionnaire des utilisateurs pour un accès rapide
  const usersById = allUsers.reduce((acc, user) => {
    acc[String(user.id)] = user;
    return acc;
  }, {});
  const friendIds = displayUser.friends || [];
  const friendObjs = friendIds.map((fid) => usersById[String(fid)]).filter(Boolean);

  // Tri des amis par activité récente
  const sortedFriends = getSortedFriendsByLastMessage(friendObjs);

  function renderFriendItem({ item }) {
    return (
      <ListItem bottomDivider>
        <Avatar rounded source={getAvatarSource(item)} />
        <ListItem.Content>
          <TouchableOpacity
            onPress={() => navigation.push('UserProfile', { userId: item.id })}
          >
            <ListItem.Title style={{ color: '#007BFF' }}>
              {item.username}
            </ListItem.Title>
          </TouchableOpacity>
        </ListItem.Content>
        <Icon
          name="message"
          type="material"
          color="#007BFF"
          onPress={() => handleSendMessage(item.id)}
          containerStyle={{ marginRight: 10 }}
        />
        <Icon
          name="person-remove"
          type="material"
          color="red"
          onPress={() => handleRemoveFriend(item.id)}
        />
      </ListItem>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Card containerStyle={styles.headerCard}>
        <Text style={styles.title}>Mes amis</Text>
        <Text>{sortedFriends.length} ami(s) au total</Text>
      </Card>

      {sortedFriends.length === 0 ? (
        <View style={styles.center}>
          <Text>Aucun ami pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedFriends}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFriendItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actionIcon: {
    marginHorizontal: 5,
  },
});
