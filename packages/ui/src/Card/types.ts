import type { ViewStyle } from 'react-native';
import type { ColorScheme } from '../theme/colors';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colorScheme?: ColorScheme;
}
