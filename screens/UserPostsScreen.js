// UserPostsScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card } from 'react-native-elements';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getCurrentUser,
  loadTopics,
  getUserTopics,
  getUserReplies,
  countRepliesAfter,
} from '../data';
import { UserContext } from '../UserContext';

/**
 * Retourne la date (timestamp) du dernier message (reply) dans un topic.
 * On ignore le post de création (topic.timestamp) et on ne regarde QUE les replies.
 */
function getLastActivityTimestamp(topic) {
  let latest = 0;
  if (Array.isArray(topic.replies)) {
    topic.replies.forEach((reply) => {
      const rTime = reply.timestamp ? new Date(reply.timestamp).getTime() : 0;
      if (rTime > latest) latest = rTime;
    });
  }
  return latest;
}

/**
 * Formatte un timestamp en "DD/MM/YYYY HH:MM".
 */
function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export default function UserPostsScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  // Paramètres : userId (profil), postType = 'topics' ou 'replies'
  const { userId, postType } = route.params || {};

  const { currentUser } = useContext(UserContext);
  const [localUser, setLocalUser] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // On force le rechargement du currentUser quand on revient sur cet écran
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          setIsLoading(true);
          // on recharge le currentUser pour avoir lastReadTopics à jour
          const freshUser = await getCurrentUser();
          if (!isActive) return;

          setLocalUser(freshUser);
          await fetchData(freshUser);
        } catch (err) {
          console.error('Erreur rechargement user / topics :', err);
          Alert.alert('Erreur', 'Impossible de charger vos posts.');
        } finally {
          setIsLoading(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [postType, userId])
  );

  /**
   * Récupère la liste des topics (créés ou replied) + calcule nb non-lus
   */
  const fetchData = async (freshUser) => {
    if (!freshUser) return;

    const lastReadObj = freshUser.lastReadTopics || {};

    if (postType === 'topics') {
      // --- MES TOPICS ---
      let userTopics = await getUserTopics(userId);
      const allTopicsObj = await loadTopics();

      // Ajout du calcul : nb total de replies, nb non lues (hors mes réponses), lastActivity
      userTopics = userTopics.map((t) => {
        const game = t.game;
        const platform = t.platform;
        const topicId = t.id;
        const topicInStore = allTopicsObj[game]?.[platform]?.find((x) => x.id === topicId);

        if (!topicInStore) {
          return {
            ...t,
            totalReplies: 0,
            unreadCount: 0,
            lastActivity: 0,
          };
        }

        const totalReplies = topicInStore.replies?.length || 0;
        const lastReadTimestamp = lastReadObj[topicId] || null;

        // On exclut mes propres réponses => troisième param "excludeUserId"
        const unreadCount = countRepliesAfter(topicInStore, lastReadTimestamp, freshUser.id);

        const lastActivity = getLastActivityTimestamp(topicInStore);

        return {
          ...t,
          totalReplies,
          unreadCount,
          lastActivity,
        };
      });

      // Tri : plus récent en premier
      userTopics.sort((a, b) => b.lastActivity - a.lastActivity);
      setItems(userTopics);

    } else {
      // --- MES RÉPONSES ---
      let userReplies = await getUserReplies(userId);
      const allTopicsObj = await loadTopics();

      // On veut un item unique par topic, trié selon lastActivity
      const grouped = {}; // { topicId: { game, platform, ... } }
      userReplies.forEach((rep) => {
        if (!grouped[rep.topicId]) {
          grouped[rep.topicId] = {
            topicId: rep.topicId,
            topicTitle: rep.topicTitle,
            game: rep.game,
            platform: rep.platform,
          };
        }
      });

      let topicsArray = Object.values(grouped).map((obj) => {
        const foundTopic = allTopicsObj[obj.game]?.[obj.platform]?.find(
          (x) => x.id === obj.topicId
        );

        if (!foundTopic) {
          return {
            ...obj,
            totalReplies: 0,
            unreadCount: 0,
            lastActivity: 0,
          };
        }

        const totalReplies = foundTopic.replies?.length || 0;
        const lastActivity = getLastActivityTimestamp(foundTopic);
        const lastReadTimestamp = lastReadObj[obj.topicId] || null;

        // On exclut mes propres réponses => troisième param "excludeUserId"
        const unreadCount = countRepliesAfter(foundTopic, lastReadTimestamp, freshUser.id);

        return {
          ...obj,
          totalReplies,
          unreadCount,
          lastActivity,
        };
      });

      // Tri : plus récent en premier
      topicsArray.sort((a, b) => b.lastActivity - a.lastActivity);
      setItems(topicsArray);
    }
  };

  const isTopicsMode = (postType === 'topics');
  const screenTitle = isTopicsMode ? 'Mes Topics' : 'Mes Réponses';

  /**
   * Rendu d'un item de la liste
   */
  const renderItem = ({ item }) => {
    // "topics": { id, title, totalReplies, unreadCount, game, platform, lastActivity }
    // "replies": { topicId, topicTitle, totalReplies, unreadCount, game, platform, lastActivity }
    const topicTitle = isTopicsMode
      ? (item.title || 'Topic sans titre')
      : (item.topicTitle || 'Topic (titre inconnu)');

    const topicId = isTopicsMode ? item.id : item.topicId;
    const unreadCount = item.unreadCount || 0;
    const totalReplies = item.totalReplies || 0;
    const lastActivityTs = item.lastActivity || 0;

    return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('TopicDetails', {
            game: item.game,
            platform: item.platform,
            topicId: topicId,
          });
        }}
      >
        <Card containerStyle={styles.card}>
          <Card.Title style={styles.cardTitle}>{topicTitle}</Card.Title>

          {/* "X réponses (Y non lues)" sur une seule ligne */}
          <Text style={styles.cardReplies}>
            {totalReplies} réponses
            {unreadCount > 0 && (
              <Text style={styles.cardUnread}> ({unreadCount} non lues)</Text>
            )}
          </Text>

          {/* Date/heure du dernier message (reply) */}
          {lastActivityTs > 0 && (
            <Text style={styles.cardDate}>
              Dernier message : {formatDateTime(lastActivityTs)}
            </Text>
          )}

          <Text style={styles.cardMeta}>
            {item.game}, {item.platform}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{screenTitle}</Text>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>
          {isTopicsMode ? 'Aucun topic créé.' : 'Aucune réponse publiée.'}
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => {
            return isTopicsMode ? item.id : `topic-${item.topicId}`;
          }}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    textAlign: 'center',
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  card: {
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardReplies: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardUnread: {
    fontSize: 14,
    color: '#d9534f',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
