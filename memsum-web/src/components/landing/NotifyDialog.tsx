'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';

import { SUPPORT_EMAIL } from '@/lib/site';
import type { LandingCopy } from '@/lib/landing-copy';

type NotifyDialogProps = {
  open: boolean;
  onClose: () => void;
  copy: LandingCopy;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 출시 알림 신청 모달.
 * 앱 미출시 → 가짜 스토어 링크 대신 이 모달로 연결한다(정직 규칙 §7).
 * 제출은 /api/notify로 POST해 Supabase에 이메일을 저장한다(허니팟으로 봇 차단).
 * 저장 실패 시에만 mailto 폴백 안내를 노출한다.
 * focus trap · Esc 닫기 · 배경 스크롤 잠금 · 닫으면 트리거로 포커스 복귀.
 * 모든 문구는 로케일 사전(`copy.notifyDialog`)에서 주입.
 */
export function NotifyDialog({ open, onClose, copy }: NotifyDialogProps) {
  const c = copy.notifyDialog;
  const bk = copy.isKorean ? 'break-keep' : '';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 저장 실패 시에만 true — mailto 폴백 안내를 켠다.
  const [fallback, setFallback] = useState(false);
  // 허니팟(봇 차단) — 사람은 비워두는 숨김 필드.
  const [company, setCompany] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // 열릴 때: 상태 초기화(깨끗한 시작) · 트리거 저장 · 스크롤 잠금 · 입력 포커스
  //         · 배경 형제에 inert/aria-hidden 부여(스크린리더가 모달 뒤로 못 가게).
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 모달을 포함하지 않는 body 직계 자식 전부를 비활성화(배경 inert).
    const root = rootRef.current;
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (root && child.contains(root)) continue; // 모달이 속한 트리는 제외
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
      inerted.push(child);
    }

    const focusTimer = window.setTimeout(() => {
      setSubmitted(false);
      setError(null);
      setEmail('');
      setSubmitting(false);
      setFallback(false);
      setCompany('');
      inputRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      // 배경 inert/aria-hidden 해제.
      for (const el of inerted) {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
      // 닫히면 트리거로 포커스 복귀 — 트리거가 여전히 DOM에 살아있을 때만 호출.
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) {
        trigger.focus?.();
      }
    };
  }, [open]);

  // Esc 닫기 + Tab focus trap.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // open은 클라이언트 상호작용으로만 true가 되므로 서버에선 항상 null(하이드레이션 불일치 없음).
  // document 미존재(SSR) 시에도 안전하게 null.
  if (!open || typeof document === 'undefined') return null;

  // 저장 실패 폴백용 mailto(제목+본문에 입력 이메일 포함).
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    c.mailtoSubject,
  )}&body=${encodeURIComponent(c.mailtoBody.replace('{email}', email.trim()))}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError(c.validationError);
      setFallback(false);
      return;
    }
    setError(null);
    setFallback(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          locale: copy.isKorean ? 'ko' : 'en',
          company, // 허니팟(사람은 빈 값)
        }),
      });
      if (!res.ok) throw new Error('store_failed');
      setSubmitted(true);
    } catch {
      // 저장 실패 — 에러 + mailto 폴백 안내.
      setError(c.submitError);
      setFallback(true);
    } finally {
      setSubmitting(false);
    }
  };

  // 실패 폴백 안내문의 {email} 토큰을 mailto 링크로 치환 — 앞뒤 텍스트 분리.
  const [errorHelpBefore, errorHelpAfter] = c.errorHelp.split('{email}');

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-title"
      aria-describedby="notify-desc"
    >
      {/* 배경 — 클릭 시 닫기. 포커스 순환에서 제외(닫기 X 버튼만 포커서블)하려
          tabIndex=-1. Tab trap이 배경 버튼으로 새지 않게 한다. */}
      <button
        type="button"
        aria-label={c.closeAria}
        tabIndex={-1}
        className="absolute inset-0 bg-(--color-ink)/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-(--radius-block) border border-(--color-line) bg-(--color-card) p-7 shadow-(--shadow-float)"
      >
        <button
          type="button"
          aria-label={c.closeAria}
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-(--color-ink-soft) transition-colors hover:bg-(--color-primary-soft) hover:text-(--color-ink)"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {submitted ? (
          <div className="py-4 text-center">
            <span className="coral-pulse mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
              <Check size={24} aria-hidden="true" />
            </span>
            <h2
              id="notify-title"
              className={`mt-4 text-xl font-bold tracking-tight ${bk}`}
            >
              {c.successTitle}
            </h2>
            <p
              id="notify-desc"
              className={`mt-2 text-sm leading-relaxed ${bk} text-(--color-ink-soft)`}
            >
              {c.successDescription}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-(--color-primary) px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--color-primary-strong)"
            >
              {c.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2
              id="notify-title"
              className={`text-xl font-bold tracking-tight ${bk}`}
            >
              {c.formTitle}
            </h2>
            <p
              id="notify-desc"
              className={`mt-2 text-sm leading-relaxed ${bk} text-(--color-ink-soft)`}
            >
              {c.formDescription}
            </p>
            {/* 허니팟 — 사람에겐 숨겨진 필드. 봇이 채우면 서버가 저장하지 않는다. */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
            />
            <label htmlFor="notify-email" className="sr-only">
              {c.emailLabel}
            </label>
            <input
              ref={inputRef}
              id="notify-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'notify-error' : undefined}
              className="mt-5 w-full rounded-2xl border border-(--color-line) bg-(--color-cream) px-4 py-3 text-base text-(--color-ink) outline-none transition-colors focus:border-(--color-primary) disabled:opacity-60"
            />
            {error ? (
              <p id="notify-error" className={`mt-2 text-sm ${bk}`}>
                <span className="text-(--color-accent)">{error}</span>
                {fallback ? (
                  <span className="text-(--color-ink-soft)">
                    {' '}
                    {errorHelpBefore}
                    <a
                      className="font-semibold text-(--color-primary) underline underline-offset-2"
                      href={mailtoHref}
                    >
                      {SUPPORT_EMAIL}
                    </a>
                    {errorHelpAfter}
                  </span>
                ) : null}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-full bg-(--color-primary) px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--color-primary-strong) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? c.submitting : c.submit}
            </button>
            <p className={`mt-3 text-center text-xs leading-relaxed ${bk} text-(--color-ink-faint)`}>
              {c.promise}
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
