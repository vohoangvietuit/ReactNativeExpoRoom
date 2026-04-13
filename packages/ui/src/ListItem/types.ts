import type { ColorScheme } from '../theme/colors';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  colorScheme?: ColorScheme;
  accessibilityLabel?: string;
}
