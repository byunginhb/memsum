import { act, create } from 'react-test-renderer';

import { Marked } from '@/design/components/Marked/Marked';

jest.mock('expo-font', () => ({ isLoaded: () => false }));
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// 대체 모듈에 useReducedMotion이 없어 보탠다.
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));

function textsOf(node: React.ReactElement): string[] {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(node);
  });
  const out = tree.root
    .findAllByType('Text' as never)
    .map((n) => n.props.children as unknown)
    .filter((c): c is string => typeof c === 'string');
  act(() => tree.unmount());
  return out;
}

describe('Marked', () => {
  it('형광펜 구절과 맞붙은 조사를 같은 덩어리로 묶어 단어 단위로 흘린다', () => {
    const texts = textsOf(<Marked text="이번 주, 일정 4개를 건졌어요" mark="일정 4개" animate={false} />);
    expect(texts).toEqual(['이번 ', '주, ', '일정 4개', '를 ', '건졌어요']);
  });

  it('구절을 못 찾으면 문장만 그린다', () => {
    const texts = textsOf(<Marked text="아직 건진 게 없어요" mark="없는 구절" />);
    expect(texts).toEqual(['아직 건진 게 없어요']);
  });
});
