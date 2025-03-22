// firebaseConfig.js
import { initializeApp } from 'firebase/app';
// Ici tu importes ce dont tu as besoin : Auth, Firestore, etc.
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getAnalytics } from "firebase/analytics"; 
// Attention, Analytics n’est pas pleinement compatible avec React Native

// Colle la config que tu as depuis la console Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDTznn-TPWuTeYTdIE31nFZrCAaLKhyOCg",
  authDomain: "gameforumfirebase.firebaseapp.com",
  projectId: "gameforumfirebase",
  storageBucket: "gameforumfirebase.firebasestorage.app",
  messagingSenderId: "760566171167",
  appId: "1:760566171167:web:b983a99eca335ac67c772a",
  measurementId: "G-ZKNSPXCZW5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services que tu veux utiliser
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const analytics = getAnalytics(app); 
// -> analytics n’est pas dispo sur React Native sans workaround
