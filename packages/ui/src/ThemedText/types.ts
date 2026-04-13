import { type TextProps } from 'react-native';
import { type ThemeColor } from '../theme/colors';

export interface ThemedTextProps extends TextProps {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
}
