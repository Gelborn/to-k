import React from 'react';
import {
  Users,
  Calendar,
  FolderOpen,
  Plus,
  KeyRound,
  AlertTriangle,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { CreateOwnerModal } from '../components/Owners/CreateOwnerModal';
import toast, { Toaster } from 'react-hot-toast';

type OwnerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  project_owners: Array<{
    project: { id: string; name: string } | null;
  }> | null;
};

export const AccountsPage: React.FC = () => {
  const [rows, setRows] = React.useState<OwnerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // modal de senha (random only)
  const [pwdModalOwner, setPwdModalOwner] = React.useState<OwnerRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        email,
        created_at,
        project_owners (
          project:projects (
            id, name
          )
        )
      `)
      .eq('role', 'owner')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as OwnerRow[]);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // realtime refresh when owners or project_owners change
  React.useEffect(() => {
    const ch = supabase
      .channel('owners_list_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        const newRole = (payload.new as any)?.role;
        const oldRole = (payload.old as any)?.role;
        if (newRole === 'owner' || oldRole === 'owner') load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_owners' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const total = rows.length;

  /* ─────────── Toasters theme-aware ─────────── */
  const showSuccess = (message: string) =>
    toast.custom((t) => (
      <div
        className={[
          'relative w-[92vw] max-w-sm',
          'rounded-2xl border bg-white text-slate-900 border-slate-200 shadow-lg',
          'dark:border-white/10 dark:bg-white/10 dark:text-white dark:backdrop-blur-xl',
          'px-4 py-3',
          t.visible ? 'animate-in fade-in duration-150' : 'animate-out fade-out duration-150',
        ].join(' ')}
        role="status"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center
                          dark:bg-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Tudo certo</p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-zinc-100/90 break-words">{message}</p>
          </div>
        </div>
      </div>
    ));

  const showError = (message: string) =>
    toast.custom((t) => (
      <div
        className={[
          'relative w-[92vw] max-w-sm',
          'rounded-2xl border bg-white text-slate-900 border-slate-200 shadow-lg',
          'dark:border-white/10 dark:bg-white/10 dark:text-white dark:backdrop-blur-xl',
          'px-4 py-3',
          t.visible ? 'animate-in fade-in duration-150' : 'animate-out fade-out duration-150',
        ].join(' ')}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center
                          dark:bg-white/10">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-700 dark:text-white">Operação falhou</p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-zinc-100/90 break-words">{message}</p>
          </div>
        </div>
      </div>
    ));

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Toaster (theme-aware) */}
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 3500,
          style: { background: 'transparent', boxShadow: 'none', padding: 0 },
        }}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Owner Accounts</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-700 dark:text-gray-400">
            Total: {total} {total === 1 ? 'owner' : 'owners'}
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Owner
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {(loading ? [] : rows).map((owner) => {
                const projects =
                  owner.project_owners?.map((po) => po.project?.name).filter(Boolean) as string[] | undefined;
                return (
                  <tr key={owner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">{owner.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">
                      {owner.email ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                        <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                        {owner.display_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-800 dark:text-gray-100">
                        <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                        {projects?.length ? (
                          <span className="truncate max-w-[28rem]" title={projects.join(', ')}>
                            {projects.join(', ')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                        {new Date(owner.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        className="text-indigo-700 dark:text-indigo-400 hover:underline text-sm font-medium flex items-center gap-1"
                        onClick={() => setPwdModalOwner(owner)}
                        title="Gerir senha"
                      >
                        <KeyRound className="w-4 h-4" />
                        Gerir senha
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                    No owners yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOwnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          load();
        }}
      />

      <ManagePasswordModal
        owner={pwdModalOwner}
        isOpen={!!pwdModalOwner}
        onClose={() => setPwdModalOwner(null)}
        onSuccess={() => {
          showSuccess('Senha redefinida e enviada por e-mail ao proprietário.');
          setPwdModalOwner(null);
        }}
        onError={(msg) => showError(msg)}
      />
    </div>
  );
};

/* ───────────────────────── Modal: Gerir Senha (random only) ───────────────────────── */

const ManagePasswordModal: React.FC<{
  owner: OwnerRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}> = ({ owner, isOpen, onClose, onSuccess, onError }) => {
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) setSubmitting(false);
  }, [isOpen]);

  if (!owner || !isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('admin_change_owner_pass', {
        body: {
          user_id: owner.id,
          email: owner.email ?? undefined,
          mode: 'random', // sempre random
        },
      });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      onError(err?.message ?? 'Falha ao atualizar senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={[
          'relative w-full max-w-lg',
          // Light theme card
          'rounded-3xl border border-gray-200 bg-white text-slate-900 shadow-xl',
          // Dark theme card
          'dark:border-white/15 dark:bg-white/10 dark:text-white dark:backdrop-blur-xl dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]',
          'p-6 sm:p-8',
          'animate-in fade-in zoom-in duration-150',
        ].join(' ')}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow
                          bg-gray-100 dark:bg-white/10">
            <KeyRound className="w-6 h-6 text-slate-900 dark:text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-1 tracking-tight">Redefinir senha</h3>
          <p className="text-slate-600 dark:text-zinc-200/90">
            Geraremos uma <span className="font-semibold">nova senha aleatória</span> e enviaremos por e-mail ao proprietário.
          </p>
        </div>

        {/* Owner info */}
        <div className="mb-5 rounded-2xl border px-4 py-3
                        border-gray-200 bg-gray-50 text-slate-800
                        dark:border-white/10 dark:bg-white/5 dark:text-white">
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-zinc-300/90">Proprietário</span>
              <span className="font-medium">{owner.display_name || '—'}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-600 dark:text-zinc-300/90">E-mail</span>
              <span className="flex items-center gap-1 font-mono text-sm">
                <Mail className="w-4 h-4 text-slate-500 dark:text-white/80" />
                {owner.email || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 text-xs text-slate-600 dark:text-zinc-200/80">
          A nova senha será temporária. Recomendamos que o proprietário a altere após entrar (Menu → Conta).
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="border-gray-300 text-slate-800 hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Gerando...' : 'Gerar & enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
