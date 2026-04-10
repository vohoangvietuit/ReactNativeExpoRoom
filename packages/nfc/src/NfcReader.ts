import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { tagIdToHex } from './parser';
import type { NfcTagIdResult, NfcStatus } from './types';

/** Timeout for a single scan session (ms). Prevents indefinite waits. */
const SCAN_TIMEOUT_MS = 30_000;

/**
 * NfcReader — core NFC reading logic wrapping react-native-nfc-manager.
 *
 * Supports:
 * - NDEF tag reading (text records with member JSON, MIME JSON)
 * - Tag ID extraction across NFC-A, NFC-B, ISO-DEP, MIFARE Classic
 * - NFC status checking
 */
export class NfcReader {
  private isInitialized = false;
  /** Pending init promise — prevents concurrent double-start race condition. */
  private initPromise: Promise<boolean> | null = null;

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (!supported) return false;
        await NfcManager.start();
        this.isInitialized = true;
        return true;
      } catch {
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async getStatus(): Promise<NfcStatus> {
    try {
      const isSupported = await NfcManager.isSupported();
      const isEnabled = isSupported ? await NfcManager.isEnabled() : false;
      return { isSupported, isEnabled };
    } catch {
      return { isSupported: false, isEnabled: false };
    }
  }

  /**
   * Scan for an NFC tag and return only its physical UID.
   * This is the primary method for member identification — tagId IS the member key.
   * Times out after SCAN_TIMEOUT_MS. Covers NFC-A, NFC-B, ISO-DEP, MIFARE Classic.
   */
  async scanTagId(): Promise<NfcTagIdResult> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<NfcTagIdResult>((resolve) => {
      timeoutId = setTimeout(() => {
        NfcManager.cancelTechnologyRequest().catch(() => {});
        resolve({ success: false, error: 'Scan timed out — hold card closer and try again' });
      }, SCAN_TIMEOUT_MS);
    });

    const scanPromise = this._doScanTagId();

    try {
      return await Promise.race([scanPromise, timeoutPromise]);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  }

  private async _doScanTagId(): Promise<NfcTagIdResult> {
    const techsToTry: NfcTech[] = [
      NfcTech.NfcA,
      NfcTech.NfcB,
      NfcTech.IsoDep,
      NfcTech.MifareClassic,
    ];

    try {
      await this.init();
      await NfcManager.requestTechnology(techsToTry);
      const tag = await NfcManager.getTag();
      const tagId = tag?.id ? tagIdToHex(tag.id as unknown as ArrayLike<number>) : undefined;
      if (tagId) {
        return { success: true, tagId };
      }
      return { success: false, error: 'No tag ID detected' };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'NFC scan failed';
      return { success: false, error: message };
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch {
        // Ignore cancel errors
      }
    }
  }

  /**
   * Read just the tag ID without NDEF data.
   * Tries NFC-A, NFC-B, ISO-DEP, and MIFARE Classic to cover all common card types
   * (gym/fitness cards, employee badges, transport cards, etc.).
   */
  async readTagId(): Promise<string | null> {
    const techsToTry: NfcTech[] = [
      NfcTech.NfcA,
      NfcTech.NfcB,
      NfcTech.IsoDep,
      NfcTech.MifareClassic,
    ];

    try {
      await this.init();
      // requestTechnology with an array selects the first tech the tag supports
      await NfcManager.requestTechnology(techsToTry);
      const tag = await NfcManager.getTag();
      return tag?.id ? tagIdToHex(tag.id as unknown as ArrayLike<number>) : null;
    } catch {
      return null;
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch {
        // Ignore
      }
    }
  }

  cancel(): void {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }

  cleanup(): void {
    if (this.isInitialized) {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      this.isInitialized = false;
    }
  }
}

