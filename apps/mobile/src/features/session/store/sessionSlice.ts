import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { SessionRecord } from '@fitsync/datasync';

interface SessionState {
  activeSession: SessionRecord | null;
  sessions: SessionRecord[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SessionState = {
  activeSession: null,
  sessions: [],
  isLoading: false,
  error: null,
};

export const startSessionThunk = createAsyncThunk(
  'session/start',
  async ({ groupId, consultantId }: { groupId: string; consultantId: string }) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const eventId = await DataSync.recordEvent(
      'SessionStarted',
      { groupId, consultantId, startedAt: new Date().toISOString() },
      sessionId
    );
    return eventId;
  }
);

export const loadActiveSessionThunk = createAsyncThunk('session/loadActive', async () => {
  return DataSync.getActiveSession();
});

export const loadAllSessionsThunk = createAsyncThunk('session/loadAll', async () => {
  return DataSync.getAllSessions();
});

export const endSessionThunk = createAsyncThunk(
  'session/end',
  async (sessionId: string) => {
    await DataSync.recordEvent(
      'SessionEnded',
      {
        endedAt: new Date().toISOString(),
        memberCount: 0,
        eventCount: 0,
      },
      sessionId
    );
    return sessionId;
  }
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadActiveSessionThunk.fulfilled, (state, action) => {
        state.activeSession = action.payload;
      })
      .addCase(loadAllSessionsThunk.fulfilled, (state, action) => {
        state.sessions = action.payload;
      })
      .addCase(startSessionThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(startSessionThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(startSessionThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to start session';
      });
  },
});

export default sessionSlice.reducer;
