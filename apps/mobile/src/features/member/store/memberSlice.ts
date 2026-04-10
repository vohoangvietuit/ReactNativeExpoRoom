import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as DataSync from '@xpw2/datasync';
import type { MemberRecord } from '@xpw2/datasync';

interface MemberState {
  members: MemberRecord[];
  selectedMember: MemberRecord | null;
  searchResults: MemberRecord[];
  isLoading: boolean;
  error: string | null;
  isRegisterLoading: boolean;
  registerError: string | null;
  isIdentifyLoading: boolean;
  identifyError: string | null;
}

const initialState: MemberState = {
  members: [],
  selectedMember: null,
  searchResults: [],
  isLoading: false,
  error: null,
  isRegisterLoading: false,
  registerError: null,
  isIdentifyLoading: false,
  identifyError: null,
};

export const registerMemberThunk = createAsyncThunk(
  'member/register',
  async ({
    name,
    email,
    phone,
    membershipNumber,
    nfcCardId,
    sessionId,
  }: {
    name: string;
    email?: string;
    phone?: string;
    membershipNumber?: string;
    nfcCardId?: string;
    sessionId: string;
  }) => {
    const memberId = `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    console.log('[MemberSlice] registerMemberThunk — payload:', {
      memberId,
      name,
      email,
      phone,
      membershipNumber,
      nfcCardId,
      sessionId,
    });
    const eventId = await DataSync.recordEvent(
      'MemberRegistered',
      { memberId, name, email, phone, membershipNumber, nfcCardId },
      sessionId
    );
    console.log('[MemberSlice] MemberRegistered event saved, eventId:', eventId);
    return { memberId, name, email, phone, membershipNumber, nfcCardId };
  }
);

export const loadMembersThunk = createAsyncThunk('member/loadAll', async () => {
  return DataSync.getAllMembers();
});

export const searchMembersThunk = createAsyncThunk(
  'member/search',
  async (query: string) => {
    return DataSync.searchMembers(query);
  }
);

export const identifyMemberByNfcThunk = createAsyncThunk(
  'member/identifyByNfc',
  async ({ nfcCardId, sessionId }: { nfcCardId: string; sessionId: string }) => {
    console.log('[MemberSlice] identifyMemberByNfcThunk — looking up nfcCardId:', nfcCardId);
    const member = await DataSync.getMemberByNfc(nfcCardId);
    console.log('[MemberSlice] getMemberByNfc result:', member ? `Found: ${member.name} (${member.id})` : 'Not found');
    if (member) {
      await DataSync.recordEvent(
        'MemberIdentified',
        { memberId: member.id, method: 'nfc', nfcCardId },
        sessionId
      );
      console.log('[MemberSlice] MemberIdentified event recorded for:', member.id);
    }
    return member;
  }
);

export const selectMemberThunk = createAsyncThunk(
  'member/select',
  async ({ memberId, sessionId }: { memberId: string; sessionId: string }) => {
    const member = await DataSync.getMember(memberId);
    if (member) {
      await DataSync.recordEvent(
        'MemberIdentified',
        { memberId: member.id, method: 'search' },
        sessionId
      );
    }
    return member;
  }
);

const memberSlice = createSlice({
  name: 'member',
  initialState,
  reducers: {
    clearSelectedMember(state) {
      state.selectedMember = null;
      state.identifyError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerMemberThunk.pending, (state) => {
        state.isRegisterLoading = true;
        state.registerError = null;
      })
      .addCase(registerMemberThunk.fulfilled, (state) => {
        state.isRegisterLoading = false;
      })
      .addCase(registerMemberThunk.rejected, (state, action) => {
        state.isRegisterLoading = false;
        state.registerError = action.error.message ?? 'Failed to register member';
      })
      .addCase(loadMembersThunk.fulfilled, (state, action) => {
        state.members = action.payload;
      })
      .addCase(searchMembersThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchMembersThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(identifyMemberByNfcThunk.pending, (state) => {
        state.isIdentifyLoading = true;
        state.identifyError = null;
        state.selectedMember = null;
      })
      .addCase(identifyMemberByNfcThunk.fulfilled, (state, action) => {
        state.isIdentifyLoading = false;
        state.selectedMember = action.payload;
      })
      .addCase(identifyMemberByNfcThunk.rejected, (state, action) => {
        state.isIdentifyLoading = false;
        state.identifyError = action.error.message ?? 'Failed to identify member';
      })
      .addCase(selectMemberThunk.fulfilled, (state, action) => {
        state.selectedMember = action.payload;
      });
  },
});

export const { clearSelectedMember } = memberSlice.actions;
export default memberSlice.reducer;
