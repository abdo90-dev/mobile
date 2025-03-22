// UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser as loadUserFromStorage, setCurrentUser as saveUserToStorage } from './data';

/**
 * Le contexte qui stocke l'utilisateur courant et des fonctions pour
 * se connecter (login) / se déconnecter (logout).
 */
export const UserContext = createContext({});

/**
 * Le Provider, englobant l'app, pour partager l'utilisateur courant partout.
 */
export function UserProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);

  /**
   * Au montage, on essaye de charger l'utilisateur depuis AsyncStorage
   * s'il a déjà été sauvegardé (ex: l'utilisateur s'est reconnecté).
   */
  useEffect(() => {
    const loadUser = async () => {
      const user = await loadUserFromStorage();
      setCurrentUserState(user);
    };
    loadUser();
  }, []);

  /**
   * Fonction pour définir l'utilisateur courant
   * (après un login réussi ou mise à jour du profil)
   */
  const setCurrentUser = async (user) => {
    await saveUserToStorage(user);
    setCurrentUserState(user);
  };

  /**
   * Fonction pour se déconnecter : supprime l'user du AsyncStorage et du state
   */
  const logoutUser = async () => {
    await saveUserToStorage(null);
    setCurrentUserState(null);
  };

  /**
   * Valeurs fournies au contexte
   */
  const value = {
    currentUser,
    setCurrentUser,  // pour mettre à jour l'utilisateur depuis n'importe où
    logoutUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
