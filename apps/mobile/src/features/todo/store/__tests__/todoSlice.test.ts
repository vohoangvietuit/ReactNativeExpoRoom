import { configureStore } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { TodoRecord } from '@fitsync/datasync';
import todoReducer, {
  loadTodosThunk,
  createTodoThunk,
  deleteTodoThunk,
  updateTodoThunk,
} from '../todoSlice';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockTodo: TodoRecord = {
  id: 'todo-001',
  title: 'Buy groceries',
  description: 'Milk, eggs, bread',
  completed: false,
  deviceId: 'device-001',
  sessionId: 'session-001',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockTodo2: TodoRecord = {
  id: 'todo-002',
  title: 'Call doctor',
  description: null,
  completed: true,
  deviceId: 'device-001',
  sessionId: 'session-001',
  createdAt: 1700000001000,
  updatedAt: 1700000001000,
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore(preloadedTodos: TodoRecord[] = []) {
  return configureStore({
    reducer: { todo: todoReducer },
    preloadedState: {
      todo: { todos: preloadedTodos, isLoading: false, error: null },
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('todoSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have empty todos, not loading, no error', () => {
      const store = makeStore();
      const state = store.getState().todo;

      expect(state.todos).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── loadTodosThunk ────────────────────────────────────────────────────────

  describe('loadTodosThunk', () => {
    it('should set isLoading to true while pending', async () => {
      (DataSync.getAllTodos as jest.Mock).mockReturnValue(new Promise(() => {}));
      const store = makeStore();

      store.dispatch(loadTodosThunk());

      expect(store.getState().todo.isLoading).toBe(true);
    });

    it('should populate todos on fulfilled', async () => {
      (DataSync.getAllTodos as jest.Mock).mockResolvedValue([mockTodo, mockTodo2]);
      const store = makeStore();

      await store.dispatch(loadTodosThunk());

      const state = store.getState().todo;
      expect(state.isLoading).toBe(false);
      expect(state.todos).toHaveLength(2);
      expect(state.todos[0].id).toBe('todo-001');
      expect(state.todos[1].id).toBe('todo-002');
    });

    it('should set error on rejected', async () => {
      (DataSync.getAllTodos as jest.Mock).mockRejectedValue(new Error('DB read failed'));
      const store = makeStore();

      await store.dispatch(loadTodosThunk());

      const state = store.getState().todo;
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('DB read failed');
      expect(state.todos).toEqual([]);
    });

    it('should set fallback error message when no message provided', async () => {
      (DataSync.getAllTodos as jest.Mock).mockRejectedValue({});
      const store = makeStore();

      await store.dispatch(loadTodosThunk());

      expect(store.getState().todo.error).toBe('Failed to load todos');
    });
  });

  // ── createTodoThunk ──────────────────────────────────────────────────────

  describe('createTodoThunk', () => {
    it('should call DataSync.recordEvent with TodoCreated and correct payload', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-123');
      const store = makeStore();

      await store.dispatch(
        createTodoThunk({
          title: 'Walk the dog',
          description: 'Around the block',
          sessionId: 'session-001',
        })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'TodoCreated',
        expect.objectContaining({
          title: 'Walk the dog',
          description: 'Around the block',
        }),
        'session-001'
      );
    });

    it('should include a generated todoId in the recordEvent payload', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-456');
      const store = makeStore();

      await store.dispatch(
        createTodoThunk({ title: 'Stretch', sessionId: 'session-001' })
      );

      const call = (DataSync.recordEvent as jest.Mock).mock.calls[0];
      expect(call[1]).toHaveProperty('todoId');
      expect(typeof call[1].todoId).toBe('string');
    });

    it('should call recordEvent without description when omitted', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-789');
      const store = makeStore();

      await store.dispatch(
        createTodoThunk({ title: 'Meditate', sessionId: 'session-002' })
      );

      const payload = (DataSync.recordEvent as jest.Mock).mock.calls[0][1];
      expect(payload.description).toBeUndefined();
    });
  });

  // ── deleteTodoThunk ──────────────────────────────────────────────────────

  describe('deleteTodoThunk', () => {
    it('should remove the todo from state on fulfilled', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-del');
      const store = makeStore([mockTodo, mockTodo2]);

      await store.dispatch(
        deleteTodoThunk({ todoId: 'todo-001', sessionId: 'session-001' })
      );

      const state = store.getState().todo;
      expect(state.todos).toHaveLength(1);
      expect(state.todos[0].id).toBe('todo-002');
    });

    it('should call DataSync.recordEvent with TodoDeleted', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-del2');
      const store = makeStore([mockTodo]);

      await store.dispatch(
        deleteTodoThunk({ todoId: 'todo-001', sessionId: 'session-001' })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'TodoDeleted',
        { todoId: 'todo-001' },
        'session-001'
      );
    });

    it('should not remove any todo when id does not match', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-noop');
      const store = makeStore([mockTodo, mockTodo2]);

      await store.dispatch(
        deleteTodoThunk({ todoId: 'todo-999', sessionId: 'session-001' })
      );

      expect(store.getState().todo.todos).toHaveLength(2);
    });
  });

  // ── updateTodoThunk ──────────────────────────────────────────────────────

  describe('updateTodoThunk', () => {
    it('should call DataSync.recordEvent with TodoUpdated', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-upd');
      const store = makeStore([mockTodo]);

      await store.dispatch(
        updateTodoThunk({
          todoId: 'todo-001',
          completed: true,
          sessionId: 'session-001',
        })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'TodoUpdated',
        expect.objectContaining({ todoId: 'todo-001', completed: true }),
        'session-001'
      );
    });
  });
});
