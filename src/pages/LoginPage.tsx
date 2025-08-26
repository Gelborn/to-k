import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col p-4 animate-fade-in">
      {/* Logo no topo esquerdo */}
      <div className="absolute top-6 left-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            tok.io <span className="text-gray-500 dark:text-gray-400 font-extralight"> |  admin</span>
          </h1>
      </div>
      
      <div className="absolute top-4 right-4 text-sm text-gray-400 font-light tracking-wider">
        ADMIN ACCESS
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800/50 rounded-2xl p-8 shadow-2xl animate-slide-up">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
              <Lock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Welcome back</h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Sign in to to-k.io Admin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400 font-medium">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
              >
                Forgot?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};