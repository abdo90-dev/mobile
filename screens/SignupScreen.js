// screens/SignupScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RECAPTCHA_SITE_KEY } from '@env';
import { registerUser } from '../services/auth';
import RecaptchaWebView from '../components/RecaptchaWebView';

const BASE_DOMAIN = 'localhost';

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

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [gender, setGender] = useState('Masculin');
  const [birthDate, setBirthDate] = useState('');
  const [region, setRegion] = useState('');
  const [acceptCGU, setAcceptCGU] = useState(false);

  const recaptchaRef = useRef(null);

  const handleRecaptchaToken = async (token) => {
    console.log('reCAPTCHA token reçu :', token);

    const userData = {
      username: username.trim(),
      email: email.trim(),
      password: password.trim(),
      gender,
      birthDate: birthDate.trim(),
      region: region.trim(),
      avatar: null,
      recaptchaToken: token, 
    };

    const response = await registerUser(userData);

    if (response.success) {
      Alert.alert('Succès', 'Inscription réussie !');
      navigation.navigate('Login');
    } else {
      Alert.alert('Erreur', response.message || 'Impossible de créer le compte. Réessayez.');
    }
  };

  const handleExpireRecaptcha = () => {
    Alert.alert('reCAPTCHA expiré', 'Veuillez réessayer.');
  };

  const handleSignup = () => {
    console.log("test");
    
    if (!acceptCGU) {
      Alert.alert('Erreur', 'Vous devez accepter les CGU.');
      return;
    }
    if (!username.trim() || !email.trim() || !birthDate.trim() || !region.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    console.log("test2");
    if (recaptchaRef.current) {
      console.log("test3");
      recaptchaRef.current.triggerCaptcha();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Inscription</Text>

        {/* Pseudo */}
        <TextInput
          style={styles.input}
          placeholder="Pseudo"
          value={username}
          onChangeText={setUsername}
        />

        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Date de naissance */}
        <TextInput
          style={styles.input}
          placeholder="Date de naissance (JJ/MM/AAAA)"
          value={birthDate}
          onChangeText={(txt) => handleBirthDateInput(txt, setBirthDate)}
          keyboardType="numeric"
          maxLength={10}
        />

        {/* Mot de passe */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Confirmation du mot de passe */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.passwordIcon}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Genre */}
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'Masculin' && styles.genderSelected]}
            onPress={() => setGender('Masculin')}
          >
            <Text>Masculin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'Féminin' && styles.genderSelected]}
            onPress={() => setGender('Féminin')}
          >
            <Text>Féminin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'Autre' && styles.genderSelected]}
            onPress={() => setGender('Autre')}
          >
            <Text>Autre</Text>
          </TouchableOpacity>
        </View>

        {/* Région / département */}
        <TextInput
          style={styles.input}
          placeholder="Département / Région"
          value={region}
          onChangeText={setRegion}
        />

        {/* CGU (case à cocher) */}
        <View style={styles.cguContainer}>
          <TouchableOpacity
            onPress={() => setAcceptCGU(!acceptCGU)}
            style={styles.checkbox}
          >
            {acceptCGU && <View style={styles.checkboxSelected} />}
          </TouchableOpacity>
          <Text style={styles.cguText}>J’accepte les CGU</Text>
        </View>

        {/* Bouton S'inscrire */}
        <TouchableOpacity style={styles.button} onPress={()=>{handleRecaptchaToken()}}>
          <Text style={styles.buttonText}>S'inscrire</Text>
        </TouchableOpacity>

        {/* Lien vers connexion */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Déjà un compte ? Connectez-vous</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Composant reCAPTCHA WebView invisible */}
      <RecaptchaWebView
        ref={recaptchaRef}
        siteKey={RECAPTCHA_SITE_KEY}
        domain={BASE_DOMAIN}
        onToken={handleRecaptchaToken}
        onExpire={handleExpireRecaptcha}
      />
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  inputPassword: {
    flex: 1,
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
    color: '#333',
  },
  passwordIcon: {
    position: 'absolute',
    right: 15,
    zIndex: 10,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 15,
  },
  genderButton: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  genderSelected: {
    backgroundColor: '#d2e8ff',
  },
  cguContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    height: 20,
    width: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    height: 12,
    width: 12,
    backgroundColor: '#007BFF',
  },
  cguText: {
    fontSize: 14,
    color: '#333',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#007BFF',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
  },
});
