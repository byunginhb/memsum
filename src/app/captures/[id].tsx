import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { useToast } from '@/design/components/Toast/useToast';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import type { CaptureEvent } from '@/features/capture/types';
import type { CaptureListItem } from '@/features/captures/types';
import { useCapture } from '@/hooks/use-capture';
import { getLocale, t } from '@/i18n';
import { deleteCapture } from '@/lib/captures';
import { useCalendarStore } from '@/stores/calendar-store';
import { useCaptureStore } from '@/stores/capture-store';

/**
 * 캡처 상세 화면 — 기능명세 상세 플로우 (W4-C) + 캘린더 연동(C2).
 * 큰 이미지 + 제목/요약 + 이벤트 카드(있으면) + OCR 전체 텍스트 + 메타 + 하단 액션.
 * 캘린더 액션은 calendar-store와 연결돼 동작한다. 공유는 아직 준비 중(비활성).
 */
export default function CaptureDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { item, isLoading, error } = useCapture(id);
  const router = useRouter();
  const toast = useToast();
  const notifyDataChanged = useCaptureStore((s) => s.notifyDataChanged);
  const [isDeleting, setIsDeleting] = useState(false);

  // why here: 캘린더 연결 상태는 SecureStore 복원 후에 확정된다. 이 화면이 캘린더
  // 액션을 노출하므로 마운트 시 1회 복원을 보장한다(restore는 멱등이라 중복 호출 무해).
  const hydrated = useCalendarStore((s) => s.hydrated);
  const restore = useCalendarStore((s) => s.restore);
  useEffect(() => {
    if (!hydrated) void restore();
  }, [hydrated, restore]);

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
                router.back();
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
  }, [isDeleting, item, notifyDataChanged, toast, router]);

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('captures.detail.title'),
          // 항목 로드 후에만 삭제 버튼 노출. 삭제 중엔 스피너로 진행 표시.
          headerRight: () =>
            item ? (
              <Pressable
                onPress={handleDelete}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel={t('captures.detail.delete.action')}
                hitSlop={spacing.sm}
                style={styles.headerButton}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Icon name="trash-2" size={24} color="danger" />
                )}
              </Pressable>
            ) : null,
        }}
      />
      <DetailBody item={item} isLoading={isLoading} error={error} />
    </View>
  );
}

type DetailBodyProps = {
  item: CaptureListItem | null;
  isLoading: boolean;
  error: string | null;
};

function DetailBody({ item, isLoading, error }: DetailBodyProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const contentStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + spacing['4xl'],
      gap: spacing.xl,
    }),
    [insets.bottom],
  );

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgBase }]}>
        <Icon name="x" size={32} color="textSecondary" />
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          {error ?? t('captures.detail.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.bgBase }]}
      contentContainerStyle={contentStyle}
    >
      <DetailImage item={item} />
      <View style={styles.bodySection}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        {item.summary.trim().length > 0 ? (
          <Text style={[styles.summary, { color: colors.textSecondary }]}>{item.summary}</Text>
        ) : null}
      </View>

      {item.hasEvent && item.event ? (
        <View style={styles.bodySection}>
          <EventCard event={item.event} />
        </View>
      ) : null}

      <View style={styles.bodySection}>
        <OcrBlock ocrText={item.ocrText} />
      </View>

      <View style={styles.bodySection}>
        <MetaBlock item={item} />
      </View>

      <View style={styles.bodySection}>
        <DetailActions item={item} />
      </View>
    </ScrollView>
  );
}

/** 큰 썸네일. thumbnailUrl이 null이면 placeholder 표시. */
function DetailImage({ item }: { item: CaptureListItem }) {
  const { colors } = useTheme();

  if (!item.thumbnailUrl) {
    return (
      <View
        style={[styles.imagePlaceholder, { backgroundColor: colors.bgMuted }]}
        accessibilityRole="image"
        accessibilityLabel={t('captures.detail.imagePlaceholder')}
      >
        <Icon name="images" size={32} color="textSecondary" />
      </View>
    );
  }

  return (
    <Image
      style={styles.image}
      source={{ uri: item.thumbnailUrl }}
      contentFit="cover"
      transition={150}
      accessibilityLabel={item.title}
    />
  );
}

