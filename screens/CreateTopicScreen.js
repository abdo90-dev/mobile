// CreateTopicScreen.js
import 'react-native-gesture-handler';
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';

// On importe addTopic + loadUsers/saveUsers pour incrémenter topicsCreated
import { addTopic, loadUsers, saveUsers } from '../data';

// Import du UserContext pour récupérer currentUser
import { UserContext } from '../UserContext';

const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

function getAvatarSource(user) {
  if (!user) return defaultAvatars['Autre'];
  if (user.avatar) return { uri: String(user.avatar) };
  const gender = user.gender || 'Autre';
  return defaultAvatars[gender] || defaultAvatars['Autre'];
}

export default function CreateTopicScreen({ route, navigation }) {
  const { game, platform, refreshCallback } = route.params || {};

  // Récupère l'utilisateur connecté via le contexte
  const { currentUser } = useContext(UserContext);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // handleCreateTopic
  const handleCreateTopic = async () => {
    if (!currentUser) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    if (currentUser.status === 'suspended') {
      Alert.alert('Compte suspendu', 'Vous ne pouvez pas créer de topic.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre et un contenu.');
      return;
    }

    setIsLoading(true);

    const topicData = { title: title.trim(), content: content.trim() };

    try {
      const success = await addTopic(game, platform, topicData, currentUser);
      if (success) {
        // Incrémenter topicsCreated
        try {
          const allUsers = await loadUsers();
          const updatedUsers = allUsers.map((u) => {
            if (u.id === currentUser.id) {
              return {
                ...u,
                topicsCreated: (u.topicsCreated || 0) + 1,
              };
            }
            return u;
          });
          await saveUsers(updatedUsers);
        } catch (err) {
          console.error('Erreur lors de l’incrémentation de topicsCreated :', err);
        }

        Alert.alert('Succès', 'Topic créé avec succès.');
        if (refreshCallback) refreshCallback();
        navigation.goBack();
      } else {
        Alert.alert('Erreur', 'Erreur lors de la création du topic.');
      }
    } catch (error) {
      console.error('Erreur handleCreateTopic :', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création du topic.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Créer un topic pour {platform} - {game}
      </Text>

      {/* On affiche l’avatar et le username de l’utilisateur connecté */}
      <View style={styles.avatarContainer}>
        <Image source={getAvatarSource(currentUser)} style={styles.avatar} />
        <Text style={styles.username}>
          {currentUser ? currentUser.username : 'Chargement...'}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Titre"
        value={title}
        onChangeText={setTitle}
        editable={!isLoading}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Contenu"
        value={content}
        onChangeText={setContent}
        multiline
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.createButton, isLoading && styles.createButtonDisabled]}
        onPress={handleCreateTopic}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Créer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  avatarContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  username: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  createButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  createButtonDisabled: { 
    opacity: 0.6 
  },
  createButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});
