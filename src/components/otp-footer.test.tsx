// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import OTPVerificationModal from './OTPVerificationModal';
import Footer from './home/Footer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  vi.useRealTimers();
});

describe('OTP deadline and footer', () => {
  it('shows the exact accessible destination in the existing footer', () => {
    const html = renderToStaticMarkup(<Footer onNavigate={() => {}} onOpenAbout={() => {}} />);
    expect(html).toContain('سایت هیئت نوالهدا یزد');
    expect(html).toContain('href="https://tanoryazd.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('keeps one countdown tied to the server deadline across rerenders and reopen', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
    const deadline = new Date(Date.now() + 120_000).toISOString();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const render = (open: boolean) => <OTPVerificationModal
      isOpen={open} onClose={() => {}} onSuccess={() => {}} userPhone="09****1234"
      nationalCode="1234567891" challengeToken="signed" expiresIn={120}
      expiresAt={deadline} loginPassword="" purpose="registration"
      onChallengeToken={() => {}} onExpiresIn={() => {}} onExpiresAt={() => {}} />;
    await act(async () => { root?.render(render(true)); });
    expect(container.textContent).toContain('زمان باقی‌مانده: 2:00');
    expect(container.textContent?.match(/زمان باقی‌مانده:/g)).toHaveLength(1);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    await act(async () => { root?.render(render(false)); root?.render(render(true)); });
    expect(container.textContent).toContain('زمان باقی‌مانده: 1:00');
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(container.textContent).toContain('زمان باقی‌مانده: 0:00');
    expect([...container.querySelectorAll('button')].find(b => b.textContent?.includes('ارسال مجدد'))?.disabled).toBe(false);
  });
});
