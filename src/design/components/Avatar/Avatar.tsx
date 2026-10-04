import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { radius } from '@/design/tokens';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  source?: { uri: string };
  fallback?: string;
  size?: AvatarSize;
  badge?: ReactNode;
};

/** 사이즈별 컨테이너 한 변 길이(px) — 디자인시스템.md §19. */
const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

/** 이니셜 폰트 크기 = 컨테이너 변 길이 × 비율. 시각적 균형용 고정 비율. */
const FONT_SIZE_RATIO = 0.4;
/** 이니셜 행간 = 글자 크기 × 비율(한글 위아래 잘림 방지). */
const LINE_RATIO = 1.2;

/** fallback 문자열의 첫 글자를 대문자 이니셜로 변환. 빈 값이면 빈 문자열. */
function initialOf(fallback: string | undefined): string {
  if (!fallback) return '';
  return fallback.trim().charAt(0).toUpperCase();
}

/**
 * Avatar — 원형 사진 또는 이니셜(코발트 연한 바탕 + 코발트 글자).
 *
 * source가 있으면 expo-image(cover)로 렌더(CaptureCard 선례), 없으면 fallback 이니셜.
 * radius full(원형). badge가 있으면 우하단 absolute 슬롯에 렌더.
 */
export function Avatar({ source, fallback, size = 'md', badge }: AvatarProps): ReactNode {
  const { colors } = useTheme();

  const dimension = SIZE_MAP[size];
  const initial = initialOf(fallback);

  const containerStyle = {
    width: dimension,
    height: dimension,
    borderRadius: radius.pill,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {source ? (
        <Image
          source={source}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel={fallback}
          accessibilityRole="image"
        />
      ) : (
        <View
          style={[styles.fallback, { backgroundColor: colors.primaryMuted }]}
          accessibilityRole="image"
          accessibilityLabel={fallback}
        >
          <Text
            variant="bodyStrong"
            color="primary"
            style={[
              styles.initial,
              { fontSize: dimension * FONT_SIZE_RATIO, lineHeight: dimension * FONT_SIZE_RATIO * LINE_RATIO },
            ]}
            numberOfLines={1}
          >
            {initial}
          </Text>
        </View>
      )}
      {badge ? <View style={styles.badge}>{badge}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.pill,
  },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  initial: {
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
