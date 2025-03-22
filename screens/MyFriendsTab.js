// MyFriendsTab.js

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { ListItem, Avatar, Icon } from 'react-native-elements';
import {
  loadUsers,
  getCurrentUser,
  getOrCreateConversation,
  getAllConversations,
} from '../../data';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function MyFriendsTab() {
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const me = await getCurrentUser();
      const users = await loadUsers();
      const convs = await getAllConversations();
      setCurrentUser(me);
      setAllUsers(users);
      setConversations(convs || []);
    } catch (err) {
      console.error('Erreur fetchData MyFriendsTab :', err);
      Alert.alert('Erreur', 'Impossible de charger la liste d’amis.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Recherche la date du dernier message en utilisant user1 et user2
  function getLastMessageDate(friendId) {
    if (!conversations || !currentUser) return 0;
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
    return lastMsg.timestamp || 0;
  }

  // Trie les amis par date du dernier message (plus récent en premier)
  function sortFriendsByActivity(friendsArray) {
    return [...friendsArray].sort((a, b) => {
      const dA = getLastMessageDate(a.id);
      const dB = getLastMessageDate(b.id);
      return dB - dA;
    });
  }

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Vous n'êtes pas connecté.</Text>
      </View>
    );
  }

  // Optimisation : création d'un dictionnaire pour un accès rapide
  const usersById = allUsers.reduce((acc, user) => {
    acc[String(user.id)] = user;
    return acc;
  }, {});
  const friendIds = currentUser.friends || [];
  const friendObjs = friendIds
    .map((id) => usersById[String(id)])
    .filter(Boolean);

  const sortedFriends = sortFriendsByActivity(friendObjs);

  // Lance la messagerie avec l'ami
  const handleSendMessage = async (friendId) => {
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
  };

  const renderFriendItem = ({ item }) => (
    <ListItem bottomDivider>
      <Avatar
        rounded
        source={
          item.avatar
            ? { uri: item.avatar }
            : require('../../assets/default-other.webp')
        }
      />
      <ListItem.Content>
        <ListItem.Title>{item.username}</ListItem.Title>
      </ListItem.Content>
      {/* Bouton pour voir le profil */}
      <Icon
        name="visibility"
        type="material"
        color="#007BFF"
        onPress={() => navigation.push('UserProfile', { userId: item.id })}
        containerStyle={{ marginRight: 10 }}
      />
      {/* Bouton pour envoyer un message */}
      <Icon
        name="message"
        type="material"
        color="#007BFF"
        onPress={() => handleSendMessage(item.id)}
      />
    </ListItem>
  );

  return (
    <FlatList
      data={sortedFriends}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderFriendItem}
    />
  );
}
