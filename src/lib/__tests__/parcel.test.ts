// 택배 추출·택배사 해석 회귀 테스트(합성 데이터).
// 실제 택배 SMS 검증에서 발견한 두 버그를 고정한다:
//   1) "CU반값택배"가 GS Postbox로 오인되던 문제(CARRIER_HINTS 우선순위).
//   2) resolveCarrier가 약한 토큰("CU")으로 "CUBEFLOW"에 오매칭되던 문제.

import { extractParcel, isLikelyParcelSms, maskInvoice, resolveCarrier } from '../parcel';

describe('extractParcel — 운송장/택배사 추출', () => {
  it('전화·주소 숫자가 섞여도 라벨된 송장번호만 추출한다', () => {
    const text =
      '[로젠택배]\n문의 010-1234-5678\n송장번호: 9876543210\n배송장소: 양현로138 901호\n배송예정 18시~21시';
    const r = extractParcel(text);
    expect(r?.invoiceNo).toBe('9876543210');
    expect(r?.carrierNameHint).toBe('로젠택배');
  });

  it('"CU반값택배"는 GS가 아니라 CU 편의점택배로 인식한다', () => {
    const r = extractParcel('[CU반값택배] 배송완료 안내\n운송장번호: 1112223334');
    expect(r?.invoiceNo).toBe('1112223334');
    expect(r?.carrierNameHint).toBe('CU 편의점택배');
  });

  it('주요 택배사 힌트를 인식한다', () => {
    expect(extractParcel('[CJ대한통운] 송장번호 1111111111')?.carrierNameHint).toBe('CJ대한통운');
    expect(extractParcel('한진택배 운송장번호 2222222222')?.carrierNameHint).toBe('한진택배');
    expect(extractParcel('롯데택배입니다 운송장번호: 3333333333')?.carrierNameHint).toBe('롯데택배');
  });

  it('택배 단서가 없으면 null', () => {
    expect(extractParcel('안녕하세요 점심 같이 먹을래요? 12시에 봐요')).toBeNull();
    expect(isLikelyParcelSms('인증번호는 123456 입니다')).toBe(false);
  });
});

describe('maskInvoice', () => {
  it('10자리: 앞4 + 별표 + 뒤2', () => {
    expect(maskInvoice('1234567890')).toBe('1234****90');
  });
  it('13자리: 앞4 + 별표 + 뒤4', () => {
    expect(maskInvoice('1234567890123')).toBe('1234*****0123');
  });
});

describe('resolveCarrier — 후보 + 힌트로 택배사 확정', () => {
  // recommend가 후보를 못 좁혀 전체 택배사를 줄 때의 함정(큐브플로우가 CU 앞에 옴).
  const many = [
    { code: '88', name: '큐런택배' },
    { code: '144', name: '큐브플로우(CUBEFLOW)' },
    { code: '46', name: 'CU 편의점택배' },
    { code: '08', name: '롯데택배' },
  ];

  it('CU 힌트는 CUBEFLOW가 아니라 CU 편의점택배(46)를 고른다', () => {
    expect(resolveCarrier(many, 'CU 편의점택배')?.code).toBe('46');
  });

  it('정확 이름 매칭 우선', () => {
    expect(resolveCarrier(many, '롯데택배')?.code).toBe('08');
  });

  it('후보 1개면 그대로, 힌트 없고 복수면 null(사용자 선택)', () => {
    expect(resolveCarrier([{ code: '06', name: '로젠택배' }], null)?.code).toBe('06');
    expect(resolveCarrier(many, null)).toBeNull();
  });
});
