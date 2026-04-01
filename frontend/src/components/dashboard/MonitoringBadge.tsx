import React, { useState, useEffect } from 'react';

export const MonitoringBadge: React.FC<{ lastFetchedAt: Date | null; isFetching: boolean }> = ({ lastFetchedAt, isFetching }) => {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const minutesAgo = lastFetchedAt ? Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000) : null;
  const label = isFetching ? 'Checking...' : minutesAgo === null ? 'Starting...' : minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Monitoring active</span>
      <span className="text-[10px] text-emerald-500 dark:text-emerald-600 hidden sm:inline">· {label}</span>
    </div>
  );
};
