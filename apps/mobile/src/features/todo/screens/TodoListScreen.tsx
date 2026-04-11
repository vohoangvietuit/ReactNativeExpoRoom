import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import {
  loadTodosThunk,
  createTodoThunk,
  updateTodoThunk,
  deleteTodoThunk,
} from '../store/todoSlice';
import * as DataSync from '@fitsync/datasync';

export default function TodoListScreen() {
  const dispatch = useAppDispatch();
  const { todos, isLoading } = useAppSelector((s) => s.todo);
  // const activeSession = useAppSelector((s) => s.session.activeSession); // SESSION DISABLED
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    dispatch(loadTodosThunk());

    // Auto-reload todos when sync completes
    const syncSub = DataSync.addSyncStatusChangedListener(() => {
      // Reload todos when the other phone sends us updates
      dispatch(loadTodosThunk());
    });

    return () => {
      syncSub.remove();
    };
  }, [dispatch]);

  const handleCreate = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;
    const sessionId = 'no-session'; // SESSION DISABLED — replace with activeSession?.id when re-enabled
    dispatch(createTodoThunk({ title, sessionId })).then(() => {
      dispatch(loadTodosThunk());
    });
    setNewTitle('');
  }, [dispatch, newTitle]);

  const handleToggle = useCallback(
    (todoId: string, completed: boolean) => {
      const sessionId = 'no-session'; // SESSION DISABLED
      dispatch(updateTodoThunk({ todoId, completed: !completed, sessionId })).then(() => {
        dispatch(loadTodosThunk());
      });
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (todoId: string) => {
      Alert.alert('Delete', 'Delete this todo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const sessionId = 'no-session'; // SESSION DISABLED
            dispatch(deleteTodoThunk({ todoId, sessionId })).then(() => {
              dispatch(loadTodosThunk());
            });
          },
        },
      ]);
    },
    [dispatch],
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
    [handleToggle, handleDelete],
  );

  // DEV TESTING: Session guard removed — uses 'test-session' fallback when no active session.
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreate}
          accessibilityLabel="Add todo"
        >
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
});
