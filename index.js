// index.js

// Importez le polyfill pour des générateurs de nombres aléatoires sécurisés
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent appelle AppRegistry.registerComponent('main', () => App);
// Il s'assure également que, que vous chargiez l'application dans Expo Go ou dans une build native,
// l'environnement est correctement configuré
registerRootComponent(App);
