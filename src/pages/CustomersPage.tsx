// src/pages/CustomersPage.tsx
import React from 'react';
import { Users, Calendar, FolderOpen, Filter, Tag as TagIcon, RefreshCcw, UserCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

type ProjectLite = { id: string; name: string };

type ProjectWithMeta = {
  id: string;
  name: string | null;
  type: string | null;
  destination_url: string | null;
};

type CustomerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;

  // Para "Projects" e contagem de tags: via tag_claims -> tag -> project
  tag_claims: Array<{ tag: { project: ProjectLite | null } | null }> | null;
};

type CardRow = {
  profile_id: string;
  username: string | null;
  project: ProjectWithMeta | null;
};

export const CustomersPage: React.FC = () => {
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [cardsByProfile, setCardsByProfile] = React.useState<Record<string, CardRow[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [projects, setProjects] = React.useState<ProjectLite[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');

  // -------------------------- loads --------------------------

  const loadProjects = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true });
    if (!error) setProjects((data ?? []) as ProjectLite[]);
  }, []);

  const loadCustomers = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1) customers + claims -> projects
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        email,
        created_at,
        tag_claims:tag_claims!tag_claims_claimed_by_profile_id_fkey (
          tag:tags (
            project:projects ( id, name )
          )
        )
      `)
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
      setCardsByProfile({});
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as CustomerRow[];
    setRows(rows);

    // 2) profile_cards por profile_id (consulta separada, robusta)
    const profileIds = rows.map(r => r.id);
    if (profileIds.length === 0) {
      setCardsByProfile({});
      setLoading(false);
      return;
    }

    const { data: cards, error: cardsErr } = await supabase
      .from('profile_cards')
      .select(`
        profile_id,
        username,
        project:projects ( id, name, type, destination_url )
      `)
      .in('profile_id', profileIds);

    if (cardsErr) {
      // Não quebra a tela; apenas log e segue sem cards
      console.warn('[CustomersPage] profile_cards query error:', cardsErr.message);
      setCardsByProfile({});
      setLoading(false);
      return;
    }

    // Agrupa por profile_id
    const map: Record<string, CardRow[]> = {};
    (cards ?? []).forEach((c: any) => {
      const k = c.profile_id as string;
      if (!map[k]) map[k] = [];
      map[k].push({
        profile_id: k,
        username: c.username ?? null,
        project: (c.project ?? null) as ProjectWithMeta | null,
      });
    });
    setCardsByProfile(map);

    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadProjects();
    loadCustomers();
  }, [loadProjects, loadCustomers]);

  // realtime refresh quando profiles / tag_claims / profile_cards mudarem
  React.useEffect(() => {
    const ch = supabase
      .channel('customers_list_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        const newRole = (payload.new as any)?.role;
        const oldRole = (payload.old as any)?.role;
        if (newRole === 'customer' || oldRole === 'customer') loadCustomers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tag_claims' }, () => loadCustomers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_cards' }, () => loadCustomers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadCustomers]);

  // -------------------------- helpers --------------------------

  // Projetos (para coluna "Projects") vindos das claims
  const uniqProjectsFromClaims = (c: CustomerRow): ProjectLite[] => {
    const claims = Array.isArray(c.tag_claims) ? c.tag_claims : [];
    const map = new Map<string, ProjectLite>();
    for (const tc of claims) {
      const p = tc?.tag?.project ?? null;
      if (p && p.id && !map.has(p.id)) map.set(p.id, p);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Projetos via cards (complementa o filtro)
  const projectsFromCards = (c: CustomerRow): ProjectLite[] => {
    const cards = cardsByProfile[c.id] ?? [];
    const map = new Map<string, ProjectLite>();
    for (const card of cards) {
      const p = card.project;
      if (p && p.id && !map.has(p.id)) {
        map.set(p.id, { id: p.id, name: p.name ?? '—' });
      }
    }
    return Array.from(map.values());
  };

  // conta tags (globais ou do projeto filtrado)
  const tagsClaimedCount = (c: CustomerRow): number => {
    const claims = Array.isArray(c.tag_claims) ? c.tag_claims : [];
    if (selectedProjectId === 'all') {
      return claims.filter(tc => Boolean(tc?.tag?.project?.id)).length;
    }
    return claims.filter(tc => tc?.tag?.project?.id === selectedProjectId).length;
  };

  // Links de perfis (projetos type=profile_card e que tenham destination_url)
  const profileLinks = (c: CustomerRow): Array<{ label: string; href: string | null; projectId: string | null }> => {
    const cards = cardsByProfile[c.id] ?? [];
    const items: Array<{ label: string; href: string | null; projectId: string | null }> = [];

    for (const card of cards) {
      const username = (card?.username || '').trim();
      const proj = card?.project;
      if (!username) continue;

      const projId = proj?.id ?? null;
      const isProfileCard = String(proj?.type || '').toLowerCase() === 'profile_card';
      const base = (proj?.destination_url || '').trim();
      const href = (isProfileCard && base)
        ? `${base.replace(/\/+$/, '')}/p/${encodeURIComponent(username)}`
        : null;

      // aplica filtro (quando um projeto específico está selecionado)
      if (selectedProjectId !== 'all' && projId !== selectedProjectId) continue;

      items.push({ label: `@${username}`, href, projectId: projId });
    }
    return items;
  };

  const filteredRows = React.useMemo(() => {
    if (selectedProjectId === 'all') return rows;

    return rows.filter((c) => {
      // união: projetos por claims OU por cards
      const fromClaims = uniqProjectsFromClaims(c).some((p) => p.id === selectedProjectId);
      if (fromClaims) return true;
      const fromCards = projectsFromCards(c).some((p) => p.id === selectedProjectId);
      return fromCards;
    });
  }, [rows, selectedProjectId, cardsByProfile]);

  const total = filteredRows.length;

  // -------------------------- UI --------------------------

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Members</h1>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">

          {/* Filtro moderno */}
          <div className="relative flex items-center">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="
                  appearance-none
                  bg-white dark:bg-gray-900
                  border border-gray-300 dark:border-gray-800
                  rounded-md
                  pl-3 pr-8 py-2
                  text-sm text-gray-800 dark:text-gray-200
                  cursor-pointer
                  transition-all
                  hover:border-gray-400 dark:hover:border-gray-700
                  shadow-sm hover:shadow
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                "
              >
                <option value="all">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {total} {total === 1 ? 'customer' : 'customers'}
          </div>

          <Button variant="secondary" onClick={loadCustomers} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tags Claimed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Profiles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {(loading ? [] : filteredRows).map((c) => {
                const projectsList = uniqProjectsFromClaims(c);
                const tagsCount = tagsClaimedCount(c);
                const links = profileLinks(c);

                return (
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

                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-800 dark:text-gray-100">
                        <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                        {projectsList.length ? (
                          <span className="truncate max-w-[22rem]" title={projectsList.map(p => p.name).join(', ')}>
                            {projectsList.map(p => p.name).join(', ')}
                          </span>
                        ) : '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                        <TagIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                        {tagsCount}
                      </div>
                    </td>

                    {/* Profiles */}
                    <td className="px-6 py-4">
                      {links.length ? (
                        <div className="flex flex-wrap gap-2">
                          {links.map((it, idx) =>
                            it.href ? (
                              <a
                                key={idx}
                                href={it.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                                           bg-gray-100 text-gray-800 hover:bg-gray-200
                                           dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
                                           transition-colors"
                                title={it.href}
                              >
                                <UserCircle2 className="w-3.5 h-3.5 opacity-70" />
                                {it.label}
                              </a>
                            ) : (
                              <span
                                key={idx}
                                title="Sem link disponível"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                                           bg-gray-100 text-gray-400
                                           dark:bg-gray-800 dark:text-gray-500
                                           cursor-default select-none"
                              >
                                <UserCircle2 className="w-3.5 h-3.5 opacity-50" />
                                {it.label}
                              </span>
                            )
                          )}
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
                );
              })}

              {(!loading && filteredRows.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                    No members found for this filter.
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
