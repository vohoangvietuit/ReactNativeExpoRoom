import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NfcReader } from '../NfcReader';
import type { NfcTagIdResult, NfcStatus } from '../types';

export function useNfcReader() {
  const readerRef = useRef<NfcReader>(new NfcReader());
  const [status, setStatus] = useState<NfcStatus>({ isSupported: false, isEnabled: false });
  const [isScanning, setIsScanning] = useState(false);

  const refreshStatus = useCallback(() => {
    readerRef.current.getStatus().then(setStatus);
  }, []);

  useEffect(() => {
    const reader = readerRef.current;
    // Initial check
    reader.getStatus().then(setStatus);

    // Re-check every time the app comes back to the foreground — covers the case where
    // the user leaves the app to toggle NFC in Android Settings and returns.
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        reader.getStatus().then(setStatus);
      }
    });

    return () => {
      subscription.remove();
      reader.cleanup();
    };
  }, []);

  const scanTagId = useCallback(async (): Promise<NfcTagIdResult> => {
    setIsScanning(true);
    try {
      const result = await readerRef.current.scanTagId();
      return result;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const readTagId = useCallback(async (): Promise<string | null> => {
    setIsScanning(true);
    try {
      return await readerRef.current.readTagId();
    } finally {
      setIsScanning(false);
    }
  }, []);

  const cancel = useCallback(() => {
    readerRef.current.cancel();
    setIsScanning(false);
  }, []);

  return {
    status,
    isScanning,
    scanTagId,
    readTagId,
    cancel,
    refreshStatus,
  };
}
