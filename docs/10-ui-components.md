# 10 — UI Components

The `@fitsync/ui` package (`packages/ui/`) provides shared, theme-aware React Native components used across the app.

---

## Package Usage

```typescript
import { Button, Card, Input, Badge, ListItem, StatusIndicator, Spinner } from '@fitsync/ui';
```

Declared as a workspace dependency in `apps/mobile/package.json`:

```json
{ "@fitsync/ui": "workspace:*" }
```

---

## `colorScheme` Prop Pattern

Every component accepts an optional `colorScheme?: 'light' | 'dark'` prop. In practice, pass the value from the app-level color scheme hook:

```tsx
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MyScreen() {
  const colorScheme = useColorScheme();
  return <Button title="Save" onPress={save} colorScheme={colorScheme} />;
}
```

All components default to `'light'` when the prop is omitted.

---

## Component Reference

### `Button`

A `TouchableOpacity`-based button with four variants.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Button label |
| `onPress` | `() => void` | — | Tap handler |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Visual style |
| `disabled` | `boolean` | `false` | Disables interaction |
| `loading` | `boolean` | `false` | Shows `ActivityIndicator` in place of label |
| `colorScheme` | `'light' \| 'dark'` | `'light'` | |
| `style` | `ViewStyle` | — | Additional container styles |

```tsx
<Button title="Start Session" onPress={handleStart} variant="primary" colorScheme={colorScheme} />
<Button title="Delete" onPress={handleDelete} variant="danger" />
<Button title="Loading..." loading={true} onPress={() => {}} />
```

---

### `Card`

A rounded container with a subtle shadow/elevation.

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `children` | `ReactNode` | — |
| `style` | `ViewStyle` | — |
| `colorScheme` | `'light' \| 'dark'` | `'light'` |

```tsx
<Card colorScheme={colorScheme}>
  <Text>Member: Jane Smith</Text>
  <Text>Weight: 72.5 kg</Text>
</Card>
```

---

### `Input`

A styled `TextInput` with label and error message support.

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `label` | `string` | — |
| `value` | `string` | — |
| `onChangeText` | `(text: string) => void` | — |
| `placeholder` | `string` | — |
| `error` | `string` | — |
| `secureTextEntry` | `boolean` | `false` |
| `colorScheme` | `'light' \| 'dark'` | `'light'` |

```tsx
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="consultant@fitsync.com"
  error={errors.email}
  colorScheme={colorScheme}
/>
```

---

### `Badge`

A small inline label with semantic color variants.

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `label` | `string` | — |
| `variant` | `'success' \| 'warning' \| 'error' \| 'info'` | — |
| `colorScheme` | `'light' \| 'dark'` | `'light'` |

```tsx
<Badge label="BackendSynced" variant="success" colorScheme={colorScheme} />
<Badge label="Pending" variant="warning" />
<Badge label="Failed" variant="error" />
<Badge label="Syncing" variant="info" />
```

---

### `ListItem`

A pressable row with left content, title, subtitle, and optional right element.

```tsx
<ListItem
  title="Jane Smith"
  subtitle="72.5 kg · Changed: -0.5 kg"
  leftElement={<Avatar name="JS" />}
  rightElement={<Badge label="Paid" variant="success" />}
  onPress={() => openMember(member.id)}
  colorScheme={colorScheme}
/>
```

---

### `StatusIndicator`

A colored dot + label showing connection or sync status.

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `status` | `'connected' \| 'syncing' \| 'offline' \| 'error'` | — |
| `label` | `string` | status default label |
| `colorScheme` | `'light' \| 'dark'` | `'light'` |

**Dot colors:**

| Status | Color |
|--------|-------|
| `connected` | Green `#22C55E` |
| `syncing` | Blue `#3B82F6` |
| `offline` | Gray `#9CA3AF` |
| `error` | Red `#EF4444` |

```tsx
<StatusIndicator status="connected" colorScheme={colorScheme} />
<StatusIndicator status="syncing" label="Uploading 12 events..." />
```

---

### `Spinner`

A centered `ActivityIndicator` wrapper for loading states.

```tsx
{isLoading && <Spinner colorScheme={colorScheme} />}
```

---

## Design Tokens

Components share these color tokens internally (not exported, but consistent):

```typescript
const Colors = {
  light: {
    text:                '#000000',
    background:          '#ffffff',
    backgroundElement:   '#F0F0F3',
    backgroundSelected:  '#E0E1E6',
    textSecondary:       '#60646C',
  },
  dark: {
    text:                '#ffffff',
    background:          '#000000',
    backgroundElement:   '#212225',
    backgroundSelected:  '#2E3135',
    textSecondary:       '#B0B4BA',
  },
};
```

Primary action color: `#3B82F6` (blue-500).  
Danger color: `#EF4444` (red-500).

---

## Extending the Package

1. Add new component to `packages/ui/src/MyComponent.tsx`
2. Export from `packages/ui/src/index.ts`
3. Use `StyleSheet.create()` — never inline styles
4. Wrap in `React.memo()` and set `displayName`
5. Accept `colorScheme?: 'light' | 'dark'` prop for theme support
