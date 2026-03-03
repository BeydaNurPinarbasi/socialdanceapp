import React from 'react';
import { View, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Header } from './Header';

const HEADER_HEIGHT = 60;
// Header'ın altındaki ekstra alanı biraz azaltarak
// tüm sayfalarda içerikleri başlığa daha yakın getiriyoruz.
const HEADER_EXTRA_HEIGHT = 90;

type HeaderProps = React.ComponentProps<typeof Header>;

interface CollapsingHeaderScrollViewProps extends Omit<ScrollViewProps, 'onScroll'> {
  headerProps: HeaderProps;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  /** Örneğin harita ekranında içeriğin başlığın arkasından başlamasını istiyorsak */
  overlayContent?: boolean;
  /** Bazı ekranlarda (harita gibi) başlığı şeffaf yapmak için */
  headerBackgroundColor?: string;
  /** true ise header (başlık + headerExtra) hiç render edilmez */
  hideHeader?: boolean;
}

export const CollapsingHeaderScrollView: React.FC<CollapsingHeaderScrollViewProps> = ({
  headerProps,
  headerExtra,
  children,
  overlayContent = false,
  headerBackgroundColor,
  hideHeader = false,
  contentContainerStyle,
  style,
  ...scrollViewProps
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const effectiveHeaderExtra = headerExtra ? HEADER_EXTRA_HEIGHT : 0;
  const headerTotal = insets.top + HEADER_HEIGHT + effectiveHeaderExtra;
  const contentTop = hideHeader ? 0 : overlayContent ? 0 : headerTotal;
  const bgColor = headerBackgroundColor ?? colors.headerBg;

  return (
    <>
      {!hideHeader && (
        <View style={[styles.headerWrap, { paddingTop: insets.top, backgroundColor: bgColor }]}>
          <Header {...headerProps} />
          {headerExtra && <View style={styles.headerExtra}>{headerExtra}</View>}
        </View>
      )}
      <ScrollView
        contentContainerStyle={[
          { paddingTop: contentTop },
          StyleSheet.flatten(contentContainerStyle),
        ]}
        style={[styles.scroll, style]}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerExtra: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
});
