import { configureStore } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { MemberRecord } from '@fitsync/datasync';
import memberReducer, {
  registerMemberThunk,
  loadMembersThunk,
  searchMembersThunk,
  identifyMemberByNfcThunk,
  selectMemberThunk,
  clearSelectedMember,
} from '../memberSlice';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockMember: MemberRecord = {
  id: 'member-001',
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1234567890',
  nfcCardId: 'NFC-ABC123',
  membershipNumber: 'XPW-00123',
  currentWeight: 72.5,
  targetWeight: 68.0,
  height: 165,
  bmi: 26.6,
  notes: null,
  joinedAt: 1700000000000,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockMember2: MemberRecord = {
  id: 'member-002',
  name: 'John Doe',
  email: 'john@example.com',
  phone: null,
  nfcCardId: null,
  membershipNumber: 'XPW-00456',
  currentWeight: null,
  targetWeight: null,
  height: null,
  bmi: null,
  notes: null,
  joinedAt: 1700100000000,
  createdAt: 1700100000000,
  updatedAt: 1700100000000,
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({
    reducer: { member: memberReducer },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('memberSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have empty members, null selectedMember, not loading, no errors', () => {
      const store = makeStore();
      const state = store.getState().member;

      expect(state.members).toEqual([]);
      expect(state.selectedMember).toBeNull();
      expect(state.searchResults).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isRegisterLoading).toBe(false);
      expect(state.registerError).toBeNull();
    });
  });

  // ── clearSelectedMember ──────────────────────────────────────────────────

  describe('clearSelectedMember', () => {
    it('should set selectedMember to null', () => {
      const store = makeStore();
      // Manually set a member first via fulfilled action
      store.dispatch(clearSelectedMember());
      expect(store.getState().member.selectedMember).toBeNull();
    });
  });

  // ── registerMemberThunk ──────────────────────────────────────────────────

  describe('registerMemberThunk', () => {
    it('should set isRegisterLoading true while pending', () => {
      (DataSync.recordEvent as jest.Mock).mockReturnValue(new Promise(() => {}));
      const store = makeStore();

      store.dispatch(
        registerMemberThunk({ name: 'Jane', sessionId: 'session-001' })
      );

      expect(store.getState().member.isRegisterLoading).toBe(true);
      expect(store.getState().member.registerError).toBeNull();
    });

    it('should set isRegisterLoading false on fulfilled', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-register-001');
      const store = makeStore();

      await store.dispatch(
        registerMemberThunk({ name: 'Jane', sessionId: 'session-001' })
      );

      expect(store.getState().member.isRegisterLoading).toBe(false);
    });

    it('should call DataSync.recordEvent with MemberRegistered and correct payload', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-register-002');
      const store = makeStore();

      await store.dispatch(
        registerMemberThunk({
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567890',
          membershipNumber: 'XPW-00123',
          nfcCardId: 'NFC-ABC123',
          sessionId: 'session-001',
        })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'MemberRegistered',
        expect.objectContaining({
          memberId: expect.stringContaining('member_'),
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567890',
          membershipNumber: 'XPW-00123',
          nfcCardId: 'NFC-ABC123',
        }),
        'session-001'
      );
    });

    it('should return payload with generated memberId', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-register-003');
      const store = makeStore();

      const result = await store.dispatch(
        registerMemberThunk({ name: 'Jane', sessionId: 'session-001' })
      );

      expect(result.payload).toMatchObject({
        memberId: expect.stringContaining('member_'),
        name: 'Jane',
      });
    });

    it('should pass undefined for optional fields when not provided', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-register-004');
      const store = makeStore();

      await store.dispatch(
        registerMemberThunk({ name: 'Jane', sessionId: 'session-001' })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'MemberRegistered',
        expect.objectContaining({
          name: 'Jane',
          email: undefined,
          phone: undefined,
          membershipNumber: undefined,
          nfcCardId: undefined,
        }),
        'session-001'
      );
    });

    it('should set registerError on rejection', async () => {
      (DataSync.recordEvent as jest.Mock).mockRejectedValue(
        new Error('DB write failed')
      );
      const store = makeStore();

      await store.dispatch(
        registerMemberThunk({ name: 'Jane', sessionId: 'session-001' })
      );

      expect(store.getState().member.isRegisterLoading).toBe(false);
      expect(store.getState().member.registerError).toBe('DB write failed');
    });
  });

  // ── loadMembersThunk ─────────────────────────────────────────────────────

  describe('loadMembersThunk', () => {
    it('should populate members array on fulfilled', async () => {
      (DataSync.getAllMembers as jest.Mock).mockResolvedValue([mockMember, mockMember2]);
      const store = makeStore();

      await store.dispatch(loadMembersThunk());

      expect(store.getState().member.members).toEqual([mockMember, mockMember2]);
    });

    it('should set empty array when no members exist', async () => {
      (DataSync.getAllMembers as jest.Mock).mockResolvedValue([]);
      const store = makeStore();

      await store.dispatch(loadMembersThunk());

      expect(store.getState().member.members).toEqual([]);
    });
  });

  // ── searchMembersThunk ───────────────────────────────────────────────────

  describe('searchMembersThunk', () => {
    it('should set isLoading true while pending', () => {
      (DataSync.searchMembers as jest.Mock).mockReturnValue(new Promise(() => {}));
      const store = makeStore();

      store.dispatch(searchMembersThunk('jane'));

      expect(store.getState().member.isLoading).toBe(true);
    });

    it('should populate searchResults on fulfilled', async () => {
      (DataSync.searchMembers as jest.Mock).mockResolvedValue([mockMember]);
      const store = makeStore();

      await store.dispatch(searchMembersThunk('jane'));

      expect(store.getState().member.isLoading).toBe(false);
      expect(store.getState().member.searchResults).toEqual([mockMember]);
    });

    it('should call DataSync.searchMembers with query string', async () => {
      (DataSync.searchMembers as jest.Mock).mockResolvedValue([]);
      const store = makeStore();

      await store.dispatch(searchMembersThunk('john'));

      expect(DataSync.searchMembers).toHaveBeenCalledWith('john');
    });
  });

  // ── identifyMemberByNfcThunk ─────────────────────────────────────────────

  describe('identifyMemberByNfcThunk', () => {
    it('should call getMemberByNfc with the nfcCardId', async () => {
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-id-001');
      const store = makeStore();

      await store.dispatch(
        identifyMemberByNfcThunk({ nfcCardId: 'NFC-ABC123', sessionId: 'session-001' })
      );

      expect(DataSync.getMemberByNfc).toHaveBeenCalledWith('NFC-ABC123');
    });

    it('should set selectedMember when member found', async () => {
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-id-002');
      const store = makeStore();

      await store.dispatch(
        identifyMemberByNfcThunk({ nfcCardId: 'NFC-ABC123', sessionId: 'session-001' })
      );

      expect(store.getState().member.selectedMember).toEqual(mockMember);
    });

    it('should record MemberIdentified event when member found', async () => {
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-id-003');
      const store = makeStore();

      await store.dispatch(
        identifyMemberByNfcThunk({ nfcCardId: 'NFC-ABC123', sessionId: 'session-001' })
      );

      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'MemberIdentified',
        { memberId: 'member-001', method: 'nfc', nfcCardId: 'NFC-ABC123' },
        'session-001'
      );
    });

    it('should set selectedMember to null when member not found', async () => {
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(null);
      const store = makeStore();

      await store.dispatch(
        identifyMemberByNfcThunk({ nfcCardId: 'UNKNOWN-NFC', sessionId: 'session-001' })
      );

      expect(store.getState().member.selectedMember).toBeNull();
      expect(DataSync.recordEvent).not.toHaveBeenCalled();
    });
  });

  // ── selectMemberThunk ────────────────────────────────────────────────────

  describe('selectMemberThunk', () => {
    it('should call getMember and record MemberIdentified event', async () => {
      (DataSync.getMember as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-sel-001');
      const store = makeStore();

      await store.dispatch(
        selectMemberThunk({ memberId: 'member-001', sessionId: 'session-001' })
      );

      expect(DataSync.getMember).toHaveBeenCalledWith('member-001');
      expect(DataSync.recordEvent).toHaveBeenCalledWith(
        'MemberIdentified',
        { memberId: 'member-001', method: 'search' },
        'session-001'
      );
      expect(store.getState().member.selectedMember).toEqual(mockMember);
    });

    it('should not record event when member not found', async () => {
      (DataSync.getMember as jest.Mock).mockResolvedValue(null);
      const store = makeStore();

      await store.dispatch(
        selectMemberThunk({ memberId: 'nonexistent', sessionId: 'session-001' })
      );

      expect(DataSync.recordEvent).not.toHaveBeenCalled();
      expect(store.getState().member.selectedMember).toBeNull();
    });
  });
});
