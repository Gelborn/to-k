import React from 'react';
import { StatCard } from '../components/Dashboard/StatCard';
import { DashboardStats } from '../types';

export const DashboardPage: React.FC = () => {
  // Mock data - in a real app this would come from your API
  const stats: DashboardStats = {
    projects: 3,
    tags: 48,
    accounts: 12,
    activeUsers: 5,
    projectsTrend: 'up',
    tagsTrend: 'up',
    accountsTrend: 'flat',
    activeUsersTrend: 'down',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Projects" 
          value={stats.projects} 
          trend={stats.projectsTrend} 
        />
        <StatCard 
          title="Tags" 
          value={stats.tags} 
          trend={stats.tagsTrend} 
        />
        <StatCard 
          title="Accounts" 
          value={stats.accounts} 
          trend={stats.accountsTrend} 
        />
        <StatCard 
          title="Active Users" 
          value={stats.activeUsers} 
          trend={stats.activeUsersTrend} 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-300 dark:border-gray-800/50 rounded-2xl p-6 animate-fade-in shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'New project created', time: '2 hours ago', type: 'project' },
              { action: 'Tag added to profile', time: '4 hours ago', type: 'tag' },
              { action: 'User account created', time: '6 hours ago', type: 'account' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 bg-gray-100 dark:bg-gray-800/30 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-4 ${
                    activity.type === 'project' ? 'bg-blue-400' :
                    activity.type === 'tag' ? 'bg-green-400' : 'bg-purple-400'
                  }`} />
                  <span className="text-gray-800 dark:text-gray-300 text-sm font-medium">{activity.action}</span>
                </div>
                <span className="text-gray-600 text-xs font-medium">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-300 dark:border-gray-800/50 rounded-2xl p-6 animate-fade-in shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">System Status</h3>
          <div className="space-y-4">
            {[
              { service: 'API Server', status: 'operational' },
              { service: 'Database', status: 'operational' },
              { service: 'File Storage', status: 'operational' },
            ].map((service, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 bg-gray-100 dark:bg-gray-800/30 rounded-xl">
                <span className="text-gray-800 dark:text-gray-300 text-sm font-medium">{service.service}</span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse" />
                  <span className="text-green-500 text-xs font-semibold capitalize tracking-wider">{service.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};