/** 감지된 이벤트 카드 — highlight 변형. 날짜·장소 표시. */
function EventCard({ event }: { event: CaptureEvent }) {
  const { colors } = useTheme();

  return (
    <Card variant="highlight">
      <View style={styles.eventRow}>
        <Icon name="calendar" size={20} color="accent" />
        <View style={styles.eventTexts}>
          <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{event.title}</Text>
          <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
            {formatDateTime(event.starts_at)}
          </Text>
          {event.location ? (
            <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
              {event.location}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** OCR 전체 텍스트 블록. "인식된 텍스트" 라벨 + 본문. */
function OcrBlock({ ocrText }: { ocrText: string }) {
  const { colors } = useTheme();
  const hasText = ocrText.trim().length > 0;

  return (
    <View style={styles.metaGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('captures.detail.ocrLabel')}
      </Text>
      <Card variant="outlined">
        <Text
          style={[styles.ocrText, { color: hasText ? colors.textPrimary : colors.textSecondary }]}
        >
          {hasText ? ocrText : t('captures.detail.ocrEmpty')}
        </Text>
      </Card>
    </View>
  );
}

/** 메타 정보(캡처 일시·상태). */
function MetaBlock({ item }: { item: CaptureListItem }) {
  const { colors } = useTheme();

  return (
    <View style={styles.metaGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('captures.detail.metaLabel')}
      </Text>
      <Card variant="flat" compact>
        <MetaRow
          label={t('captures.detail.meta.capturedAt')}
          value={formatDateTime(item.createdAt)}
        />
        <MetaRow
          label={t('captures.detail.meta.status')}
          value={t(`captures.detail.status.${item.status}`)}
        />
      </Card>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaRowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaRowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

/**
 * 하단 액션. 이벤트가 있으면 "캘린더에 추가"(연결 필요 시 자동 연결 시도)를 노출하고,
 * 이미 등록된 캡처면 "캘린더에서 열기"로 전환한다. 공유는 아직 준비 중(비활성).
 *
 * why 로컬 낙관적 갱신: useCapture 훅에는 refetch가 없으므로, 등록 성공 시 item을 다시
 * 불러오는 대신 이 컴포넌트의 로컬 state(justRegistered + htmlLink)로 즉시 "열기"로 바꾼다.
 */
function DetailActions({ item }: { item: CaptureListItem }) {
  const toast = useToast();

  // 스토어에서 진행 상태·액션을 구독한다(필요한 슬라이스만 선택해 리렌더 최소화).
  // 연결 상태(status)는 핸들러에서 getState()로 최신값을 직접 읽으므로 구독하지 않는다.
  const isBusy = useCalendarStore((s) => s.isBusy);
  const connect = useCalendarStore((s) => s.connect);
  const registerCapture = useCalendarStore((s) => s.registerCapture);

  // 등록 성공 후 낙관적 표시용. 서버 item 갱신 없이 버튼을 "열기"로 전환한다.
  const [justRegistered, setJustRegistered] = useState(false);
  const [registeredHtmlLink, setRegisteredHtmlLink] = useState<string | null>(null);
  // 이 버튼이 트리거한 작업 진행 여부. 중복 탭 방지 + 버튼 로딩 표시용.
  const [localBusy, setLocalBusy] = useState(false);

  // 서버 기준 등록 여부(calendarEventId) 또는 이번 세션 등록(justRegistered)이면 "열기".
  const isRegistered = item.calendarEventId !== null || justRegistered;
  // 딥링크는 서버 값 우선, 없으면 방금 등록 응답의 htmlLink를 쓴다.
  const htmlLink = item.calendarHtmlLink ?? registeredHtmlLink;

  // 스토어 작업 중이거나 이 화면이 띄운 작업 중이면 버튼 비활성(중복 탭 차단).
  const busy = isBusy || localBusy;

  /** 등록된 일정을 구글 캘린더 앱/웹에서 연다. 링크가 없으면 안내 토스트. */
  const handleOpen = useCallback(async () => {
    if (busy) return;
    if (!htmlLink) {
      // 등록은 됐지만 딥링크가 없을 수 있다(events.insert 응답에 htmlLink 누락 가능).
      // 별도 키가 없어 "등록됨" 의미의 success 문구를 info 톤으로 안내한다.
      toast.show({ tone: 'info', title: t('calendar.toast.registerSuccess') });
      return;
    }
    try {
      await Linking.openURL(htmlLink);
    } catch (openError) {
      console.error('[captures/detail] 캘린더 링크 열기 실패:', openError);
      toast.show({ tone: 'danger', title: t('calendar.toast.registerError') });
    }
  }, [busy, htmlLink, toast]);

  /** 캡처 이벤트를 구글 캘린더에 등록. 미연결이면 먼저 연결을 시도한다. */
  const handleAdd = useCallback(async () => {
    // 중복 탭 또는 이벤트 누락 시 무동작(타입상 event는 호출부에서 보장).
    if (busy || !item.event) return;

    setLocalBusy(true);
    try {
      // 미연결이면 먼저 OAuth 연결을 시도한다(취소/실패는 connect 내부에서 상태 반영).
      if (useCalendarStore.getState().status !== 'connected') {
        try {
          await connect();
        } catch (connectError) {
          // connect 실패는 아래 status 재확인에서 needConnect로 안내하므로 여기선 로깅만.
          console.error('[captures/detail] 캘린더 연결 실패:', connectError);
          toast.show({ tone: 'danger', title: t('calendar.toast.connectError') });
          return;
        }
      }

      // 연결 시도 후에도 connected가 아니면(취소 등) 등록을 진행하지 않는다.
      if (useCalendarStore.getState().status !== 'connected') {
        toast.show({ tone: 'info', title: t('calendar.toast.needConnect') });
        return;
      }

      const registration = await registerCapture({
        captureId: item.id,
        event: item.event,
      });

      // 낙관적 갱신: 서버 item 재조회 없이 즉시 "열기"로 전환한다.
      setRegisteredHtmlLink(registration.htmlLink);
      setJustRegistered(true);
      toast.show({ tone: 'success', title: t('calendar.toast.registerSuccess') });
    } catch (registerError) {
      console.error('[captures/detail] 캘린더 등록 실패:', registerError);
      toast.show({ tone: 'danger', title: t('calendar.toast.registerError') });
    } finally {
      setLocalBusy(false);
    }
  }, [busy, item.event, item.id, connect, registerCapture, toast]);

  return (
    <View style={styles.actions}>
      {isRegistered ? (
        <Button
          variant="primary"
          size="lg"
          loading={busy}
          onPress={handleOpen}
          accessibilityLabel={t('captures.detail.action.openInCalendar')}
          leftIcon={<Icon name="calendar" size={20} color="onPrimary" />}
        >
          {t('captures.detail.action.openInCalendar')}
        </Button>
      ) : item.hasEvent && item.event ? (
        <Button
          variant="primary"
          size="lg"
          loading={busy}
          onPress={handleAdd}
          accessibilityLabel={t('captures.detail.action.addToCalendar')}
          leftIcon={<Icon name="calendar" size={20} color="onPrimary" />}
        >
          {t('captures.detail.action.addToCalendar')}
        </Button>
      ) : null}
      {/* 공유 기능 준비 중: 의도적으로 비활성 유지(기존 동작 보존). */}
      <Button
        variant="secondary"
        size="lg"
        disabled
        onPress={() => undefined}
        accessibilityLabel={t('captures.detail.action.share')}
        leftIcon={<Icon name="share-2" size={20} color="primary" />}
      >
        {t('captures.detail.action.share')}
      </Button>
    </View>
  );
}

/** ISO8601 → 사람이 읽는 일시. 파싱 실패 시 원문 반환(앱이 깨지지 않음). */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // 디바이스 로케일에 의존하지 않도록 앱 로케일을 명시한다(KO/EN 일관성).
  const locale = getLocale() === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleString(locale);
}

const IMAGE_ASPECT_RATIO = 4 / 3;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  image: {
    width: '100%',
    aspectRatio: IMAGE_ASPECT_RATIO,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: IMAGE_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodySection: {
    paddingHorizontal: spacing.xl,
  },
  itemTitle: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
  },
  summary: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    marginTop: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventTexts: {
    flex: 1,
    gap: spacing.xs,
  },
  eventTitle: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  eventMeta: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  metaGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
  ocrText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metaRowLabel: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  metaRowValue: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodyMd.weight,
  },
  actions: {
    gap: spacing.md,
  },
});
