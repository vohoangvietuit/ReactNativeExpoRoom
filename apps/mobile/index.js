import { AppRegistry } from 'react-native';

const isStorybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

if (isStorybookEnabled) {
  // Load storybook — stories are auto-discovered by .storybook/main.ts glob
  const StorybookUI = require('./.storybook').default;
  AppRegistry.registerComponent('main', () => StorybookUI);
} else {
  // Normal expo-router entry
  require('expo-router/entry');
}
