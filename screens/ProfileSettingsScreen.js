// ProfileSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Button, Input, Icon, Avatar, Card } from 'react-native-elements';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';

import { departments } from '../data/departements'; // Ton fichier dpt
import { loadUsers, saveUsers } from '../data';      // Load & save user

// Avatars par défaut
const defaultAvatars = {
  Masculin: require('../assets/default-male.webp'),
  Féminin: require('../assets/default-female.webp'),
  Autre: require('../assets/default-other.webp'),
};

/** Format la date en JJ/MM/AAAA quand on tape */
function handleBirthDateInput(text, setBirthDate) {
  let cleaned = text.replace(/\D/g, '');
  if (cleaned.length > 2) {
    cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
  }
  if (cleaned.length > 5) {
    cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5);
  }
  setBirthDate(cleaned);
}

export default function ProfileSettingsScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Champs
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Masculin');
  const [birthDate, setBirthDate] = useState('');
  const [region, setRegion] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [about, setAbout] = useState('');

  // Plateformes et (nouvelle) liste de jeux du moment
  const [platformsInput, setPlatformsInput] = useState('');
  // On remplace favoriteGames par currentGames
  const [currentGamesInput, setCurrentGamesInput] = useState('');

  useEffect(() => {
    if (!userId) {
      Alert.alert('Erreur', "Aucun ID utilisateur fourni.");
      navigation.goBack();
      return;
    }

    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const users = await loadUsers();
        const foundUser = users.find((u) => u.id === userId);
        if (!foundUser) {
          Alert.alert('Erreur', 'Utilisateur introuvable.');
          navigation.goBack();
          return;
        }
        setUser(foundUser);

        // Charger les champs
        setPseudo(foundUser.username || '');
        setEmail(foundUser.email || '');
        setGender(foundUser.gender || 'Masculin');
        setBirthDate(foundUser.birthDate || '');
        setRegion(foundUser.region || '');
        setAvatar(foundUser.avatar || defaultAvatars[foundUser.gender || 'Masculin']);
        setAbout(foundUser.about || '');

        // Plateformes
        if (Array.isArray(foundUser.platforms)) {
          setPlatformsInput(foundUser.platforms.join(', '));
        }
        // currentGames (ex-favoriteGames)
        if (Array.isArray(foundUser.currentGames)) {
          setCurrentGamesInput(foundUser.currentGames.join(', '));
        }

      } catch (error) {
        console.error('Erreur chargement user (ProfileSettings) :', error);
        Alert.alert('Erreur', 'Impossible de charger le profil.');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId, navigation]);

  /** Sélection d'un avatar */
  const handleChangeAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission refusée', 'Autorisez la galerie pour changer l’avatar.');
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!pickerResult.canceled) {
        setAvatar(pickerResult.assets[0].uri);
      }
    } catch (err) {
      console.error('Erreur avatar :', err);
      Alert.alert('Erreur', 'Impossible de changer l’avatar.');
    }
  };

  /** Sauvegarde */
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Aucun utilisateur à sauvegarder.');
      return;
    }
    try {
      setIsLoading(true);
      const users = await loadUsers();

      // Conversion des inputs => tableaux
      const platformsArray = platformsInput
        .split(',')
        .map((str) => str.trim())
        .filter(Boolean);

      // currentGames
      const currentGamesArray = currentGamesInput
        .split(',')
        .map((str) => str.trim())
        .filter(Boolean);

      // On met à jour l'utilisateur
      const updated = users.map((u) => {
        if (u.id === user.id) {
          return {
            ...u,
            username: pseudo.trim(),
            email: email.trim(),
            // On laisse le genre inchangé si on veut
            gender: u.gender,
            birthDate: birthDate.trim(),
            region: region.trim(),
            avatar: typeof avatar === 'string' ? avatar : u.avatar,
            about: about.trim(),
            platforms: platformsArray,
            // Remplace "favoriteGames" par "currentGames"
            currentGames: currentGamesArray,
          };
        }
        return u;
      });

      await saveUsers(updated);
      Alert.alert('Succès', 'Profil mis à jour !');
      navigation.goBack();
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Utilisateur introuvable.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: 'blue', marginTop: 20 }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Déterminer la source de l’avatar
  const avatarSource = typeof avatar === 'string' ? { uri: avatar } : avatar;

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraHeight={100}
    >
      <Card containerStyle={styles.card}>
        <Text style={styles.header}>Modifier mon Profil</Text>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Avatar
            rounded
            size="xlarge"
            source={avatarSource}
            containerStyle={styles.avatar}
          />
          <TouchableOpacity
            style={styles.editAvatarButton}
            onPress={handleChangeAvatar}
          >
            <Icon name="camera-alt" type="material" color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Pseudo */}
        <Text style={styles.label}>Pseudo</Text>
        <Input
          placeholder="Pseudo"
          value={pseudo}
          onChangeText={setPseudo}
          leftIcon={{ name: 'person', type: 'material', color: '#555' }}
          containerStyle={styles.inputContainer}
        />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={{ name: 'email', type: 'material', color: '#555' }}
          containerStyle={styles.inputContainer}
        />

        {/* Date de naissance */}
        <Text style={styles.label}>Date de naissance (JJ/MM/AAAA)</Text>
        <Input
          placeholder="JJ/MM/AAAA"
          value={birthDate}
          onChangeText={(txt) => handleBirthDateInput(txt, setBirthDate)}
          keyboardType="numeric"
          maxLength={10}
          leftIcon={{ name: 'event', type: 'material', color: '#555' }}
          containerStyle={styles.inputContainer}
        />

        {/* Département / Région */}
        <Text style={styles.label}>Département / Région</Text>
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            placeholder={{ label: 'Sélectionnez un département', value: '' }}
            onValueChange={setRegion}
            items={departments}
            value={region}
            style={{
              inputIOS: styles.pickerInput,
              inputAndroid: styles.pickerInput,
              iconContainer: { top: 10, right: 15 },
            }}
            Icon={() => <Icon name="arrow-drop-down" type="material" color="#555" />}
          />
        </View>

        {/* Plateformes préférées */}
        <Text style={styles.label}>Plateformes préférées (séparées par des virgules)</Text>
        <Input
          placeholder="Ex: PS5, Switch, PC"
          value={platformsInput}
          onChangeText={setPlatformsInput}
          leftIcon={{ name: 'gamepad', type: 'material-community', color: '#555' }}
          containerStyle={styles.inputContainer}
        />

        {/* Mes jeux du moment (ex-favoriteGames) */}
        <Text style={styles.label}>Mes jeux du moment (séparés par des virgules)</Text>
        <Input
          placeholder="Ex: Overwatch, Call of Duty"
          value={currentGamesInput}
          onChangeText={setCurrentGamesInput}
          leftIcon={{ name: 'sports-esports', type: 'material', color: '#555' }}
          containerStyle={styles.inputContainer}
        />

        {/* À propos */}
        <Text style={styles.label}>À propos de moi</Text>
        <Input
          placeholder="Parlez de vous..."
          value={about}
          onChangeText={setAbout}
          multiline
          numberOfLines={3}
          leftIcon={{ name: 'info', type: 'material', color: '#555' }}
          containerStyle={styles.inputContainer}
        />

        {/* Bouton sauvegarde */}
        <Button
          title="Enregistrer"
          onPress={handleSave}
          icon={{ name: 'save', type: 'material', color: '#fff' }}
          buttonStyle={styles.saveButton}
        />
      </Card>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingBottom: 60,
    backgroundColor: '#f5f5f5',
  },
  card: {
    borderRadius: 10,
    padding: 20,
    margin: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
    color: '#333',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#ccc',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#007BFF',
    borderRadius: 20,
    padding: 5,
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 10,
  },
  pickerContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  pickerInput: {
    fontSize: 16,
    color: '#333',
    padding: 10,
  },
  saveButton: {
    backgroundColor: 'green',
    marginTop: 20,
    borderRadius: 5,
  },
});
