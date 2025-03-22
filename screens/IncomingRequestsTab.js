// IncomingRequestsTab.js

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { ListItem, Avatar, Icon } from 'react-native-elements';
import {
  loadUsers,
  getCurrentUser,
  acceptFriendRequest,
  declineFriendRequest,
} from '../../data';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IncomingRequestsTab({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  // Recharge currentUser et allUsers
  const reload = async () => {
    try {
      const me = await getCurrentUser();
      const users = await loadUsers();
      setCurrentUser(me);
      setAllUsers(users);
    } catch (error) {
      console.error('Erreur reload IncomingRequestsTab :', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [])
  );

  // Supprime la notification de type FRIEND_REQUEST provenant de fromUserId
  const removeFriendRequestNotification = async (fromUserId) => {
    try {
      const data = await AsyncStorage.getItem('notifications');
      if (data) {
        let notifs = JSON.parse(data);
        // Filtre toutes les notifications de type FRIEND_REQUEST qui ne correspondent pas à l’expéditeur
        notifs = notifs.filter(
          (notif) =>
            !(notif.type === 'FRIEND_REQUEST' &&
              String(notif.data.fromUserId) === String(fromUserId))
        );
        await AsyncStorage.setItem('notifications', JSON.stringify(notifs));
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification :", error);
    }
  };

  if (!currentUser) {
    return (
      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const incomingIds = currentUser.incomingFriendRequests || [];
  const incomingUsers = incomingIds
    .map((id) => allUsers.find((u) => String(u.id) === String(id)))
    .filter(Boolean);

  if (incomingUsers.length === 0) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Aucune demande reçue.</Text>
      </View>
    );
  }

  const handleAccept = async (fromUserId) => {
    const ok = await acceptFriendRequest(
      String(currentUser.id),
      String(fromUserId)
    );
    if (ok) {
      Alert.alert('Succès', 'Demande acceptée.');
      await removeFriendRequestNotification(fromUserId);
      await reload();
    } else {
      Alert.alert('Erreur', 'Impossible d’accepter.');
    }
  };

  const handleDecline = async (fromUserId) => {
    const ok = await declineFriendRequest(
      String(currentUser.id),
      String(fromUserId)
    );
    if (ok) {
      Alert.alert('Info', 'Demande refusée.');
      await removeFriendRequestNotification(fromUserId);
      await reload();
    } else {
      Alert.alert('Erreur', 'Impossible de refuser.');
    }
  };

  return (
    <FlatList
      data={incomingUsers}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
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
            <ListItem.Subtitle>Vous a envoyé une demande</ListItem.Subtitle>
          </ListItem.Content>
          <Icon
            name="check"
            type="material"
            color="green"
            onPress={() => handleAccept(item.id)}
            containerStyle={{ marginRight: 10 }}
          />
          <Icon
            name="close"
            type="material"
            color="red"
            onPress={() => handleDecline(item.id)}
          />
        </ListItem>
      )}
    />
  );
}
