import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MembersTab from '../members';
import memberReducer from '@/features/member/store/memberSlice';
import sessionReducer from '@/features/session/store/sessionSlice';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({
    reducer: {
      member: memberReducer,
      session: sessionReducer,
    },
  });
}

function renderTab() {
  const store = makeStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <MembersTab />
      </Provider>
    ),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MembersTab', () => {
  it('should render segment control with Identify and Register options', () => {
    renderTab();

    expect(screen.getByLabelText('Switch to Identify mode')).toBeTruthy();
    expect(screen.getByLabelText('Switch to Register mode')).toBeTruthy();
  });

  it('should show Identify screen by default', () => {
    renderTab();

    // MemberIdentifyScreen shows "Member Identify" header
    expect(screen.getByText('Member Identify')).toBeTruthy();
  });

  it('should switch to Register screen when Register segment is pressed', () => {
    renderTab();

    fireEvent.press(screen.getByLabelText('Switch to Register mode'));

    // RegisterMemberScreen shows "Member Details" card title
    expect(screen.getByText('Member Details')).toBeTruthy();
  });

  it('should switch back to Identify screen', () => {
    renderTab();

    fireEvent.press(screen.getByLabelText('Switch to Register mode'));
    expect(screen.getByText('Member Details')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Switch to Identify mode'));
    expect(screen.getByText('Member Identify')).toBeTruthy();
  });
});
