/** Result for tag-ID-only scans — tagId IS the member identifier. */
export interface NfcTagIdResult {
  success: boolean;
  tagId?: string;
  error?: string;
}

export interface NfcStatus {
  isSupported: boolean;
  isEnabled: boolean;
}
