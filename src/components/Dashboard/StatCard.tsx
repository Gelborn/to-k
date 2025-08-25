import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  trend: 'up' | 'down' | 'flat';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, trend }) => {
  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    flat: Minus,
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    flat: 'text-gray-400',
  };

  const TrendIcon = trendIcons[trend];

  return (
    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-300 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-400 dark:hover:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-all duration-300 group animate-fade-in shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white transition-colors">
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-xl bg-gray-200 dark:bg-gray-800/50 group-hover:bg-gray-300 dark:group-hover:bg-gray-800/70 transition-all duration-200`}>
          <TrendIcon className={`w-5 h-5 ${trendColors[trend]} group-hover:scale-110 transition-transform`} />
        </div>
      </div>
    </div>
  );
};