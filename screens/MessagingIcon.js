// components/MessagingIcon.js
import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MessagingIcon({ unreadCount = 0, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Image
        source={require('../assets/message-icon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      {unreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  icon: {
    width: 32,
    height: 32,
  },
  badgeContainer: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
