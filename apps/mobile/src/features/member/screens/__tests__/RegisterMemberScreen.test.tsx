import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as DataSync from '@fitsync/datasync';
import { useNfcReader } from '@fitsync/nfc';
import RegisterMemberScreen from '../RegisterMemberScreen';
import memberReducer from '../../store/memberSlice';
import sessionReducer from '../../../session/store/sessionSlice';

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
        <RegisterMemberScreen />
      </Provider>,
    ),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterMemberScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('should render form fields — name, email, phone, membership number', () => {
      renderWithStore();

      expect(screen.getByPlaceholderText('Full name')).toBeTruthy();
      expect(screen.getByPlaceholderText('email@example.com')).toBeTruthy();
      expect(screen.getByPlaceholderText('+1 234 567 8900')).toBeTruthy();
      expect(screen.getByPlaceholderText('XPW-00123')).toBeTruthy();
    });

    it('should render Register Member button', () => {
      renderWithStore();
      expect(screen.getByLabelText('Register member')).toBeTruthy();
    });

    it('should render NFC scan button', () => {
      renderWithStore();
      expect(screen.getByLabelText('Scan NFC card to link')).toBeTruthy();
    });

    // SESSION DISABLED — warning banner is hidden
    it('should not show no-session warning (session disabled)', () => {
      renderWithStore();
      expect(screen.queryByText(/No active session/)).toBeNull();
    });

    it('should not show warning when active session exists', () => {
      renderWithStore({
        session: {
          activeSession: {
            id: 'session-001',
            groupId: 'g1',
            consultantId: 'c1',
            status: 'active',
            startedAt: 1700000000000,
            endedAt: null,
            memberCount: 0,
            eventCount: 0,
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
          sessions: [],
          isLoading: false,
          error: null,
        },
      });
      expect(screen.queryByText(/No active session/)).toBeNull();
    });
  });

  // ── Registration flow ────────────────────────────────────────────────────

  describe('registration flow', () => {
    it('should show alert when name is empty (validation)', () => {
      renderWithStore();
      const registerBtn = screen.getByLabelText('Register member');
      fireEvent.press(registerBtn);
      // recordEvent should NOT have been called
      expect(DataSync.recordEvent).not.toHaveBeenCalled();
    });

    it('should call DataSync.recordEvent with MemberRegistered on valid submit', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-reg-001');
      renderWithStore();

      fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'Jane Smith');
      fireEvent.changeText(screen.getByPlaceholderText('email@example.com'), 'jane@test.com');
      fireEvent.press(screen.getByLabelText('Register member'));

      await waitFor(() => {
        expect(DataSync.recordEvent).toHaveBeenCalledWith(
          'MemberRegistered',
          expect.objectContaining({
            name: 'Jane Smith',
            email: 'jane@test.com',
          }),
          'no-session',
        );
      });
    });

    it('should show success screen after registration', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-reg-002');
      renderWithStore();

      fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'Jane Smith');
      fireEvent.press(screen.getByLabelText('Register member'));

      await waitFor(() => {
        expect(screen.getByText('Member Registered!')).toBeTruthy();
      });
    });

    // SESSION DISABLED — sessionId is always 'no-session' regardless of store state
    it('should use no-session id when session is disabled', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-reg-003');
      renderWithStore({
        session: {
          activeSession: {
            id: 'session-active',
            groupId: 'g',
            consultantId: 'c',
            status: 'active',
            startedAt: 1700000000000,
            endedAt: null,
            memberCount: 0,
            eventCount: 0,
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
          sessions: [],
          isLoading: false,
          error: null,
        },
      });

      fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'John Doe');
      fireEvent.press(screen.getByLabelText('Register member'));

      await waitFor(() => {
        expect(DataSync.recordEvent).toHaveBeenCalledWith(
          'MemberRegistered',
          expect.objectContaining({ name: 'John Doe' }),
          'no-session',
        );
      });
    });

    it('should reset form when Register Another is pressed', async () => {
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-reg-004');
      renderWithStore();

      fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'Jane');
      fireEvent.press(screen.getByLabelText('Register member'));

      await waitFor(() => {
        expect(screen.getByText('Member Registered!')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Register Another'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Full name')).toBeTruthy();
      });
    });
  });

  // ── NFC scanning ─────────────────────────────────────────────────────────

  describe('NFC scanning', () => {
    it('should call readTagId when scan button pressed', () => {
      const mockReadTagId = jest.fn().mockResolvedValue('TAG-001');
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        readTagId: mockReadTagId,
        cancel: jest.fn(),
      });

      renderWithStore();
      fireEvent.press(screen.getByLabelText('Scan NFC card to link'));

      expect(mockReadTagId).toHaveBeenCalled();
    });

    it('should show scanned tag UID after successful scan', async () => {
      const mockReadTagId = jest.fn().mockResolvedValue('NFC-XYZ789');
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        readTagId: mockReadTagId,
        cancel: jest.fn(),
      });

      renderWithStore();
      fireEvent.press(screen.getByLabelText('Scan NFC card to link'));

      await waitFor(() => {
        expect(screen.getByText('NFC-XYZ789')).toBeTruthy();
      });
    });

    it('should include nfcCardId in registration payload after scan', async () => {
      const mockReadTagId = jest.fn().mockResolvedValue('NFC-LINKED');
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        readTagId: mockReadTagId,
        cancel: jest.fn(),
      });
      (DataSync.recordEvent as jest.Mock).mockResolvedValue('evt-nfc-reg');

      renderWithStore();

      // Scan NFC first
      fireEvent.press(screen.getByLabelText('Scan NFC card to link'));
      await waitFor(() => {
        expect(screen.getByText('NFC-LINKED')).toBeTruthy();
      });

      // Fill name and register
      fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'NFC Member');
      fireEvent.press(screen.getByLabelText('Register member'));

      await waitFor(() => {
        expect(DataSync.recordEvent).toHaveBeenCalledWith(
          'MemberRegistered',
          expect.objectContaining({
            name: 'NFC Member',
            nfcCardId: 'NFC-LINKED',
          }),
          'no-session',
        );
      });
    });

    it('should allow removing scanned NFC tag', async () => {
      const mockReadTagId = jest.fn().mockResolvedValue('NFC-REMOVE');
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: true },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        readTagId: mockReadTagId,
        cancel: jest.fn(),
      });

      renderWithStore();

      fireEvent.press(screen.getByLabelText('Scan NFC card to link'));
      await waitFor(() => {
        expect(screen.getByText('NFC-REMOVE')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Remove NFC card'));

      await waitFor(() => {
        expect(screen.queryByText('NFC-REMOVE')).toBeNull();
      });
    });

    it('should disable NFC button when NFC not enabled', () => {
      (useNfcReader as jest.Mock).mockReturnValue({
        status: { isSupported: true, isEnabled: false },
        isScanning: false,
        lastResult: null,
        scanForMemberCard: jest.fn(),
        readTagId: jest.fn(),
        cancel: jest.fn(),
      });

      renderWithStore();
      const nfcButton = screen.getByLabelText('Scan NFC card to link');
      expect(nfcButton.props.accessibilityState?.disabled ?? nfcButton.props.disabled).toBeTruthy();
    });
  });
});
