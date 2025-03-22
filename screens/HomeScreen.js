// HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Icon, Card } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Fuse from 'fuse.js';

// Import des fonctions de data
import { loadUsers, loadTopics, countUnreadMessages } from '../data';
// Import de la liste statique de jeux
import { listeDeJeux } from '../data/listeDeJeux';

// Composant de l’icône de messagerie
import MessagingIcon from '../components/MessagingIcon';

/**
 * Calcule la date de dernière activité (ms) d’un topic (topic + replies).
 */
function getLastActivityForTopic(topic) {
  let latest = topic.timestamp ? new Date(topic.timestamp).getTime() : 0;
  if (Array.isArray(topic.replies)) {
    topic.replies.forEach((reply) => {
      const replyTime = reply.timestamp
        ? new Date(reply.timestamp).getTime()
        : 0;
      if (replyTime > latest) {
        latest = replyTime;
      }
    });
  }
  return latest;
}

/**
 * Calcule la date de dernière activité (ms) pour un JEU,
 * en regardant tous ses topics (toutes plateformes confondues).
 */
function getLastActivityForGame(gameName, allTopics) {
  if (!allTopics[gameName]) {
    return 0; // Aucun topic => 0
  }
  let gameActivity = 0;
  const platformsObj = allTopics[gameName];
  // On parcourt chaque plateforme du jeu
  for (const platform in platformsObj) {
    const topicsArray = platformsObj[platform];
    topicsArray.forEach((topic) => {
      const topicLast = getLastActivityForTopic(topic);
      if (topicLast > gameActivity) {
        gameActivity = topicLast;
      }
    });
  }
  return gameActivity;
}

