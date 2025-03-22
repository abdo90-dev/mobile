import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';

import { UserContext } from '../UserContext';
import {
  loadConversations,
  sendMessageToConversation,
  editPrivateMessage,
  deletePrivateMessage,
  getOrCreateConversation,
  markMessagesAsRead,
  loadUsers,
} from '../data';

/** Format de date : JJ/MM/YYYY HH:MM */
function formatDate(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export default function MessagingScreen({ route }) {
  const navigation = useNavigation();
  const { conversationId, recipientId } = route.params || {};
  const { currentUser } = useContext(UserContext);

  // États
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]); // tri décroissant: index 0 = plus récent
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');

  // Pour trouver l'autre utilisateur (header)
  const [allUsers, setAllUsers] = useState([]);

  // Réf FlatList (pour scroller en haut = index 0)
  const flatListRef = useRef(null);

  // Modal d'édition
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // Highlight du dernier message envoyé par moi
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // ---------------------------------------
  // 1) Chargement initial
  // ---------------------------------------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté.');
        navigation.goBack();
        return;
      }
      try {
        setIsLoading(true);

        // Charger tous les utilisateurs
        const usersFromStore = await loadUsers();
        if (isMounted) {
          setAllUsers(usersFromStore || []);
        }

        // Charger ou créer la conversation
        let conv = null;
        if (conversationId) {
          const allConvos = await loadConversations();
          conv = allConvos.find((c) => c.id === conversationId);
          if (!conv) {
            Alert.alert('Erreur', 'Conversation introuvable.');
            navigation.goBack();
            return;
          }
        } else if (recipientId) {
          conv = await getOrCreateConversation(currentUser.id, recipientId);
          if (!conv) {
            Alert.alert('Erreur', 'Impossible de créer la conversation.');
            navigation.goBack();
            return;
          }
        }
        setConversation(conv);

        // Tri en DESC: plus récent -> plus ancien
        const sortedMsgs = [...(conv.messages || [])].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setMessages(sortedMsgs);

        // Marquer lus
        await markMessagesAsRead(conv.id, currentUser.id);

        // On limite l'affichage
        setVisibleCount(Math.min(20, sortedMsgs.length));
      } catch (err) {
        console.error('Erreur load messaging:', err);
        Alert.alert('Erreur', 'Impossible de charger la conversation.');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [conversationId, recipientId, currentUser, navigation]);

  // ---------------------------------------
  // 2) Se placer en haut (index 0) après chargement initial
  // ---------------------------------------
  useEffect(() => {
    if (!isLoading && messages.length > 0 && flatListRef.current) {
      // On attend un petit temps pour que la FlatList calcule son layout
      setTimeout(() => {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }, 100);
    }
  }, [isLoading, messages]);

  // ---------------------------------------
  // 3) Mise à jour header
  // ---------------------------------------
  useEffect(() => {
    if (!conversation || !currentUser) return;
    const otherUserId =
      conversation.user1 === currentUser.id
        ? conversation.user2
        : conversation.user1;
    const otherUser = allUsers.find((u) => u.id === otherUserId);
    navigation.setOptions({
      title: `Messagerie - ${otherUser ? otherUser.username : '???'}`,
    });
  }, [conversation, currentUser, allUsers, navigation]);

  // ---------------------------------------
  // 4) Envoyer un message
  // ---------------------------------------
  async function handleSend() {
    if (!inputText.trim() || !conversation) return;

    const newMsg = {
      id: `temp-${Date.now()}`,
      content: inputText.trim(),
      senderId: currentUser.id,
      timestamp: new Date().toISOString(),
      edited: false,
      read: false,
    };

    // On insère en 1er (index 0)
    const newMessages = [newMsg, ...messages];
    setMessages(newMessages);
    setVisibleCount(Math.min(newMessages.length, visibleCount + 1));
    setInputText('');

    // highlight
    setHighlightedMessageId(newMsg.id);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3000);

    // On se replace en haut pour voir ce message
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }, 100);

    // Envoyer au backend
    try {
      const success = await sendMessageToConversation(
        conversation.id,
        currentUser.id,
        newMsg.content
      );
      if (!success) {
        // Si échec
        setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
        Alert.alert('Erreur', 'Impossible d’envoyer le message.');
      }
    } catch (err) {
      console.error('Erreur handleSend :', err);
      setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
      Alert.alert('Erreur', 'Impossible d’envoyer le message.');
    }
  }

  // ---------------------------------------
  // 5) Charger + de messages (les plus anciens)
  // ---------------------------------------
  function loadPreviousMessages() {
    // On a du tri DESC (0 = plus récent, fin = plus ancien)
    // "Charger plus" = on veut afficher plus d’items en bas (donc plus anciens).
    if (visibleCount >= messages.length) return;
    setVisibleCount(Math.min(messages.length, visibleCount + 15));
  }

  // ---------------------------------------
  // 6) Éditer / Supprimer
  // ---------------------------------------
  function handleEditMessage(msg) {
    setEditingMessage(msg);
    setEditingContent(msg.content);
    setEditModalVisible(true);
  }

  async function confirmEditMessage() {
    if (!editingMessage) return;
    try {
      const editedMsg = {
        ...editingMessage,
        content: editingContent.trim(),
        edited: true,
      };
      // Mise à jour locale
      const updatedMsgs = messages.map((m) =>
        m.id === editingMessage.id ? editedMsg : m
      );
      setMessages(updatedMsgs);
      // Serveur
      const ok = await editPrivateMessage(
        conversation.id,
        editingMessage.id,
        editedMsg.content,
        currentUser.id
      );
      if (!ok) {
        Alert.alert('Erreur', 'Impossible d’éditer ce message.');
      }
    } catch (err) {
      console.error('Erreur confirmEditMessage :', err);
    } finally {
      setEditModalVisible(false);
      setEditingMessage(null);
      setEditingContent('');
    }
  }

  async function handleDeleteMessage(msg) {
    Alert.alert('Supprimer le message', 'Voulez-vous supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          const ok = await deletePrivateMessage(
            conversation.id,
            msg.id,
            currentUser.id
          );
          if (!ok) {
            Alert.alert('Erreur', 'Impossible de supprimer ce message.');
          }
        },
      },
    ]);
  }

  // ---------------------------------------
  // 7) Sous-ensemble visible
  // ---------------------------------------
  const visibleMessages = messages.slice(0, visibleCount);

  // ---------------------------------------
  // 8) Footer = bouton "Charger +"
  // ---------------------------------------
  function renderFooter() {
    if (visibleCount < messages.length) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadPreviousMessages}>
          <Text style={styles.loadMoreText}>Charger d'anciens messages</Text>
        </TouchableOpacity>
      );
    } else {
      return null;
    }
  }

  // ---------------------------------------
  // 9) Rendu de chaque message (bulle ou carte)
  // ---------------------------------------
  function renderItem({ item }) {
    const isMine = item.senderId === currentUser.id;
    // Couleur de fond
    const bubbleStyle = [
      styles.messageBubble,
      isMine ? styles.myMessageBubble : styles.otherMessageBubble,
    ];

    // Si c'est le message qu'on vient d'envoyer, on le surcolore 3 secondes
    if (item.id === highlightedMessageId) {
      bubbleStyle.push({ backgroundColor: '#99CCFF' });
    }

    return (
      <View style={bubbleStyle}>
        <Text style={styles.messageText}>{item.content}</Text>
        <View style={styles.bubbleFooter}>
          {item.edited && <Text style={styles.edited}>(modifié)</Text>}
          <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
        </View>
        {isMine && (
          <View style={styles.msgActionsContainer}>
            <TouchableOpacity onPress={() => handleEditMessage(item)} style={styles.iconButton}>
              <Icon name="edit" type="material" color="#444" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteMessage(item)} style={styles.iconButton}>
              <Icon name="delete" type="material" color="red" size={20} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ---------------------------------------
  // Rendu principal
  // ---------------------------------------
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={renderFooter} // le bouton pour charger plus
      />

      {/* Barre d'envoi */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Tapez votre message..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && { opacity: 0.7 }]}
          onPress={handleSend}
          disabled={isLoading}
        >
          <Icon name="send" type="material" color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Modal d'édition */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Éditer le message</Text>
            <TextInput
              style={styles.modalInput}
              value={editingContent}
              onChangeText={setEditingContent}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#999' }]}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingMessage(null);
                  setEditingContent('');
                }}
              >
                <Text style={{ color: '#fff' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#007BFF' }]}
                onPress={confirmEditMessage}
              >
                <Text style={{ color: '#fff' }}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------
// Styles
// ---------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  messagesList: {
    padding: 10,
    paddingBottom: 50, // pour éviter que le footer soit caché
  },
  // Bulles
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 5,
    borderRadius: 16,
  },
  myMessageBubble: {
    alignSelf: 'flex-start', // plus récent en haut => on veut ton message à gauche ?
    backgroundColor: '#d2e8ff',
    borderTopLeftRadius: 0,
  },
  otherMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#ffffff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderTopRightRadius: 0,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  edited: {
    fontSize: 11,
    color: '#666',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 10,
  },
  msgActionsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  iconButton: {
    marginLeft: 10,
  },
  // Bouton "Charger d'anciens messages"
  loadMoreBtn: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#eee',
    marginTop: 10,
  },
  loadMoreText: {
    color: '#007BFF',
    fontWeight: '600',
  },
  // Barre d'envoi
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginRight: 8,
    height: 40,
  },
  sendButton: {
    backgroundColor: '#007BFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  // Modal d'édition
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    minHeight: 50,
    padding: 10,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    marginLeft: 10,
  },
  // Loading
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
