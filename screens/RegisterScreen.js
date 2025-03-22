// RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';

// ===== IMPORTS SPÉCIFIQUES POUR L'UUID (NOUVEAU) =====
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// =====================================================

import { Picker } from '@react-native-picker/picker';
import CheckBox from '@react-native-community/checkbox';
import * as ImagePicker from 'expo-image-picker';

import { loadUsers, saveUsers } from '../data';
import bcrypt from '../secureBcrypt'; // Bcrypt configuré
import DepartmentAutocomplete from '../components/DepartmentAutocomplete';

/**
 * Helpers de validation
 */
function validateEmailFormat(email) {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
}

function validateDateFormat(dateString) {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  return regex.test(dateString);
}

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    pseudo: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'Masculin',
    birthDate: '',
    department: '', // pas obligatoire
    acceptCGU: false,
    avatar: null, // chemin local de l'image choisie
  });

  const [errors, setErrors] = useState({});

  // Avatars par défaut selon le genre
  const avatars = {
    Masculin: require('../assets/default-male.webp'),
    Féminin: require('../assets/default-female.webp'),
    Autre: require('../assets/default-other.webp'),
  };

  /**
   * Choisir un avatar personnalisé
   */
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setFormData({ ...formData, avatar: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Erreur lors du choix de la photo :', error);
      Alert.alert('Erreur', 'Impossible de sélectionner une image pour le moment.');
    }
  };

  /**
   * Vérifie les champs obligatoires
   */
  const validateFields = () => {
    const newErrors = {};

    // Pseudo
    if (!formData.pseudo.trim()) {
      newErrors.pseudo = 'Le pseudo est obligatoire.';
    }

    // Email + format
    if (!formData.email.trim()) {
      newErrors.email = 'L’email est obligatoire.';
    } else if (!validateEmailFormat(formData.email.trim())) {
      newErrors.email = 'Format d’email invalide.';
    }

    // Mot de passe
    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est obligatoire.';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    // Date de naissance
    if (!formData.birthDate.trim()) {
      newErrors.birthDate = 'La date de naissance est obligatoire.';
    } else if (!validateDateFormat(formData.birthDate.trim())) {
      newErrors.birthDate = 'Format de date invalide (JJ/MM/AAAA).';
    }

    // CGU
    if (!formData.acceptCGU) {
      newErrors.acceptCGU = 'Vous devez accepter les CGU.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Inscription (hashage du mot de passe, stockage, etc.)
   */
  const handleRegister = async () => {
    if (!validateFields()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    try {
      // Détermination de l’avatar (par défaut selon le genre ou personnalisé)
      const userAvatar =
        formData.avatar || Image.resolveAssetSource(avatars[formData.gender]).uri;

      // Hashage du mot de passe
      const hashedPassword = bcrypt.hashSync(formData.password.trim(), 10);

      // Génération UUID
      const uniqueUserId = uuidv4();

      // Nouvel utilisateur
      const newUser = {
        id: uniqueUserId,
        pseudo: formData.pseudo.trim(),
        email: formData.email.trim(),
        password: hashedPassword,
        gender: formData.gender,
        birthDate: formData.birthDate.trim(),
        department: formData.department.trim(),
        avatar: userAvatar,

        about: '',
        role: 'user',
      };

      // Exemple : si l'email est le tien => role admin
      if (newUser.email.toLowerCase() === 'lezardvalethlenneth@gmail.com') {
        newUser.role = 'admin';
        newUser.pseudo = 'Ellios';
      }

      // On charge la liste des utilisateurs stockés en local
      const users = await loadUsers();

      // Vérifier si e-mail déjà utilisé
      const emailExists = users.some(
        (u) => u.email.toLowerCase() === newUser.email.toLowerCase()
      );
      // Vérifier si pseudo déjà utilisé
      const usernameExists = users.some(
        (u) => u.pseudo.toLowerCase() === newUser.pseudo.toLowerCase()
      );

      // Vérif collisions
      if (emailExists && usernameExists) {
        Alert.alert('Erreur', 'Cet e-mail et ce pseudo sont déjà utilisés.');
        return;
      } else if (emailExists) {
        Alert.alert('Erreur', 'Cet e-mail est déjà utilisé.');
        return;
      } else if (usernameExists) {
        Alert.alert('Erreur', 'Ce pseudo est déjà utilisé.');
        return;
      }

      // On ajoute le nouvel utilisateur
      users.push(newUser);
      await saveUsers(users);

      console.log('Nouvel utilisateur enregistré :', newUser);
      Alert.alert('Succès', 'Compte créé avec succès !');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Erreur lors de la création de compte :', error);
      Alert.alert('Erreur', 'Impossible de créer le compte pour le moment.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Inscription</Text>

      {/* Avatar */}
      <Image
        source={
          formData.avatar
            ? { uri: formData.avatar }
            : avatars[formData.gender]
        }
        style={styles.avatarPreview}
      />
      <TouchableOpacity style={styles.customButton} onPress={pickImage}>
        <Text style={styles.customButtonText}>Changer l'avatar</Text>
      </TouchableOpacity>

      {/* Pseudo */}
      <TextInput
        style={[styles.input, errors.pseudo && styles.inputError]}
        placeholder="Pseudo*"
        value={formData.pseudo}
        onChangeText={(text) => setFormData({ ...formData, pseudo: text })}
      />
      {errors.pseudo && <Text style={styles.errorText}>{errors.pseudo}</Text>}

      {/* Email */}
      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        placeholder="E-mail*"
        keyboardType="email-address"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        autoCapitalize="none"
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      {/* Mot de passe */}
      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="Mot de passe*"
        secureTextEntry
        value={formData.password}
        onChangeText={(text) => setFormData({ ...formData, password: text })}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      {/* Confirmation du mot de passe */}
      <TextInput
        style={[styles.input, errors.confirmPassword && styles.inputError]}
        placeholder="Confirmez le mot de passe*"
        secureTextEntry
        value={formData.confirmPassword}
        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
      />
      {errors.confirmPassword && (
        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
      )}

      {/* Genre */}
      <Text style={styles.label}>Genre*</Text>
      <Picker
        selectedValue={formData.gender}
        onValueChange={(itemValue) => setFormData({ ...formData, gender: itemValue })}
        style={styles.picker}
      >
        <Picker.Item label="Masculin" value="Masculin" />
        <Picker.Item label="Féminin" value="Féminin" />
        <Picker.Item label="Autre" value="Autre" />
      </Picker>

      {/* Date de naissance */}
      <TextInput
        style={[styles.input, errors.birthDate && styles.inputError]}
        placeholder="Date de naissance (JJ/MM/AAAA)*"
        value={formData.birthDate}
        onChangeText={(text) => setFormData({ ...formData, birthDate: text })}
      />
      {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate}</Text>}

      {/* Département */}
      <DepartmentAutocomplete
        value={formData.department}
        onChangeValue={(selectedDep) => setFormData({ ...formData, department: selectedDep })}
        placeholder="Ex: 75 Paris"
      />

      {/* CGU */}
      <View style={styles.checkboxContainer}>
        <CheckBox
          value={formData.acceptCGU}
          onValueChange={(value) => setFormData({ ...formData, acceptCGU: value })}
        />
        <Text style={[styles.label, errors.acceptCGU && styles.errorText]}>
          J'accepte les CGU*
        </Text>
      </View>

      {/* Bouton S'inscrire */}
      <TouchableOpacity style={styles.customButton} onPress={handleRegister}>
        <Text style={styles.customButtonText}>S'inscrire</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/** Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: 'red',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  customButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  customButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
  },
  picker: {
    height: 40,
    marginBottom: 10,
  },
});
