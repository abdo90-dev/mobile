import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { loadUsers, setModerator } from '../data';

export default function ManageModeratorsScreen({ navigation }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const userList = await loadUsers();
      setUsers(userList);
    };
    fetchUsers();
  }, []);

  const toggleModerator = async (userId, isModerator) => {
    const success = await setModerator(userId, !isModerator);
    if (success) {
      Alert.alert(
        'Succès',
        `L'utilisateur est ${!isModerator ? 'désormais modérateur' : 'retiré en tant que modérateur'}.`
      );
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, isModerator: !isModerator } : user
      );
      setUsers(updatedUsers);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Gestion des modérateurs</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <Text style={styles.username}>{item.username}</Text>
            <TouchableOpacity
              style={[styles.button, item.isModerator && styles.moderatorButton]}
              onPress={() => toggleModerator(item.id, item.isModerator)}
            >
              <Text style={styles.buttonText}>
                {item.isModerator ? 'Retirer Modérateur' : 'Définir Modérateur'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 5,
    elevation: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  moderatorButton: {
    backgroundColor: '#FF4433',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
