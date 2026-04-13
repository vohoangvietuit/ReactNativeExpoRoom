import { type ViewProps } from 'react-native';
import { type ThemeColor } from '../theme/colors';

export interface ThemedViewProps extends ViewProps {
  type?: ThemeColor;
}
