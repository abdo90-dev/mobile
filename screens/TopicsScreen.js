// TopicsScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert 
} from 'react-native';
import { locations } from '../data/regions'; // Assure-toi que ce chemin est correct
import * as ImagePicker from 'expo-image-picker';
import { loadTopics, saveTopics, addTopic } from '../data'; // Import des fonctions de sauvegarde

/**
 * Formate une date ISO en "DD/MM/YYYY à HH:MM"
 * @param {string} isoString - La date au format ISO.
 * @returns {string} - La date formatée.
 */
const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);

  // Vérifie si la date est valide
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois commencent à 0
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} à ${hours}:${minutes}`;
};

export default function TopicsScreen({ route }) {
  const { game, platform } = route.params; // Récupère le jeu et la plateforme depuis la navigation
  const [topics, setTopics] = useState([]); // Liste des topics
  const [newTopic, setNewTopic] = useState(''); // Nouveau topic
  const [department, setDepartment] = useState(''); // Département saisi
  const [filteredDepartments, setFilteredDepartments] = useState([]); // Suggestions de départements
  const flatListRef = useRef(); // Référence pour scroller

  // Avatars par défaut selon le genre
  const defaultAvatars = {
    Masculin: require('../assets/default-male.webp'),
    Féminin: require('../assets/default-female.webp'),
    Autre: require('../assets/default-other.webp'),
  };

  // Avatar actuel
  const [avatar, setAvatar] = useState(null); // Avatar personnalisé ou par défaut

  /**
   * Normalise une chaîne de caractères pour la recherche
   * @param {string} str - La chaîne à normaliser.
   * @returns {string} - La chaîne normalisée.
   */
  const normalizeString = (str) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /**
   * Gère la saisie du département et filtre les suggestions
   * @param {string} text - Le texte saisi.
   */
  const handleDepartmentInput = (text) => {
    setDepartment(text);
    const normalizedInput = normalizeString(text);
    const filtered = locations.filter((loc) =>
      normalizeString(loc).includes(normalizedInput)
    );
    setFilteredDepartments(filtered.slice(0, 5)); // Limite à 5 suggestions

    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 300, animated: true });
    }
  };

  /**
   * Sélectionne une suggestion de département
   * @param {string} selectedDepartment - Le département sélectionné.
   */
  const selectDepartment = (selectedDepartment) => {
    setDepartment(selectedDepartment);
    setFilteredDepartments([]);
  };

  /**
   * Ajoute un nouveau topic à la liste
   */
  const handleAddTopic = async () => {
    if (newTopic.trim()) {
      const newTopicObject = {
        id: Date.now().toString(),
        title: newTopic.trim(),
        content: "Contenu par défaut", // Ajoute du contenu si nécessaire
        game: game, // Ajoute le jeu en cours
        platform: platform, // Ajoute la plateforme en cours
        timestamp: new Date().toISOString(), // Ajoute le timestamp
        department: department, // Ajoute le département sélectionné
        replies: [], // Initialise les réponses
      };

      const success = await addTopic(newTopicObject);

      if (success) {
        const updatedTopics = [...topics, newTopicObject];
        console.log('Avant mise à jour des topics :', topics); // Debug
        setTopics(updatedTopics);
        console.log('Après mise à jour des topics :', updatedTopics); // Debug
        setNewTopic('');
        setDepartment(''); // Réinitialise le département après ajout
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter le topic.');
      }
    } else {
      Alert.alert('Erreur', 'Le titre du topic ne peut pas être vide.');
    }
  };

  /**
   * Ouvre la galerie pour sélectionner un avatar personnalisé
   */
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission refusée',
          'Vous devez autoriser l’accès à la galerie pour changer votre avatar.'
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Photo carrée
        quality: 1,
      });

      if (!pickerResult.canceled) {
        setAvatar(pickerResult.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur avatar :', error);
      Alert.alert('Erreur', 'Impossible de changer l’avatar.');
    }
  };

  /**
   * Met à jour l'avatar par défaut lors du changement de genre
   * @param {string} newGender - Le nouveau genre sélectionné.
   */
  const handleGenderChange = (newGender) => {
    // Si l'utilisateur n'a pas d'avatar personnalisé, mettre à jour l'avatar par défaut
    if (!avatar) {
      setAvatar(defaultAvatars[newGender] || defaultAvatars['Autre']);
    }
  };

  /**
   * Charge les topics depuis AsyncStorage lors du montage du composant
   */
  useEffect(() => {
    const fetchTopics = async () => {
      const storedTopics = await loadTopics();
      const filteredTopics = storedTopics.filter(
        (topic) => topic.game === game && topic.platform === platform
      );
      setTopics(filteredTopics);
      console.log('Topics chargés depuis AsyncStorage.', filteredTopics); // Debug
    };

    fetchTopics();
  }, [game, platform]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Topics pour {platform} - {game} :</Text>
      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          console.log('Rendering topic:', item); // Debug pour vérifier le rendu
          return (
            <View style={styles.topicItem}>
              <Text style={styles.topicText}>{item.title}</Text>
              <Text style={styles.timestampText}>{formatDate(item.timestamp)}</Text>
              <Text style={styles.departmentText}>{item.department}</Text>
              <Text style={styles.contentText}>{item.content}</Text>
            </View>
          );
        }}
      />

      {/* Champ Département avec suggestions */}
      <TextInput
        style={styles.input}
        placeholder="Département ou région"
        value={department}
        onChangeText={handleDepartmentInput}
        onFocus={() => setFilteredDepartments(locations.slice(0, 5))}
      />
      {filteredDepartments.length > 0 && (
        <View style={styles.suggestionList}>
          <FlatList
            data={filteredDepartments}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionContainer}
                onPress={() => selectDepartment(item)}
              >
                <Text style={styles.suggestion}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Nouveau topic */}
      <TextInput
        style={styles.input}
        placeholder="Ajouter un nouveau topic"
        value={newTopic}
        onChangeText={setNewTopic}
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAddTopic}>
        <Text style={styles.addButtonText}>Ajouter</Text>
      </TouchableOpacity>

      {/* Optionnel : Bouton pour changer l'avatar */}
      <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
        <Text style={styles.avatarButtonText}>Changer l'avatar</Text>
      </TouchableOpacity>

      {/* Affichage de l'avatar actuel */}
      {avatar && (
        <Image
          source={{ uri: avatar }}
          style={styles.avatarImage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f5f5f5' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  topicItem: {
    padding: 15,
    backgroundColor: '#ddd',
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1, // Bordure visible pour le débogage
    borderColor: 'red', // Bordure rouge pour identifier facilement les topics
  },
  topicText: { 
    fontSize: 18, 
    fontWeight: 'bold',
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  departmentText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contentText: { 
    fontSize: 14, 
    marginTop: 5,
    color: '#333',
  },
  input: { 
    height: 40, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    marginBottom: 10, 
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
    maxHeight: 150,
    marginBottom: 20,
  },
  suggestionContainer: {
    padding: 10,
  },
  suggestion: {
    fontSize: 16,
    color: '#007BFF',
  },
  avatarButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  avatarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginTop: 10,
  },
});
