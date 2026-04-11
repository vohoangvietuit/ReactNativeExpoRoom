import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { SyncStatus } from '@fitsync/datasync';

interface SyncState {
  status: SyncStatus | null;
  isLoading: boolean;
}

const initialState: SyncState = {
  status: null,
  isLoading: false,
};

export const loadSyncStatusThunk = createAsyncThunk('sync/loadStatus', async () => {
  return DataSync.getSyncStatus();
});

export const triggerSyncThunk = createAsyncThunk('sync/trigger', async () => {
  await DataSync.triggerSync();
  return DataSync.getSyncStatus();
});

export const schedulePeriodicSyncThunk = createAsyncThunk('sync/schedule', async () => {
  await DataSync.schedulePeriodicSync();
});

export const startOutboxThunk = createAsyncThunk('sync/startOutbox', async () => {
  await DataSync.startOutboxProcessing();
});

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSyncStatusThunk.fulfilled, (state, action) => {
        state.status = action.payload;
      })
      .addCase(triggerSyncThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(triggerSyncThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = action.payload;
      })
      .addCase(triggerSyncThunk.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export default syncSlice.reducer;
