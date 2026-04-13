import type { ViewStyle } from 'react-native';
import type { ColorScheme } from '../theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  colorScheme?: ColorScheme;
  style?: ViewStyle;
}