export default function HomeScreen({ route, navigation }) {
  const { userId: routeUserId } = route.params || {};

  // État local
  const [currentUserId, setCurrentUserId] = useState(routeUserId || null);
  const [currentUser, setCurrentUser] = useState(null);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');

  // Contiendra **tous** les jeux (avec lastActivity) avant slicing
  const [allGamesFull, setAllGamesFull] = useState([]);
  // Contiendra le top 20 (ou 21) à afficher en home
  const [allGames, setAllGames] = useState([]);
  // Contiendra la liste filtrée selon la recherche
  const [filteredGames, setFilteredGames] = useState([]);

  // Chargement + unread messages
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  /**
   * Récupère l'utilisateur courant via ID
   */
  const fetchCurrentUser = async (id) => {
    try {
      const users = await loadUsers();
      const foundUser = users.find((u) => u.id === id);
      if (foundUser) {
        setCurrentUser(foundUser);
      } else {
        console.warn('Utilisateur introuvable (ID=)', id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l’utilisateur :', error);
    }
  };

  /**
   * Calcule le nombre de messages non lus
   */
  const fetchUnreadMessages = async () => {
    try {
      if (currentUserId) {
        const unreadCount = await countUnreadMessages(currentUserId);
        setUnreadMessages(unreadCount);
      }
    } catch (error) {
      console.error('Erreur lors du comptage des messages non lus :', error);
    }
  };

  /**
   * Charge topics + calcule la lastActivity pour chaque jeu
   */
  const fetchGamesWithActivity = async () => {
    try {
      // 1. Charger tous les topics
      const topicsData = await loadTopics(); 
      // ex: { "Valorant": { "PC": [...], "PS5": [...] }, ... }

      // 2. Récupère tous les noms depuis listeDeJeux
      const staticGames = listeDeJeux.map((gameObj) => gameObj.name);

      // 3. Combine les noms statiques + ceux trouvés dans topicsData
      const allGamesSet = new Set(staticGames);
      for (const gameName in topicsData) {
        allGamesSet.add(gameName);
      }

      // 4. Prépare un map pour mémoriser l’index d’origine dans listeDeJeux
      //    (afin de trier secondement par l’ordre “initial” si lastActivity = 0)
      const orderMap = {};
      listeDeJeux.forEach((obj, idx) => {
        orderMap[obj.name] = idx;
      });

      // 5. Construit le tableau result
      const result = [];
      allGamesSet.forEach((gameName) => {
        const lastActivity = getLastActivityForGame(gameName, topicsData);
        result.push({ name: gameName, lastActivity });
      });

      // 6. Tri par lastActivity desc, puis ordre initial
      result.sort((a, b) => {
        if (b.lastActivity !== a.lastActivity) {
          // tri desc par date
          return b.lastActivity - a.lastActivity;
        }
        // sinon, on regarde leur ordre initial
        const idxA = orderMap[a.name] ?? 99999; 
        const idxB = orderMap[b.name] ?? 99999;
        return idxA - idxB;
      });

      // Vérif console : combien de jeux au total ?
      console.log('=== RESULT FINAL ===');
      console.log('Nb total de jeux =', result.length);
      console.log(result.map((g) => `${g.name} (lastAct=${g.lastActivity})`));

      // 7. Stocke la liste complète
      setAllGamesFull(result);

      // 8. On limite l’affichage à 20 jeux
      const top20 = result.slice(0, 20);
      setAllGames(top20);
      setFilteredGames(top20);
    } catch (error) {
      console.error('Erreur fetchGamesWithActivity :', error);
    }
  };

  /**
   * useEffect principal
   */
  useEffect(() => {
    (async () => {
      try {
        // 1. Récupération du userId
        if (routeUserId) {
          await fetchCurrentUser(routeUserId);
          setCurrentUserId(routeUserId);
        } else {
          // sinon, via AsyncStorage
          const userString = await AsyncStorage.getItem('currentUser');
          if (userString) {
            const userObj = JSON.parse(userString);
            if (userObj?.id) {
              setCurrentUserId(userObj.id);
              await fetchCurrentUser(userObj.id);
            }
          }
        }

        // 2. Charge la liste de jeux + tri
        await fetchGamesWithActivity();

        // 3. Compte les messages non lus
        await fetchUnreadMessages();
      } catch (err) {
        console.error('Erreur init HomeScreen :', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [routeUserId]);

  /**
   * Au retour sur HomeScreen, on rafraîchit
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      await fetchGamesWithActivity();
      await fetchUnreadMessages();
    });
    return unsubscribe;
  }, [navigation]);

  /**
   * Si currentUserId change, recalcule unread
   */
  useEffect(() => {
    fetchUnreadMessages();
  }, [currentUserId]);

  /**
   * Barre de recherche
   * - si query vide, on remet le top 20
   * - sinon, on cherche dans allGamesFull
   */
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query) {
      setFilteredGames(allGames);
      return;
    }

    // Fuse.js sur la liste complète
    const fuse = new Fuse(allGamesFull, {
      keys: ['name'],
      threshold: 0.3,           // plus faible => plus strict
      minMatchCharLength: 2,    // "Va" fera 2 char => match "Valorant"
    });
    const fuseResults = fuse.search(query);
    const newList = fuseResults.map((r) => r.item);

    setFilteredGames(newList);
  };

  /**
   * Déconnexion
   */
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      setCurrentUserId(null);
      setCurrentUser(null);
      navigation.replace('Login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
    }
  };

  // Si en cours de chargement
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  // Message d’accueil
  const welcomeMessage = currentUser
    ? `Bienvenue, ${currentUser.username || 'Utilisateur'}${
        currentUser.status === 'suspended' ? ' (suspendu)' : ''
      } !`
    : 'Bienvenue !';

  return (
    <View style={styles.container}>
      {/* Header */}
      <Card containerStyle={styles.headerCard}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>{welcomeMessage}</Text>

          {/* Icône de messagerie */}
          <MessagingIcon
            unreadCount={unreadMessages}
            onPress={() => {
              navigation.navigate('MessagingListScreen');
            }}
          />
        </View>
      </Card>

      {/* Boutons rapides (Profil / Modifier / Déconnexion) */}
      <View style={styles.quickAccessContainer}>
        <TouchableOpacity
          style={[styles.quickAccessButton, { backgroundColor: '#007BFF' }]}
          onPress={() => navigation.navigate('UserProfile', { userId: currentUserId })}
        >
          <Icon name="account-circle" type="material" color="#fff" size={25} />
          <Text style={styles.quickAccessText}>Mon profil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAccessButton, { backgroundColor: '#FFA726' }]}
          onPress={() => navigation.navigate('ProfileSettings', { userId: currentUserId })}
        >
          <Icon name="edit" type="material" color="#fff" size={25} />
          <Text style={styles.quickAccessText}>Modifier profil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAccessButton, { backgroundColor: '#EF5350' }]}
          onPress={handleLogout}
        >
          <Icon name="logout" type="material" color="#fff" size={25} />
          <Text style={styles.quickAccessText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des jeux */}
      {/* On peut enlever Card ou s'assurer qu'il prend bien flex: 1 */}
      <Card containerStyle={[styles.gamesCard, { flex: 1 }]}>
        <TextInput
          style={styles.searchBar}
          placeholder="Rechercher un jeu..."
          value={searchQuery}
          onChangeText={handleSearch}
        />

        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gameItem}
              onPress={() => navigation.navigate('Platform', { game: item.name })}
            >
              <Icon name="sports-esports" type="material" color="#757575" size={30} />
              <Text style={styles.gameText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>Aucun jeu trouvé</Text>
          }
        />
      </Card>
    </View>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    borderRadius: 10,
    padding: 15,
    margin: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 15,
    padding: 10,
  },
  quickAccessButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
    paddingVertical: 15,
    elevation: 5,
  },
  quickAccessText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  gamesCard: {
    borderRadius: 10,
    padding: 15,
    margin: 15,
    // On peut ajouter flex: 1 ici ou dans l'appel <Card containerStyle={[styles.gamesCard, {flex: 1}]}>
  },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  gameText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#000',
    fontWeight: 'bold',
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
});
