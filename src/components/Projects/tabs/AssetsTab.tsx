import React from "react";
import { Plus, Edit3, Trash2, Image as ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
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
  img_link?: string | null;
  created_at: string;
};

type Draft = {
  name: string;
  description: string;
  type: "unique" | "generic";
  file: File | null;
  previewUrl: string | null;
};

export const AssetsTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [rows, setRows] = React.useState<AssetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createDraft, setCreateDraft] = React.useState<Draft>({
    name: "",
    description: "",
    type: "unique",
    file: null,
    previewUrl: null,
  });

  // Edit modal
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<AssetRow | null>(null);
  const [editDraft, setEditDraft] = React.useState<Draft>({
    name: "",
    description: "",
    type: "unique",
    file: null,
    previewUrl: null,
  });

  // Confirm delete modal
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AssetRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("assets")
      .select("id, project_id, name, description, type, img_link, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
      toast.error("Falha ao carregar assets.");
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

  // ————————————————————————————————————————
  // Utils
  // ————————————————————————————————————————
  function extFromMime(mime: string): string {
    if (mime === "image/webp") return ".webp";
    if (mime === "image/png") return ".png";
    if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
    if (mime === "image/gif") return ".gif";
    return "";
  }

  function resetCreateDraft() {
    if (createDraft.previewUrl) URL.revokeObjectURL(createDraft.previewUrl);
    setCreateDraft({ name: "", description: "", type: "unique", file: null, previewUrl: null });
  }

  function resetEditDraft() {
    if (editDraft.previewUrl) URL.revokeObjectURL(editDraft.previewUrl);
    setEditDraft({ name: "", description: "", type: "unique", file: null, previewUrl: null });
  }

  function onPickCreateFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      if (createDraft.previewUrl) URL.revokeObjectURL(createDraft.previewUrl);
      setCreateDraft((d) => ({ ...d, file: null, previewUrl: null }));
      return;
    }
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem (PNG, JPG, WEBP...)");
    if (f.size > 10 * 1024 * 1024) return toast.error("Imagem até 10MB.");

    if (createDraft.previewUrl) URL.revokeObjectURL(createDraft.previewUrl);
    const url = URL.createObjectURL(f);
    setCreateDraft((d) => ({ ...d, file: f, previewUrl: url }));
  }

  function onPickEditFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      if (editDraft.previewUrl) URL.revokeObjectURL(editDraft.previewUrl);
      setEditDraft((d) => ({ ...d, file: null, previewUrl: null }));
      return;
    }
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem (PNG, JPG, WEBP...)");
    if (f.size > 10 * 1024 * 1024) return toast.error("Imagem até 10MB.");

    if (editDraft.previewUrl) URL.revokeObjectURL(editDraft.previewUrl);
    const url = URL.createObjectURL(f);
    setEditDraft((d) => ({ ...d, file: f, previewUrl: url }));
  }

  // ————————————————————————————————————————
  // Create
  // ————————————————————————————————————————
  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    const name = createDraft.name.trim();
    if (!name) return toast.error("Nome do asset é obrigatório.");

    setCreating(true);
    setError(null);

    try {
      const payload = {
        project_id: projectId,
        name,
        description: createDraft.description.trim() || null,
        type: createDraft.type,
      };

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("admin_create_asset", {
        body: payload,
      });
      if (fnErr) throw new Error(fnErr.message ?? "Falha ao criar asset");
      if (!fnData?.ok || !fnData?.asset_id || !fnData?.storage?.object_prefix) {
        throw new Error("Resposta inesperada ao criar asset");
      }

      const assetId: string = fnData.asset_id;
      const objectPrefix: string = fnData.storage.object_prefix; // "<project>/<asset>"

      if (createDraft.file) {
        const ext = extFromMime(createDraft.file.type) || (createDraft.file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg");
        const objectPath = `${objectPrefix}${ext}`;

        const up = await supabase.storage.from("asset-images").upload(objectPath, createDraft.file, { upsert: true });
        if (up.error) throw new Error(`Falha ao subir imagem: ${up.error.message}`);

        const { data: pub } = supabase.storage.from("asset-images").getPublicUrl(objectPath);
        const publicUrl = pub?.publicUrl ?? null;

        if (publicUrl) {
          const upd = await supabase.from("assets").update({ img_link: publicUrl }).eq("id", assetId);
          if (upd.error) console.error("update img_link error", upd.error);
        }
      }

      await load();
      setIsCreateOpen(false);
      resetCreateDraft();
      toast.success("Asset criado com sucesso!");
    } catch (err: any) {
      console.error("createAsset failed", err);
      setError(err?.message ?? "Erro ao criar asset");
      toast.error(err?.message ?? "Erro ao criar asset.");
    } finally {
      setCreating(false);
    }
  };

  // ————————————————————————————————————————
  // Edit
  // ————————————————————————————————————————
  function openEdit(a: AssetRow) {
    resetEditDraft();
    setEditTarget(a);
    setEditDraft({
      name: a.name ?? "",
      description: a.description ?? "",
      type: a.type,
      file: null,
      previewUrl: null,
    });
    setIsEditOpen(true);
  }

  const updateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing || !editTarget) return;

    const name = editDraft.name.trim();
    if (!name) return toast.error("Nome do asset é obrigatório.");

    setEditing(true);
    setError(null);

    try {
      const baseUpdate: Partial<AssetRow> = {
        name,
        description: editDraft.description.trim() || null,
        type: editDraft.type,
      };

      let img_link_to_set: string | null | undefined = undefined;

      if (editDraft.file) {
        const objectPrefix = `${projectId}/${editTarget.id}`;
        const ext =
          extFromMime(editDraft.file.type) || (editDraft.file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg");
        const objectPath = `${objectPrefix}${ext}`;

        const up = await supabase.storage.from("asset-images").upload(objectPath, editDraft.file, { upsert: true });
        if (up.error) throw new Error(`Falha ao subir imagem: ${up.error.message}`);

        const { data: pub } = supabase.storage.from("asset-images").getPublicUrl(objectPath);
        img_link_to_set = pub?.publicUrl ?? null;
      }

      const updatePayload =
        img_link_to_set === undefined ? baseUpdate : { ...baseUpdate, img_link: img_link_to_set };

      const upd = await supabase.from("assets").update(updatePayload).eq("id", editTarget.id);
      if (upd.error) throw new Error(upd.error.message);

      await load();
      setIsEditOpen(false);
      resetEditDraft();
      setEditTarget(null);
      toast.success("Asset atualizado!");
    } catch (err: any) {
      console.error("updateAsset failed", err);
      setError(err?.message ?? "Erro ao atualizar asset");
      toast.error(err?.message ?? "Erro ao atualizar asset.");
    } finally {
      setEditing(false);
    }
  };

  // ————————————————————————————————————————
  // Confirm Delete
  // ————————————————————————————————————————
  function openConfirmDelete(a: AssetRow) {
    setDeleteTarget(a);
    setIsConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const id = deleteTarget.id;
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;

      // otimista
      setRows((prev) => prev.filter((r) => r.id !== id));
      setIsConfirmOpen(false);
      setDeleteTarget(null);
      toast.success("Asset excluído.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erro ao excluir asset.");
    } finally {
      setDeleting(false);
    }
  }

  // ————————————————————————————————————————
  // Render
  // ————————————————————————————————————————
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Assets do Projeto</h2>
        <Button onClick={() => setIsCreateOpen(true)} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Novo Asset
        </Button>
      </div>

      {/* Erro global */}
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-black/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-gray-900/50 p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/50 grid place-items-center mb-4 border border-gray-200 dark:border-gray-800/50">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nenhum asset ainda</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Crie seu primeiro asset para começar.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((asset) => (
            <div
              key={asset.id}
              className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700/50 transition-all duration-200 group shadow-sm"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800/50">
                {asset.img_link ? (
                  <img
                    src={asset.img_link}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const sib = (e.currentTarget.parentElement?.querySelector("[data-fallback]") as HTMLElement) ?? null;
                      if (sib) sib.style.display = "flex";
                    }}
                  />
                ) : null}

                {/* Fallback ícone */}
                <div
                  data-fallback
                  className={`absolute inset-0 ${asset.img_link ? "hidden" : "flex"} items-center justify-center`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/70 dark:bg-black/30 grid place-items-center border border-gray-200 dark:border-gray-800/50">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                </div>

                {/* Badge Único/Genérico — sempre visível, topo direito */}
                <span
                  className={`absolute top-2 right-2 z-10 inline-block px-2 py-1 text-[10px] font-semibold rounded-full border uppercase tracking-wider backdrop-blur-sm ${
                    asset.type === "unique"
                      ? "text-purple-700 bg-purple-100/90 border-purple-200 dark:text-purple-300 dark:bg-purple-900/40 dark:border-purple-800/50"
                      : "text-blue-700 bg-blue-100/90 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800/50"
                  }`}
                >
                  {asset.type === "unique" ? "Único" : "Genérico"}
                </span>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                {/* Linha: Nome (esq) | Ações (dir) */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-3">{asset.name}</h3>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Editar"
                      onClick={() => openEdit(asset)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      title="Excluir"
                      onClick={() => openConfirmDelete(asset)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {asset.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{asset.description}</p>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                  Criado em {new Date(asset.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!creating) {
            setIsCreateOpen(false);
            resetCreateDraft();
          }
        }}
        title="Criar novo Asset"
      >
        <form onSubmit={createAsset} className="space-y-6">
          <Input
            label="Nome do Asset"
            value={createDraft.name}
            onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Ex.: Porsche 911 Carrera"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Descrição
            </label>
            <textarea
              value={createDraft.description}
              onChange={(e) => setCreateDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Detalhes do asset"
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Tipo do Asset
            </label>
            <select
              value={createDraft.type}
              onChange={(e) => setCreateDraft((d) => ({ ...d, type: e.target.value as "unique" | "generic" }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="unique">Único</option>
              <option value="generic">Genérico</option>
            </select>
          </div>

          {/* Upload da imagem (opcional) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Imagem (opcional)
            </label>

            {createDraft.previewUrl ? (
              <div className="relative">
                <img
                  src={createDraft.previewUrl}
                  alt="Pré-visualização"
                  className="w-full h-44 object-cover rounded-xl border border-gray-200 dark:border-gray-800/50"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {createDraft.file?.name} ({Math.round((createDraft.file?.size ?? 0) / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (createDraft.previewUrl) URL.revokeObjectURL(createDraft.previewUrl);
                      setCreateDraft((d) => ({ ...d, file: null, previewUrl: null }));
                    }}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remover imagem
                  </button>
                </div>
              </div>
            ) : (
              <label className="w-full flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={onPickCreateFile} />
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Clique para selecionar uma imagem</span>
                <span className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP até 10MB</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!creating) {
                  setIsCreateOpen(false);
                  resetCreateDraft();
                }
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando…
                </>
              ) : (
                "Criar Asset"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar (rolável + footer sticky) */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          if (!editing) {
            setIsEditOpen(false);
            resetEditDraft();
            setEditTarget(null);
          }
        }}
        title={editTarget ? `Editar Asset: ${editTarget.name}` : "Editar Asset"}
      >
        <form onSubmit={updateAsset} className="flex flex-col max-h-[75vh]">
          <div className="space-y-6 overflow-y-auto pr-1">
            <Input
              label="Nome do Asset"
              value={editDraft.name}
              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nome do asset"
              required
            />

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                Descrição
              </label>
              <textarea
                value={editDraft.description}
                onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Detalhes do asset"
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                Tipo do Asset
              </label>
              <select
                value={editDraft.type}
                onChange={(e) => setEditDraft((d) => ({ ...d, type: e.target.value as "unique" | "generic" }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="unique">Único</option>
                <option value="generic">Genérico</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                Imagem
              </label>

              {editTarget?.img_link && !editDraft.previewUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800/50">
                  <img src={editTarget.img_link} alt="Atual" className="w-full h-36 object-cover" />
                </div>
              )}

              {editDraft.previewUrl ? (
                <div className="relative">
                  <img
                    src={editDraft.previewUrl}
                    alt="Pré-visualização"
                    className="w-full h-36 object-cover rounded-xl border border-gray-200 dark:border-gray-800/50"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {editDraft.file?.name} ({Math.round((editDraft.file?.size ?? 0) / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (editDraft.previewUrl) URL.revokeObjectURL(editDraft.previewUrl);
                        setEditDraft((d) => ({ ...d, file: null, previewUrl: null }));
                      }}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remover nova imagem
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={onPickEditFile} />
                  <ImageIcon className="w-7 h-7 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Clique para substituir a imagem</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP até 10MB</span>
                </label>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-3 sticky bottom-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-b-xl">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!editing) {
                  setIsEditOpen(false);
                  resetEditDraft();
                  setEditTarget(null);
                }
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={editing}>
              {editing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar exclusão */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!deleting) {
            setIsConfirmOpen(false);
            setDeleteTarget(null);
          }
        }}
        title="Confirmar exclusão"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-sm">
              <p className="text-gray-900 dark:text-gray-100 font-semibold">
                Tem certeza que deseja excluir este asset?
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Esta ação é permanente. A imagem associada (se houver) também será removida do Storage.
              </p>
            </div>
          </div>

          {deleteTarget && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/40">
                <div className="font-medium text-gray-900 dark:text-gray-100">{deleteTarget.name}</div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border uppercase tracking-wider ${
                    deleteTarget.type === "unique"
                      ? "text-purple-700 bg-purple-100 border-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-800/50"
                      : "text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800/50"
                  }`}
                >
                  {deleteTarget.type === "unique" ? "Único" : "Genérico"}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900/30">
                {deleteTarget.img_link ? (
                  <img src={deleteTarget.img_link} alt={deleteTarget.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="h-40 grid place-items-center text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!deleting) {
                  setIsConfirmOpen(false);
                  setDeleteTarget(null);
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600/30"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo…
                </>
              ) : (
                "Excluir definitivamente"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
