import { useColorScheme } from 'react-native';
import { Colors } from '../theme/colors';

export function useTheme() {
  const scheme = useColorScheme();
  const resolved = scheme === 'dark' ? 'dark' : 'light';
  return Colors[resolved];
}
