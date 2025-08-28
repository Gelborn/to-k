import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast, { Toaster } from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const showGlassError = (message: string) => {
    toast.custom((t) => (
      <div
        className={[
          "relative w-[92vw] max-w-sm",
          "rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl",
          "shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)]",
          "px-4 py-3",
          t.visible ? "animate-in fade-in duration-150" : "animate-out fade-out duration-150",
        ].join(" ")}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Sign-in failed</p>
            <p className="mt-0.5 text-sm text-zinc-100/90 break-words">{message}</p>
          </div>
        </div>
      </div>
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) showGlassError(error.message || "Please check your credentials.");
    setLoading(false);
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden text-zinc-100">
      {/* Toaster */}
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 3500,
          style: { background: 'transparent', boxShadow: 'none', padding: 0 },
        }}
      />

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black" />
        <div className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/25 to-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6">
        <a
          href="/"
          className="text-xl font-bold text-gray-100 tracking-tight hover:text-blue-400 transition-colors"
        >
          tok chip <span className="text-gray-400 font-extralight"> | admin</span>
        </a>
      </div>

      {/* Centered content */}
      <main className="min-h-[100svh] flex items-center justify-center px-5 pb-16 pb-[env(safe-area-inset-bottom)]">
        <div className="relative w-full max-w-md">
          <div className="relative rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 shadow">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
              <p className="text-zinc-300 font-medium">Sign in to to-k.chip Admin</p>
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
                <label className="block text-sm font-semibold text-zinc-200 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <a
                  href="#"
                  className="text-sm text-zinc-400 hover:text-blue-400 transition-colors font-medium"
                >
                  Forgot password?
                </a>
              </div>

              <Button type="submit" disabled={loading} className="w-full transition-all duration-200">
                {loading ? <span className="animate-pulse">Signing in...</span> : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="pointer-events-none absolute bottom-4 w-full text-center text-xs text-zinc-500">
        Made with ♥ by to-k.chip
      </div>
    </div>
  );
};
