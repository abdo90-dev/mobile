// components/NotificationList.js
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NotificationItem = ({ notification, onPress, onDismiss }) => {
  const translateX = new Animated.Value(0);

  const swipeLeft = () => {
    Animated.timing(translateX, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TOPIC_JOIN':
        return 'person-add';
      case 'NEW_MESSAGE':
        return 'chatbubble';
      case 'GAME_STARTING':
        return 'game-controller';
      case 'FRIEND_REQUEST':
        return 'people';
      default:
        return 'notifications';
    }
  };

  return (
    <Animated.View
      style={[
        styles.notificationItem,
        { transform: [{ translateX }] },
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={onPress}
        onLongPress={swipeLeft}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={getNotificationIcon(notification.type)}
            size={24}
            color="#3b5998"
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle}>
            {notification.title}
          </Text>
          <Text style={styles.notificationBody}>
            {notification.body}
          </Text>
          <Text style={styles.notificationTime}>
            {new Date(notification.createdAt).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
      >
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const NotificationList = ({ notifications, onNotificationPress, onDismiss }) => {
  return (
    <FlatList
      data={notifications}
      renderItem={({ item }) => (
        <NotificationItem
          notification={item}
          onPress={() => onNotificationPress(item)}
          onDismiss={() => onDismiss(item.id)}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
    />
  );
};

export default NotificationList;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
  },
  iconContainer: {
    marginRight: 15,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationBody: {
    color: '#666',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  dismissButton: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});
