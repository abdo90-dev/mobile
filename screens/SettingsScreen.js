// SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupNotifications } from '../services/notifications';

export default function SettingsScreen({ navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // État local pour le toggle notifications
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    // Charger la valeur pushEnabled depuis AsyncStorage au montage
    (async () => {
      try {
        const val = await AsyncStorage.getItem('pushEnabled');
        if (val !== null) {
          setPushEnabled(JSON.parse(val));
        }
      } catch (error) {
        console.error('Erreur lors du chargement pushEnabled :', error);
      }
    })();
  }, []);

  const handleTogglePush = async (value) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem('pushEnabled', JSON.stringify(value));
      if (value) {
        // Si l’utilisateur active la notif, on appelle setupNotifications
        const token = await setupNotifications(true);
        console.log('Token expo push :', token);
      } else {
        console.log('Notifications désactivées');
        // On ne révoque pas la permission, 
        // mais on n’enverra plus de notif (côté backend).
      }
    } catch (error) {
      console.error('Erreur lors de l’enregistrement de pushEnabled :', error);
    }
  };

  const handleChangePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    // Envoyer la requête pour changer le mot de passe (RGPD...)
    Alert.alert('Succès', 'Mot de passe modifié.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Confirmer',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: () => {
            // Appeler une fonction pour supprimer le compte
            Alert.alert('Compte supprimé.');
            navigation.navigate('Login'); // Retourner à l'écran de connexion
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Paramètres</Text>

      {/* --- Password change --- */}
      <Text style={styles.label}>Changer de mot de passe</Text>
      <TextInput
        style={styles.input}
        placeholder="Nouveau mot de passe"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>Modifier le mot de passe</Text>
      </TouchableOpacity>

      {/* --- Updates (region, birthDate) --- */}
      <Text style={styles.label}>Mise à jour des informations</Text>
      <TextInput
        style={styles.input}
        placeholder="Date de naissance (JJ/MM/AAAA)"
        value={birthDate}
        onChangeText={setBirthDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Région"
        value={region}
        onChangeText={setRegion}
      />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Mettre à jour</Text>
      </TouchableOpacity>

      {/* --- Toggle notifications push --- */}
      <View style={styles.toggleContainer}>
        <Text style={styles.label}>Notifications Push</Text>
        <Switch
          value={pushEnabled}
          onValueChange={handleTogglePush}
        />
      </View>

      {/* --- Logout --- */}
      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>

      {/* --- Delete account --- */}
      <TouchableOpacity
        style={[styles.button, styles.deleteButton]}
        onPress={handleDeleteAccount}
      >
        <Text style={styles.buttonText}>Supprimer le compte</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginVertical: 10 },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#FF9900' },
  deleteButton: { backgroundColor: '#FF3333' },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
});
