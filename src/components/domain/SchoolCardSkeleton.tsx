import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  cardBackgroundColor?: string;
}

export const SchoolCardSkeleton: React.FC<Props> = ({ cardBackgroundColor }) => {
  const { colors, radius, shadows } = useTheme();
  const isDark = Boolean(cardBackgroundColor);
  const bg = cardBackgroundColor ?? colors.cardBg;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : colors.cardBorder;

  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.75, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const blockColor = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'),
    [isDark],
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor,
          ...shadows.sm,
        },
      ]}
    >
      <Animated.View style={[styles.image, { opacity: pulse, backgroundColor: blockColor }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.lineLg, { opacity: pulse, backgroundColor: blockColor }]} />
        <View style={{ height: 10 }} />
        <Animated.View style={[styles.lineMd, { opacity: pulse, backgroundColor: blockColor }]} />
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <Animated.View style={[styles.pill, { opacity: pulse, backgroundColor: blockColor }]} />
          <View style={{ width: 10 }} />
          <Animated.View style={[styles.pillSm, { opacity: pulse, backgroundColor: blockColor }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 140,
  },
  body: {
    padding: 12,
  },
  lineLg: {
    width: '70%',
    height: 14,
    borderRadius: 8,
  },
  lineMd: {
    width: '92%',
    height: 10,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    width: 64,
    height: 12,
    borderRadius: 999,
  },
  pillSm: {
    width: 44,
    height: 12,
    borderRadius: 999,
  },
});

