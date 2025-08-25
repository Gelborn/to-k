import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Tag, Users, LogOut, X, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Tags', href: '/tags', icon: Tag },
  { name: 'Accounts', href: '/accounts', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { theme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        ${theme === 'dark' 
          ? 'bg-black/95 backdrop-blur-xl border-r border-gray-800/30' 
          : 'bg-white/95 backdrop-blur-xl border-r border-gray-200/50'
        }
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col min-h-screen
      `}>
        <div className={`flex items-center justify-between h-16 px-4 border-b ${
          theme === 'dark' ? 'border-gray-800/30' : 'border-gray-200/50'
        }`}>
          <h1 className={`text-xl font-bold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            to-k
          </h1>
          <button
            onClick={onToggle}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive 
                    ? theme === 'dark'
                      ? 'bg-gray-800/80 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-900 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3 transition-colors" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* User info and controls */}
        <div className={`p-3 border-t ${
          theme === 'dark' ? 'border-gray-800/30' : 'border-gray-200/50'
        }`}>
          <div className="space-y-3">
            {/* User info */}
            <div className={`flex items-center px-3 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'
            }`}>
              <div className={`p-1.5 rounded-md mr-3 ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'
              }`}>
      </div>
    </>
  );
};