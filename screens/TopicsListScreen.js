// TopicsListScreen.js
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { loadTopics } from '../data';
import Icon from 'react-native-vector-icons/FontAwesome';
import { UserContext } from '../UserContext';

const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

function getAvatarSource(item) {
  if (!item) return defaultAvatars['Autre'];
  if (item.avatar) {
    return { uri: item.avatar };
  }
  const gender = item.gender || 'Autre';
  return defaultAvatars[gender] || defaultAvatars['Autre'];
}

const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
};

const getLastActivityTimestamp = (topic) => {
  let latest = topic.timestamp ? new Date(topic.timestamp).getTime() : 0;
  if (Array.isArray(topic.replies)) {
    topic.replies.forEach((reply) => {
      if (reply.timestamp) {
        const replyTime = new Date(reply.timestamp).getTime();
        if (replyTime > latest) {
          latest = replyTime;
        }
      }
    });
  }
  return latest;
};

const getLastActivityText = (topic) => {
  const ts = getLastActivityTimestamp(topic);
  if (!ts) return 'Dernière activité inconnue';
  return `Dernière activité : ${formatDate(new Date(ts).toISOString())}`;
};

const TopicsListScreen = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();
  const { game, platform } = route.params || {};

  // Import du currentUser pour filtrer en fonction du rôle
  const { currentUser } = useContext(UserContext);

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      const loadedTopics = await loadTopics();

      const platformTopics = Array.isArray(loadedTopics[game]?.[platform])
        ? loadedTopics[game][platform]
        : [];

      let sortedTopics = [...platformTopics];

      // Tri par dernière activité (du plus récent au plus ancien)
      sortedTopics.sort((a, b) => {
        const aTime = getLastActivityTimestamp(a);
        const bTime = getLastActivityTimestamp(b);
        return bTime - aTime;
      });

      // Pour les utilisateurs normaux, on ne garde que les topics online.
      // Seuls les admins ou modérateurs verront l'intégralité.
      let filteredTopics = sortedTopics;
      if (!(currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator'))) {
        filteredTopics = sortedTopics.filter(topic => topic.status === 'online');
      }

      setTopics(filteredTopics);
    } catch (error) {
      console.error('Erreur lors du chargement des topics :', error);
      Alert.alert('Erreur', 'Impossible de charger les topics.');
    } finally {
      setLoading(false);
    }
  }, [game, platform, currentUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchTopics);
    fetchTopics();
    return unsubscribe;
  }, [game, platform, navigation, fetchTopics]);

  const renderItem = ({ item }) => {
    const avatarSource = getAvatarSource(item);

    // On rend le pseudo cliquable pour accéder au profil
    const handleGoToUserProfile = () => {
      if (!item.authorId) return; 
      navigation.navigate('UserProfile', { userId: item.authorId });
    };

    return (
      <TouchableOpacity
        style={styles.topicCard}
        onPress={() =>
          navigation.navigate('TopicDetails', {
            game,
            platform,
            topicId: item.id,
          })
        }
      >
        <View style={styles.authorContainer}>
          <Image source={avatarSource} style={styles.authorAvatar} />

          <TouchableOpacity onPress={handleGoToUserProfile}>
            <Text style={styles.authorUsername}>{item.username || 'Anonyme'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.topicTitle}>{item.title}</Text>
        <Text style={styles.timestampText}>{getLastActivityText(item)}</Text>

        <View style={styles.metaRow}>
          <View style={styles.commentSection}>
            <Icon name="comments" size={16} color="#555" style={styles.commentIcon} />
            <Text style={styles.commentCount}>{item.replies?.length || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Topics pour {platform} - {game}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : topics.length === 0 ? (
        <Text style={styles.noTopicsText}>Aucun topic créé pour le moment</Text>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.noTopicsText}>Aucun topic trouvé.</Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateTopic', { game, platform })}
      >
        <Text style={styles.createButtonText}>Créer un Topic</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TopicsListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  topicCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  commentSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentIcon: {
    marginRight: 6,
  },
  commentCount: {
    fontSize: 14,
    color: '#555',
  },
  noTopicsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  createButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
