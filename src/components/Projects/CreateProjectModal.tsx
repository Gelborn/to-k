import React, { useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Sparkles, LayoutGrid, Check, ChevronDown, ExternalLink } from "lucide-react";
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

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  ownerOptions = [],
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType | "">("");
  const [showroomMode, setShowroomMode] = useState(false);
  const [ownerId, setOwnerId] = useState<string>("");
  const [destinationUrl, setDestinationUrl] = useState("");
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

  const isValid =
    name.trim().length >= 3 &&
    !!ownerId &&
    !!type &&
    isValidUrl(destinationUrl.trim());

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

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setName("");
    setType("");
    setShowroomMode(false);
    setOwnerId("");
    setDestinationUrl("");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Corrija os campos destacados.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        showroom_mode: canShowShowroom ? showroomMode : false,
        owner_id: ownerId,
        destination_url: destinationUrl.trim(),
      };

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

      toast.success("Projeto criado com sucesso!");
      onCreated?.(data?.project_id ?? "");
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
                {loading ? "Criando..." : "Criar projeto"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
