import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button,
  CropFrame,
  EmptyState,
  Eyebrow,
  Header,
  Marked,
  PressableScale,
  Text,
  useToast,
} from '@/design';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing } from '@/design/tokens';
import { ExtractedEventRow } from '@/features/capture/ExtractedEventRow';
import type { CaptureEvent } from '@/features/capture/types';
import { useAddToCalendar } from '@/features/capture/use-add-to-calendar';
import { formatSpokenDateTime, formatStamp } from '@/features/captures/capture-format';
import { SkeletonBlock } from '@/features/captures/CaptureSkeleton';
import type { CaptureListItem } from '@/features/captures/types';
import { useCapture } from '@/hooks/use-capture';
import { getLocale, t } from '@/i18n';
import { deleteCapture } from '@/lib/captures';
import { extractParcel, isLikelyParcelSms, maskInvoice } from '@/lib/parcel';
import { maskForCategory } from '@/lib/sensitive-mask';
import { useCaptureStore } from '@/stores/capture-store';

/** 상세 이미지 비율 — 세로형 스크린샷의 윗부분(제목·날짜가 몰리는 곳)이 보이게 3:4. */
const IMAGE_ASPECT = 3 / 4;
/** 이미지 진입 시작 배율(공유 요소 전환 대체). */
const IMAGE_ENTER_SCALE = 0.96;
/** 상세 이미지 크롭 모서리 바깥 돌출(px). */
const IMAGE_CROP_OUTSET = 4;
/** 등록 체크 아이콘이 튀어나오는 시작 배율. */
const CHECK_ENTER_SCALE = 0.4;
/** 최소 터치 영역. */
const MIN_TOUCH = 44;

/** 데이터 처리 흐름 3단계(원격 #6) — 개인정보처리방침 §4와 같은 내용. */
const DATA_FLOW_STEPS: readonly { icon: IconName; key: string }[] = [
  { icon: 'smartphone', key: 'captures.detail.dataFlow.step1' },
  { icon: 'cloud', key: 'captures.detail.dataFlow.step2' },
  { icon: 'shield', key: 'captures.detail.dataFlow.step3' },
];

/**
 * 캡처 상세 — 명세 §6 "상세: 시스템 헤더 대신 공용 Header. 이미지 → 제목 → 뽑힌 일정/택배 →
 * OCR 원문은 접힘". 맨 아래 "데이터 처리" 흐름과 삭제 경로(원격 #6 데이터흐름 가시화).
 *
 * 카드로 감싸지 않고 머리카락 구분선으로 단을 나눈다. 메타(캡처 일시·상태)는 제목 위 mono 머리표 한 줄.
 * 이 화면의 연출은 "캘린더 등록 성공" 한 곳뿐(체크 + 형광펜). 이미지 진입은 조용한 페이드+스케일.
 *
 * 공유 요소 전환(sharedTransitionTag)은 쓰지 않는다: reanimated 4.3에서는 정적 기능 플래그
 * ENABLE_SHARED_ELEMENT_TRANSITIONS(기본 false, 실험 단계)를 켜고 네이티브를 다시 빌드해야 하며
 * expo-router 네이티브 스택과의 조합이 검증되지 않았다.
 */
