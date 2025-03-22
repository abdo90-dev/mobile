// src/components/DepartmentAutocomplete.js

import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

/**
 * Liste des départements
 * Format : [ "0 Autre", "1 Ain", "2 Aisne", ..., "89 Yonne", etc. ]
 */
const DEPARTMENTS = [
  '0 Autre',
  '1 Ain',
  '2 Aisne',
  '3 Allier',
  '4 Alpes-de-Haute-Provence',
  '5 Hautes-Alpes',
  '6 Alpes-Maritimes',
  '7 Ardèche',
  '8 Ardennes',
  '9 Ariège',
  '10 Aube',
  '11 Aude',
  '12 Aveyron',
  '13 Bouches-du-Rhône',
  '14 Calvados',
  '15 Cantal',
  '16 Charente',
  '17 Charente-Maritime',
  '18 Cher',
  '19 Corrèze',
  '2A Corse-du-Sud',
  '2B Haute-Corse',
  '21 Côte-d\'Or',
  '22 Côtes d\'Armor',
  '23 Creuse',
  '24 Dordogne',
  '25 Doubs',
  '26 Drôme',
  '27 Eure',
  '28 Eure-et-Loir',
  '29 Finistère',
  '30 Gard',
  '31 Haute-Garonne',
  '32 Gers',
  '33 Gironde',
  '34 Hérault',
  '35 Ille-et-Vilaine',
  '36 Indre',
  '37 Indre-et-Loire',
  '38 Isère',
  '39 Jura',
  '40 Landes',
  '41 Loir-et-Cher',
  '42 Loire',
  '43 Haute-Loire',
  '44 Loire-Atlantique',
  '45 Loiret',
  '46 Lot',
  '47 Lot-et-Garonne',
  '48 Lozère',
  '49 Maine-et-Loire',
  '50 Manche',
  '51 Marne',
  '52 Haute-Marne',
  '53 Mayenne',
  '54 Meurthe-et-Moselle',
  '55 Meuse',
  '56 Morbihan',
  '57 Moselle',
  '58 Nièvre',
  '59 Nord',
  '60 Oise',
  '61 Orne',
  '62 Pas-de-Calais',
  '63 Puy-de-Dôme',
  '64 Pyrénées-Atlantiques',
  '65 Hautes-Pyrénées',
  '66 Pyrénées-Orientales',
  '67 Bas-Rhin',
  '68 Haut-Rhin',
  '69 Rhône',
  '70 Haute-Saône',
  '71 Saône-et-Loire',
  '72 Sarthe',
  '73 Savoie',
  '74 Haute-Savoie',
  '75 Paris',
  '76 Seine-Maritime',
  '77 Seine-et-Marne',
  '78 Yvelines',
  '79 Deux-Sèvres',
  '80 Somme',
  '81 Tarn',
  '82 Tarn-et-Garonne',
  '83 Var',
  '84 Vaucluse',
  '85 Vendée',
  '86 Vienne',
  '87 Haute-Vienne',
  '88 Vosges',
  '89 Yonne',
  '90 Territoire-de-Belfort',
  '91 Essonne',
  '92 Hauts-de-Seine',
  '93 Seine-Saint-Denis',
  '94 Val-de-Marne',
  '95 Val-D\'Oise',
  '971 Guadeloupe',
  '972 Martinique',
  '973 Guyane',
  '974 La Réunion',
  '976 Mayotte',
];

export default function DepartmentAutocomplete({
  value,         // Valeur initiale (ex: "75 Paris" ou "")
  onChangeValue, // Callback invoqué à chaque fois que l'utilisateur tape ou sélectionne
  placeholder,   // Placeholder du TextInput
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /**
   * Quand l'utilisateur tape dans le champ
   */
  const handleInputChange = (text) => {
    console.log('--- [DEBUG] handleInputChange ---');
    console.log('Texte tapé (brut) :', JSON.stringify(text));

    // On "trim" le texte pour enlever les espaces au début et à la fin
    const trimmed = text.trim();
    console.log('Texte après trim :', JSON.stringify(trimmed));

    setQuery(trimmed);
    if (onChangeValue) {
      onChangeValue(trimmed);
    }

    // Si rien saisi => pas de suggestions
    if (!trimmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      console.log('trimmed est vide, on arrête ici');
      return;
    }

    // On log le tableau complet pour s'assurer que "89 Yonne" est bien présent
    console.log('DEPARTMENTS array :', DEPARTMENTS);

    // On log chaque correspondance possible
    DEPARTMENTS.forEach((dep) => {
      const depLower = dep.toLowerCase();
      const trimmedLower = trimmed.toLowerCase();
      const match = depLower.includes(trimmedLower);
      if (match) {
        console.log(`[DEBUG MATCH] "${dep}" contient "${trimmed}"`);
      }
    });

    // Filtrage final
    const filtered = DEPARTMENTS.filter((dep) =>
      dep.toLowerCase().includes(trimmed.toLowerCase())
    );
    console.log('Résultat du filtrage :', filtered);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  /**
   * Quand on sélectionne une suggestion dans la liste
   */
  const handleSelect = (dep) => {
    setQuery(dep);
    if (onChangeValue) {
      onChangeValue(dep);
    }
    // On masque les suggestions
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder || 'N° de département'}
        value={query}
        onChangeText={handleInputChange}
      />

      {showSuggestions && (
        <FlatList
          style={styles.suggestionsList}
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              style={styles.suggestionItem}
            >
              <Text>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    position: 'relative',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  suggestionsList: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    zIndex: 999,
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
