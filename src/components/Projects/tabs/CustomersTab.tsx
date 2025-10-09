import React from 'react';
import { Users, Calendar, FolderOpen, Tag as TagIcon, RefreshCcw, UserCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { UiProject } from '../../../pages/ProjectDetailPage';
import { Button } from '../../../components/ui/Button';

type CustomerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};

type CardRow = {
  profile_id: string;
  username: string | null;
};

type ClaimsAgg = {
  profile_id: string;
  count: number;
};

type Props = {
  project: UiProject; // precisa de id, name, destination_url, type
};

export const CustomersTab: React.FC<Props> = ({ project }) => {
  const projectId = project.id;

  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [cardsByProfile, setCardsByProfile] = React.useState<Record<string, CardRow[]>>({});
  const [claimsCountByProfile, setClaimsCountByProfile] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    // 1) Descobrir perfis relacionados ao projeto (via cards OU claims)
    //    1a) cards -> pega profile_ids com card nesse projeto
    const { data: cards, error: cardsErr } = await supabase
      .from('profile_cards')
      .select('profile_id, username')
      .eq('project_id', projectId);

    if (cardsErr) {
      setError(cardsErr.message);
      setRows([]);
      setCardsByProfile({});
      setClaimsCountByProfile({});
      setLoading(false);
      return;
    }

    const cardMap: Record<string, CardRow[]> = {};
    const profileIdsFromCards = new Set<string>();
    (cards ?? []).forEach((c: any) => {
      const pid = c.profile_id as string;
      profileIdsFromCards.add(pid);
      if (!cardMap[pid]) cardMap[pid] = [];
      cardMap[pid].push({ profile_id: pid, username: c.username ?? null });
    });

    //    1b) claims -> pega perfis que fizeram claim em tags deste projeto
    const { data: tagRows, error: tagsErr } = await supabase
      .from('tags')
      .select('id')
      .eq('project_id', projectId);

    if (tagsErr) {
      setError(tagsErr.message);
      setRows([]);
      setCardsByProfile({});
      setClaimsCountByProfile({});
      setLoading(false);
      return;
    }

    const tagIds = (tagRows ?? []).map((t: any) => t.id) as string[];
    let profileIdsFromClaims = new Set<string>();
    let claimsAgg: ClaimsAgg[] = [];

    if (tagIds.length > 0) {
      const { data: claimRows, error: claimsErr } = await supabase
        .from('tag_claims')
        .select('claimed_by_profile_id')
        .in('tag_id', tagIds);

      if (claimsErr) {
        setError(claimsErr.message);
        setRows([]);
        setCardsByProfile({});
        setClaimsCountByProfile({});
        setLoading(false);
        return;
      }

      // agrega contagem por profile_id
      const counter = new Map<string, number>();
      (claimRows ?? []).forEach((r: any) => {
        const pid = r.claimed_by_profile_id as string | null;
        if (!pid) return;
        profileIdsFromClaims.add(pid);
        counter.set(pid, (counter.get(pid) ?? 0) + 1);
      });
      claimsAgg = Array.from(counter.entries()).map(([profile_id, count]) => ({ profile_id, count }));
    }

    // 2) União dos perfis relacionados
    const relatedIds = Array.from(new Set<string>([
      ...Array.from(profileIdsFromCards.values()),
      ...Array.from(profileIdsFromClaims.values())
    ]));

    if (relatedIds.length === 0) {
      setRows([]);
      setCardsByProfile({});
      setClaimsCountByProfile({});
      setLoading(false);
      return;
    }

    // 3) Buscar perfis (apenas customers) entre os relacionados
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, display_name, email, created_at')
      .in('id', relatedIds)
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (profErr) {
      setError(profErr.message);
      setRows([]);
      setCardsByProfile({});
      setClaimsCountByProfile({});
      setLoading(false);
      return;
    }

    // montar maps auxiliares
    const claimsMap: Record<string, number> = {};
    claimsAgg.forEach((a) => { claimsMap[a.profile_id] = a.count; });

    setRows((profiles ?? []) as unknown as CustomerRow[]);
    setCardsByProfile(cardMap);
    setClaimsCountByProfile(claimsMap);
    setLoading(false);
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  // realtime: se algo mudar no escopo do projeto, recarrega
  React.useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel('project_customers_tab_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_cards', filter: `project_id=eq.${projectId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tag_claims' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags', filter: `project_id=eq.${projectId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [projectId, load]);

  // helpers de render
  const tagsCount = (profileId: string) => claimsCountByProfile[profileId] ?? 0;

  const profilePills = (profileId: string) => {
    const cards = cardsByProfile[profileId] ?? [];
    const isProfileCardProject = String(project.type || '').toLowerCase() === 'profile_card';
    const base = (project.destination_url || '').trim();
    return cards.map((c, idx) => {
      const label = c.username ? `@${c.username}` : '@—';
      const href = (isProfileCardProject && base && c.username)
        ? `${base.replace(/\/+$/, '')}/p/${encodeURIComponent(c.username)}`
        : null;

      return href ? (
        <a
          key={`${profileId}-${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                     bg-gray-100 text-gray-800 hover:bg-gray-200
                     dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
                     transition-colors"
          title={href}
        >
          <UserCircle2 className="w-3.5 h-3.5 opacity-70" />
          {label}
        </a>
      ) : (
        <span
          key={`${profileId}-${idx}`}
          title="Sem link disponível"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                     bg-gray-100 text-gray-400
                     dark:bg-gray-800 dark:text-gray-500
                     cursor-default select-none"
        >
          <UserCircle2 className="w-3.5 h-3.5 opacity-50" />
          {label}
        </span>
      );
    });
  };

  const total = rows.length;

  // UI
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {total} {total === 1 ? 'customer' : 'customers'}
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tags Claimed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Profiles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {(loading ? [] : rows).map((c) => (
                <tr key={c.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">{c.id}</td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">
                    {c.email ?? '—'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                      <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                      {c.display_name || '—'}
                    </div>
                  </td>

                  {/* Projects: nessa aba é sempre este projeto */}
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-800 dark:text-gray-100">
                      <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <span>{project.name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                      <TagIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                      {tagsCount(c.id)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {cardsByProfile[c.id]?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profilePills(c.id)}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}

              {(!loading && rows.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                    No customers found for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
