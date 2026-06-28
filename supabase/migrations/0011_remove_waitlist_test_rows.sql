-- 엔드포인트 검증 중 넣은 테스트 행 정리.
-- example.com은 RFC 2606 예약 도메인이라 실제 신청과 겹치지 않는다(안전).
delete from public.launch_waitlist where email like '%@example.com';
