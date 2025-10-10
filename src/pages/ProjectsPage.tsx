// src/pages/ProjectsPage.tsx
import React from 'react';
import { Plus, RefreshCcw, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CreateProjectModal } from '../components/Projects/CreateProjectModal';
import { ProjectCard } from '../components/Projects/ProjectCard';
import { supabase } from '../lib/supabase';

type DbProject = {
  id: string;
  name: string;
  icon: string | null;           // legado
  project_img: string | null;    // NOVO
  description: string | null;    // NOVO
  type: 'profile_card' | 'exclusive_club' | 'simple_redirect';
  showroom_mode: boolean | null;
  destination_url: string | null;
  created_at: string;
  updated_at?: string | null;
  project_owners: Array<{
    profile_id: string;
    profiles: { display_name: string | null } | null;
  }>;
};

type UiProject = {
  id: string;
  name: string;
  type: 'profile_card' | 'exclusive_club' | 'simple_redirect';
  showroom_mode?: boolean;
  destination_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  icon?: string | null;            // fallback
  project_img?: string | null;     // NOVO
  description?: string | null;     // NOVO
  owners: string[];
  customersCount?: number;
  lastActivityAt?: string | null;
};

type OwnerOption = { id: string; name: string; email?: string | null };

type StatsRow = {
  project_id: string;
  customers_count: number | null;
  last_activity_at: string | null;
};

export const ProjectsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<UiProject[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<OwnerOption[]>([]);
  const [ownerFilter, setOwnerFilter] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [ownersLoading, setOwnersLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadOwnerOptions = React.useCallback(async () => {
    setOwnersLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_owners')
        .select('profile_id, profiles:profiles!project_owners_profile_id_fkey(display_name, email)')
        .order('profile_id', { ascending: true });
      if (error) throw error;

      const map = new Map<string, OwnerOption>();
      for (const row of (data ?? []) as any[]) {
        const id = row.profile_id as string;
        const name = row.profiles?.display_name || '(sem nome)';
        const email = row.profiles?.email ?? null;
        if (!map.has(id)) map.set(id, { id, name, email });
      }
      setOwnerOptions(Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      ));
    } catch {
      setOwnerOptions([]);
    } finally {
      setOwnersLoading(false);
    }
  }, []);

  const loadProjects = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseSelect = `
        id, name, icon, project_img, description, type, showroom_mode, destination_url, created_at, updated_at,
        project_owners (
          profile_id,
          profiles ( display_name )
        )
      ` as const;

      let query = ownerFilter
        ? supabase
            .from('projects')
            .select(`
              id, name, icon, project_img, description, type, showroom_mode, destination_url, created_at, updated_at,
              project_owners!inner(
                profile_id,
                profiles(display_name)
              )
            `)
            .eq('project_owners.profile_id', ownerFilter)
        : supabase.from('projects').select(baseSelect);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const projectsData = (data ?? []) as DbProject[];
      const projectIds = projectsData.map(p => p.id);
      let statsMap = new Map<string, StatsRow>();

      if (projectIds.length) {
        const { data: stats, error: statsErr } = await supabase
          .from('project_customer_stats')
          .select('project_id, customers_count, last_activity_at')
          .in('project_id', projectIds);
        if (statsErr) throw statsErr;
        statsMap = new Map((stats ?? []).map((s: any) => [s.project_id as string, s as StatsRow]));
      }

      const mapped: UiProject[] = projectsData.map((p) => {
        const s = statsMap.get(p.id);
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          showroom_mode: !!p.showroom_mode,
          destination_url: p.destination_url,
          created_at: p.created_at,
          updated_at: p.updated_at ?? null,
          icon: p.icon ?? null,                // fallback antigo
          project_img: p.project_img ?? null,  // novo
          description: p.description ?? null,  // novo
          owners: p.project_owners?.map(o => o.profiles?.display_name || o.profile_id) ?? [],
          customersCount: s?.customers_count ?? 0,
          lastActivityAt: s?.last_activity_at ?? null,
        };
      });

      // Ordena: users ↓, lastActivity ↓, created_at ↓
      mapped.sort((a, b) => {
        const aUsers = a.customersCount ?? 0;
        const bUsers = b.customersCount ?? 0;
        if (bUsers !== aUsers) return bUsers - aUsers;

        const aLast = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bLast = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        if (bLast !== aLast) return bLast - aLast;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProjects(mapped);
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao carregar projetos.');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [ownerFilter]);

  React.useEffect(() => { loadOwnerOptions(); }, [loadOwnerOptions]);
  React.useEffect(() => { loadProjects(); }, [loadProjects]);

  React.useEffect(() => {
    const channel = supabase
      .channel('projects_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_owners' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tag_claims' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => loadProjects())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadProjects]);

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ordenado por <span className="font-medium">mais users</span> → <span className="font-medium">última atividade</span>.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="w-64">
            <label className="grid gap-1.5">
              <span className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Filtrar por Owner</span>
              <div className="relative">
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="appearance-none w-full pr-10 pl-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={ownersLoading}
                >
                  <option value="">Todos os owners</option>
                  {ownerOptions.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.email ? `— ${o.email}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadProjects} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsModalOpen(true)} disabled={ownersLoading}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-black/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No projects found. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => loadProjects()}
        ownerOptions={ownerOptions}
      />
    </div>
  );
};
