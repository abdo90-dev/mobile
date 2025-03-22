// src/components/LocationAutocomplete.js

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { locations } from '../data/regions'; // Chemin à adapter

function normalizeString(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function LocationAutocomplete({
  value,
  onChangeValue,
  placeholder,
  maxSuggestions = 5,
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (text) => {
    setQuery(text);
    if (onChangeValue) onChangeValue(text);

    const normalizedInput = normalizeString(text);
    if (!normalizedInput) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = locations.filter((loc) =>
      normalizeString(loc).includes(normalizedInput)
    );
    const limited = filtered.slice(0, maxSuggestions);
    setSuggestions(limited);
    setShowSuggestions(limited.length > 0);
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item);
    if (onChangeValue) onChangeValue(item);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder || 'Département ou région'}
        value={query}
        onChangeText={handleInputChange}
        onFocus={() => {
          if (query.length === 0) {
            const firstSuggestions = locations.slice(0, maxSuggestions);
            setSuggestions(firstSuggestions);
            setShowSuggestions(true);
          }
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <FlatList
          nestedScrollEnabled
          style={styles.suggestionsContainer}
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    maxHeight: 150,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    zIndex: 999,
  },
  suggestionItem: {
    padding: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  suggestionText: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
});
