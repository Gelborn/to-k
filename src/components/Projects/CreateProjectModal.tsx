import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  Sparkles, LayoutGrid, Check, ChevronDown, ExternalLink,
  Image as ImageIcon, Link2, UploadCloud, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

type ProjectType = "profile_card" | "exclusive_club" | "simple_redirect";

type OwnerOption = {
  id: string;
  name: string;
  email?: string | null;
};

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
  ownerOptions?: OwnerOption[];
}

type ImgMode = "none" | "url" | "upload";

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  ownerOptions = [],
}) => {
  // campos existentes
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType | "">("");
  const [showroomMode, setShowroomMode] = useState(false);
  const [ownerId, setOwnerId] = useState<string>("");
  const [destinationUrl, setDestinationUrl] = useState("");

  // novos campos
  const [description, setDescription] = useState("");
  const [imgMode, setImgMode] = useState<ImgMode>("none");
  const [projectImgUrl, setProjectImgUrl] = useState("");
  const [projectImgFile, setProjectImgFile] = useState<File | null>(null);
  const [projectImgPreview, setProjectImgPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameRef = useRef<HTMLInputElement>(null);

  const canShowShowroom = type === "exclusive_club";

  const isValidUrl = (v: string) => {
    try {
      const u = new URL(v.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // validação leve do campo imagem por URL (opcional)
  const imgUrlOk =
    imgMode !== "url" || projectImgUrl.trim() === "" || isValidUrl(projectImgUrl.trim());

  const isValid =
    name.trim().length >= 3 &&
    !!ownerId &&
    !!type &&
    isValidUrl(destinationUrl.trim()) &&
    imgUrlOk;

  const ownerHint = useMemo(() => {
    const o = ownerOptions.find((x) => x.id === ownerId);
    return o ? `${o.name}${o.email ? ` · ${o.email}` : ""}` : "Selecione o dono do projeto";
  }, [ownerId, ownerOptions]);

  const setFieldError = (field: string, message: string) =>
    setErrors((prev) => ({ ...prev, [field]: message }));

  const clearFieldError = (field: string) =>
    setErrors((prev) => {
      const { [field]: _omit, ...rest } = prev;
      return rest;
    });

  const validate = () => {
    const e: Record<string, string> = {};
    const nm = name.trim();
    const url = destinationUrl.trim();

    if (!nm || nm.length < 3) e.name = "O nome deve ter pelo menos 3 caracteres.";
    if (!ownerId) e.ownerId = "Selecione o dono do projeto.";
    if (!type) e.type = "Escolha um tipo de projeto.";
    if (!url) e.destination_url = "A URL de destino é obrigatória.";
    else if (!isValidUrl(url)) e.destination_url = "Informe uma URL http(s) válida.";

    if (imgMode === "url" && projectImgUrl.trim() && !isValidUrl(projectImgUrl.trim())) {
      e.project_img = "Informe uma URL http(s) válida para a imagem.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  function revokePreview() {
    if (projectImgPreview) URL.revokeObjectURL(projectImgPreview);
  }

  const reset = () => {
    setName("");
    setType("");
    setShowroomMode(false);
    setOwnerId("");
    setDestinationUrl("");
    setDescription("");
    setImgMode("none");
    setProjectImgUrl("");
    setProjectImgFile(null);
    revokePreview();
    setProjectImgPreview(null);
    setErrors({});
  };

  useEffect(() => {
    return () => revokePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function extFromMime(mime: string): string {
    if (mime === "image/webp") return ".webp";
    if (mime === "image/png") return ".png";
    if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
    if (mime === "image/gif") return ".gif";
    return "";
  }

  function onPickProjectImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      revokePreview();
      setProjectImgFile(null);
      setProjectImgPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG, WEBP...)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Imagem até 10MB.");
      return;
    }

    revokePreview();
    const url = URL.createObjectURL(f);
    setProjectImgFile(f);
    setProjectImgPreview(url);
    clearFieldError("project_img");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Corrija os campos destacados.");
      return;
    }

    setLoading(true);
    try {
      // monta payload inicial
      const payload: Record<string, any> = {
        name: name.trim(),
        type,
        showroom_mode: canShowShowroom ? showroomMode : false,
        owner_id: ownerId,
        destination_url: destinationUrl.trim(),
        description: description.trim() || null,
      };

      // se for URL de imagem e válido, já envia junto
      if (imgMode === "url" && projectImgUrl.trim() && isValidUrl(projectImgUrl.trim())) {
        payload.project_img = projectImgUrl.trim();
      }

      const { data, error } = await supabase.functions.invoke("admin_create_project", {
        body: payload,
      });

      if (error) {
        let serverMsg: string | undefined;
        const resp = (error as any)?.context?.response as Response | undefined;
        if (resp) {
          try {
            const j = await resp.clone().json();
            serverMsg = typeof j?.error === "string" ? j.error : undefined;
            console.error("admin_create_project error resp", resp.status, j);
          } catch {
            // ignore
          }
        } else {
          console.error("admin_create_project invoke error", error);
        }

        const msg = serverMsg || "";

        if (/project with this name already exists/i.test(msg)) {
          setFieldError("name", "Já existe um projeto com esse nome.");
        } else if (/destination_url already in use/i.test(msg)) {
          setFieldError("destination_url", "Essa URL de destino já está em uso.");
        } else if (/destination_url must be a valid http\(s\) URL/i.test(msg)) {
          setFieldError("destination_url", "Informe uma URL http(s) válida.");
        } else if (/invalid owner_id .* role 'owner'/i.test(msg)) {
          setFieldError("ownerId", "O dono precisa ser um perfil com papel 'owner'.");
        } else if (/showroom_mode is required/i.test(msg)) {
          setFieldError("type", "Para hub de conteúdo, defina o showroom ligado/desligado.");
        } else if (/name is required|owner_id is required|type must be/i.test(msg)) {
          toast.error(msg);
        } else {
          toast.error("Não foi possível criar o projeto agora, tente novamente.");
        }

        throw error; // garante o finally
      }

      const projectId: string = data?.project_id ?? "";

      // caso tenha escolhido upload, faz o upload e atualiza o project_img
      if (imgMode === "upload" && projectImgFile && projectId) {
        try {
          const ext =
            extFromMime(projectImgFile.type) ||
            (projectImgFile.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg");

          // usa o MESMO bucket público dos assets
          const objectPath = `${projectId}/project-cover${ext}`;
          const up = await supabase.storage
            .from("asset-images")
            .upload(objectPath, projectImgFile, { upsert: true });

          if (up.error) throw new Error(`Falha ao subir imagem: ${up.error.message}`);

          const { data: pub } = supabase.storage.from("asset-images").getPublicUrl(objectPath);
          const publicUrl = pub?.publicUrl ?? null;

          if (publicUrl) {
            const upd = await supabase.from("projects").update({ project_img: publicUrl }).eq("id", projectId);
            if (upd.error) {
              console.error("update project_img error", upd.error);
              toast.error("Projeto criado, mas houve falha ao gravar a imagem.");
            }
          }
        } catch (imgErr: any) {
          console.error("upload project cover failed", imgErr);
          toast.error(imgErr?.message ?? "Falha ao enviar a imagem do projeto.");
        }
      }

      toast.success("Projeto criado com sucesso!");
      onCreated?.(projectId);
      onClose();
      reset();
    } catch {
      // já tratado acima
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Criar novo projeto"
      size="lg"
      initialFocusRef={nameRef}
    >
      {/* Layout vertical com corpo rolável */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-h-[70vh]">
        {/* CONTEÚDO ROLÁVEL */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Nome + Dono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              ref={nameRef}
              label="Nome do projeto"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              placeholder="Modalle Hub"
              required
              error={errors.name}
              autoComplete="off"
            />

            {/* Select do Dono */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Dono do projeto
              </label>
              <div className="relative">
                <select
                  value={ownerId}
                  onChange={(e) => {
                    setOwnerId(e.target.value);
                    clearFieldError("ownerId");
                  }}
                  className={`w-full h-11 px-4 pr-10 rounded-xl border bg-white/70 text-zinc-900
                             dark:bg-zinc-900/50 dark:text-zinc-100 backdrop-blur-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none
                             ${errors.ownerId
                               ? "border-red-500/70"
                               : "border-zinc-200/70 hover:border-zinc-300 dark:border-zinc-700/50 dark:hover:border-zinc-600/70"}`}
                >
                  <option value="">{ownerHint}</option>
                  {(ownerOptions ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.email ? `· ${o.email}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              {errors.ownerId && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.ownerId}</p>}
              <p className="text-xs text-zinc-500 dark:text-zinc-500">Defina quem será o responsável pelo projeto.</p>
            </div>
          </div>

          {/* Descrição (opcional) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearFieldError("description");
              }}
              placeholder="Breve texto sobre o projeto."
              rows={3}
              className="w-full px-4 py-3 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm border
                         border-zinc-200/70 dark:border-zinc-700/50 rounded-xl text-zinc-900 dark:text-zinc-100
                         placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            />
          </div>

          {/* URL de destino */}
          <Input
            label="URL de destino"
            value={destinationUrl}
            onChange={(e) => {
              setDestinationUrl(e.target.value);
              clearFieldError("destination_url");
            }}
            placeholder="https://seu-projeto.com/bem-vindo"
            required
            error={errors.destination_url}
            autoComplete="off"
            iconRight={<ExternalLink className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />}
          />
          <p className="text-xs -mt-2 text-zinc-600 dark:text-zinc-500">
            Para onde os usuários serão direcionados ao interagir com as tags.
          </p>

          {/* Tipo de projeto */}
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Tipo de projeto
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile Card */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition group
                  ${type === "profile_card"
                    ? "border-blue-500/60 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:border-zinc-600/70 dark:hover:bg-zinc-800/30"}`}
              >
                <input
                  type="radio"
                  name="projectType"
                  className="mt-1"
                  checked={type === "profile_card"}
                  onChange={() => {
                    setType("profile_card");
                    clearFieldError("type");
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="font-medium">Oferecer um Profile Card</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Perfil escaneável com links, redes sociais e ações rápidas.
                  </p>
                </div>
                <span className="w-5 h-5 flex items-center justify-center">
                  {type === "profile_card" && <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                </span>
              </label>

              {/* Exclusive Club / Hub de conteúdo */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition group
                  ${type === "exclusive_club"
                    ? "border-blue-500/60 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:border-zinc-600/70 dark:hover:bg-zinc-800/30"}`}
              >
                <input
                  type="radio"
                  name="projectType"
                  className="mt-1"
                  checked={type === "exclusive_club"}
                  onChange={() => {
                    setType("exclusive_club");
                    clearFieldError("type");
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">Hub de conteúdo (Clube exclusivo)</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Área com conteúdo protegido (docs, links, vídeos) e acesso por tags.
                  </p>
                </div>
                <span className="w-5 h-5 flex items-center justify-center">
                  {type === "exclusive_club" && <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                </span>
              </label>

              {/* Simple Redirect */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition group md:col-span-2
                  ${type === "simple_redirect"
                    ? "border-blue-500/60 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:border-zinc-600/70 dark:hover:bg-zinc-800/30"}`}
              >
                <input
                  type="radio"
                  name="projectType"
                  className="mt-1"
                  checked={type === "simple_redirect"}
                  onChange={() => {
                    setType("simple_redirect");
                    clearFieldError("type");
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <ExternalLink className="w-4 h-4" />
                    <span className="font-medium">Redirect simples</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Cada leitura do tag redireciona diretamente para a URL definida, sem UI extra.
                  </p>
                </div>
                <span className="w-5 h-5 flex items-center justify-center">
                  {type === "simple_redirect" && <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                </span>
              </label>
            </div>

            {errors.type && <p className="text-xs text-red-600 dark:text-red-400">{errors.type}</p>}
          </fieldset>

          {/* Imagem do projeto (opcional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Imagem do projeto (opcional)
              </label>
              {/* pill switch */}
              <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                {[
                  { key: "none", label: "Nenhuma" },
                  { key: "url", label: "Link" },
                  { key: "upload", label: "Upload" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setImgMode(opt.key as ImgMode);
                      if (opt.key !== "upload") {
                        // limpar file se sair do upload
                        revokePreview();
                        setProjectImgFile(null);
                        setProjectImgPreview(null);
                      }
                      if (opt.key !== "url") setProjectImgUrl("");
                      clearFieldError("project_img");
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition
                      ${imgMode === opt.key
                        ? "bg-blue-600 text-white"
                        : "bg-white/70 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* URL */}
            {imgMode === "url" && (
              <Input
                label={
                  <span className="inline-flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-zinc-500" />
                    Link da imagem
                  </span>
                }
                value={projectImgUrl}
                onChange={(e) => {
                  setProjectImgUrl(e.target.value);
                  clearFieldError("project_img");
                }}
                placeholder="https://cdn.exemplo.com/cover.jpg"
                error={errors.project_img}
                autoComplete="off"
              />
            )}

            {/* Upload */}
            {imgMode === "upload" && (
              <div className="space-y-2">
                {projectImgPreview ? (
                  <div className="relative">
                    <img
                      src={projectImgPreview}
                      alt="Pré-visualização"
                      className="w-full h-44 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700/50"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {projectImgFile?.name} ({Math.round((projectImgFile?.size ?? 0) / 1024)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          revokePreview();
                          setProjectImgFile(null);
                          setProjectImgPreview(null);
                        }}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remover imagem
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer border-zinc-300 dark:border-zinc-700/50 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={onPickProjectImg} />
                    <UploadCloud className="w-8 h-8 text-zinc-400 mb-2" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Clique para selecionar uma imagem</span>
                    <span className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP até 10MB</span>
                  </label>
                )}
                {errors.project_img && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.project_img}</p>
                )}
              </div>
            )}
          </div>

          {/* Showroom (somente para hub de conteúdo) */}
          {canShowShowroom && (
            <div className="rounded-xl border p-4 border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showroomMode}
                  onChange={(e) => setShowroomMode(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-zinc-900 dark:text-zinc-100 font-medium">Este projeto é um showroom?</div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Em showroom, uma mesma tag pode ter múltiplos claims/taps.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* RODAPÉ FIXO */}
        <div className="sticky bottom-0 -mx-6 px-6 py-3 border-t bg-white/95 backdrop-blur dark:bg-zinc-900/95 border-zinc-200/80 dark:border-white/10">
          <div className="flex justify-between items-center gap-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-500">
              <span className="font-medium">Dica:</span> você pode editar os detalhes depois nas configurações do projeto.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  onClose();
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid || loading}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando…
                  </span>
                ) : (
                  "Criar projeto"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
