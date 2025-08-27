import React from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CreateProjectModal } from '../components/Projects/CreateProjectModal';
import { ProjectCard } from '../components/Projects/ProjectCard';
import { supabase } from '../lib/supabase';

type DbProject = {
  id: string;
  name: string;
  icon: string | null;
  type: 'profile_card' | 'exclusive_club';
  showroom_mode: boolean | null;
  destination_url: string | null;
  created_at: string;
  project_owners: Array<{
    profile_id: string;
    profiles: { display_name: string | null } | null;
  }>;
};

type UiProject = {
  id: string;
  name: string;
  type: 'profile_card' | 'exclusive_club';
  showroom_mode?: boolean;
  destination_url?: string | null;
  created_at: string;
  icon?: string | null;
  owners: string[];
};

type OwnerOption = {
  id: string;
  name: string;
  email?: string | null;
};

export const ProjectsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<UiProject[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<OwnerOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [ownersLoading, setOwnersLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadProjects = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, icon, type, showroom_mode, destination_url, created_at,
        project_owners (
          profile_id,
          profiles ( display_name )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const mapped: UiProject[] =
      (data as DbProject[]).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        showroom_mode: !!p.showroom_mode,
        destination_url: p.destination_url,
        created_at: p.created_at,
        icon: p.icon,
        owners: p.project_owners?.map(
          (o) => o.profiles?.display_name || o.profile_id
        ) ?? [],
      })) || [];

    setProjects(mapped);
    setLoading(false);
  }, []);

  const loadOwnerOptions = React.useCallback(async () => {
    setOwnersLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, role')
      .in('role', ['owner'])
      .order('display_name', { ascending: true });

    if (error) {
      setOwnerOptions([]);
      setOwnersLoading(false);
      return;
    }

    const options: OwnerOption[] =
      (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.display_name || '(no name)',
        email: p.email ?? null,
      })) || [];
    setOwnerOptions(options);
    setOwnersLoading(false);
  }, []);

  React.useEffect(() => {
    loadProjects();
    loadOwnerOptions();
  }, [loadProjects, loadOwnerOptions]);

  React.useEffect(() => {
    const channel = supabase
      .channel('projects_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => loadProjects()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_owners' },
        () => loadProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects]);

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadProjects} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} disabled={ownersLoading}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
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
            <div key={i} className="h-56 rounded-2xl bg-white/50 dark:bg-zinc-900 border border-black/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No projects found. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
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
