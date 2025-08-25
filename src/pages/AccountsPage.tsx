import React from 'react';
import { Users, Calendar, FolderOpen } from 'lucide-react';
import { Account } from '../types';

export const AccountsPage: React.FC = () => {
  const accounts: Account[] = [
    {
      id: '1',
      type: 'owner',
      projects: 3,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      type: 'user',
      projects: 1,
      created_at: '2024-01-14T15:30:00Z',
    },
    {
      id: '3',
      type: 'user',
      projects: 0,
      created_at: '2024-01-13T09:15:00Z',
    },
    {
      id: '4',
      type: 'owner',
      projects: 2,
      created_at: '2024-01-12T14:20:00Z',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Accounts</h1>
        <div className="text-sm text-gray-400">
          Total: {accounts.length} accounts
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">
                    {account.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-500 mr-2" />
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        account.type === 'owner' 
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800' 
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-400 dark:border-gray-700'
                      }`}>
                        {account.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-800 dark:text-gray-100">
                      <FolderOpen className="w-4 h-4 text-gray-500 mr-2" />
                      {account.projects}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(account.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No accounts found.</p>
        </div>
      )}
    </div>
  );
};