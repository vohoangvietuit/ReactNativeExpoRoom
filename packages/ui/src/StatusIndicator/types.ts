import type { ColorScheme } from '../theme/colors';

export type StatusType = 'connected' | 'syncing' | 'offline' | 'error';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  colorScheme?: ColorScheme;
}
