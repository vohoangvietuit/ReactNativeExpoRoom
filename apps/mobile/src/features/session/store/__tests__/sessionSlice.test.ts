import { configureStore } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { SessionRecord } from '@fitsync/datasync';
import sessionReducer, {
  startSessionThunk,
  loadActiveSessionThunk,
  loadAllSessionsThunk,
  endSessionThunk,
} from '../sessionSlice';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockSession: SessionRecord = {
  id: 'session-001',
  groupId: 'group-alpha',
  consultantId: 'consultant-001',
  status: 'active',
  startedAt: 1700000000000,
  endedAt: null,
  memberCount: 5,
  eventCount: 12,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockSession2: SessionRecord = {
  id: 'session-002',
  groupId: 'group-beta',
  consultantId: 'consultant-001',
  status: 'completed',
  startedAt: 1699990000000,
  endedAt: 1699999000000,
  memberCount: 3,
  eventCount: 7,
  createdAt: 1699990000000,
  updatedAt: 1699999000000,
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({
    reducer: { session: sessionReducer },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('sessionSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have null activeSession, empty sessions, not loading, no error', () => {
      const store = makeStore();
      const state = store.getState().session;

      expect(state.activeSession).toBeNull();
      expect(state.sessions).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── startSessionThunk ────────────────────────────────────────────────────

  describe('startSessionThunk', () => {
    it('should set isLoading true while pending', () => {
      (DataSync.recordEvent as jest.Mock).mockReturnValue(new Promise(() => {}));
      const store = makeStore();

      store.dispatch(startSessionThunk({ groupId: 'group-alpha', consultantId: 'c-001' }));

      expect(store.getState().session.isLoading).toBe(true);
    });

    it('should set isLoading false on fulfilled', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-session-start');
      const store = makeStore();

      await store.dispatch(
        startSessionThunk({ groupId: 'group-alpha', consultantId: 'c-001' })
      );

      expect(store.getState().session.isLoading).toBe(false);
    });

    it('should call DataSync.recordEvent with SessionStarted', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-001');
      const store = makeStore();

      await store.dispatch(
        startSessionThunk({ groupId: 'group-alpha', consultantId: 'c-001' })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'SessionStarted',
        expect.objectContaining({
          groupId: 'group-alpha',
          consultantId: 'c-001',
          startedAt: expect.any(String),
        }),
        expect.any(String)
      );
    });

    it('should set error on rejected', async () => {
      (DataSync.recordEvent as jest.Mock).mockRejectedValue(new Error('Native module error'));
      const store = makeStore();

      await store.dispatch(
        startSessionThunk({ groupId: 'group-alpha', consultantId: 'c-001' })
      );

      const state = store.getState().session;
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Native module error');
    });

    it('should use fallback error message when none is provided', async () => {
      (DataSync.recordEvent as jest.Mock).mockRejectedValue({});
      const store = makeStore();

      await store.dispatch(
        startSessionThunk({ groupId: 'group-alpha', consultantId: 'c-001' })
      );

      expect(store.getState().session.error).toBe('Failed to start session');
    });
  });

  // ── loadActiveSessionThunk ────────────────────────────────────────────────

  describe('loadActiveSessionThunk', () => {
    it('should set activeSession when one exists', async () => {
      (DataSync.getActiveSession as jest.Mock).mockResolvedValue(mockSession);
      const store = makeStore();

      await store.dispatch(loadActiveSessionThunk());

      expect(store.getState().session.activeSession).toEqual(mockSession);
    });

    it('should set activeSession to null when none exists', async () => {
      (DataSync.getActiveSession as jest.Mock).mockResolvedValue(null);
      const store = makeStore();

      await store.dispatch(loadActiveSessionThunk());

      expect(store.getState().session.activeSession).toBeNull();
    });

    it('should call DataSync.getActiveSession once', async () => {
      (DataSync.getActiveSession as jest.Mock).mockResolvedValue(null);
      const store = makeStore();

      await store.dispatch(loadActiveSessionThunk());

      expect(DataSync.getActiveSession).toHaveBeenCalledTimes(1);
    });
  });

  // ── loadAllSessionsThunk ──────────────────────────────────────────────────

  describe('loadAllSessionsThunk', () => {
    it('should populate sessions array on fulfilled', async () => {
      (DataSync.getAllSessions as jest.Mock).mockResolvedValue([mockSession, mockSession2]);
      const store = makeStore();

      await store.dispatch(loadAllSessionsThunk());

      const state = store.getState().session;
      expect(state.sessions).toHaveLength(2);
      expect(state.sessions[0].id).toBe('session-001');
      expect(state.sessions[1].id).toBe('session-002');
    });

    it('should set sessions to empty array when none exist', async () => {
      (DataSync.getAllSessions as jest.Mock).mockResolvedValue([]);
      const store = makeStore();

      await store.dispatch(loadAllSessionsThunk());

      expect(store.getState().session.sessions).toEqual([]);
    });
  });

  // ── endSessionThunk ───────────────────────────────────────────────────────

  describe('endSessionThunk', () => {
    it('should call DataSync.recordEvent with SessionEnded', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('event-end');
      const store = makeStore();

      await store.dispatch(endSessionThunk('session-001'));

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'SessionEnded',
        expect.objectContaining({
          endedAt: expect.any(String),
          memberCount: expect.any(Number),
          eventCount: expect.any(Number),
        }),
        'session-001'
      );
    });
  });
});
