export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',

    // Semantic
    primary: '#007AFF',
    success: '#34c759',
    successDark: '#155724',
    successLight: '#d4edda',
    danger: '#ff3b30',
    dangerDark: '#721c24',
    dangerLight: '#f8d7da',
    warning: '#ff9500',
    warningDark: '#856404',
    warningLight: '#FFF3CD',
    info: '#5C6BC0',

    // Surfaces & borders
    surface: '#f5f5f5',
    card: '#ffffff',
    border: '#dddddd',
    borderLight: '#eeeeee',
    disabled: '#BDBDBD',

    // Text variants
    textMuted: '#999999',
    textTertiary: '#666666',
    textOnPrimary: '#ffffff',
    textOnSuccess: '#155724',
    textOnDanger: '#721c24',
    textOnWarning: '#856404',

    // Accent
    purple: '#8e44ad',
    teal: '#4ec9b0',
    warningAccent: '#FFC107',
    successMuted: '#a8d8b9',
    primaryLight: '#e8f0fe',
    successSurface: '#E8F5E9',
    successBorder: '#A5D6A7',
    successText: '#2E7D32',

    // Dark panels (debug logs, code blocks)
    darkPanel: '#1a1a1a',
    darkPanelHeader: '#2a2a2a',
    darkPanelText: '#a8d8a8',
    darkPanelMuted: '#555555',

    // Status dots
    dotConnected: '#34c759',
    dotNearby: '#f0ad4e',
    dotOffline: '#cccccc',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',

    // Semantic
    primary: '#0A84FF',
    success: '#30D158',
    successDark: '#b6f2c8',
    successLight: '#1a3a24',
    danger: '#FF453A',
    dangerDark: '#f8b4b4',
    dangerLight: '#3a1a1a',
    warning: '#FF9F0A',
    warningDark: '#ffe0a3',
    warningLight: '#3a2e1a',
    info: '#7986CB',

    // Surfaces & borders
    surface: '#1c1c1e',
    card: '#2c2c2e',
    border: '#3a3a3c',
    borderLight: '#38383a',
    disabled: '#636366',

    // Text variants
    textMuted: '#8e8e93',
    textTertiary: '#aeaeb2',
    textOnPrimary: '#ffffff',
    textOnSuccess: '#b6f2c8',
    textOnDanger: '#f8b4b4',
    textOnWarning: '#ffe0a3',

    // Accent
    purple: '#BF5AF2',
    teal: '#64D2A6',
    warningAccent: '#FFD60A',
    successMuted: '#2a5a3a',
    primaryLight: '#1a2a3a',
    successSurface: '#1a3a24',
    successBorder: '#2a6a3a',
    successText: '#6ee7a0',

    // Dark panels (debug logs, code blocks)
    darkPanel: '#1a1a1a',
    darkPanelHeader: '#2a2a2a',
    darkPanelText: '#a8d8a8',
    darkPanelMuted: '#555555',

    // Status dots
    dotConnected: '#30D158',
    dotNearby: '#FFD60A',
    dotOffline: '#636366',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
