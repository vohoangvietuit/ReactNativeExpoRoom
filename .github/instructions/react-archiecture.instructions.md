---
applyTo: '**/*.ts,**/*.tsx,**/*.js,**/*.jsx'
---

# React Native Architecture & Structure

## Monorepo Package Responsibilities

```
packages/
  ui/                  # @fitsync/ui — UI components + theme tokens + UI hooks
    src/
      theme/           # Design tokens (single source of truth)
        colors.ts      # Colors, ColorScheme, ThemeColor
        typography.ts  # Fonts (Platform.select)
        spacing.ts     # Spacing, BottomTabInset, MaxContentWidth
        index.ts       # Barrel re-export
      hooks/           # UI-specific hooks
        useTheme.ts    # Returns resolved theme colors for current color scheme
        index.ts
      Badge/           # Each component in its own folder
        Badge.tsx
        types.ts
        index.ts
      Button/
      Card/
      Input/
      ListItem/
      Spinner/
      StatusIndicator/
      index.ts         # Package barrel: exports theme, hooks, all components + types

  shared/              # @fitsync/shared — Pure TypeScript (NO React Native imports)
    src/
      constants.ts     # BLE UUIDs, sync intervals, service IDs
      domain.ts        # Business entities (Member, Payment, WeightRecord, etc.)
      events.ts        # Event types, payloads, outbox, sync batch
      index.ts

  datasync/            # @fitsync/datasync — Expo Module (Room + SQLCipher bridge)
  nfc/                 # @fitsync/nfc — NFC card reader
  ble-scale/           # @fitsync/ble-scale — BLE weight scale reader
  tsconfig/            # Shared TypeScript configs
```

### Package Boundary Rules

| Content                                    | Package                        |
| ------------------------------------------ | ------------------------------ |
| Colors, Fonts, Spacing, design tokens      | `@fitsync/ui` (theme/)         |
| `Platform.select()` or RN-specific styling | `@fitsync/ui` (never `shared`) |
| UI components (Button, Card, Badge, etc.)  | `@fitsync/ui`                  |
| `useTheme()`, `useColorScheme()` wrappers  | `@fitsync/ui` (hooks/)         |
| Business domain types (Member, Payment)    | `@fitsync/shared`              |
| Event types, payloads, sync contracts      | `@fitsync/shared`              |
| BLE/NFC UUIDs, sync intervals, constants   | `@fitsync/shared`              |
| Screen components, Redux slices            | `apps/mobile` (features/)      |
| App-specific themed wrappers (ThemedText)  | `apps/mobile` (components/)    |

```typescript
// ✅ GOOD: App re-exports theme from @fitsync/ui
// apps/mobile/src/constants/theme.ts
export { Colors, Fonts, Spacing, BottomTabInset, MaxContentWidth } from '@fitsync/ui';
export type { ColorScheme, ThemeColor } from '@fitsync/ui';

// ✅ GOOD: UI component imports theme from same package
// packages/ui/src/Button/Button.tsx
import { Colors } from '../theme/colors';

// ❌ BAD: Platform.select() in @fitsync/shared
import { Platform } from 'react-native'; // NEVER in shared

// ❌ BAD: Duplicating color values instead of importing from theme
const Colors = { light: { text: '#000000' } }; // NEVER duplicate
```

### UI Component Folder Pattern

Each component in `@fitsync/ui` follows this structure:

```
ComponentName/
  ComponentName.tsx    # Implementation (imports from ../theme/colors)
  types.ts             # Props interface (imports ColorScheme from ../theme/colors)
  index.ts             # Barrel: export { ComponentName } + export type { Props }
```

## Directory Structure

### Required React Native Folder Layout (Feature-First Architecture)

