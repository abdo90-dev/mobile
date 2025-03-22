// services/auth.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'react-native-bcrypt'; // Pour hacher le mot de passe
// import AsyncStorage from '@react-native-async-storage/async-storage';
// Import nécessaires pour générer l'UUID
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const USERS_KEY = 'users';

/**
 * Inscrire un utilisateur.
 *
 * @param {Object} userData - Objet contenant les infos de l'utilisateur.
 * @param {string} userData.username  (== pseudo)
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} [userData.gender]
 * @param {string} [userData.birthDate]
 * @param {string} [userData.region]
 * @param {string} [userData.avatar] - Chemin / URL de l'avatar, ou null
 * @param {string} [userData.recaptchaToken] - Token reCAPTCHA si tu veux le valider côté back
 */
export async function registerUser({
  username,
  email,
  password,
  gender = '',
  birthDate = '',
  region = '',
  avatar = null,
  recaptchaToken, // optionnel pour la validation reCAPTCHA
}) {
  try {
    // Récupérer la liste actuelle d'utilisateurs
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];

    // Vérif e-mail déjà utilisé
    const emailExists = users.some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    // Vérif pseudo déjà utilisé
    const usernameExists = users.some(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (emailExists && usernameExists) {
      // Les deux sont déjà pris
      return { success: false, message: 'E-mail et Pseudo déjà utilisés.' };
    } else if (emailExists) {
      return { success: false, message: 'E-mail déjà utilisé.' };
    } else if (usernameExists) {
      return { success: false, message: 'Pseudo déjà utilisé.' };
    }

    // (Éventuellement) valider le token reCAPTCHA
    // Ex: if (!validateRecaptcha(recaptchaToken)) return { success:false, message:'Captcha invalide'};

    // Hacher le mot de passe
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password.trim(), salt);

    // Générer un UUID pour l'ID utilisateur
    const userId = uuidv4();

    // Construire l'objet utilisateur
    const newUser = {
      id: userId,
      username: username.trim(),
      email: email.trim(),
      password: hashedPassword,
      gender,
      birthDate,
      region,
      avatar,

      role: 'user',
      about: '',
      status: 'active',

      // Champs initiaux pour éviter includes undefined
      friends: [],
      blockedUsers: [],
      incomingFriendRequests: [],
      outgoingFriendRequests: [],
      currentGames: [],
      platforms: [],
      topicsCreated: 0,
      totalResponses: 0,
    };

    // Ajouter le nouvel utilisateur
    users.push(newUser);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    console.log('Utilisateurs actuels :', users);
    return { success: true, user: newUser };
  } catch (error) {
    console.error('Erreur lors de l\'inscription :', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

/**
 * Connecter un utilisateur (login).
 * @param {string} email
 * @param {string} password
 */
export async function loginUser(email, password) {
  try {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];

    console.log('Utilisateurs disponibles :', users);

    // Chercher l'utilisateur par email
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'Utilisateur non trouvé.' };
    }

    // Vérifier le mot de passe haché
    const isPasswordValid = bcrypt.compareSync(password.trim(), user.password);
    if (!isPasswordValid) {
      return { success: false, message: 'Mot de passe incorrect.' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

/**
 * Récupérer un utilisateur par ID
 */
export async function getUserById(userId) {
  try {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];
    return users.find((user) => user.id === userId) || null;
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des informations utilisateur :',
      error
    );
    return null;
  }
}

/**
 * Déconnecter un utilisateur (supprimer currentUser du stockage)
 */
export async function logoutUser() {
  await AsyncStorage.removeItem('currentUser');
}


export async function saveUsers(users) {
  try {
    await AsyncStorage.setItem('users', JSON.stringify(users));
    console.log('Users saved successfully.');
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

/**
 * Sauvegarder l'utilisateur actuellement connecté
 */
export async function setCurrentUser(user) {
  await AsyncStorage.setItem('currentUser', JSON.stringify(user));
}

/**
 * Récupérer l'utilisateur actuellement connecté
 */
export async function getCurrentUser() {
  const currentUser = await AsyncStorage.getItem('currentUser');
  return currentUser ? JSON.parse(currentUser) : null;
}
