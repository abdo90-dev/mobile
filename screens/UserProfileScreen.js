// UserProfileScreen.js 

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Card, Icon } from 'react-native-elements';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import * as ImagePicker from 'expo-image-picker';

import {
  loadUsers,
  saveUsers,
  getCurrentUser,
  setCurrentUser as setGlobalCurrentUser,
  blockUser,
  unblockUser,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  updateUserRole,
  suspendUser,
  reactivateUser,
  deleteUserAccount,
  getOrCreateConversation,
  getUserTopics,
  getUserReplies,
  loadTopics,
  countRepliesAfter,
} from '../data';

/** Avatars par défaut */
const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

/** Renvoie l'avatar approprié pour un user */
function getAvatarSource(userObj) {
  if (!userObj) return defaultAvatars['Autre'];
  if (userObj.avatar) {
    return { uri: userObj.avatar };
  }
  return defaultAvatars[userObj.gender || 'Autre'];
}

export default function UserProfileScreen({ route }) {
  const navigation = useNavigation();
  const { userId: routeUserId } = route.params || {};

  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUserState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Nombre de réponses non lues pour mes topics et mes réponses
  const [unreadTopicsCount, setUnreadTopicsCount] = useState(0);
  const [unreadRepliesCount, setUnreadRepliesCount] = useState(0);

  // Helpers
  const isMyProfile = currentUser && user && user.id === currentUser.id;
  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator';

  // Permissions de modération
  const canSuspendOrReactivate =
    (isAdmin || isModerator) &&
    user &&
    user.id !== currentUser?.id &&
    !(isModerator && user.role === 'admin');

  const canChangeModeratorStatus = isAdmin && user && user.id !== currentUser?.id;

  // -----------------------------------------------------------------------------
  // useFocusEffect => rechargement à chaque fois qu'on revient sur l'écran
  // -----------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await fetchData();
      })();
    }, []) // tableau vide => se relance à CHAQUE focus
  );

  // -----------------------------------------------------------------------------
  // fetchData => charge le profil et recalcule les non-lues si c'est mon profil
  // -----------------------------------------------------------------------------
  async function fetchData() {
    try {
      setIsLoading(true);

      // 1) Charger le currentUser
      const me = await getCurrentUser();
      if (me) {
        if (!Array.isArray(me.friends)) me.friends = [];
        if (!Array.isArray(me.blockedUsers)) me.blockedUsers = [];
        if (!Array.isArray(me.incomingFriendRequests)) me.incomingFriendRequests = [];
        if (!Array.isArray(me.outgoingFriendRequests)) me.outgoingFriendRequests = [];
      }
      setCurrentUserState(me || null);

      // 2) Déterminer quel profil afficher
      const userIdToLoad = routeUserId || me?.id;
      if (!userIdToLoad) {
        Alert.alert('Erreur', 'Impossible de déterminer le profil à afficher.');
        navigation.goBack();
        return;
      }

      // 3) Charger l'utilisateur "found"
      const allUsers = await loadUsers();
      const found = allUsers.find((u) => String(u.id) === String(userIdToLoad));
      if (!found) {
        Alert.alert('Erreur', 'Utilisateur introuvable.');
        navigation.goBack();
        return;
      }

      // Normalisations
      if (!Array.isArray(found.friends)) found.friends = [];
      if (!Array.isArray(found.incomingFriendRequests)) found.incomingFriendRequests = [];
      if (!Array.isArray(found.outgoingFriendRequests)) found.outgoingFriendRequests = [];
      if (!Array.isArray(found.blockedUsers)) found.blockedUsers = [];

      setUser(found);

      // 4) Si c'est mon profil => calculer non-lues
      if (me && found && me.id === found.id) {
        await calculateUnreadCounts(me);
      } else {
        setUnreadTopicsCount(0);
        setUnreadRepliesCount(0);
      }
    } catch (error) {
      console.error('Erreur fetchData UserProfileScreen :', error);
      Alert.alert('Erreur', 'Impossible de charger le profil.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }

  // -----------------------------------------------------------------------------
  // Calculer le nombre total de réponses non lues (mes topics & mes réponses)
  // -----------------------------------------------------------------------------
  async function calculateUnreadCounts(meUser) {
    try {
      if (!meUser) {
        setUnreadTopicsCount(0);
        setUnreadRepliesCount(0);
        return;
      }
      const lastReadObj = meUser.lastReadTopics || {};
      const allTopicsObj = await loadTopics();

      // (1) Topics créés par moi
      const myTopics = await getUserTopics(meUser.id);
      let totalUnreadTopics = 0;
      for (const t of myTopics) {
        const topicInStore = allTopicsObj[t.game]?.[t.platform]?.find((x) => x.id === t.id);
        if (!topicInStore) continue;
        const lr = lastReadObj[t.id] || null;

        // Mise à jour : exclure mes propres réponses en passant `meUser.id`
        const unread = countRepliesAfter(topicInStore, lr, meUser.id);
        totalUnreadTopics += unread;
      }

      // (2) Topics auxquels j'ai répondu
      const myReplies = await getUserReplies(meUser.id);
      const grouped = {};
      myReplies.forEach((rep) => {
        if (!grouped[rep.topicId]) {
          grouped[rep.topicId] = {
            game: rep.game,
            platform: rep.platform,
            topicId: rep.topicId,
          };
        }
      });
      let totalUnreadReplies = 0;
      for (const tid in grouped) {
        const { game, platform, topicId } = grouped[tid];
        const foundTopic = allTopicsObj[game]?.[platform]?.find((x) => x.id === topicId);
        if (!foundTopic) continue;
        const lr = lastReadObj[topicId] || null;

        // Mise à jour : exclure mes propres réponses en passant `meUser.id`
        const unread = countRepliesAfter(foundTopic, lr, meUser.id);
        totalUnreadReplies += unread;
      }

      setUnreadTopicsCount(totalUnreadTopics);
      setUnreadRepliesCount(totalUnreadReplies);
    } catch (err) {
      console.error('Erreur calculateUnreadCounts :', err);
      setUnreadTopicsCount(0);
      setUnreadRepliesCount(0);
    }
  }

  // -----------------------------------------------------------------------------
  // reloadBoth => recharger user + currentUser
  // -----------------------------------------------------------------------------
  async function reloadBoth() {
    const updatedUsers = await loadUsers();

    // recharger "user"
    if (user) {
      const refreshed = updatedUsers.find((u) => String(u.id) === String(user.id));
      if (refreshed) setUser(refreshed);
    }

    // recharger "currentUser"
    if (currentUser) {
      const refreshedMe = updatedUsers.find((u) => String(u.id) === String(currentUser.id));
      if (refreshedMe) {
        await setGlobalCurrentUser(refreshedMe);
        setCurrentUserState(refreshedMe);

        // Recalcule si c'est mon profil
        if (user && refreshedMe.id === user.id) {
          await calculateUnreadCounts(refreshedMe);
        }
      }
    }
  }

  // -----------------------------------------------------------------------------
  // Changer d'avatar
  // -----------------------------------------------------------------------------
  async function handleChangeAvatar() {
    if (!isMyProfile || !user) return;
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission refusée', 'Autoriser la galerie pour changer l’avatar.');
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (pickerResult.canceled) return;

      const selectedImageUri = pickerResult.assets[0].uri;
      const updatedUser = { ...user, avatar: selectedImageUri };
      setUser(updatedUser);

      const allUsers = await loadUsers();
      const newAll = allUsers.map((u) => (u.id === user.id ? updatedUser : u));
      await saveUsers(newAll);

      if (isMyProfile) {
        await setGlobalCurrentUser(updatedUser);
        setCurrentUserState(updatedUser);
      }
      Alert.alert('Succès', 'Avatar mis à jour.');
    } catch (err) {
      console.error('Erreur handleChangeAvatar :', err);
      Alert.alert('Erreur', 'Impossible de changer l’avatar.');
    }
  }

  // -----------------------------------------------------------------------------
  // Déconnexion
  // -----------------------------------------------------------------------------
  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          await setGlobalCurrentUser(null);
          setCurrentUserState(null);
          navigation.replace('Login');
        },
      },
    ]);
  }

  // -----------------------------------------------------------------------------
  // Messagerie
  // -----------------------------------------------------------------------------
  async function handleSendMessage() {
    if (!user || !currentUser) return;
    try {
      const conv = await getOrCreateConversation(String(currentUser.id), String(user.id));
      if (!conv) {
        Alert.alert('Erreur', 'Impossible de démarrer la conversation.');
        return;
      }
      navigation.navigate('MessagingScreen', { conversationId: conv.id });
    } catch (error) {
      console.error('Erreur handleSendMessage :', error);
      Alert.alert('Erreur', 'Impossible de démarrer la conversation.');
    }
  }

  // -----------------------------------------------------------------------------
  // AMIS & BLOCAGE
  // -----------------------------------------------------------------------------
  function getFriendshipStatus() {
    if (!currentUser || !user) return {};
    const isFriend = currentUser.friends.includes(user.id);
    const isBlocked = currentUser.blockedUsers.includes(user.id);
    const hasBlockedMe = user.blockedUsers.includes(currentUser.id);
    const isIncomingRequest = currentUser.incomingFriendRequests.includes(user.id);
    const isOutgoingRequest = currentUser.outgoingFriendRequests.includes(user.id);
    return { isFriend, isBlocked, hasBlockedMe, isIncomingRequest, isOutgoingRequest };
  }

  async function handleSendFriendRequest() {
    if (!currentUser || !user || currentUser.id === user.id) return;
    const ok = await sendFriendRequest(String(currentUser.id), String(user.id));
    if (ok) {
      Alert.alert('Succès', `Demande envoyée à ${user.username}.`);
      await reloadBoth();
    } else {
      Alert.alert('Info', 'Impossible ou déjà fait.');
    }
  }

  async function handleAcceptFriendRequest() {
    if (!currentUser || !user) return;
    const ok = await acceptFriendRequest(String(currentUser.id), String(user.id));
    if (ok) {
      Alert.alert('Succès', `Vous êtes maintenant amis avec ${user.username}.`);
      await reloadBoth();
    } else {
      Alert.alert('Info', 'Impossible ou déjà accepté.');
    }
  }

  async function handleDeclineFriendRequest() {
    if (!currentUser || !user) return;
    const ok = await declineFriendRequest(String(currentUser.id), String(user.id));
    if (ok) {
      Alert.alert('Refusé', `Vous avez refusé la demande de ${user.username}.`);
      await reloadBoth();
    } else {
      Alert.alert('Info', 'Impossible de refuser.');
    }
  }

  async function handleRemoveFriend() {
    if (!currentUser || !user) return;
    Alert.alert('Retirer ami', `Retirer ${user.username} de vos amis ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          const ok = await removeFriend(String(currentUser.id), String(user.id));
          if (ok) {
            Alert.alert('Info', `${user.username} n’est plus dans vos amis.`);
            await reloadBoth();
          } else {
            Alert.alert('Erreur', 'Impossible de retirer cet ami.');
          }
        },
      },
    ]);
  }

  async function handleBlockUser() {
    if (!currentUser || !user) return;
    Alert.alert('Bloquer', `Bloquer ${user.username} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Bloquer',
        style: 'destructive',
        onPress: async () => {
          const ok = await blockUser(String(currentUser.id), String(user.id));
          if (ok) {
            Alert.alert('Bloqué', `${user.username} est bloqué.`);
            await reloadBoth();
          } else {
            Alert.alert('Erreur', 'Impossible de bloquer.');
          }
        },
      },
    ]);
  }

  async function handleUnblockUser() {
    if (!currentUser || !user) return;
    const ok = await unblockUser(String(currentUser.id), String(user.id));
    if (ok) {
      Alert.alert('Débloqué', `${user.username} est débloqué.`);
      await reloadBoth();
    } else {
      Alert.alert('Erreur', 'Impossible de débloquer.');
    }
  }

  // -----------------------------------------------------------------------------
  // MODÉRATION
  // -----------------------------------------------------------------------------
  async function handleToggleModerator() {
    if (!user) return;
    const newRole = user.role === 'moderator' ? 'user' : 'moderator';
    const ok = await updateUserRole(user.id, newRole);
    if (ok) {
      Alert.alert('Succès', `Le rôle de ${user.username} est maintenant ${newRole}.`);
      await reloadBoth();
    } else {
      Alert.alert('Erreur', 'Impossible de changer le rôle.');
    }
  }

  async function handleSuspendUser() {
    if (!user) return;
    Alert.alert('Suspendre', `Suspendre ${user.username} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Suspendre',
        style: 'destructive',
        onPress: async () => {
          const ok = await suspendUser(user.id);
          if (ok) {
            Alert.alert('Succès', `${user.username} est suspendu.`);
            await reloadBoth();
          } else {
            Alert.alert('Erreur', 'Impossible de suspendre.');
          }
        },
      },
    ]);
  }

  async function handleReactivateUser() {
    if (!user) return;
    Alert.alert('Réactiver', `Réactiver ${user.username} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réactiver',
        onPress: async () => {
          const ok = await reactivateUser(user.id);
          if (ok) {
            Alert.alert('Succès', `${user.username} est réactivé.`);
            await reloadBoth();
          } else {
            Alert.alert('Erreur', 'Impossible de réactiver.');
          }
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    if (!user) return;
    Alert.alert('Supprimer compte', 'Supprimer ce compte définitivement ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteUserAccount(user.id);
          if (ok) {
            Alert.alert('Info', 'Compte supprimé.');
            if (isMyProfile) {
              await setGlobalCurrentUser(null);
              setCurrentUserState(null);
              navigation.replace('Login');
            } else {
              navigation.goBack();
            }
          } else {
            Alert.alert('Erreur', 'Impossible de supprimer ce compte.');
          }
        },
      },
    ]);
  }

  // -----------------------------------------------------------------------------
  // RENDU
  // -----------------------------------------------------------------------------
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Utilisateur introuvable.</Text>
        <Button title="Retour" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // Récupère le statut d'ami/blocage
  const { isFriend, isBlocked, hasBlockedMe, isIncomingRequest, isOutgoingRequest } =
    getFriendshipStatus();
  const friendCount = user.friends.length || 0;

  // S'il n'est pas bloqué, on peut envoyer un MP
  const handleSendMessagePress = () => {
    if (!hasBlockedMe) {
      handleSendMessage();
    }
  };

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: '#f9f9f9' }}>
      {/* ====================== HEADER DU PROFIL ====================== */}
      <View style={styles.profileHeader}>
        {/* Bannière notifications (demandes d'ami) */}
        {isMyProfile && currentUser?.incomingFriendRequests?.length > 0 && (
          <TouchableOpacity
            style={styles.notificationBanner}
            onPress={() => navigation.navigate('FriendListScreen')}
          >
            <Icon name="info" type="material" color="#fff" size={16} />
            <Text style={styles.notificationText}>
              {currentUser.incomingFriendRequests.length} demande(s) d’ami
            </Text>
          </TouchableOpacity>
        )}

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image source={getAvatarSource(user)} style={styles.avatar} />
          {isMyProfile && (
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handleChangeAvatar}>
              <Icon name="camera-alt" type="material" color="#fff" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nom + icône éditer si c'est mon profil */}
        <View style={styles.nameRow}>
          <Text style={styles.username}>{user.username || 'Pseudo Inconnu'}</Text>
          {isMyProfile && (
            <TouchableOpacity
              style={styles.editProfileIcon}
              onPress={() => navigation.navigate('ProfileSettings', { userId: user.id })}
            >
              <Icon name="edit" type="material" color="#007BFF" size={22} />
            </TouchableOpacity>
          )}
        </View>

        {/* Rôles (mod/admin) & statut (suspended) */}
        {user.role === 'moderator' && (
          <View style={[styles.roleBadge, { backgroundColor: '#007BFF' }]}>
            <Icon name="star" type="material" color="#fff" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>MODÉRATEUR</Text>
          </View>
        )}
        {user.role === 'admin' && (
          <View style={[styles.roleBadge, { backgroundColor: '#d9534f' }]}>
            <Icon name="shield" type="material" color="#fff" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>ADMIN</Text>
          </View>
        )}
        {user.status === 'suspended' && (
          <Text style={styles.suspendedText}>[Compte suspendu]</Text>
        )}

        <Text style={styles.userInfoText}>
          {user.gender || 'Genre ?'} | {user.region || 'Région non spécifiée'}
        </Text>

        {/* Stats (topicsCreated / totalResponses) */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="forum" type="material" color="#3b5998" size={24} />
            <Text style={styles.statNumber}>{user.topicsCreated ?? 0}</Text>
            <Text style={styles.statLabel}>Topics</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="chat" type="material" color="#3b5998" size={24} />
            <Text style={styles.statNumber}>{user.totalResponses ?? 0}</Text>
            <Text style={styles.statLabel}>Réponses</Text>
          </View>
        </View>

        {/* Bouton MP si pas bloqué et pas moi */}
        {!isMyProfile && currentUser && !hasBlockedMe && (
          <Button
            title="Envoyer un message privé"
            onPress={handleSendMessagePress}
            icon={<Icon name="message" type="material" color="#fff" size={18} />}
            buttonStyle={styles.sendMessageBtn}
          />
        )}
      </View>

      {/* ===================== RELATION (si pas mon profil) ===================== */}
      {!isMyProfile && currentUser && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Relation</Text>
          <View style={styles.relationRow}>
            {isBlocked ? (
              <TouchableOpacity style={styles.relationAction} onPress={handleUnblockUser}>
                <Icon name="block" type="material" color="gray" />
                <Text style={styles.relationText}>Débloquer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.relationAction} onPress={handleBlockUser}>
                <Icon name="block" type="material" color="gray" />
                <Text style={styles.relationText}>Bloquer</Text>
              </TouchableOpacity>
            )}

            {hasBlockedMe ? (
              <Text style={{ color: 'red', fontWeight: 'bold', marginLeft: 15 }}>
                {user.username} vous a bloqué
              </Text>
            ) : (
              <>
                {isFriend && !isBlocked && (
                  <TouchableOpacity style={styles.relationAction} onPress={handleRemoveFriend}>
                    <Icon name="person-remove" type="material" color="#ff8888" />
                    <Text style={styles.relationText}>Retirer Ami</Text>
                  </TouchableOpacity>
                )}

                {!isFriend && isIncomingRequest && (
                  <>
                    <TouchableOpacity
                      style={styles.relationAction}
                      onPress={handleAcceptFriendRequest}
                    >
                      <Icon name="check" type="material" color="green" />
                      <Text style={styles.relationText}>Accepter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.relationAction}
                      onPress={handleDeclineFriendRequest}
                    >
                      <Icon name="close" type="material" color="red" />
                      <Text style={styles.relationText}>Refuser</Text>
                    </TouchableOpacity>
                  </>
                )}

                {!isFriend && isOutgoingRequest && (
                  <View style={styles.relationAction}>
                    <Icon name="hourglass-empty" type="material" color="#ccc" />
                    <Text style={styles.relationText}>En attente</Text>
                  </View>
                )}

                {!isFriend && !isIncomingRequest && !isOutgoingRequest && !isBlocked && (
                  <TouchableOpacity
                    style={styles.relationAction}
                    onPress={handleSendFriendRequest}
                  >
                    <Icon name="person-add" type="material" color="#007BFF" />
                    <Text style={styles.relationText}>Ajouter Ami</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </Card>
      )}

      {/* ===================== MES POSTS (Topics / Réponses) ===================== */}
      {isMyProfile && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mes Posts</Text>
          <View style={styles.postButtonsRow}>
            {/* --- BOUTON "MES TOPICS" --- */}
            <TouchableOpacity
              style={styles.postButtonContainer}
              onPress={() =>
                navigation.navigate('UserPostsScreen', {
                  userId: user.id,
                  postType: 'topics',
                })
              }
            >
              <Icon name="list" type="material" color="#fff" size={18} />
              <Text style={styles.buttonText}>Mes Topics</Text>
              {/* Badge rouge si unread */}
              {unreadTopicsCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadTopicsCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* --- BOUTON "MES RÉPONSES" --- */}
            <TouchableOpacity
              style={[styles.postButtonContainer, { backgroundColor: '#6f42c1' }]}
              onPress={() =>
                navigation.navigate('UserPostsScreen', {
                  userId: user.id,
                  postType: 'replies',
                })
              }
            >
              <Icon name="comment" type="material" color="#fff" size={18} />
              <Text style={styles.buttonText}>Mes Réponses</Text>
              {unreadRepliesCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadRepliesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* ===================== MES AMIS (mon profil) ===================== */}
      {isMyProfile && (
        <Card containerStyle={styles.sectionCard}>
          <View style={styles.myFriendsRow}>
            <Text style={styles.sectionTitle}>Mes Amis ({friendCount})</Text>
            {friendCount > 0 && (
              <TouchableOpacity
                style={styles.seeAllFriendsBtn}
                onPress={() => navigation.push('UserFriendsListScreen', { userId: user.id })}
              >
                <Text style={styles.seeAllFriendsText}>Voir tous mes amis</Text>
                <Icon name="arrow-forward" type="material" color="#007BFF" size={18} />
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* ===================== À PROPOS ===================== */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>À propos de moi</Text>
        <Text style={styles.aboutText}>{user.about || 'Aucune description.'}</Text>
      </Card>

      {/* ===================== MES JEUX DU MOMENT ===================== */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Mes jeux du moment</Text>
        <View style={styles.tagsContainer}>
          {(user.currentGames || []).map((game, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.tagText}>{game}</Text>
            </View>
          ))}
          {(!user.currentGames || user.currentGames.length === 0) && (
            <Text style={styles.aboutText}>Aucun jeu renseigné.</Text>
          )}
        </View>
      </Card>

      {/* ===================== PLATEFORMES ===================== */}
      {user.platforms && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Plateformes</Text>
          <View style={styles.tagsContainer}>
            {user.platforms.map((plat, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{plat}</Text>
              </View>
            ))}
            {(!user.platforms || user.platforms.length === 0) && (
              <Text style={styles.aboutText}>Aucune plateforme renseignée.</Text>
            )}
          </View>
        </Card>
      )}

      {/* ===================== MODÉRATION ===================== */}
      {(canChangeModeratorStatus || canSuspendOrReactivate) && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Modération</Text>
          <View style={styles.modRow}>
            {canChangeModeratorStatus && (
              <Button
                title={user.role === 'moderator' ? 'Retirer Mod' : 'Rendre Modérateur'}
                onPress={handleToggleModerator}
                icon={<Icon name="shield" type="material" color="#fff" size={18} />}
                buttonStyle={{ marginRight: 10, marginBottom: 10, backgroundColor: 'purple' }}
              />
            )}
            {canSuspendOrReactivate && user.status === 'active' && (
              <Button
                title="Suspendre"
                onPress={handleSuspendUser}
                icon={<Icon name="block" type="material" color="#fff" size={18} />}
                buttonStyle={{ marginRight: 10, marginBottom: 10, backgroundColor: 'orange' }}
              />
            )}
            {canSuspendOrReactivate && user.status === 'suspended' && (
              <Button
                title="Réactiver"
                onPress={handleReactivateUser}
                icon={<Icon name="check-circle" type="material" color="#fff" size={18} />}
                buttonStyle={{ marginRight: 10, marginBottom: 10, backgroundColor: 'green' }}
              />
            )}
            {canSuspendOrReactivate && isAdmin && (
              <Button
                title="Supprimer"
                onPress={handleDeleteAccount}
                icon={<Icon name="delete" type="material" color="#fff" size={18} />}
                buttonStyle={{ marginBottom: 10, backgroundColor: 'red' }}
              />
            )}
          </View>
        </Card>
      )}

      {/* ===================== BOUTON DÉCONNEXION (MON PROFIL) ===================== */}
      {isMyProfile && (
        <Card containerStyle={styles.sectionCard}>
          <Button
            title="Se déconnecter"
            onPress={handleLogout}
            icon={<Icon name="logout" type="material" color="#fff" size={18} />}
            buttonStyle={{ backgroundColor: 'red' }}
          />
        </Card>
      )}
    </KeyboardAwareScrollView>
  );
}

// ---------------------------------- STYLES ----------------------------------
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFC107',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationText: {
    marginLeft: 6,
    color: '#fff',
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ccc',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007BFF',
    padding: 5,
    borderRadius: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileIcon: {
    marginLeft: 8,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 5,
  },
  roleBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  suspendedText: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 5,
  },
  userInfoText: {
    color: '#666',
    marginTop: 6,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 15,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b5998',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sendMessageBtn: {
    marginTop: 15,
    alignSelf: 'center',
    backgroundColor: '#007BFF',
    borderRadius: 5,
    width: 220,
  },
  sectionCard: {
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  relationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  relationAction: {
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10,
  },
  relationText: {
    fontSize: 12,
    marginTop: 5,
    color: '#444',
  },
  myFriendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllFriendsText: {
    color: '#007BFF',
    marginRight: 4,
    fontWeight: '500',
  },
  aboutText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#3b5998',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginTop: 6,
  },
  tagText: {
    color: '#fff',
    fontSize: 13,
  },
  modRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Boutons "Mes Topics" / "Mes Réponses" + badges
  postButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postButtonContainer: {
    position: 'relative',
    width: '48%',
    flexDirection: 'row',
    backgroundColor: '#17a2b8',
    borderRadius: 6,
    marginTop: 5,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 5,
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
