'use client';

import { useState } from 'react';

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
    } catch {
      // Even on network failure, navigate home — the cookie is cleared on the
      // server side or will age out.
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-[var(--fg-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
    >
      قطع الربط
    </button>
  );
}
