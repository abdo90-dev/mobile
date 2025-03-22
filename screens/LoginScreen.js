// screens/LoginScreen.js

import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadUsers } from '../data';
import bcrypt from 'bcryptjs'; 
import { UserContext } from '../UserContext';
import RecaptchaWebView from '../components/RecaptchaWebView';
import { saveUsers } from '../services/auth';
const RECAPTCHA_SITE_KEY = '6Lf--bQqAAAAADdAiGhpPhojo8PGH6jNkjLdlYCY';
const BASE_DOMAIN = 'votre-domaine.fr';

// import bcrypt from 'bcryptjs'; // Ensure bcryptjs is imported

async function loginUserLocally(email, password) {
  try {
    if (!email || !password) {
      return {
        success: false,
        message: 'Email et mot de passe requis'
      };
    }

    const users = await loadUsers();
    console.log('Utilisateurs chargés :', users);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return {
        success: false,
        message: 'Format d\'email invalide'
      };
    }

    const foundUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    console.log('Utilisateur trouvé :', foundUser);

    if (!foundUser) {
      return {
        success: false,
        message: 'Email ou mot de passe incorrect'
      };
    }

    if (!foundUser.password) {
      console.error('Password missing for user:', foundUser.email);
      return {
        success: false,
        message: 'Erreur interne. Contactez le support.'
      };
    }

    // Brute force protection
    if (foundUser.loginAttempts >= 5) {
      const lockoutTime = 15 * 60 * 1000; // 15 minutes
      const timeSinceLastAttempt = Date.now() - (foundUser.lastLoginAttempt || 0);

      if (timeSinceLastAttempt < lockoutTime) {
        return {
          success: false,
          message: 'Compte temporairement bloqué. Veuillez réessayer plus tard.'
        };
      }
    }
console.log('Mot de passe trouvé :');

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password.trim(), foundUser.password);
    if (!isMatch) {
      // Track login attempts
      foundUser.loginAttempts = (foundUser.loginAttempts || 0) + 1;
      foundUser.lastLoginAttempt = Date.now();
      await saveUsers(users);

      return {
        success: false,
        message: 'Email ou mot de passe incorrect'
      };
    }

    // Reset login attempts on successful login
    foundUser.loginAttempts = 0;
    foundUser.lastLoginAttempt = null;
    await saveUsers(users);

    const { password: _, ...safeUserData } = foundUser;

    return {
      success: true,
      user: safeUserData
    };

  } catch (error) {
    console.error(`Erreur lors de la connexion pour l'email ${email}:`, error);
    return {
      success: false,
      message: 'Erreur interne lors de la connexion.'
    };
  }
}


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setCurrentUser } = useContext(UserContext);
  const recaptchaRef = useRef(null);

  const handleRecaptchaToken = async (token) => {
    console.log('reCAPTCHA token:', token);

    const response = await loginUserLocally(email, password);

    if (response.success) {
      await setCurrentUser(response.user);
      Alert.alert('Succès', 'Connexion réussie !', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Home', { userId: response.user.id });
          }
        }
      ]);
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue.');
    }
  };

  const handleExpireRecaptcha = () => {
    Alert.alert('reCAPTCHA expiré', 'Veuillez réessayer.');
  };

  const handleLogin = async () => {
    const result = await loginUserLocally(email, password);
    if (result.success) {
      navigation.navigate('Home');
    } else {
      Alert.alert('Erreur', result.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>Pas de compte ? Inscrivez-vous</Text>
      </TouchableOpacity>

      <RecaptchaWebView
        ref={recaptchaRef}
        siteKey={RECAPTCHA_SITE_KEY}
        domain={BASE_DOMAIN}
        onToken={handleRecaptchaToken}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
    color: '#333'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20
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
    color: '#333'
  },
  passwordIcon: {
    position: 'absolute',
    right: 15,
    zIndex: 10
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  link: {
    color: '#007BFF',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 14
  }
});
