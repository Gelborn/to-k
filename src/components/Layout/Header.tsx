import React from 'react';
import { Bell, Menu, Sun, Moon, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
  };

  // Close dropdown ao clicar fora ou apertar Esc
  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!dropdownOpen) return;
      const el = dropdownRef.current;
      if (el && !el.contains(e.target as Node)) setDropdownOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setDropdownOpen(false);
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [dropdownOpen]);

  return (
    <header className="w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50 px-4 sm:px-6 h-16 flex items-center sticky top-0 z-30">
      {/* Left side: Menu + Title */}
      <div className="flex items-center">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 mr-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight ml-2">
          {title}
        </h1>
      </div>

      {/* Right side actions */}
      <div className="ml-auto flex items-center space-x-2 sm:space-x-3">
        {/* Toggle theme */}
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <User className="w-5 h-5" />
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-2 z-50"
              role="menu"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Logado como
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mt-1">
                  {user?.email}
                </p>
              </div>

              <button
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                role="menuitem"
              >
                <User className="w-4 h-4 mr-3" />
                Profile
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                role="menuitem"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
