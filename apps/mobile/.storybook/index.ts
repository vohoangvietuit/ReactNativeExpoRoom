import { view } from '@storybook/react-native';
import './preview';

const StorybookUI = view.getStorybookUI({
  enableWebsockets: true,
  host: 'localhost',
  port: 7007,
  onDeviceUI: true,
});

export default StorybookUI;
