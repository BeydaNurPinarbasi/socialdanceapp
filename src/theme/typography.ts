import { TextStyle } from 'react-native';

export const fontFamily = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const typography = {
  h1: {
    fontFamily: fontFamily.regular,
    fontSize: 30,
    lineHeight: 36,
  },
  h2: {
    fontFamily: fontFamily.regular,
    fontSize: 24,
    lineHeight: 30,
  },
  h3: {
    fontFamily: fontFamily.regular,
    fontSize: 20,
    lineHeight: 26,
  },
  h4: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyLight: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmallLight: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmallMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmallBold: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  captionBold: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  button: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 20,
  },
  buttonSmall: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
  },
} as const;

export type Typography = typeof typography;
