// FriendListScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card, ListItem, Avatar, Icon } from 'react-native-elements';
import {
  loadUsers,
  getCurrentUser,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  setCurrentUser as setGlobalCurrentUser,
} from '../data';
import { useFocusEffect } from '@react-navigation/native';

const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

function getAvatarSource(userObj) {
  if (!userObj) return defaultAvatars['Autre'];
  if (userObj.avatar) return { uri: userObj.avatar };
  const gender = userObj.gender || 'Autre';
  return defaultAvatars[gender] || defaultAvatars['Autre'];
}

export default function FriendListScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Etats locaux pour affichage immédiat
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendObjs, setFriendObjs] = useState([]);

  const reloadData = async () => {
    setLoading(true);
    const me = await getCurrentUser();
    const users = await loadUsers();

    console.log('=== reloadData: currentUser =', me);
    console.log('=== reloadData: allUsers =', users);

    if (me) {
      setCurrentUser(me);
      await setGlobalCurrentUser(me);
    } else {
      setCurrentUser(null);
    }

    setAllUsers(users || []);
    setLoading(false);

    if (me && users) {
      const incomingIds = me.incomingFriendRequests || [];
      const usersById = users.reduce((acc, u) => {
        acc[String(u.id)] = u;
        return acc;
      }, {});
      const requestsList = incomingIds.map((id) => usersById[String(id)]).filter(Boolean);
      setFriendRequests(requestsList);

      const friendIds = me.friends || [];
      const friendsList = friendIds.map((id) => usersById[String(id)]).filter(Boolean);
      setFriendObjs(friendsList);
    }
  };

  useFocusEffect(
    useCallback(() => {
      reloadData();
    }, [])
  );

  async function handleAccept(fromUserId) {
    setFriendRequests((prev) => prev.filter((fr) => String(fr.id) !== String(fromUserId)));
    console.log('Accepting friend request =>', currentUser.id, fromUserId);
    const ok = await acceptFriendRequest(String(currentUser.id), String(fromUserId));
    if (!ok) {
      Alert.alert('Erreur', 'Impossible ou déjà accepté.');
    } else {
      Alert.alert('Succès', 'Demande acceptée !');
    }
    await reloadData();
  }

  async function handleDecline(fromUserId) {
    setFriendRequests((prev) => prev.filter((fr) => String(fr.id) !== String(fromUserId)));
    const ok = await declineFriendRequest(String(currentUser.id), String(fromUserId));
    if (!ok) {
      Alert.alert('Erreur', 'Impossible de refuser ?');
    } else {
      Alert.alert('Info', 'Demande refusée.');
    }
    await reloadData();
  }

  async function handleRemoveFriend(friendId) {
    setFriendObjs((prev) => prev.filter((f) => String(f.id) !== String(friendId)));
    const ok = await removeFriend(String(currentUser.id), String(friendId));
    if (!ok) {
      Alert.alert('Erreur', 'Impossible de retirer cet ami.');
    } else {
      Alert.alert('Info', 'Ami retiré de votre liste.');
    }
    await reloadData();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.center}>
        <Text>Aucun utilisateur connecté.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* DEMANDES D’AMIS */}
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>Demandes d'amis reçues</Text>
        {friendRequests.length === 0 ? (
          <Text style={{ color: '#777' }}>Aucune demande en attente.</Text>
        ) : (
          friendRequests.map((usr) => (
            <ListItem key={String(usr.id)} bottomDivider>
              <Avatar rounded source={getAvatarSource(usr)} size="medium" />
              <ListItem.Content>
                <ListItem.Title style={{ fontWeight: 'bold' }}>
                  {usr.username || 'Pseudo Inconnu'}
                </ListItem.Title>
                <ListItem.Subtitle>Vous a envoyé une demande</ListItem.Subtitle>
              </ListItem.Content>
              <Icon
                name="check"
                type="material"
                color="green"
                containerStyle={styles.actionIcon}
                onPress={() => handleAccept(usr.id)}
              />
              <Icon
                name="close"
                type="material"
                color="red"
                containerStyle={styles.actionIcon}
                onPress={() => handleDecline(usr.id)}
              />
            </ListItem>
          ))
        )}
      </Card>

      {/* MES AMIS */}
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>Mes amis</Text>
        {friendObjs.length === 0 ? (
          <Text style={{ color: '#777' }}>Vous n’avez pas encore d’amis.</Text>
        ) : (
          friendObjs.map((fr) => (
            <ListItem key={String(fr.id)} bottomDivider>
              <Avatar rounded source={getAvatarSource(fr)} size="medium" />
              <ListItem.Content>
                <TouchableOpacity
                  onPress={() => navigation.navigate('UserProfile', { userId: fr.id })}
                >
                  <ListItem.Title style={{ color: '#007BFF' }}>
                    {fr.username || 'Ami(e) sans pseudo'}
                  </ListItem.Title>
                </TouchableOpacity>
                <ListItem.Subtitle>Mon ami(e)</ListItem.Subtitle>
              </ListItem.Content>
              <Icon
                name="person-remove"
                type="material"
                color="gray"
                containerStyle={styles.actionIcon}
                onPress={() => handleRemoveFriend(fr.id)}
              />
            </ListItem>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  actionIcon: {
    marginHorizontal: 5,
  },
});