```
src/
  features/            # Feature-based modules (PRIMARY ORGANIZATION)
    auth/              # Authentication feature
      screens/          # Auth screen components
        LoginScreen.tsx
        RegisterScreen.tsx
        ForgotPasswordScreen.tsx
      components/        # Auth-specific components
        LoginForm/
        RegisterForm/
        AuthGuard/
        PasswordReset/
      hooks/             # Auth-specific hooks
        useAuth.ts
        useLogin.ts
        useRegister.ts
      services/          # Auth API calls
        authService.ts
        tokenService.ts
      store/             # Auth Redux slices
        authSlice.ts
        authSelectors.ts
      types/             # Auth-specific types
        auth.types.ts
        user.types.ts
      utils/             # Auth utilities
        validatePassword.ts
        formatAuthError.ts
      navigation/        # Auth-specific navigation
        AuthNavigator.tsx
        authRoutes.ts
      index.ts           # Feature barrel export

    [other-features]/    # Other features follow same structure
      screens/           # Feature-specific screens
      components/        # Feature-specific components
      hooks/             # Feature-specific hooks
      services/          # Feature API calls
      store/             # Feature Redux slices
      types/             # Feature types
      utils/             # Feature utilities
      navigation/        # Feature navigation
      index.ts           # Feature barrel export

  components/          # ONLY shared/reusable React Native components
    ui/                # Generic UI components
      Button/
      Input/
      Modal/
      Card/
      Spinner/
      TouchableOpacity/
    layout/            # Layout components
      SafeAreaView/
      KeyboardAvoidingView/
      Container/
      Screen/
    navigation/        # Navigation components
      TabBar/
      Header/
      DrawerContent/
    forms/             # Shared form components
      FormField/
      ValidationMessage/
      TextInput/

  screens/             # OPTIONAL: Re-exports for navigation setup
    index.ts           # Re-exports from features for navigation

  navigation/          # React Navigation setup
    RootNavigator.tsx
    TabNavigator.tsx
    StackNavigator.tsx
    types.ts           # Navigation type definitions

  hooks/               # ONLY shared hooks
    useLocalStorage.ts
    useDebounce.ts
    useApi.ts

  services/            # ONLY shared services
    api/               # Base API configuration
      client.ts
      interceptors.ts
    analytics/         # Shared analytics (Firebase, etc.)
    storage/           # AsyncStorage utilities
    notifications/     # Push notification services
    permissions/       # Device permission handling

  store/               # Redux Toolkit global state
    rootReducer.ts
    store.ts
    middleware/

  utils/               # Shared utility functions
    format/            # Formatting utilities
      date.ts
      currency.ts
    validation/        # Shared validation
      email.ts
      phone.ts
    platform/          # Platform-specific utilities
      dimensions.ts
      statusBar.ts
    testing/           # Test utilities

  types/               # ONLY shared TypeScript types
    api/               # Shared API types
      response.types.ts
      error.types.ts
    navigation/        # Navigation types
      routes.types.ts
    platform/          # Platform-specific types
      device.types.ts
  assets/              # Static assets
    images/            # Images organized by feature or screen
      auth/
      profile/
      onboarding/
    icons/             # Icon assets (SVG, PNG)
    fonts/             # Custom fonts
    sounds/            # Audio assets for mobile
    animations/        # Lottie or other animation files
```

### File Naming Conventions

#### Screens

- PascalCase with 'Screen' suffix: `UserProfileScreen.tsx`
- kebab-case for directories: `user-profile/`
- index.tsx for barrel exports

#### Components

- PascalCase for component files: `UserCard.tsx`
- kebab-case for directories: `user-card/`
- index.tsx for barrel exports

#### Navigation

- PascalCase with 'Navigator' suffix: `AuthNavigator.tsx`
- Route names in SCREAMING_SNAKE_CASE: `USER_PROFILE`

#### Hooks

- camelCase starting with 'use': `useAuthCheck.ts`
- Group related hooks in subdirectories

#### Utils and Services

- camelCase for files: `formatDate.ts`
- camelCase for functions: `formatCurrency()`

#### Types

- PascalCase for interfaces: `UserProfile.ts`
- Suffix with purpose: `UserProfileProps`, `UserProfileState`

## React Native Component Organization

### Atomic Design Principles for Mobile

```
components/
  atoms/               # Basic mobile building blocks
    Button/
    Input/
    Icon/
    TouchableArea/
    SafeText/

  molecules/           # Simple mobile combinations
    SearchBox/
    FormField/
    Card/
    ListItem/
    TabBarItem/

  organisms/           # Complex mobile combinations
    Navigation/
    UserList/
    ProductGrid/
    Header/
    TabBar/

  templates/           # Screen layouts
    AuthLayout/
    MainLayout/
    OnboardingLayout/
    FormLayout/
```

### React Native Component File Structure

```typescript
// components/Button/index.tsx
export { Button } from './Button';
export type { ButtonProps } from './Button';

// components/Button/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ButtonProps } from './types';

export const Button: React.FC<ButtonProps> = ({ title, onPress, style, ...props }) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} {...props}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// components/Button/types.ts
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// components/Button/Button.module.css
.button {
  /* styles */
}
```

## Feature-Based Architecture

### Complete Feature Module Structure (Auth Example)

