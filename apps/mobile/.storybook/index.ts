import { view } from './storybook.requires';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StorybookUI = view.getStorybookUI({
  enableWebsockets: true,
  host: 'localhost',
  port: 7007,
  onDeviceUI: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

export default StorybookUI;
