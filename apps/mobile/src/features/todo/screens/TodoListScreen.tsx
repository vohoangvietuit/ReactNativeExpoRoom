import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { loadTodosThunk, createTodoThunk, updateTodoThunk, deleteTodoThunk } from '../store/todoSlice';

export default function TodoListScreen() {
  const dispatch = useAppDispatch();
  const { todos, isLoading } = useAppSelector((s) => s.todo);
  const activeSession = useAppSelector((s) => s.session.activeSession);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    dispatch(loadTodosThunk());
  }, [dispatch]);

  const handleCreate = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;
    const sessionId = activeSession?.id ?? 'test-session';
    dispatch(createTodoThunk({ title, sessionId })).then(() => {
      dispatch(loadTodosThunk());
    });
    setNewTitle('');
  }, [dispatch, newTitle, activeSession]);

  const handleToggle = useCallback(
    (todoId: string, completed: boolean) => {
      const sessionId = activeSession?.id ?? 'test-session';
      dispatch(updateTodoThunk({ todoId, completed: !completed, sessionId })).then(() => {
        dispatch(loadTodosThunk());
      });
    },
    [dispatch, activeSession]
  );

  const handleDelete = useCallback(
    (todoId: string) => {
      Alert.alert('Delete', 'Delete this todo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const sessionId = activeSession?.id ?? 'test-session';
            dispatch(deleteTodoThunk({ todoId, sessionId })).then(() => {
              dispatch(loadTodosThunk());
            });
          },
        },
      ]);
    },
    [dispatch, activeSession]
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof todos)[0] }) => (
      <View style={styles.todoItem}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleToggle(item.id, item.completed)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
        >
          <Text style={styles.checkboxText}>{item.completed ? '✓' : '○'}</Text>
        </TouchableOpacity>
        <Text style={[styles.todoTitle, item.completed && styles.completed]}>{item.title}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityLabel="Delete todo">
          <Text style={styles.deleteText}>×</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleToggle, handleDelete]
  );

  if (!activeSession) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Todos (Sync Test)</Text>
        <View style={styles.noSession}>
          <Text style={styles.noSessionText}>No active session.</Text>
          <Text style={styles.noSessionHint}>Go to the Session tab to start one.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Todos (Sync Test)</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="New todo..."
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
          accessibilityLabel="New todo title"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleCreate} accessibilityLabel="Add todo">
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={() => dispatch(loadTodosThunk())}
        ListEmptyComponent={<Text style={styles.empty}>No todos yet. Add one above!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 20,
  },
  todoTitle: {
    flex: 1,
    fontSize: 16,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteText: {
    fontSize: 24,
    color: '#ff3b30',
    paddingLeft: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
  },
  noSession: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noSessionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  noSessionHint: {
    fontSize: 14,
    color: '#888',
  },
});
