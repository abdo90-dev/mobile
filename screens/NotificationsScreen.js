// screens/NotificationsScreen.js

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationList from '../components/NotificationList';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);

  // Charge les notifications depuis AsyncStorage
  const loadNotifications = async () => {
    try {
      const data = await AsyncStorage.getItem('notifications');
      if (data) {
        setNotifications(JSON.parse(data));
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  // Recharge les notifications à chaque fois que l’écran reçoit le focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleNotificationPress = (notification) => {
    // Navigation en fonction du type de notification
    switch (notification.type) {
      case 'TOPIC_JOIN':
      case 'NEW_MESSAGE':
        navigation.navigate('TopicDetails', {
          topicId: notification.data.topicId,
        });
        break;
      case 'GAME_STARTING':
        navigation.navigate('GameLobby', {
          topicId: notification.data.topicId,
        });
        break;
      case 'FRIEND_REQUEST':
        navigation.navigate('FriendRequests');
        break;
      default:
        break;
    }
    // Dès qu'une notification est cliquée, on la supprime
    handleDismiss(notification.id);
  };

  const handleDismiss = async (notificationId) => {
    const newNotifications = notifications.filter(
      (notif) => notif.id !== notificationId
    );
    setNotifications(newNotifications);
    try {
      await AsyncStorage.setItem(
        'notifications',
        JSON.stringify(newNotifications)
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications:', error);
    }
  };

  return (
    <View style={styles.container}>
      <NotificationList
        notifications={notifications}
        onNotificationPress={handleNotificationPress}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
