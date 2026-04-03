import React, { useRef } from 'react';
import { TextInput, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
  /** Özel arka plan rengi (örn. #482347). Verilirse yazı/placeholder açık renk kullanılır. */
  backgroundColor?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Ara...',
  style,
  autoFocus = false,
  backgroundColor: customBg,
  onFocus,
  onBlur,
}) => {
  const inputRef = useRef<TextInput>(null);
  const { colors, spacing, radius, typography } = useTheme();
  const bgColor = customBg ?? colors.inputBg;
  const isDark = Boolean(customBg);
  const textColor = isDark ? '#FFFFFF' : colors.text;
  const placeholderColor = isDark ? 'rgba(255,255,255,0.6)' : colors.inputPlaceholder;
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : colors.inputBorder;

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderRadius: radius.full,
          paddingHorizontal: spacing.lg,
          height: 48,
          borderWidth: 1,
          borderColor,
        },
        style,
      ]}
      onPress={() => inputRef.current?.focus()}
    >
      <Icon name="magnify" size={20} color={placeholderColor} />
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          typography.body,
          { color: textColor, marginLeft: spacing.sm },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 0,
  },
});