export default function CaptureDetailScreen(): ReactNode {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { item, isLoading, error } = useCapture(id);
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const notifyDataChanged = useCaptureStore((s) => s.notifyDataChanged);
  const [isDeleting, setIsDeleting] = useState(false);

  // 딥링크로 바로 들어오면 돌아갈 화면이 없으므로 홈으로 보낸다.
  const handleBack = useCallback((): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // 이 캡처 1건을 영구 삭제. 파괴적이라 확인 다이얼로그 후 진행하고, 성공 시 목록 갱신 + 뒤로.
  const handleDelete = useCallback((): void => {
    if (isDeleting || !item) return;
    Alert.alert(
      t('captures.detail.delete.confirmTitle'),
      t('captures.detail.delete.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('captures.detail.delete.confirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsDeleting(true);
              try {
                await deleteCapture(item.id, item.imagePath);
                notifyDataChanged();
                toast.show({ tone: 'success', title: t('captures.detail.delete.success') });
                handleBack();
              } catch (deleteError) {
                console.error('[captures/detail] 삭제 실패:', deleteError);
                toast.show({ tone: 'danger', title: t('captures.detail.delete.error') });
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [isDeleting, item, notifyDataChanged, toast, handleBack]);

  const deleteButton = item ? (
    <PressableScale
      onPress={handleDelete}
      disabled={isDeleting}
      accessibilityRole="button"
      accessibilityLabel={t('captures.detail.delete.action')}
      accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
      hitSlop={spacing.sm}
      style={styles.headerButton}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Icon name="trash-2" size={24} color="danger" />
      )}
    </PressableScale>
  ) : undefined;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header
        title={t('captures.detail.title')}
        onBack={handleBack}
        backLabel={t('common.back')}
        right={deleteButton}
        topInset={insets.top}
      />
      {isLoading ? (
        <DetailSkeleton />
      ) : error || !item ? (
        <EmptyState
          icon="images"
          // 불러오기 실패(일반 문구)와 정말 없는 경우를 나눠 안내한다.
          title={error ?? t('captures.detail.notFound')}
          body={error ? undefined : t('captures.detail.notFoundBody')}
          action={{ label: t('captures.detail.goBack'), onPress: handleBack }}
        />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing['4xl'] }}
        >
          <DetailImage item={item} />
          <TitleBlock item={item} />
          <ExtractedBlock item={item} />
          <OcrSection ocrText={item.ocrText} category={item.category} />
          <DataFlowSection />
        </ScrollView>
      )}
    </View>
  );
}

/** 로딩 자리 표시 — 실제 배치(이미지·머리표·제목 두 줄)와 같은 모양. */
function DetailSkeleton(): ReactNode {
  return (
    <View
      style={styles.section}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('search.loading')}
    >
      <SkeletonBlock aspectRatio={IMAGE_ASPECT} rounded="md" />
      <View style={styles.skeletonLines}>
        <SkeletonBlock width="40%" height={spacing.md} />
        <SkeletonBlock width="85%" height={spacing['2xl']} />
        <SkeletonBlock width="60%" height={spacing['2xl']} />
      </View>
    </View>
  );
}

/**
 * 큰 이미지 + 크롭 모서리. 썸네일에서 이어지는 느낌을 주려 살짝 작은 배율에서 페이드인한다
 * (공유 요소 전환 대체). 모션 줄이기면 처음부터 최종 상태.
 */
function DetailImage({ item }: { item: CaptureListItem }): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: motion.easing.emphasized,
    });
  }, [reducedMotion, progress]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: IMAGE_ENTER_SCALE + (1 - IMAGE_ENTER_SCALE) * progress.value }],
  }));

  return (
    <View style={styles.imageSection}>
      <Animated.View style={enterStyle}>
        <CropFrame outset={IMAGE_CROP_OUTSET} color="textPrimary">
          <View style={[styles.image, { backgroundColor: colors.bgMuted }]}>
            {item.thumbnailUrl ? (
              <Image
                style={StyleSheet.absoluteFill}
                source={{ uri: item.thumbnailUrl }}
                contentFit="cover"
                contentPosition="top"
                transition={motion.duration.fast}
                accessibilityLabel={item.title}
              />
            ) : (
              <View
                style={styles.imagePlaceholder}
                accessible
                accessibilityRole="image"
                accessibilityLabel={t('captures.detail.imagePlaceholder')}
              >
                <Icon name="images" size={32} color="textSecondary" />
              </View>
            )}
          </View>
        </CropFrame>
      </Animated.View>
    </View>
  );
}

