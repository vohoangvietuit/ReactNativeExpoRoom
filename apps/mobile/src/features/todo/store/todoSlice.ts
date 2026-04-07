import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as DataSync from '@xpw2/datasync';
import type { TodoRecord } from '@xpw2/datasync';

interface TodoState {
  todos: TodoRecord[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TodoState = {
  todos: [],
  isLoading: false,
  error: null,
};

export const loadTodosThunk = createAsyncThunk('todo/loadAll', async () => {
  return DataSync.getAllTodos();
});

export const createTodoThunk = createAsyncThunk(
  'todo/create',
  async ({ title, description, sessionId }: { title: string; description?: string; sessionId: string }) => {
    const todoId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
    await DataSync.recordEvent('TodoCreated', { todoId, title, description }, sessionId);
    return { todoId, title, description };
  }
);

export const updateTodoThunk = createAsyncThunk(
  'todo/update',
  async ({
    todoId,
    title,
    description,
    completed,
    sessionId,
  }: {
    todoId: string;
    title?: string;
    description?: string;
    completed?: boolean;
    sessionId: string;
  }) => {
    await DataSync.recordEvent('TodoUpdated', { todoId, title, description, completed }, sessionId);
    return { todoId, title, description, completed };
  }
);

export const deleteTodoThunk = createAsyncThunk(
  'todo/delete',
  async ({ todoId, sessionId }: { todoId: string; sessionId: string }) => {
    await DataSync.recordEvent('TodoDeleted', { todoId }, sessionId);
    return todoId;
  }
);

const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTodosThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadTodosThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todos = action.payload;
      })
      .addCase(loadTodosThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to load todos';
      })
      .addCase(createTodoThunk.fulfilled, (state) => {
        // Reload from DB on next render
      })
      .addCase(deleteTodoThunk.fulfilled, (state, action) => {
        state.todos = state.todos.filter((t) => t.id !== action.payload);
      });
  },
});

export default todoSlice.reducer;