```
features/auth/
  screens/            # Auth screen components
    LoginScreen.tsx
    RegisterScreen.tsx

  components/         # Auth-specific components
    LoginForm/
      LoginForm.tsx
      types.ts
      index.ts

  hooks/              # Auth-specific hooks
    useAuth.ts
    useLogin.ts

  services/           # Auth API calls
    authService.ts
    tokenService.ts

  store/              # Auth state management
    authSlice.ts      # Redux slice + thunks
    __tests__/
      authSlice.test.tsx

  types/              # Auth-specific types
    index.ts

  index.ts            # Feature barrel export

# FitSync features: auth, session, member, devices, sync, todo, weigh
```

### Feature Barrel Exports (Auth Example)

```typescript
// features/auth/index.ts
// Screens
export { default as LoginScreen } from './screens/LoginScreen';

// Thunks & Actions
export { loginThunk, restoreSessionThunk, logoutThunk } from './store/authSlice';

// Hooks (when created)
// export { useAuth } from './hooks/useAuth';

// Types (when created)
// export type { AuthUser, LoginCredentials } from './types';
```

### Cross-Feature Dependencies

```typescript
// ✅ GOOD: Feature importing from @fitsync/ui package
import { Button, Card } from '@fitsync/ui';
import { Colors, Spacing } from '@fitsync/ui';

// ✅ GOOD: Feature importing from @fitsync/shared package
import { EVENT_TYPES, type Member } from '@fitsync/shared';

// ✅ GOOD: Feature importing app-level shared components
import { ThemedText } from '@/components/themed-text';

// ✅ GOOD: Feature importing shared hooks
import { useAppSelector, useAppDispatch } from '@/hooks/useStore';

// ✅ GOOD: Feature importing app-scoped theme re-export
import { Colors, Spacing } from '@/constants/theme';

// ❌ AVOID: Direct feature-to-feature imports
import { useOtherFeature } from '../other-feature/hooks/useOtherFeature'; // ❌

// ✅ BETTER: Use shared state via Redux
import { useAppSelector } from '@/hooks/useStore';
```

## Import Organization

### Import Order (ESLint rule)

