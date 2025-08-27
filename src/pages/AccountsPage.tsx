import React from 'react';
import { Users, Calendar, FolderOpen, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { CreateOwnerModal } from '../components/Owners/CreateOwnerModal';

type OwnerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  project_owners: Array<{
    project: { id: string; name: string; } | null;
  }> | null;
};

export const AccountsPage: React.FC = () => {
  const [rows, setRows] = React.useState<OwnerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

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
        // Only refresh if the row is (or became) an owner
        const newRole = (payload.new as any)?.role;
        const oldRole = (payload.old as any)?.role;
        if (newRole === 'owner' || oldRole === 'owner') load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_owners' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const total = rows.length;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Owner Accounts</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
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

      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {(loading ? [] : rows).map((owner) => {
                const projects =
                  owner.project_owners?.map((po) => po.project?.name).filter(Boolean) as string[] | undefined;
                return (
                  <tr key={owner.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">
                      {owner.id}
                    </td>
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
                        {projects?.length
                          ? <span className="truncate max-w-[28rem]" title={projects.join(', ')}>{projects.join(', ')}</span>
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                        {new Date(owner.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!loading && rows.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
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
    </div>
  );
};
