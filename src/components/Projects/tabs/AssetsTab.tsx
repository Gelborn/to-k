import React from "react";
import { Plus, Package, Edit3, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";

export type AssetRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  type: "unique" | "generic";
  created_at: string;
};

export const AssetsTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [rows, setRows] = React.useState<AssetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<{ name: string; description: string; type: "unique" | "generic" }>({
    name: "",
    description: "",
    type: "unique",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("assets")
      .select("id, project_id, name, description, type, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AssetRow[]);
    }
    setLoading(false);
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const ch = supabase
      .channel("assets_live_" + projectId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assets", filter: `project_id=eq.${projectId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, load]);

  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      project_id: projectId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      type: draft.type,
    };
    const { error } = await supabase.from("assets").insert(payload);
    if (!error) {
      setIsModalOpen(false);
      setDraft({ name: "", description: "", type: "unique" });
    } else {
      alert(error.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Project Assets</h2>
        <Button onClick={() => setIsModalOpen(true)} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-black/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-gray-900/50 p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/50 grid place-items-center mb-4 border border-gray-200 dark:border-gray-800/50">
            <Package className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">No assets yet</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create your first asset to get started.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((asset) => (
            <div
              key={asset.id}
              className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700/50 transition-all duration-200 group shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800/50 rounded-xl mr-3 border border-gray-200 dark:border-gray-800/50">
                    <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{asset.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 border
                        ${
                          asset.type === "unique"
                            ? "text-purple-700 bg-purple-100 border-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-800/50"
                            : "text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800/50"
                        }`}
                    >
                      {asset.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {asset.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{asset.description}</p>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                Created {new Date(asset.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Asset">
        <form onSubmit={createAsset} className="space-y-6">
          <Input
            label="Asset Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Enter asset name"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Enter asset description"
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Asset Type
            </label>
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft((d) => ({ ...d, type: e.target.value as "unique" | "generic" }))
              }
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="unique">Unique</option>
              <option value="generic">Generic</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Asset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
