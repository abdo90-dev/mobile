import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

// Importez votre icône de message (message-icon.png) depuis le dossier assets
const messageIcon = require('../assets/message-icon.png');

export default function MessagingIcon({ unreadCount = 0, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      {/* Icône de message */}
      <Image source={messageIcon} style={styles.icon} />

      {/* Badge pour les messages non lus, affiché seulement si unreadCount > 0 */}
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 30, // Ajustez la taille de l'icône
    height: 30,
  },
  badge: {
    position: 'absolute',
    top: -5, // Ajustez la position verticale du badge
    right: -10, // Ajustez la position horizontale du badge
    backgroundColor: '#FF4433',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20, // Largeur minimale pour afficher les chiffres
    height: 20, // Hauteur fixe du badge
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
