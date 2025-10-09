import React from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ProjectHeader } from "../components/Projects/ProjectHeader";
import { ProjectTabs } from "../components/Projects/ProjectTabs";
import { AssetsTab } from "../components/Projects/tabs/AssetsTab";
import { TagsTab } from "../components/Projects/tabs/TagsTab";
import { ResourcesTab } from "../components/Projects/tabs/ResourcesTab";
import { SettingsTab } from "../components/Projects/tabs/SettingsTab";
import { CustomersTab } from "../components/Projects/tabs/CustomersTab"; // ⬅️ novo

type ProjectType = "profile_card" | "exclusive_club";

export type UiProject = {
  id: string;
  name: string;
  type: ProjectType;
  showroom_mode: boolean;
  destination_url: string | null;
  created_at: string;
  icon?: string | null;
  owners: string[];
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = React.useState<
    "assets" | "tags" | "resources" | "customers" | "settings"   // ⬅️ adiciona "customers"
  >("assets");

  const [project, setProject] = React.useState<UiProject | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        id, name, type, showroom_mode, destination_url, created_at, icon,
        project_owners(
          profile_id,
          profiles(display_name)
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setError("Project not found");
      setLoading(false);
      return;
    }

    const owners =
      (data.project_owners ?? [])
        .map((po: any) => po.profiles?.display_name || po.profile_id) ?? [];

    setProject({
      id: data.id,
      name: data.name,
      type: data.type,
      showroom_mode: !!data.showroom_mode,
      destination_url: data.destination_url ?? null,
      created_at: data.created_at,
      icon: data.icon ?? null,
      owners,
    });
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel("project_detail_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `id=eq.${id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_owners" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="h-10 w-56 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-black/5 animate-pulse mb-6" />
        <div className="h-48 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-black/5 animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-300">
          {error || "Project not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <ProjectHeader project={project} />
      <ProjectTabs active={activeTab} onChange={setActiveTab} project={project} />

      <div className="animate-fade-in">
        {activeTab === "assets" && <AssetsTab projectId={project.id} />}
        {activeTab === "tags" && <TagsTab projectId={project.id} />}
        {activeTab === "resources" && <ResourcesTab project={project} />}
        {activeTab === "customers" && <CustomersTab project={project} />}  {/* ⬅️ nova aba */}
        {activeTab === "settings" && <SettingsTab project={project} onUpdated={load} />}
      </div>
    </div>
  );
};
