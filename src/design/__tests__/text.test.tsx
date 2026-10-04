import { act, create } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

import { Text } from '@/design/components/Text/Text';
import { setFontsReady } from '@/design/theme/fonts';
import { fontFamily } from '@/design/tokens';

jest.mock('expo-font', () => ({ isLoaded: () => false }));
// 네이티브 워크릿 런타임이 없는 jest 환경 — 공식 대체 모듈 사용.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

const mounted: ReturnType<typeof create>[] = [];

function render(node: React.ReactElement) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(node);
  });
  mounted.push(tree);
  return tree;
}

describe('Text', () => {
  afterEach(() => {
    act(() => {
      mounted.splice(0).forEach((tree) => tree.unmount());
    });
    setFontsReady(false);
  });

  it('서체 로드 전에는 fontFamily 없이 fontWeight로 대체한다', () => {
    const tree = render(<Text variant="title">제목</Text>);
    const style = StyleSheet.flatten(tree.root.findByType('Text' as never).props.style);
    expect(style.fontFamily).toBeUndefined();
    expect(style.fontWeight).toBe('700');
    expect(style.fontSize).toBe(22);
  });

  it('서체 로드 후에는 굵기별 fontFamily를 쓴다', () => {
    setFontsReady(true);
    const tree = render(<Text variant="display">헤드라인</Text>);
    const style = StyleSheet.flatten(tree.root.findByType('Text' as never).props.style);
    expect(style.fontFamily).toBe(fontFamily.black);
    expect(style.fontWeight).toBeUndefined();
  });

  it('mono 속 한글 구간만 Wanted Sans로 감싼다', () => {
    setFontsReady(true);
    const tree = render(<Text variant="mono">09:41 · 택배</Text>);
    const texts = tree.root.findAllByType('Text' as never);
    const inner = texts.find((n) => StyleSheet.flatten(n.props.style)?.fontFamily === fontFamily.semibold);
    expect(inner?.props.children).toBe('택배');
  });
});
