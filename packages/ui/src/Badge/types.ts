import type { ColorScheme } from '../theme/colors';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  colorScheme?: ColorScheme;
}
