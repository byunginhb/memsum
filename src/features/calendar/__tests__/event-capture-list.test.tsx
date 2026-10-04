import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import { EventCaptureList } from '@/features/calendar/EventCaptureList';
import { CaptureCard } from '@/features/captures/CaptureCard';
import { dayParts, formatShortDate } from '@/features/captures/capture-format';
import type { CaptureListItem } from '@/features/captures/types';
import { t } from '@/i18n';

jest.mock('expo-font', () => ({ isLoaded: () => false }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/design/icons/Icon', () => ({ Icon: () => null }));
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

// 시각 문자열은 오프셋 없이(로컬 시각) 둬서 테스트 머신 시간대와 무관하게 만든다.
function makeItem(overrides: Partial<CaptureListItem> = {}): CaptureListItem {
  return {
    id: 'c1',
    title: '팀 회의',
    summary: '',
    ocrText: '',
    createdAt: '2026-10-04T09:41:00',
    thumbnailUrl: null,
    imagePath: null,
    hasEvent: true,
    event: {
      title: '팀 회의',
      starts_at: '2026-10-12T14:00:00',
      ends_at: null,
      location: '강남역',
    },
    status: 'ocr_done',
    category: 'etc',
    calendarEventId: null,
    calendarHtmlLink: null,
    ...overrides,
  };
}

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

function textsOf(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAllByType('Text' as never)
    .flatMap((n) => {
      const c = n.props.children as unknown;
      return Array.isArray(c) ? c : [c];
    })
    .filter((c): c is string => typeof c === 'string');
}

describe('capture-format', () => {
  it('mono 머리표용 고정 숫자 형식을 만든다', () => {
    expect(formatShortDate('2026-10-04T09:41:00')).toBe('10.04');
    expect(dayParts('2026-10-12T14:00:00', new Date('2026-10-12T08:00:00'))?.isToday).toBe(true);
    expect(dayParts('잘못된 값')).toBeNull();
  });
});

describe('EventCaptureList', () => {
  it('날짜 열 + 내용 행을 그리고, 등록 버튼과 등록됨 상태를 구분한다', () => {
    const onRegister = jest.fn();
    const tree = render(
      <EventCaptureList
        upcoming={[makeItem()]}
        past={[makeItem({ id: 'c2', calendarEventId: 'e1', calendarHtmlLink: 'https://x' })]}
        onRegister={onRegister}
        onOpen={jest.fn()}
        onOpenCapture={jest.fn()}
        registeringId={null}
      />,
    );
    const texts = textsOf(tree);
    expect(texts).toEqual(expect.arrayContaining(['12', '팀 회의', '14:00 · 강남역', t('calendar.item.registered')]));
    act(() => tree.unmount());
  });
});

describe('CaptureCard', () => {
  it('일정이 있으면 형광펜 날짜표를 붙이고 스크린리더 라벨을 한 문장으로 만든다', () => {
    const tree = render(<CaptureCard item={makeItem()} onPress={jest.fn()} />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['10.12', '팀 회의', '10.04']));
    const pressable = tree.root.findAll((n) => n.props.accessibilityRole === 'button')[0];
    expect(pressable?.props.accessibilityLabel).toContain('팀 회의');
    act(() => tree.unmount());
  });
});
