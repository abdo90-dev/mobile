// PlatformScreen.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// On importe la liste de jeux depuis ton fichier dédié
import { listeDeJeux } from '../data/listeDeJeux';

export default function PlatformScreen({ route, navigation }) {
  const { game } = route.params || {}; // Récupère le nom du jeu

  if (!game) {
    console.error("Aucun jeu reçu dans PlatformScreen. Redirection...");
    Alert.alert(
      "Erreur",
      "Aucun jeu sélectionné. Vous allez être redirigé.",
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
    return null; // Évite de rendre l'écran
  }

  // On cherche dans listeDeJeux l'objet correspondant au jeu
  const selectedGame = listeDeJeux.find((g) => g.name === game);

  if (!selectedGame) {
    // Si aucun jeu ne correspond au 'game' reçu,
    // on avertit l’utilisateur, puis on revient en arrière
    console.error(`Jeu "${game}" introuvable dans listeDeJeux.js`);
    Alert.alert(
      "Erreur",
      `Le jeu "${game}" n'est pas reconnu. Vous allez être redirigé.`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
    return null;
  }

  // On récupère le tableau de plateformes défini dans listeDeJeux
  const { platforms } = selectedGame;

  // Gère le clic sur une plateforme
  const handlePlatformPress = (platform) => {
    if (!platform) {
      console.error("Plateforme non définie. Navigation impossible.");
      Alert.alert("Erreur", "Plateforme non valide.");
      return;
    }

    console.log('Navigation vers Topics avec game et platform:', game, platform);
    navigation.navigate('Topics', { game, platform });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Sélectionnez une plateforme pour "{game}" :
      </Text>

      <FlatList
        data={platforms}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.platformItem}
            onPress={() => handlePlatformPress(item)}
          >
            <Text style={styles.platformText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  platformItem: {
    padding: 15,
    backgroundColor: '#ddd',
    marginBottom: 10,
    borderRadius: 5,
  },
  platformText: {
    fontSize: 18,
  },
});
