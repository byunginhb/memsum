import { maskCardNumbers, maskForCategory } from '../sensitive-mask';

describe('maskCardNumbers', () => {
  it('하이픈·공백·연속 16자리 카드번호를 앞 4자리만 남기고 가린다', () => {
    expect(maskCardNumbers('카드 1234-5678-9012-3456 승인').text).toBe('카드 1234-****-****-**** 승인');
    expect(maskCardNumbers('1234 5678 9012 3456').text).toBe('1234-****-****-****');
    expect(maskCardNumbers('no 1234567890123456.').text).toBe('no 1234-****-****-****.');
  });

  it('16자리가 아닌 숫자(전화번호·운송장·금액)는 그대로 두고 masked=false', () => {
    const text = '010-1234-5678 / 운송장 123456789012 / 24,000원';
    expect(maskCardNumbers(text)).toEqual({ text, masked: false });
  });
});

describe('maskForCategory', () => {
  it('영수증·쇼핑만 가린다', () => {
    const card = '1234-5678-9012-3456';
    expect(maskForCategory(card, 'receipt').masked).toBe(true);
    expect(maskForCategory(card, 'shopping').masked).toBe(true);
    expect(maskForCategory(card, 'info')).toEqual({ text: card, masked: false });
  });
});
