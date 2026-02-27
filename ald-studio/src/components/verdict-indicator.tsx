'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type VerdictIndicatorProps = {
  verdict: string | null;
};

export default function VerdictIndicator({ verdict }: VerdictIndicatorProps) {
  if (!verdict) {
    return null;
  }

  const lowerCaseVerdict = verdict.toLowerCase();

  if (lowerCaseVerdict === 'good' || lowerCaseVerdict === 'pass') {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-semibold">{verdict}</span>
      </div>
    );
  }

  if (lowerCaseVerdict === 'partial') {
    return (
      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-semibold">{verdict}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
      <XCircle className="h-5 w-5" />
      <span className="font-semibold">{verdict}</span>
    </div>
  );
}
