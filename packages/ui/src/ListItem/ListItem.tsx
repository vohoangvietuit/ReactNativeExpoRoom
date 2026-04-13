import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import type { ListItemProps } from './types';

export const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    title,
    subtitle,
    onPress,
    leftIcon,
    rightIcon,
    colorScheme = 'light',
    accessibilityLabel,
  }) => {
    const theme = Colors[colorScheme];

    const handlePress = useCallback(() => {
      if (onPress !== undefined) {
        onPress();
      }
    }, [onPress]);

    return (
      <Pressable
        onPress={onPress !== undefined ? handlePress : undefined}
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}
        accessibilityRole={onPress !== undefined ? 'button' : 'none'}
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {leftIcon !== undefined && <View style={styles.leftIcon}>{leftIcon}</View>}
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle !== undefined && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        {rightIcon !== undefined && <View style={styles.rightIcon}>{rightIcon}</View>}
      </Pressable>
    );
  },
);

ListItem.displayName = 'ListItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 56,
  },
  leftIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rightIcon: {
    marginLeft: 12,
  },
});
