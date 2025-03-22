// notifications.js
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configuration globale : afficher alerte, son et badge
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Demande les permissions pour les notifications push et renvoie le token.
 */
export async function setupNotifications(pushEnabled = true) {
  if (!pushEnabled) {
    console.log('Notifications désactivées par l’utilisateur.');
    return null;
  }

  try {
    // Mets ici le GUID exact que tu as dans ton app.json → "expo": { "projectId": "..." }.
    // Par exemple : "0120bef4-23b9-4d52-bc68-717600b36b6b"
    const projectId = '0120bef4-23b9-4d52-bc68-717600b36b6b';

    // Demande la permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Permission de notifications non accordée.');
      return null;
    }

    // Obtenir le token Expo (SDK 48+ autorise { projectId })
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('Expo push token :', tokenData.data);

    // Configuration spécifique Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Erreur lors de la configuration des notifications :', error);
    return null;
  }
}

/**
 * Envoie une notification locale immédiate (optionnel).
 */
export async function sendNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger: null,
    });
    console.log('Notification locale envoyée.');
  } catch (error) {
    console.error('Erreur lors de l’envoi de la notification locale :', error);
  }
}

/**
 * Exemple d'enum pour typer des notifications spécifiques dans ton projet
 */
export const NotificationTypes = {
  TOPIC_JOIN: 'TOPIC_JOIN',
  NEW_MESSAGE: 'NEW_MESSAGE',
  GAME_STARTING: 'GAME_STARTING',
  FRIEND_REQUEST: 'FRIEND_REQUEST',
};
