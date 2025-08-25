import React from 'react';
import { Bell, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuToggle }) => {
  return (
    <header className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 px-4 sm:px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 mr-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800/50 rounded-xl transition-all duration-200">
            <Bell className="w-5 h-5" />
          </button>
          <div className="hidden sm:block text-sm text-gray-400 font-medium tracking-wider">
            ADMIN ACCESS
          </div>
        </div>
      </div>
    </header>
  );
};