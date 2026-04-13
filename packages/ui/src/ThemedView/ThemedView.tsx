import { View } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { type ThemedViewProps } from './types';

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
