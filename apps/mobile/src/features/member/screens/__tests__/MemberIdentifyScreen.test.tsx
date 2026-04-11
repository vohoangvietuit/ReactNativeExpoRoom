import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import type { MemberRecord, SessionRecord } from '@fitsync/datasync';
import { useNfcReader } from '@fitsync/nfc';
import MemberIdentifyScreen from '../MemberIdentifyScreen';
import memberReducer from '../../store/memberSlice';
import sessionReducer from '../../../session/store/sessionSlice';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockSession: SessionRecord = {
  id: 'session-001',
  groupId: 'group-alpha',
  consultantId: 'consultant-001',
  status: 'active',
  startedAt: 1700000000000,
  endedAt: null,
  memberCount: 0,
  eventCount: 0,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStore(overrides: Record<string, unknown> = {}) {
  return configureStore({
    reducer: {
      member: memberReducer,
      session: sessionReducer,
    },
    preloadedState: overrides as never,
  });
}

function renderWithStore(overrides: Record<string, unknown> = {}) {
  const store = makeStore(overrides);
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemberIdentifyScreen />
      </Provider>,
    ),
  };
}

const withActiveSession = {
  session: {
    activeSession: mockSession,
    sessions: [],
    isLoading: false,
    error: null,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MemberIdentifyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default NFC mock
    (useNfcReader as jest.Mock).mockReturnValue({
      status: { isSupported: true, isEnabled: true },
      isScanning: false,
      lastResult: null,
      scanForMemberCard: jest.fn().mockResolvedValue({ success: false, error: 'No tag' }),
      scanTagId: jest.fn().mockResolvedValue({ success: false, error: 'No tag' }),
      readTagId: jest.fn().mockResolvedValue(null),
      cancel: jest.fn(),
    });
  });

  // ── No active session (SESSION DISABLED — screen always renders) ─────────────

  describe('no active session', () => {
    it('should render scan button even without an active session', () => {
      renderWithStore();
      expect(screen.getByLabelText('Scan NFC card')).toBeTruthy();
    });
  });

  // ── Active session ───────────────────────────────────────────────────────

  describe('active session', () => {
    it('should render scan NFC card button', () => {
      renderWithStore(withActiveSession);
      expect(screen.getByLabelText('Scan NFC card')).toBeTruthy();
    });

    it('should show NFC status as Ready when supported and enabled', () => {
      renderWithStore(withActiveSession);
      expect(screen.getByText(/NFC:.*Ready/)).toBeTruthy();
    });

    it('should show NFC status as Not Supported', () => {
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: false, isEnabled: false },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        scanTagId: jest.fn(),
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });

      renderWithStore(withActiveSession);
      expect(screen.getByText(/Not Supported/)).toBeTruthy();
    });

    it('should show NFC status as Disabled', () => {
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: false },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        scanTagId: jest.fn(),
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });

      renderWithStore(withActiveSession);
      expect(screen.getByText(/Disabled/)).toBeTruthy();
    });
  });

  // ── NFC scanning ─────────────────────────────────────────────────────────

  describe('NFC scanning', () => {
    it('should call scanTagId on button press', () => {
      const mockScan = jest.fn().mockResolvedValue({ success: false, error: 'No tag' });
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanTagId: mockScan,
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });

      renderWithStore(withActiveSession);
      fireEvent.press(screen.getByLabelText('Scan NFC card'));

      expect(mockScan).toHaveBeenCalled();
    });

    it('should show cancel while scanning', () => {
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: true,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        scanTagId: jest.fn(),
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });

      renderWithStore(withActiveSession);
      expect(screen.getByLabelText('Cancel NFC scan')).toBeTruthy();
      expect(screen.getByText(/Scanning.*Cancel/)).toBeTruthy();
    });

    it('should dispatch identifyMemberByNfcThunk on successful scan with tagId', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        success: true,
        tagId: 'NFC-ABC123',
      });
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanTagId: mockScan,
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-identify');

      renderWithStore(withActiveSession);
      fireEvent.press(screen.getByLabelText('Scan NFC card'));

      await waitFor(() => {
        expect(DataSync.getMemberByNfc).toHaveBeenCalledWith('NFC-ABC123');
      });
    });

    it('should prefer tagId over card.memberId for lookup', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        success: true,
        tagId: 'PHYSICAL-UID',
      });
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanTagId: mockScan,
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(null);

      renderWithStore(withActiveSession);
      fireEvent.press(screen.getByLabelText('Scan NFC card'));

      await waitFor(() => {
        expect(DataSync.getMemberByNfc).toHaveBeenCalledWith('PHYSICAL-UID');
      });
    });
  });

  // ── Member display ────────────────────────────────────────────────────

  describe('member display', () => {
    it('should show member details when identified', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        success: true,
        tagId: 'NFC-ABC123',
      });
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanTagId: mockScan,
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-id');

      renderWithStore(withActiveSession);
      fireEvent.press(screen.getByLabelText('Scan NFC card'));

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeTruthy();
      });

      expect(screen.getByText(/jane@example.com/)).toBeTruthy();
      expect(screen.getByText(/72.5 kg/)).toBeTruthy();
      expect(screen.getByText(/XPW-00123/)).toBeTruthy();
      expect(screen.getByText(/NFC-ABC123/)).toBeTruthy();
    });

    it('should clear member when clear button pressed', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        success: true,
        tagId: 'NFC-ABC123',
      });
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanTagId: mockScan,
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(mockMember);
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-id');

      renderWithStore(withActiveSession);
      fireEvent.press(screen.getByLabelText('Scan NFC card'));

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Clear member'));

      await waitFor(() => {
        expect(screen.queryByText('Jane Smith')).toBeNull();
      });
    });
  });

  // ── Not found state ──────────────────────────────────────────────────────

  describe('not found state', () => {
    it('should show not-found card when scan succeeds but member is null', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        success: true,
        tagId: 'UNKNOWN-TAG',
      });
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanTagId: mockScan,
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });
      (DataSync.getMemberByNfc as jest.Mock).mockResolvedValue(null);

      renderWithStore(withActiveSession);
      fireEvent.press(screen.getByLabelText('Scan NFC card'));

      await waitFor(() => {
        expect(screen.getByText(/No matching member found/)).toBeTruthy();
      });
      expect(screen.getByText(/UNKNOWN-TAG/)).toBeTruthy();
    });
  });
});
