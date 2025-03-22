// TopicDetailsScreen.js

import React, { useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  loadTopics,
  addReply,
  loadUsers,
  saveUsers,
  deleteTopic,
  deleteReply,
  setTopicOffline,
  setTopicOnline,
  setReplyOffline,
  setReplyOnline,
  markTopicAsRead,
} from '../data';
import { UserContext } from '../UserContext';

/** Avatars par défaut */
const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

/** Retourne la source d'avatar pour un objet (topic, reply, user...) */
function getAvatarSource(obj) {
  if (!obj) return defaultAvatars['Autre'];
  if (obj.avatar) {
    return { uri: obj.avatar };
  }
  const gender = obj.gender || 'Autre';
  return defaultAvatars[gender] || defaultAvatars['Autre'];
}

/**
 * Formatte une date "JJ/MM/AAAA à HH:MM"
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export default function TopicDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Paramètres passés à l'écran
  const { game, platform, topicId } = route.params || {};

  const [topic, setTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [highlightedReplyId, setHighlightedReplyId] = useState(null);

  const { currentUser } = useContext(UserContext);

  const flatListRef = useRef(null);

  // Est-on admin ou modérateur ?
  const isModeratorOrAdmin =
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

  /**
   * Charge le topic + appelle markTopicAsRead
   */
  const fetchTopicData = useCallback(async () => {
    console.log('fetchTopicData => game=', game, 'platform=', platform, 'topicId=', topicId);
    setIsLoading(true);
    try {
      const storedTopics = await loadTopics();
      if (!storedTopics[game] || !storedTopics[game][platform]) {
        Alert.alert('Erreur', 'Jeu ou plateforme non trouvés.');
        navigation.goBack();
        return;
      }
      // Trouve le topic
      const topicFound = storedTopics[game][platform].find((t) => t.id === topicId);
      if (!topicFound) {
        Alert.alert('Erreur', 'Topic non trouvé.');
        navigation.goBack();
        return;
      }

      setTopic(topicFound);

      // Marquer comme lu
      if (currentUser?.id && topicFound.id) {
        await markTopicAsRead(String(currentUser.id), String(topicFound.id));
      }
    } catch (error) {
      console.error('Erreur chargement topic :', error);
      Alert.alert('Erreur', 'Impossible de charger le topic.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [game, platform, topicId, navigation, currentUser]);

  /**
   * useFocusEffect => se relance à chaque retour sur l'écran
   */
  useFocusEffect(
    useCallback(() => {
      console.log('TopicDetailsScreen => focus => fetchTopicData()');
      fetchTopicData();
    }, [fetchTopicData])
  );

  // Peut-on modifier/supprimer ce topic ?
  const canEditOrDeleteTopic =
    currentUser && topic?.authorId && topic.authorId === currentUser.id;

  /**
   * Ajoute une réponse
   */
  async function handleAddReply() {
    if (!currentUser) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      return;
    }
    if (currentUser.status === 'suspended') {
      Alert.alert('Compte suspendu', 'Vous ne pouvez pas répondre à ce topic.');
      return;
    }
    if (!replyContent.trim()) {
      Alert.alert('Erreur', 'La réponse ne peut pas être vide.');
      return;
    }
    setIsLoading(true);

    const replyData = {
      username: currentUser.username || 'Anonyme',
      gender: currentUser.gender || 'Autre',
      content: replyContent.trim(),
      avatar: currentUser.avatar || null,
      role: currentUser.role || 'user',
      authorId: currentUser.id,
    };

    try {
      const newReplyId = await addReply(game, platform, topicId, replyData);
      if (newReplyId) {
        // Incrémenter totalResponses dans le user
        try {
          const allUsers = await loadUsers();
          const updatedUsers = allUsers.map((u) => {
            if (String(u.id) === String(currentUser.id)) {
              return { ...u, totalResponses: (u.totalResponses || 0) + 1 };
            }
            return u;
          });
          await saveUsers(updatedUsers);
        } catch (err) {
          console.error('Erreur incrémentation totalResponses :', err);
        }

        Alert.alert('Succès', 'Réponse ajoutée.');
        setReplyContent('');

        // Recharge le topic
        await fetchTopicData();

        // Surbrillance de la nouvelle réponse
        setHighlightedReplyId(newReplyId);
        setTimeout(() => {
          setHighlightedReplyId(null);
        }, 5000);
      } else {
        Alert.alert('Erreur', "Impossible d'ajouter la réponse.");
      }
    } catch (error) {
      console.error('Erreur ajout réponse :', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Supprimer le topic
   */
  async function handleDeleteTopic() {
    Alert.alert('Confirmer la suppression', 'Voulez-vous vraiment supprimer ce topic ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            const success = await deleteTopic(game, platform, topic.id);
            if (success) {
              Alert.alert('Succès', 'Le topic a été supprimé.');
              navigation.goBack();
            } else {
              Alert.alert('Erreur', 'Impossible de supprimer le topic.');
            }
          } catch (error) {
            console.error('Erreur suppression topic :', error);
            Alert.alert('Erreur', 'Une erreur est survenue.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  }

  /**
   * Éditer le topic
   */
  function handleEditTopic() {
    navigation.navigate('EditTopic', {
      game,
      platform,
      topicId: topic.id,
      oldTitle: topic.title,
      oldContent: topic.content,
    });
  }

  /**
   * Masquer (offline) le topic
   */
  async function handleSetTopicOffline() {
    setIsLoading(true);
    try {
      const success = await setTopicOffline(game, platform, topic.id);
      if (success) {
        Alert.alert('Succès', 'Le topic est maintenant masqué (offline).');
        await fetchTopicData();
      } else {
        Alert.alert('Erreur', 'Impossible de masquer ce topic.');
      }
    } catch (error) {
      console.error('Erreur setTopicOffline :', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Remettre le topic online
   */
  async function handleSetTopicOnline() {
    setIsLoading(true);
    try {
      const success = await setTopicOnline(game, platform, topic.id);
      if (success) {
        Alert.alert('Succès', 'Le topic est à nouveau visible (online).');
        await fetchTopicData();
      } else {
        Alert.alert('Erreur', 'Impossible de remettre ce topic en ligne.');
      }
    } catch (error) {
      console.error('Erreur setTopicOnline :', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Supprimer une réponse
   */
  async function handleDeleteReply(replyId) {
    Alert.alert('Confirmer la suppression', 'Voulez-vous vraiment supprimer cette réponse ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            const success = await deleteReply(game, platform, topic.id, replyId);
            if (success) {
              Alert.alert('Succès', 'La réponse a été supprimée.');
              await fetchTopicData();
            } else {
              Alert.alert('Erreur', 'Impossible de supprimer la réponse.');
            }
          } catch (error) {
            console.error('Erreur suppression réponse :', error);
            Alert.alert('Erreur', 'Une erreur est survenue.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  }

  /**
   * Éditer une réponse
   */
  function handleEditReply(replyObj) {
    navigation.navigate('EditReply', {
      game,
      platform,
      topicId: topic.id,
      replyId: replyObj.id,
      oldContent: replyObj.content,
    });
  }

  /**
   * Aller vers le profil de l'auteur d'une réponse
   */
  function handleGoToUserProfile(authorId) {
    if (!authorId) {
      Alert.alert('Erreur', "L'auteur de cette réponse est inconnu.");
      return;
    }
    navigation.navigate('UserProfile', { userId: authorId });
  }

  /**
   * Masquer (offline) une réponse
   */
  async function handleSetReplyOffline(replyId) {
    setIsLoading(true);
    try {
      const success = await setReplyOffline(game, platform, topic.id, replyId);
      if (success) {
        Alert.alert('Succès', 'Réponse masquée (offline).');
        await fetchTopicData();
      } else {
        Alert.alert('Erreur', 'Impossible de masquer cette réponse.');
      }
    } catch (error) {
      console.error('Erreur setReplyOffline :', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Remettre la réponse online
   */
  async function handleSetReplyOnline(replyId) {
    setIsLoading(true);
    try {
      const success = await setReplyOnline(game, platform, topic.id, replyId);
      if (success) {
        Alert.alert('Succès', 'Réponse remise en ligne.');
        await fetchTopicData();
      } else {
        Alert.alert('Erreur', 'Impossible de remettre cette réponse en ligne.');
      }
    } catch (error) {
      console.error('Erreur setReplyOnline :', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Rendu du bloc principal (titre, content, etc.)
   */
  function renderTopicContent() {
    // Si le topic est offline et qu'on n'est pas mod/admin => masqué
    if (!isModeratorOrAdmin && topic?.status !== 'online') {
      return (
        <View style={styles.hiddenContainer}>
          <Text style={styles.hiddenText}>Ce topic a été masqué par la modération.</Text>
        </View>
      );
    }
    return (
      <>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.timestampText}>
          Créé le {formatDate(topic.timestamp)}
        </Text>
        <Text style={styles.topicContent}>{topic.content}</Text>
        {topic.edited && <Text style={styles.editedText}>(modifié)</Text>}

        {isModeratorOrAdmin && topic?.status !== 'online' && (
          <Text style={styles.hiddenText}>[Topic masqué]</Text>
        )}
      </>
    );
  }

  /**
   * Rendu d'un item "réponse"
   */
  function renderReplyItem({ item }) {
    // Seule la modération voit les réponses offline
    const shouldDisplay = isModeratorOrAdmin || item.status === 'online';
    if (!shouldDisplay) return null;

    // L'utilisateur peut-il éditer/suppr ?
    const canEditOrDeleteReply =
      currentUser && item.authorId && String(item.authorId) === String(currentUser.id);

    // Surbrillance si c’est la dernière réponse ajoutée
    const isHighlighted = item.id === highlightedReplyId;

    // Badge "Modérateur" ?
    const renderModeratorBadge =
      item.role === 'moderator' ? <Text style={{ color: 'purple' }}> [Modérateur]</Text> : null;

    return (
      <View style={[styles.replyItem, isHighlighted && styles.replyItemHighlighted]}>
        {/* En-tête auteur */}
        <View style={styles.replyAuthorContainer}>
          <Image source={getAvatarSource(item)} style={styles.replyAuthorAvatar} />
          <TouchableOpacity onPress={() => handleGoToUserProfile(item.authorId)}>
            <Text style={styles.replyAuthorUsername}>
              {item.username || 'Anonyme'}
              {renderModeratorBadge}
            </Text>
          </TouchableOpacity>

          {/* Boutons Edit/Suppr si c'est ma réponse */}
          {canEditOrDeleteReply && (
            <View style={styles.replyButtonsContainer}>
              <TouchableOpacity style={styles.editButton} onPress={() => handleEditReply(item)}>
                <Ionicons name="create-outline" size={20} color="blue" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteReply(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Timestamp + Contenu */}
        <Text style={styles.replyTimestamp}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.replyContent}>{item.content}</Text>
        {item.edited && <Text style={styles.editedText}>(modifié)</Text>}

        {/* Modération (masquer / remettre en ligne) */}
        {isModeratorOrAdmin && (
          <View style={{ flexDirection: 'row', marginTop: 5 }}>
            {item.status === 'online' ? (
              <TouchableOpacity onPress={() => handleSetReplyOffline(item.id)} style={{ marginRight: 10 }}>
                <Text style={{ color: 'red' }}>Masquer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => handleSetReplyOnline(item.id)} style={{ marginRight: 10 }}>
                <Text style={{ color: 'green' }}>Remettre en ligne</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // État "chargement"
  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  // Topic introuvable
  if (!topic) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Topic non trouvé.</Text>
      </View>
    );
  }

  // Accéder au profil de l'auteur du topic
  function handleGoToTopicAuthorProfile() {
    if (!topic.authorId) {
      Alert.alert('Erreur', "L'auteur de ce topic est inconnu.");
      return;
    }
    navigation.navigate('UserProfile', { userId: topic.authorId });
  }

  // Badge modérateur pour l'auteur du topic ?
  const topicModeratorBadge =
    topic.role === 'moderator' ? <Text style={{ color: 'purple' }}> [Modérateur]</Text> : null;

  return (
    <View style={styles.container}>
      {/* Boutons de modération (offline / online) */}
      {isModeratorOrAdmin && (
        <View style={styles.moderationTopicContainer}>
          {topic.status === 'online' ? (
            <TouchableOpacity onPress={handleSetTopicOffline} style={styles.moderationButton}>
              <Text style={{ color: 'red' }}>Masquer le topic</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSetTopicOnline} style={styles.moderationButton}>
              <Text style={{ color: 'green' }}>Remettre en ligne</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* En-tête (auteur, avatar, btn éditer/suppr) */}
      <View style={styles.topicHeader}>
        <Image source={getAvatarSource(topic)} style={styles.authorAvatar} />
        <TouchableOpacity onPress={handleGoToTopicAuthorProfile}>
          <Text style={styles.authorUsername}>
            {topic.username || 'Anonyme'}
            {topicModeratorBadge}
          </Text>
        </TouchableOpacity>

        {canEditOrDeleteTopic && (
          <View style={styles.topicButtonsContainer}>
            <TouchableOpacity style={styles.editButton} onPress={handleEditTopic}>
              <Ionicons name="create-outline" size={24} color="blue" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTopic}>
              <Ionicons name="trash-outline" size={24} color="red" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Contenu du topic */}
      {renderTopicContent()}

      <Text style={styles.repliesHeader}>Réponses :</Text>

      {/* Liste des réponses */}
      <FlatList
        ref={flatListRef}
        data={
          Array.isArray(topic.replies)
            ? isModeratorOrAdmin
              ? topic.replies
              : topic.replies.filter((reply) => reply.status === 'online')
            : []
        }
        keyExtractor={(item) => item.id}
        renderItem={renderReplyItem}
        ListEmptyComponent={
          <Text style={styles.emptyRepliesText}>Aucune réponse pour l’instant.</Text>
        }
        onContentSizeChange={() => {
          // Utilisation d'un petit délai pour s'assurer que la nouvelle réponse est bien rendue avant de scroller
          if (flatListRef.current) {
            setTimeout(() => {
              flatListRef.current.scrollToEnd({ animated: true });
            }, 100);
          }
        }}
      />

      {/* Champ pour ajouter une réponse */}
      <View style={styles.replyContainer}>
        <TextInput
          style={styles.replyInput}
          placeholder="Ajouter une réponse"
          value={replyContent}
          onChangeText={setReplyContent}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.replyButton, isLoading && styles.replyButtonDisabled]}
          onPress={handleAddReply}
          disabled={isLoading}
        >
          <Text style={styles.replyButtonText}>Répondre</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// -------------------- STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 20,
  },
  moderationTopicContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  moderationButton: {
    marginLeft: 10,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  authorUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: '#007BFF',
  },
  topicButtonsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  editButton: {
    marginLeft: 8,
  },
  deleteButton: {
    marginLeft: 8,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  topicContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  editedText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 2,
  },
  hiddenContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  hiddenText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'red',
  },
  repliesHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  replyItem: {
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 5,
    elevation: 1,
  },
  replyItemHighlighted: {
    backgroundColor: '#d2f8d2',
  },
  replyAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  replyAuthorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#ccc',
  },
  replyAuthorUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: '#007BFF',
  },
  replyButtonsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  replyTimestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  replyContent: {
    fontSize: 14,
    color: '#333',
  },
  emptyRepliesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontSize: 14,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  replyInput: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  replyButton: {
    marginLeft: 10,
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
  },
  replyButtonDisabled: {
    opacity: 0.6,
  },
  replyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

