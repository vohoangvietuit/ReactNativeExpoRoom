import type { ColorScheme } from '../theme/colors';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  accessibilityLabel?: string;
  colorScheme?: ColorScheme;
}
