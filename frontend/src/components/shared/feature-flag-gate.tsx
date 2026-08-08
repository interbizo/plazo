'use client';

import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

interface FeatureFlagGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Jika true, tampilkan halaman 404 Next.js saat flag OFF. Default: false */
  showNotFound?: boolean;
  /** Jika true, tampilkan children saat loading (optimistic). Default: false */
  optimistic?: boolean;
}

/**
 * Gate berbasis feature flag (client-side).
 * Hanya merender children jika feature flag aktif.
 * Jika showNotFound=true dan flag OFF, render halaman 404 Next.js.
 */
export function FeatureFlagGate({
  flag,
  children,
  fallback = null,
  showNotFound = false,
  optimistic = false,
}: FeatureFlagGateProps) {
  const flags = useFeatureFlagsStore((s) => s.flags);
  const isLoaded = useFeatureFlagsStore((s) => s.isLoaded);
  const fetchFlags = useFeatureFlagsStore((s) => s.fetchFlags);

  useEffect(() => {
    fetchFlags();
  }, [flag, fetchFlags]);

  if (!isLoaded) {
    return optimistic ? <>{children}</> : null;
  }

  const enabled = flags[flag] !== 'false';

  if (!enabled) {
    if (showNotFound) {
      notFound();
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
