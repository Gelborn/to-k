import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Tag, Users, X,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Tags', href: '/tags', icon: Tag },
  { name: 'Owners', href: '/accounts', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  useAuth(); // still used for initials earlier; now footer removed, but keep hook ready if you re-add

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem('sidebar:collapsed') === '1'; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('sidebar:collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const sidebarWidth = collapsed ? 'lg:w-20' : 'lg:w-64';

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
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
          border-r border-gray-200 dark:border-gray-800/50 flex flex-col
          min-h-screen
          w-64 ${sidebarWidth}
          transform transition-transform duration-300 ease-in-out lg:transform-none
          transition-[width]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800/50">
          {/* Título expandido */}
          <h1
            className={`text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-all duration-200
              ${collapsed ? 'opacity-0 scale-95 w-0' : 'opacity-100 scale-100'}
            `}
          >
            tok chip <span className="text-gray-500 dark:text-gray-400 font-extralight"> | admin</span>
          </h1>

          {/* “tok” colapsado, centralizado */}
          <div
            className={`
              absolute inset-0 flex items-center justify-center pointer-events-none
              ${collapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
              transition-all duration-200
            `}
            aria-hidden={!collapsed}
          >
            <span className="text-xs font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              tok
            </span>
          </div>

          {/* Fechar no mobile */}
          <button
            onClick={onToggle}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Botão de colapso (na divisa, dentro da largura) */}
          <button
            onClick={toggleCollapsed}
            className="
              hidden lg:flex items-center justify-center
              absolute top-1/2 -translate-y-1/2 right-1
              w-7 h-7 rounded-full shadow-md border border-gray-200 dark:border-gray-800
              bg-white/90 dark:bg-gray-900/90 backdrop-blur
              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors
            "
            aria-label={collapsed ? 'Expandir sidebar' : 'Compactar sidebar'}
            title={collapsed ? 'Expandir' : 'Compactar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={`
                  group relative flex items-center rounded-xl transition-all duration-200
                  ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                  ${isActive
                    ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span
                  className={`
                    ml-3 text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${collapsed ? 'opacity-0 scale-95 w-0' : 'opacity-100 scale-100'}
                  `}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
        {/* Footer removido */}
      </div>
    </>
  );
};