```typescript
// 1. React and React-related
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// 2. External libraries
import axios from 'axios';
import { format } from 'date-fns';

// 3. Internal utilities and services
import { api } from '@/services';
import { formatCurrency } from '@/utils';

// 4. Internal components and features
import { Button } from '@/components/common';
import { useAuth } from '@/features/auth';

// 5. Relative imports
import { validateForm } from './utils';
import styles from './Component.module.css';
```

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/features/*": ["features/*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/utils/*": ["utils/*"],
      "@/types/*": ["types/*"]
    }
  }
}
```

## Routing Architecture (Feature-First)

### Route Organization

```typescript
// routes/index.ts - Central route configuration
export const routes = {
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
  },
  // Other features follow similar pattern:
  // products: { list: '/products', detail: '/products/:id', ... },
  // orders: { list: '/orders', detail: '/orders/:id', ... },
  dashboard: {
    overview: "/dashboard",
    analytics: "/dashboard/analytics",
    reports: "/dashboard/reports",
  },
} as const;

// Router setup importing from features
import { LoginPage, RegisterPage, ForgotPasswordPage } from "@/features/auth";
// Import other features as needed:
// import { ProductListPage, ProductDetailPage } from '@/features/products';
// import { DashboardPage } from '@/features/dashboard';

export const routeConfig = [
  // Auth routes
  { path: routes.auth.login, element: <LoginPage /> },
  { path: routes.auth.register, element: <RegisterPage /> },
  { path: routes.auth.forgotPassword, element: <ForgotPasswordPage /> },

  // Other feature routes follow the same pattern
  // { path: routes.products.list, element: <ProductListPage /> },
  // { path: routes.dashboard.overview, element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
];
```

### Protected Routes Pattern

```typescript
// features/auth/components/AuthGuard/AuthGuard.tsx
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = null,
  requireAuth = true,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate to={routes.auth.login} state={{ from: location }} replace />
    );
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to={routes.dashboard.overview} replace />;
  }

  return <>{children}</>;
};

// Usage in features
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <AuthGuard requireAuth={true}>{children}</AuthGuard>;

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <AuthGuard requireAuth={false}>{children}</AuthGuard>;
```

## State Architecture

### State Layers

1. **Component State**: useState, useReducer
2. **Shared State**: Context API, Zustand
3. **Server State**: React Query, SWR
4. **Global App State**: Redux Toolkit

### When to Use Each

```typescript
// Component state - local UI state
const [isOpen, setIsOpen] = useState(false);

// Shared state - theme, user session
const { theme, setTheme } = useTheme();

// Server state - API data
const { data: users, isLoading } = useQuery('users', fetchUsers);

// Global state - complex app state
const dispatch = useAppDispatch();
const { currentUser } = useAppSelector((state) => state.auth);
```

## Asset Organization

### Asset Structure

```
assets/
  images/              # JPG, PNG, WebP images
    logos/
    banners/
    avatars/
    tabIcons/          # Tab bar icons

  icons/               # SVG icons only
    ui/                # UI icons (arrows, close, etc)
    social/            # Social media icons

  fonts/               # Custom fonts
  sounds/              # Audio assets for mobile
  animations/          # Lottie or other animation files
```

### Theme Tokens (packages/ui/src/theme/)

Theme tokens are the single source of truth for all visual styling:

```
packages/ui/src/theme/
  colors.ts            # Colors (light/dark), ColorScheme, ThemeColor type
  typography.ts        # Fonts (Platform.select — ios/android/web)
  spacing.ts           # Spacing scale, BottomTabInset, MaxContentWidth
  index.ts             # Barrel re-export
```

```typescript
// colors.ts
export const Colors = {
  light: { text: '#000000', background: '#ffffff', backgroundElement: '#F0F0F3', ... },
  dark:  { text: '#ffffff', background: '#000000', backgroundElement: '#212225', ... },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// spacing.ts
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
```

### Theme Usage in App Code

```typescript
// App-level re-export (apps/mobile/src/constants/theme.ts)
export { Colors, Fonts, Spacing, BottomTabInset, MaxContentWidth } from '@fitsync/ui';
export type { ColorScheme, ThemeColor } from '@fitsync/ui';

// In components — import from @/constants/theme (resolved via re-export)
import { Colors, Spacing } from '@/constants/theme';

// Or use the hook
import { useTheme } from '@fitsync/ui';
const theme = useTheme(); // Returns Colors.light or Colors.dark
```

### Global CSS

```
src/
  global.css           # Global CSS variables (NativeWind / web styles)
```

### Asset Import Patterns

```typescript
// Static imports for bundled assets
import logoImage from '@/assets/images/logo.png';
import { ReactComponent as CloseIcon } from '@/assets/icons/close.svg';

// Dynamic imports for conditional assets
const loadIcon = async (name: string) => {
  const icon = await import(`@/assets/icons/${name}.svg`);
  return icon.ReactComponent;
};
```

## Key Architecture Rules (Feature-First)

1. **Feature-first organization** - organize by business domain, not technical layer
2. **Feature isolation** - each feature should be self-contained and independent
3. **Shared components only** - `/components` contains ONLY reusable components
4. **Barrel exports** - each feature exports through index.ts for clean imports
5. **Feature screens** - screen components live in `features/[feature]/screens/`
6. **No cross-feature imports** - features communicate through shared state/context
7. **Consistent feature structure** - screens, components, hooks, services, store, types
8. **Path aliases** - use `@/features/[feature]` for feature imports
9. **Route organization** - expo-router file-based routing in `app/`
10. **Feature-specific testing** - tests co-located with feature code (`__tests__/`)
11. **Theme in @fitsync/ui** - all design tokens live in `packages/ui/src/theme/`
12. **Pure TS in @fitsync/shared** - no React Native imports in shared package
13. **No duplicated theme values** - import Colors/Spacing from `@fitsync/ui` or `@/constants/theme`

### Feature Organization Rules

#### ✅ DO:

- Put feature-specific logic in `features/[feature]/`
- Export everything through feature barrel (`features/[feature]/index.ts`)
- Use UI components from `@fitsync/ui` or `@/components/`
- Place screen components in `features/[feature]/screens/`
- Keep feature state in `features/[feature]/store/`
- Import theme from `@/constants/theme` (re-exports `@fitsync/ui`)

#### ❌ DON'T:

- Import directly between features (`../other-feature/`)
- Put feature-specific components in shared `/components/`
- Mix feature logic in shared folders
- Create deep nested folder structures within features
- Duplicate color/spacing values — always import from theme
- Put `Platform.select()` calls in `@fitsync/shared`
- Violate feature boundaries

### Migration Guide from Page-First to Feature-First

```bash
# Old structure (Page-First)
src/pages/auth/login/index.tsx
src/pages/auth/register/index.tsx
src/components/auth/LoginForm.tsx
src/components/auth/RegisterForm.tsx
src/hooks/auth/useAuth.ts
src/services/authService.ts

# New structure (Feature-First)
src/features/auth/pages/LoginPage.tsx
src/features/auth/pages/RegisterPage.tsx
src/features/auth/components/LoginForm/LoginForm.tsx
src/features/auth/components/RegisterForm/RegisterForm.tsx
src/features/auth/hooks/useAuth.ts
src/features/auth/services/authService.ts
src/features/auth/index.ts  # Barrel export

# All other features follow the same migration pattern
```
