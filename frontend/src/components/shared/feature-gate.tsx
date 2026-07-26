"use client";

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  featureName: string;
  hasAccess: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  featureName,
  hasAccess,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const router = useRouter();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  // Default upgrade prompt
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="mx-auto w-fit rounded-full bg-gradient-to-br from-blue-500 to-blue-600 p-3 mb-4">
        <Crown className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Fitur Premium
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {featureName} hanya tersedia untuk paket berbayar.
        <br />
        Upgrade paket Anda untuk mengakses fitur ini.
      </p>
      <Button
        onClick={() => router.push('/seller/dashboard/subscription')}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
      >
        <Crown className="h-4 w-4 mr-2" />
        Upgrade Sekarang
      </Button>
    </div>
  );
}

interface FeatureBadgeProps {
  isPremium: boolean;
  size?: 'sm' | 'md';
}

export function FeatureBadge({ isPremium, size = 'sm' }: FeatureBadgeProps) {
  if (!isPremium) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <Crown className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      Premium
    </span>
  );
}

interface LockedFeatureButtonProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function LockedFeatureButton({
  onClick,
  children,
  className = '',
}: LockedFeatureButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={onClick || (() => router.push('/seller/dashboard/subscription'))}
      className={`relative overflow-hidden ${className}`}
      disabled
    >
      <div className="absolute inset-0 bg-gray-100 opacity-60" />
      <div className="relative flex items-center justify-center gap-2 opacity-50">
        {children}
        <Lock className="h-4 w-4" />
      </div>
    </button>
  );
}
