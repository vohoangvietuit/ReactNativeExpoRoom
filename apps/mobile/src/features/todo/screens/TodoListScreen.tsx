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
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

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
    padding: Spacing.three,
    backgroundColor: Colors.light.surface,
  },
  header: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.three,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    backgroundColor: Colors.light.card,
    fontSize: FontSize.base,
    marginRight: Spacing.two,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.two,
  },
  checkbox: {
    marginRight: Spacing.three,
  },
  checkboxText: {
    fontSize: FontSize.xl,
  },
  todoTitle: {
    flex: 1,
    fontSize: FontSize.base,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: Colors.light.textMuted,
  },
  deleteText: {
    fontSize: FontSize.xxl,
    color: Colors.light.danger,
    paddingLeft: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    color: Colors.light.textMuted,
    marginTop: Spacing.five,
  },
});
