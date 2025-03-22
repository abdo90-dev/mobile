// App.js
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

// ===== Import de la variable depuis .env =====
import { RECAPTCHA_SITE_KEY } from '@env';

import { UserProvider } from './UserContext';
import { setupNotifications } from './services/notifications';

// Import des écrans
import HomeScreen from './screens/HomeScreen';
import PlatformScreen from './screens/PlatformScreen';
import TopicsListScreen from './screens/TopicsListScreen';
import TopicDetailsScreen from './screens/TopicDetailsScreen';
import CreateTopicScreen from './screens/CreateTopicScreen';
import ProfileSettingsScreen from './screens/ProfileSettingsScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import TermsScreen from './screens/TermsScreen';
import UserProfileScreen from './screens/UserProfileScreen';

// ***** ICI on importe la nouvelle UserPostsScreen *****
import UserPostsScreen from './screens/UserPostsScreen';

import SettingsScreen from './screens/SettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import MessagingScreen from './screens/MessagingScreen';
import EditTopicScreen from './screens/EditTopicScreen';
import EditReplyScreen from './screens/EditReplyScreen';
import DebugScreen from './screens/DebugScreen';
import MessagingListScreen from './screens/MessagingListScreen';
import FriendListScreen from './screens/FriendListScreen';
import UserFriendsListScreen from './screens/UserFriendsListScreen';

import {
  initializeTopics,
  createTestUser,
  loadUsers,
  ensureAdminExists,
} from './data';

const Stack = createStackNavigator();

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    console.log('Clé RECAPTCHA_SITE_KEY =', RECAPTCHA_SITE_KEY);

    const initializeApp = async () => {
      try {
        console.log("Initialisation de l'application...");

        // S’assurer qu’un admin "lezardvalethlenneth@gmail.com" existe
        await ensureAdminExists();

        // Initialiser les topics
        await initializeTopics();

        // Charger la liste des utilisateurs
        const users = await loadUsers();
        if (!users || users.length === 0) {
          console.log("Aucun utilisateur trouvé. Création d'un utilisateur test...");
          await createTestUser();
        } else {
          console.log('Utilisateurs existants trouvés :', users);
        }

        // Notifications push
        const token = await setupNotifications(false);
        setPushToken(token);

        setIsAppReady(true);
      } catch (error) {
        console.error('Erreur init app :', error);
        setIsAppReady(true);
      }
    };

    initializeApp();

    // Listener de notifications en foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification en foreground:', notification);
      });

    // Listener des réponses utilisateur (clic sur notif)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Réponse notif:', response);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }
try{
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: '#f8f9fa' },
            headerTintColor: '#333',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          {/* Écrans d'authentification */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Connexion' }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: 'Inscription' }}
          />

          {/* Écran d'accueil */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Accueil' }}
          />

          {/* Choix plateforme / Topics */}
          <Stack.Screen
            name="Platform"
            component={PlatformScreen}
            options={{ title: 'Choisissez une plateforme' }}
          />
          <Stack.Screen
            name="Topics"
            component={TopicsListScreen}
            options={{ title: 'Liste des topics' }}
          />
          <Stack.Screen
            name="TopicDetails"
            component={TopicDetailsScreen}
            options={{ title: 'Détails du topic' }}
          />
          <Stack.Screen
            name="CreateTopic"
            component={CreateTopicScreen}
            options={{ title: 'Créer un nouveau topic' }}
          />

          {/* Messagerie */}
          <Stack.Screen
            name="MessagingListScreen"
            component={MessagingListScreen}
            options={{ title: 'Mes Messages' }}
          />
          <Stack.Screen
            name="MessagingScreen"
            component={MessagingScreen}
            options={{ title: 'Messagerie' }}
          />

          {/* Utilisateurs */}
          <Stack.Screen
            name="ProfileSettings"
            component={ProfileSettingsScreen}
            options={{ title: 'Paramètres du profil' }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={({ route }) => ({
              title: `Profil de ${route.params?.username || 'Utilisateur'}`,
            })}
          />

          {/* ***** La route s’appelle "UserPostsScreen" pour correspondre à navigate('UserPostsScreen') ***** */}
          <Stack.Screen
            name="UserPostsScreen"
            component={UserPostsScreen}
            options={{ title: 'Mes Posts' }}
          />

          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Paramètres' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />

          {/* Écran "FriendListScreen" */}
          <Stack.Screen
            name="FriendListScreen"
            component={FriendListScreen}
            options={{ title: 'Gestion des Amis' }}
          />

          {/* "UserFriendsListScreen" */}
          <Stack.Screen
            name="UserFriendsListScreen"
            component={UserFriendsListScreen}
            options={{ title: 'Liste des amis' }}
          />

          {/* Autres */}
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{ title: "Conditions d'Utilisation" }}
          />
          <Stack.Screen
            name="EditTopic"
            component={EditTopicScreen}
            options={{ title: 'Modifier le topic' }}
          />
          <Stack.Screen
            name="EditReply"
            component={EditReplyScreen}
            options={{ title: 'Modifier la réponse' }}
          />
          <Stack.Screen
            name="Debug"
            component={DebugScreen}
            options={{ title: 'Debug' }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Optionnel : afficher le token push si besoin */}
      {pushToken ? (
        <View style={styles.pushTokenContainer}>
          <Text style={styles.pushTokenText} selectable>
            Push Token: {pushToken}
          </Text>
        </View>
      ) : (
        <View style={styles.pushTokenContainer}>
          <Text style={[styles.pushTokenText, { color: 'red' }]}>
            Aucun token récupéré.
          </Text>
        </View>
      )}
    </UserProvider>
  );
}catch (error) {
  console.error("App crashed:", error);
  return <Text>Error loading app</Text>;
}
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pushTokenContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  pushTokenText: {
    fontSize: 14,
    color: '#333',
  },
});
