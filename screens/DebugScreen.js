// ./screens/DebugScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Écran de débogage : propose un bouton permettant de vider complètement AsyncStorage,
 * réinitialisant ainsi toutes les données locales de l'application.
 */
export default function DebugScreen({ navigation }) {
  // Fonction pour vider AsyncStorage
  const handleClearStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Succès', 'Le stockage local (AsyncStorage) a été réinitialisé.');
    } catch (error) {
      console.error('Erreur lors du vidage d’AsyncStorage :', error);
      Alert.alert('Erreur', 'Impossible de vider le stockage local.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Écran de débogage</Text>
      <Text style={styles.info}>
        Ici, tu peux effacer tout le contenu de AsyncStorage afin de repartir de zéro.
      </Text>

      <TouchableOpacity onPress={handleClearStorage} style={styles.clearButton}>
        <Text style={styles.clearButtonText}>Vider le stockage local</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
