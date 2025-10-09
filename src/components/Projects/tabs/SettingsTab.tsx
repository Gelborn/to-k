import React from "react";
import type { UiProject } from "../../../pages/ProjectDetailPage";
import { Input } from "../../ui/Input";
import { supabase } from "../../../lib/supabase";
import toast from "react-hot-toast";
import { X, Save } from "lucide-react";

export const SettingsTab: React.FC<{
  project: UiProject;
  onUpdated?: () => void;
}> = ({ project, onUpdated }) => {
  // ---------- Local state (editable fields) ----------
  const [name, setName] = React.useState(project.name);
  const [dest, setDest] = React.useState(project.destination_url || "");
  const [saving, setSaving] = React.useState(false);

  // modal delete indisponível
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  // detectar "dirty"
  const dirty =
    name.trim() !== (project.name ?? "").trim() ||
    (dest || "").trim() !== (project.destination_url || "").trim();

  // ---------- Labels ----------
  const projectTypeLabel =
    project.type === "exclusive_club"
      ? "Content hub"
      : project.type === "profile_card"
      ? "Profile card"
      : "Redirect Simples";

  // ---------- Save handler ----------
  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: name.trim(),
          destination_url: dest.trim() || null,
        })
        .eq("id", project.id);

      if (error) throw error;
      toast.success("Alterações salvas com sucesso.");
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Card principal */}
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
          Project Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Project Name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Digite o nome do projeto"
          />

          <div className="space-y-1 relative">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Project Type
            </label>
            <select
              value={projectTypeLabel}
              disabled
              className="w-full px-4 pr-10 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 opacity-80 appearance-none"
            >
              <option>Profile card</option>
              <option>Content hub</option>
              <option>Redirect Simples</option>
            </select>
            {/* custom chevron */}
            <svg
              className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <Input
            label="Destination URL"
            value={dest}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDest(e.target.value)}
            placeholder="https://example.com"
          />

          {project.type === "exclusive_club" && (
            <Input
              label="Showroom Mode"
              value={project.showroom_mode ? "On" : "Off"}
              readOnly
            />
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2 tracking-tight">
          Danger Zone
        </h3>
        <p className="text-red-700/80 dark:text-gray-400 text-sm mb-4 font-medium">
          Once you delete a project, there is no going back. Please be certain.
        </p>
        <button
          className="px-4 py-2 rounded-xl border text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-semibold"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Project
        </button>
      </div>

      {/* Botão flutuante Salvar alterações */}
      {dirty && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/70 text-white font-semibold shadow-lg"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      )}

      {/* Modal de delete indisponível */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          {/* modal card */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Ação indisponível
              </h4>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 text-gray-700 dark:text-gray-300">
              Indisponível no momento, contate o administrador da plataforma.
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
