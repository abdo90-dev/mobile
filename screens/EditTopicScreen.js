// EditTopicScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { editTopic, getCurrentUser } from '../data'; // <-- Import getCurrentUser ici

export default function EditTopicScreen({ route, navigation }) {
  const { game, platform, topicId, oldTitle, oldContent } = route.params || {};
  const [title, setTitle] = useState(oldTitle);
  const [content, setContent] = useState(oldContent);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Enregistre les modifications en appelant editTopic (data.js).
   * Cela va mettre à jour le titre/le contenu et passer edited = true.
   */
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Erreur', 'Le titre et le contenu ne peuvent pas être vides.');
      return;
    }
    setIsSaving(true);

    try {
      // Récupérer l'utilisateur courant pour obtenir son userId
      const user = await getCurrentUser();
      if (!user || !user.id) {
        Alert.alert(
          'Erreur',
          "Vous n'êtes pas connecté. Veuillez vous connecter pour éditer le topic."
        );
        setIsSaving(false);
        return;
      }

      // On appelle la fonction 'editTopic' avec l'argument updates ET user.id
      const success = await editTopic(
        game,
        platform,
        topicId,
        {
          newTitle: title.trim(),
          newContent: content.trim(),
        },
        user.id // <-- On passe le userId en dernier paramètre
      );

      if (success) {
        Alert.alert('Succès', 'Topic mis à jour (modifié).');
        // Retour à l'écran précédent (TopicDetailsScreen)
        navigation.goBack();
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour le topic.');
      }
    } catch (error) {
      console.error('Erreur mise à jour topic :', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Modifier le topic</Text>

      <Text style={styles.label}>Titre</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Contenu</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={content}
        onChangeText={setContent}
        multiline
      />

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