/** mono 메타 머리표(캡처 일시 · 상태) + 제목 + 요약. */
function TitleBlock({ item }: { item: CaptureListItem }): ReactNode {
  const stamp = formatStamp(item.createdAt);
  const statusKey = `captures.detail.status.${item.status}`;
  const statusLabel = t(statusKey);
  // 알 수 없는 상태값이면 키가 그대로 돌아오므로 머리표에서 뺀다.
  const meta = [stamp, statusLabel === statusKey ? '' : statusLabel]
    .filter((s) => s.length > 0)
    .join(' · ');
  const title = item.title.trim().length > 0 ? item.title : t('captures.untitled');

  return (
    <View style={styles.titleBlock}>
      {meta.length > 0 ? (
        <Eyebrow
          accessibilityLabel={`${t('captures.detail.meta.capturedAt', {
            when: formatSpokenDateTime(item.createdAt),
          })}, ${statusLabel}`}
        >
          {meta}
        </Eyebrow>
      ) : null}
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {item.summary.trim().length > 0 ? (
        <Text variant="body" color="textSecondary">
          {item.summary}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 뽑힌 항목(일정·택배). 각 항목은 구분선 한 줄로 나눈 행.
 * 택배는 OCR 원문에서 운송장을 찾았을 때만, 한국어 로케일에서만 보인다(택배 기능이 ko 한정).
 */
function ExtractedBlock({ item }: { item: CaptureListItem }): ReactNode {
  const { colors } = useTheme();
  const parcel = useMemo(
    () =>
      getLocale() === 'ko' && isLikelyParcelSms(item.ocrText) ? extractParcel(item.ocrText) : null,
    [item.ocrText],
  );
  const event = item.hasEvent ? item.event : null;

  if (!event && !parcel) return null;

  return (
    <View>
      {event ? (
        <View style={[styles.extractRow, { borderTopColor: colors.border }]}>
          <Eyebrow>{t('captures.detail.kind.event')}</Eyebrow>
          <ExtractedEventRow event={event} showLowConfidenceHint={item.calendarEventId === null} />
          <CalendarAction item={item} event={event} />
        </View>
      ) : null}
      {parcel ? (
        <View style={[styles.extractRow, { borderTopColor: colors.border }]}>
          <Eyebrow>
            {parcel.carrierNameHint
              ? `${t('captures.detail.kind.parcel')} · ${parcel.carrierNameHint}`
              : t('captures.detail.kind.parcel')}
          </Eyebrow>
          <Text variant="monoLg" selectable>
            {maskInvoice(parcel.invoiceNo)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 일정 행의 캘린더 액션. 미등록이면 "캘린더에 등록"(미연결이면 먼저 연결 시도),
 * 등록됐으면 "등록됨" 줄 + (딥링크가 있으면) "캘린더에서 열기".
 * 흐름은 캡처 시트와 같은 useAddToCalendar 훅. 성공 피드백은 토스트 대신 화면 안 체크+형광펜 연출.
 */
function CalendarAction({ item, event }: { item: CaptureListItem; event: CaptureEvent }): ReactNode {
  const calendar = useAddToCalendar({
    captureId: item.id,
    event,
    initiallyAdded: item.calendarEventId !== null,
    initialHtmlLink: item.calendarHtmlLink,
    successFeedback: 'inline',
    announceText: t('captures.detail.registered.text'),
  });

  if (!calendar.added) {
    // 확신 낮은(또는 확신도 없는 구버전) 일정은 "확인 후 추가" — 날짜를 한 번 더 보게 한다(원격 #5).
    const label =
      event.confidence === 'high'
        ? t('captures.detail.action.addToCalendar')
        : t('capture.action.confirmAndAdd');
    return (
      <Button
        variant="primary"
        size="md"
        fullWidth
        loading={calendar.busy}
        onPress={() => void calendar.add()}
        accessibilityLabel={label}
        leftIcon={<Icon name="calendar" size={20} color="onPrimary" />}
        style={styles.actionButton}
      >
        {label}
      </Button>
    );
  }

  return (
    <View style={styles.registered}>
      <RegisteredLine justNow={calendar.justAdded} />
      {calendar.htmlLink ? (
        <Button
          variant="secondary"
          size="sm"
          onPress={() => void calendar.open()}
          accessibilityLabel={t('captures.detail.action.openInCalendar')}
          rightIcon={<Icon name="chevron-right" size={16} color="primary" />}
        >
          {t('captures.detail.action.openInCalendar')}
        </Button>
      ) : null}
    </View>
  );
}

/**
 * "등록됨" 줄. 방금 등록했으면 체크가 튀어나오고 "등록했어요"에 형광펜이 그어진다(화면의 유일한 연출).
 * 서버에서 이미 등록된 상태로 열었으면 조용한 success 색 줄만.
 */
function RegisteredLine({ justNow }: { justNow: boolean }): ReactNode {
  const reducedMotion = useReducedMotion();
  const animate = justNow && !reducedMotion;
  const scale = useSharedValue(animate ? CHECK_ENTER_SCALE : 1);

  useEffect(() => {
    if (!animate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(1, motion.spring.bouncy);
  }, [animate, scale]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.registeredLine}>
      <Animated.View style={checkStyle}>
        <Icon name="check-circle" size={20} color="success" />
      </Animated.View>
      {justNow ? (
        <Marked
          variant="bodyStrong"
          text={t('captures.detail.registered.text')}
          mark={t('captures.detail.registered.mark')}
          animate={animate}
          delay={motion.duration.fast}
        />
      ) : (
        // 라이트 success(#0F8A4A)는 종이 바탕에서 약 4.0:1 → 글씨는 잉크, 색은 체크 아이콘이 맡는다.
        <Text variant="bodyStrong">
          {t('captures.detail.registered.static')}
        </Text>
      )}
    </View>
  );
}

/**
 * OCR 원문 — 기본 접힘. "인식된 글자 보기"를 누르면 높이가 펼쳐진다.
 * 본문은 절대 배치로 먼저 그려 높이를 재고, 바깥 상자의 높이만 0↔측정값으로 움직인다.
 * 영수증·쇼핑 캡처의 카드번호는 화면에서만 가린다(원문 데이터는 그대로, 원격 #6).
 */
function OcrSection({ ocrText, category }: { ocrText: string; category: string }): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const hasText = ocrText.trim().length > 0;
  const display = useMemo(() => maskForCategory(ocrText, category), [ocrText, category]);

  useEffect(() => {
    const target = open ? 1 : 0;
    progress.value = reducedMotion
      ? target
      : withTiming(target, { duration: motion.duration.slow, easing: motion.easing.standard });
  }, [open, reducedMotion, progress]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 90}deg` }],
  }));

  const handleLayout = (e: LayoutChangeEvent): void => {
    contentHeight.value = e.nativeEvent.layout.height;
  };

  if (!hasText) {
    return (
      <View style={[styles.ocrSection, { borderTopColor: colors.border }]}>
        <Text variant="caption" color="textSecondary" style={styles.ocrEmpty}>
          {t('captures.detail.ocrEmpty')}
        </Text>
      </View>
    );
  }

  const label = open ? t('captures.detail.ocrHide') : t('captures.detail.ocrShow');

  return (
    <View style={[styles.ocrSection, { borderTopColor: colors.border }]}>
      <PressableScale
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={styles.ocrToggle}
      >
        <Text variant="bodyStrong" color="primary">
          {label}
        </Text>
        <Animated.View style={chevronStyle}>
          <Icon name="chevron-right" size={20} color="primary" />
        </Animated.View>
      </PressableScale>

      <Animated.View
        style={[styles.ocrClip, bodyStyle]}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        <View onLayout={handleLayout} style={styles.ocrMeasure}>
          <Text variant="body" selectable style={styles.ocrText}>
            {display.text}
          </Text>
          {display.masked ? (
            <View style={styles.maskHint}>
              <Icon name="shield" size={16} color="textSecondary" />
              <Text variant="caption" color="textSecondary" style={styles.flex}>
                {t('captures.detail.sensitivity.maskHint')}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * 데이터 처리 — 무엇이 기기에서, 무엇이 서버에서 처리되는지 정직하게 적는다("기기에서만" 같은 과장 금지).
 * 마지막 줄의 "내 데이터 삭제"는 설정 탭의 삭제 행으로 보낸다.
 */
function DataFlowSection(): ReactNode {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.dataFlow, { borderTopColor: colors.border }]}>
      <Eyebrow accessibilityRole="header">{t('captures.detail.dataFlow.label')}</Eyebrow>
      <View>
        {DATA_FLOW_STEPS.map((step, i) => (
          <View
            key={step.key}
            style={[
              styles.dataFlowRow,
              i < DATA_FLOW_STEPS.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                : null,
            ]}
          >
            <Icon name={step.icon} size={16} color="textSecondary" />
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              {t(step.key)}
            </Text>
          </View>
        ))}
      </View>
      <PressableScale
        onPress={() => router.push('/settings')}
        accessibilityRole="link"
        accessibilityLabel={t('captures.detail.dataFlow.deleteLink')}
        style={styles.dataFlowLink}
      >
        <Text variant="bodyStrong" color="primary">
          {t('captures.detail.dataFlow.deleteLink')}
        </Text>
        <Icon name="chevron-right" size={16} color="primary" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skeletonLines: {
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  imageSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: IMAGE_ASPECT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  extractRow: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  actionButton: {
    marginTop: spacing.md,
  },
  registered: {
    marginTop: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  registeredLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ocrSection: {
    marginHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ocrEmpty: {
    paddingVertical: spacing.lg,
  },
  ocrToggle: {
    minHeight: MIN_TOUCH + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ocrClip: {
    overflow: 'hidden',
  },
  maskHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  dataFlow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  dataFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dataFlowLink: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  ocrMeasure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  ocrText: {
    paddingBottom: spacing.lg,
  },
});
