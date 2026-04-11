# 07 — NFC & BLE Scales

Two hardware integrations enable fast member identification (NFC) and automated weight capture (BLE scales).

---

## NFC — Member Card Reader

**Package:** `@fitsync/nfc` (`packages/nfc/`)  
**Library:** `react-native-nfc-manager@3.15.0`

### Architecture

The physical tag UID (hex string) **is** the member identifier — no NDEF payload parsing required.

```
NFC Card (any type: NFC-A, NFC-B, ISO-DEP, MIFARE Classic)
   │
   ▼
NfcReader.scanTagId()            ← packages/nfc/src/NfcReader.ts
   │
   ▼
tagIdToHex(tag.id)               ← packages/nfc/src/parser.ts
   │
   ▼
NfcTagIdResult { success, tagId }
   │
   ▼
DataSync.getMemberByNfc(tagId)   → Member lookup in Room DB
   │
   ▼
DataSync.recordEvent('MemberIdentified', { memberId, method: 'nfc', nfcCardId: tagId })
```

### Initialization

```typescript
import { NfcReader } from '@fitsync/nfc';

const nfc = new NfcReader();

// Check support before any scan
const { isSupported, isEnabled } = await nfc.getStatus();
if (!isSupported) { /* show unsupported UI */ }
if (!isEnabled)   { /* Alert + deep-link to android.settings.NFC_SETTINGS */ }
```

### Scanning

```typescript
const result = await nfc.scanTagId();
// → NfcTagIdResult { success: true, tagId: 'a1:b2:c3:d4' }

if (result.success && result.tagId) {
  const member = await DataSync.getMemberByNfc(result.tagId);
  if (member) {
    dispatch(identifyMemberByNfcThunk({ nfcCardId: result.tagId, sessionId }));
  }
} else {
  // result.error — timeout, no tag detected, or NFC error
}
```

### Tag ID Format

The physical UID bytes are converted to a lowercase colon-separated hex string:

```
a1:b2:c3:d4        // 4-byte UID (NFC-A / MIFARE)
a1:b2:c3:d4:e5:f6:07:08  // 7-byte UID (ISO-DEP / modern cards)
```

This value is stored as `nfcCardId` on the `MemberRecord` in Room DB.

### Registration

During member registration, the same `scanTagId()` call is used to capture the card UID:

```typescript
const tagId = await nfc.scanTagId();
// → store tagId in form, submit with MemberRegistered event
DataSync.recordEvent('MemberRegistered', { memberId, name, nfcCardId: tagId.tagId });
```

### React Hook

```typescript
const { status, isScanning, scanTagId, readTagId, cancel, refreshStatus } = useNfcReader();
```

- `scanTagId()` — with 30s timeout, returns `NfcTagIdResult` (use in screens)
- `readTagId()` — raw, no timeout, returns `string | null` (use in forms)
- `refreshStatus()` — re-check NFC enabled state (called on AppState foreground)

### Android Permissions

```xml
<!-- apps/mobile/android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

`required="false"` allows the app to install on non-NFC devices (NFC features degrade gracefully).

---

## BLE Scales

**Package:** `@fitsync/ble-scale` (`packages/ble-scale/`)  
**Library:** `react-native-ble-plx@3.2.1`

### Architecture

```
BLE Scale Device
   │  Weight Measurement characteristic (UUID: 0000181D-...)
   ▼
BleScaleReader.startWeighing()    ← packages/ble-scale/src/BleScaleReader.ts
   │
   ▼
parseWeightMeasurement(base64)    ← packages/ble-scale/src/weightParser.ts
   │
   ▼
ScaleReading { weight, unit, stable, deviceId }
   │
   ▼
Redux: dispatch(recordWeight({ weight, source: 'scale', ... }))
   │
   ▼
DataSync.recordEvent('WeightRecorded', payload)
```

### BLE Service and Characteristic UUIDs

```typescript
// packages/ble-scale/src/weightParser.ts
const WEIGHT_SERVICE_UUID        = '0000181D-0000-1000-8000-00805F9B34FB';
const WEIGHT_MEASUREMENT_CHAR    = '00002A9D-0000-1000-8000-00805F9B34FB';
```

These are Bluetooth SIG standardized UUIDs for the **Weight Scale** profile.

### IEEE 11073 Weight Data Parsing

The Weight Measurement characteristic uses IEEE 11073 binary encoding:

```
Byte layout:
  byte[0]      — flags
                  bit 0: 0 = SI (kg), 1 = Imperial (lb)
                  bit 1: timestamp present
                  bit 2: user ID present
                  bit 3: BMI + height present
                  bit 4: measurement unstable (still settling)
  bytes[1-2]   — weight (uint16 little-endian)
                  SI units:       value × 0.005 = kg
                  Imperial units: value × 0.01  = lb
```

```typescript
export function parseWeightMeasurement(
  base64Value: string,
  deviceId: string,
  deviceName: string
): ScaleReading | null {
  const bytes      = base64ToBytes(base64Value);
  if (bytes.length < 3) return null;

  const flags      = bytes[0];
  const isImperial = (flags & 0x01) !== 0;
  const isUnstable = (flags & 0x10) !== 0;

  const rawWeight  = bytes[1] | (bytes[2] << 8);
  const weight     = isImperial
    ? Math.round(rawWeight * 0.01 * 10) / 10   // lb
    : Math.round(rawWeight * 0.005 * 10) / 10; // kg

  return {
    weight,
    unit: isImperial ? 'lb' : 'kg',
    stable: !isUnstable,
    timestamp: new Date().toISOString(),
    deviceId,
    deviceName,
  };
}
```

### Unit Conversion

```typescript
export function toKg(reading: ScaleReading): number {
  switch (reading.unit) {
    case 'kg': return reading.weight;
    case 'lb': return Math.round(reading.weight * 0.453592 * 10) / 10;
    case 'st': return Math.round(reading.weight * 6.35029  * 10) / 10;
  }
}
```

### `useScaleWeight` Hook

```typescript
// packages/ble-scale/src/hooks/useScaleWeight.ts
export function useScaleWeight(deviceId: string | null) {
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [status, setStatus]   = useState<'idle' | 'scanning' | 'connected' | 'error'>('idle');

  useEffect(() => {
    if (!deviceId) return;
    const reader = new BleScaleReader();
    reader.startWeighing(deviceId, (r) => {
      if (r.stable) setReading(r);
    }, setStatus);
    return () => reader.stopWeighing();
  }, [deviceId]);

  return { reading, status };
}
```

### Android Permissions

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

---

## Member Identification Flow (Combined)

```
1. Operator presses "Identify Member"
2. NFC scan initiated (or manual search fallback)
3. Tag read → memberId extracted
4. DataSync.getMemberById(memberId) → member loaded
5. MemberIdentified event recorded
6. If weigh role: BLE scale scan auto-starts for this member
7. Stable weight reading received
8. WeightRecorded event recorded with memberId
```
