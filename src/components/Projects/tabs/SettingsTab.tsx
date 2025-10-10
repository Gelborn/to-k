import React from "react";
import type { UiProject } from "../../../pages/ProjectDetailPage";
import { Input } from "../../ui/Input";
import { supabase } from "../../../lib/supabase";
import toast from "react-hot-toast";
import { X, Save, UploadCloud, Link2, Image as ImageIcon } from "lucide-react";

type ImgMode = "none" | "url" | "upload";

export const SettingsTab: React.FC<{
  project: UiProject;
  onUpdated?: () => void;
}> = ({ project, onUpdated }) => {
  // ---------- Local state ----------
  const [name, setName] = React.useState(project.name);
  const [dest, setDest] = React.useState(project.destination_url || "");
  const [description, setDescription] = React.useState(project.description || "");

  // imagem
  const [imgMode, setImgMode] = React.useState<ImgMode>("none");
  const [imgUrl, setImgUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [removeImage, setRemoveImage] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // ---------- Helpers ----------
  const isValidUrl = (v: string) => {
    try {
      const u = new URL(v.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  function extFromMime(mime: string): string {
    if (mime === "image/webp") return ".webp";
    if (mime === "image/png") return ".png";
    if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
    if (mime === "image/gif") return ".gif";
    return "";
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem (PNG, JPG, WEBP...)");
    if (f.size > 10 * 1024 * 1024) return toast.error("Imagem até 10MB.");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setRemoveImage(false);
  }

  // ---------- Dirty detection ----------
  const dirty =
    name.trim() !== (project.name ?? "").trim() ||
    (dest || "").trim() !== (project.destination_url || "").trim() ||
    (description || "").trim() !== (project.description || "").trim() ||
    removeImage ||
    (imgMode === "url" && imgUrl.trim() && imgUrl.trim() !== (project.project_img || "")) ||
    (imgMode === "upload" && !!file);

  // ---------- Save handler ----------
  const handleSave = async () => {
    if (!dirty) return;

    // URL validations
    if (dest.trim() && !isValidUrl(dest)) {
      toast.error("Destination URL inválida. Use http(s).");
      return;
    }
    if (imgMode === "url" && imgUrl.trim() && !isValidUrl(imgUrl)) {
      toast.error("Link da imagem inválido. Use http(s).");
      return;
    }

    setSaving(true);
    try {
      // 1) Se houver upload, sobe primeiro e captura a publicUrl
      let project_img_to_set: string | null | undefined = undefined;

      if (removeImage) {
        project_img_to_set = null;
      }

      if (imgMode === "upload" && file) {
        const ext =
          extFromMime(file.type) || (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg");
        const objectPath = `${project.id}/project-cover${ext}`;

        const up = await supabase.storage.from("asset-images").upload(objectPath, file, { upsert: true });
        if (up.error) throw new Error(`Falha ao subir imagem: ${up.error.message}`);

        const { data: pub } = supabase.storage.from("asset-images").getPublicUrl(objectPath);
        project_img_to_set = pub?.publicUrl ?? null;
      } else if (imgMode === "url") {
        // se informou um link, seta; se deixou vazio, não mexe (a não ser que removeImage esteja true)
        if (imgUrl.trim()) project_img_to_set = imgUrl.trim();
      }

      // 2) Atualiza o projeto com os campos editados
      const updatePayload: any = {
        name: name.trim(),
        destination_url: dest.trim() || null,
        description: description.trim() || null,
      };
      if (project_img_to_set !== undefined) updatePayload.project_img = project_img_to_set;

      const { error } = await supabase.from("projects").update(updatePayload).eq("id", project.id);
      if (error) throw error;

      toast.success("Alterações salvas com sucesso.");
      onUpdated?.();

      // reset de estados voláteis
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFile(null);
      setImgMode("none");
      setImgUrl("");
      setRemoveImage(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  const projectTypeLabel =
    project.type === "exclusive_club"
      ? "Content hub"
      : project.type === "profile_card"
      ? "Profile card"
      : "Redirect Simples";

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

        {/* Description */}
        <div className="mt-6 space-y-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
            Description
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve texto sobre o projeto."
            className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Project image */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Project Image (cover)
            </label>

            {/* Segment control */}
            <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
              {[
                { k: "none", l: "Nenhuma" },
                { k: "url", l: "Link" },
                { k: "upload", l: "Upload" },
              ].map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => {
                    setImgMode(o.k as ImgMode);
                    if (o.k !== "upload") {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setFile(null);
                      setPreviewUrl(null);
                    }
                    if (o.k !== "url") setImgUrl("");
                    setRemoveImage(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition
                    ${imgMode === o.k
                      ? "bg-blue-600 text-white"
                      : "bg-white/70 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Current image */}
          {project.project_img && !previewUrl && imgMode !== "url" && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60">
              <img src={project.project_img} alt="Atual" className="w-full h-40 object-cover" />
            </div>
          )}

          {/* Mode: URL */}
          {imgMode === "url" && (
            <Input
              label={
                <span className="inline-flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-zinc-500" />
                  Link da imagem
                </span>
              }
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              placeholder="https://cdn.exemplo.com/cover.jpg"
              autoComplete="off"
            />
          )}

          {/* Mode: Upload */}
          {imgMode === "upload" && (
            <>
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Pré-visualização"
                    className="w-full h-44 object-cover rounded-xl border border-gray-200 dark:border-gray-700/60"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {file?.name} ({Math.round((file?.size ?? 0) / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                  <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Clique para selecionar uma imagem</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP até 10MB</span>
                </label>
              )}
            </>
          )}

          {/* Remove current image */}
          {project.project_img && imgMode !== "upload" && (
            <button
              type="button"
              onClick={() => {
                setRemoveImage((v) => !v);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setFile(null);
                }
                setImgUrl("");
              }}
              className={`inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2 border transition
                ${removeImage
                  ? "border-red-300 text-red-700 dark:border-red-800/60 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                  : "border-zinc-300 text-zinc-700 dark:border-zinc-700/60 dark:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"}`}
            >
              <ImageIcon className="w-4 h-4" />
              {removeImage ? "Remover imagem (selecionado)" : "Remover imagem atual"}
            </button>
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
