// EditReplyScreen.js

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
import { editReply, getCurrentUser } from '../data'; // <-- Import de getCurrentUser

export default function EditReplyScreen({ route, navigation }) {
  const { game, platform, topicId, replyId, oldContent } = route.params || {};
  const [content, setContent] = useState(oldContent);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Enregistre les modifications en appelant editReply.
   * data.js se charge alors de passer edited = true sur la réponse.
   */
  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Erreur', 'Le contenu ne peut pas être vide.');
      return;
    }
    setIsSaving(true);

    try {
      // Récupérer l’utilisateur courant pour avoir son userId
      const user = await getCurrentUser();
      if (!user || !user.id) {
        Alert.alert(
          'Erreur',
          "Vous n'êtes pas connecté. Veuillez vous connecter pour éditer la réponse."
        );
        setIsSaving(false);
        return;
      }

      // Appel avec le userId en 6ᵉ paramètre
      const success = await editReply(
        game,
        platform,
        topicId,
        replyId,
        content.trim(),
        user.id // <-- userId
      );

      if (success) {
        Alert.alert('Succès', 'Réponse mise à jour (modifiée).');
        // Retourne à l'écran précédent (TopicDetailsScreen)
        navigation.goBack();
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour la réponse.');
      }
    } catch (error) {
      console.error('Erreur mise à jour réponse :', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Modifier la réponse</Text>

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
