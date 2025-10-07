// src/components/resources/ResourceModal.tsx
import * as React from "react";
import {
  Upload, Image as ImageIcon, Lock, Eye, Image as Img, Box, Users, Search, Check, UserPlus, Replace as ReplaceIcon, File as FileIcon, Play
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { supabase } from "../../lib/supabase";

export const MAX_BYTES = 1024 * 1024 * 1024; // 1GB

export function extFromMime(m: string, fallback = ""): string {
  if (m.startsWith("video/")) return ".mp4";
  if (m === "application/pdf") return ".pdf";
  if (/^image\//.test(m)) return ".jpg";
  if (m === "application/msword") return ".doc";
  if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  return fallback;
}

export type CreateDraft =
  | ({ type: "video" } & {
      nome: string; descricao: string; acesso: "public" | "private";
      assetObrigatorioId: string | "";
      origemVideo: "upload" | "link";
      videoArquivo: File | null;
      videoUrl: string;
      capa: File | null;
    })
  | ({ type: "playlist" } & {
      nome: string; descricao: string; acesso: "public" | "private";
      assetObrigatorioId: string | "";
      playlistUrl: string;
      capa: File | null;
    })
  | ({ type: "doc" } & {
      nome: string; descricao: string; acesso: "public" | "private";
      assetObrigatorioId: string | "";
      docArquivo: File | null; docUrl: string;
      capa: File | null;
    })
  | ({ type: "blog_post" } & {
      nome: string; descricao: string; acesso: "public" | "private";
      assetObrigatorioId: string | "";
      conteudo: string;
      capa: File | null;
      autorImg: File | null;
      autorNome: string;
      autorDescricao: string;
    });

export type EditDraft = Partial<CreateDraft> & { id?: string; type: CreateDraft["type"] };

export function validateFile(f: File | null, accept: "video" | "doc" | "image"): string | null {
  if (!f) return null;
  if (f.size > MAX_BYTES) return `Arquivo excede 1GB (${(f.size / 1024 / 1024).toFixed(1)} MB).`;
  if (accept === "video" && !f.type.startsWith("video/")) return "Selecione um vídeo válido.";
  if (
    accept === "doc" &&
    !(
      f.type === "application/pdf" ||
      f.type === "application/msword" ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
  ) {
    return "Documento deve ser PDF, DOC ou DOCX.";
  }
  if (accept === "image" && !f.type.startsWith("image/")) return "Selecione uma imagem válida.";
  return null;
}

type Step = "dados" | "acesso";
type AuthorMode = "new" | "existing";

type AssetCard = {
  id: string;
  name: string;
  type: "unique" | "generic";
  img_link: string | null;
  created_at: string;
};

type AuthorLite = {
  name: string;
  description: string | null;
  image_path: string | null;
};

type ExistingResource = {
  id: string;
  type: "video" | "playlist" | "doc" | "blog_post";
  thumbnail_path: string | null;        // capa
  author_image_path: string | null;     // avatar do autor
  file_path: string | null;             // vídeo/doc armazenado
  url: string | null;                   // link externo (vídeo/doc/playlist)
};

const typeBadge = (t: "unique" | "generic") =>
  t === "unique"
    ? "text-purple-700 bg-purple-100/90 border-purple-200 dark:text-purple-300 dark:bg-purple-900/40 dark:border-purple-800/50"
    : "text-blue-700 bg-blue-100/90 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800/50";

/* ───────────────────────── Signed URL helpers ───────────────────────── */
async function createSignedUrlFromFullPath(fullPath: string, expiresInSec = 60 * 30): Promise<string | null> {
  // fullPath vem como "resource-images/..." ou "resource-files/..."
  const [bucket, ...rest] = fullPath.split("/");
  const key = rest.join("/");
  if (!bucket || !key) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresInSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function useSignedUrl(fullPath?: string | null, deps: React.DependencyList = [], expires = 60 * 30) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!fullPath) { setUrl(null); return; }
      const u = await createSignedUrlFromFullPath(fullPath, expires);
      if (active) setUrl(u);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullPath, expires, ...deps]);
  return url;
}

/* ───────────────────────── Previews locais (File -> objectURL) ───────────────────────── */
function useObjectUrl(file: File | null) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

/** Cartão de asset (gating) */
const AssetCardItem = React.memo(function AssetCardItem({
  asset, selected, onClick,
}: { asset: AssetCard; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border transition overflow-hidden text-left
        ${selected ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10" : "border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/70"}`}
    >
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800/50">
        {asset.img_link ? (
          <img src={asset.img_link} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-gray-400">
            <Img className="w-7 h-7" />
          </div>
        )}
        <span className={`absolute top-2 right-2 z-10 inline-block px-2 py-1 text-[10px] font-semibold rounded-full border uppercase tracking-wider backdrop-blur-sm ${typeBadge(asset.type)}`}>
          {asset.type === "unique" ? "Único" : "Genérico"}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate pr-2">{asset.name}</div>
          <div className={`w-2.5 h-2.5 rounded-full ${selected ? "bg-blue-500" : "bg-gray-400 dark:bg-gray-600"}`} />
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
          Criado em {new Date(asset.created_at).toLocaleDateString("pt-BR")}
        </div>
      </div>
    </button>
  );
});

/** Grid de assets */
const AssetsGrid = React.memo(function AssetsGrid({
  assets, selectedId, onSelect,
}: { assets: AssetCard[]; selectedId: string; onSelect: (id: string) => void }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-300 dark:border-gray-700/50 p-6 text-center">
        <Box className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <div className="text-sm text-gray-600 dark:text-gray-400">Nenhum asset disponível para este projeto.</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {assets.map((a) => (
        <AssetCardItem key={a.id} asset={a} selected={a.id === selectedId} onClick={() => onSelect(a.id)} />
      ))}
    </div>
  );
});

/** Cartão de autor existente (usa URL assinada) */
const AuthorCard: React.FC<{
  a: AuthorLite;
  selected: boolean;
  onPick: () => void;
}> = ({ a, selected, onPick }) => {
  const avatarSigned = useSignedUrl(a.image_path || undefined, [a.image_path]);
  return (
    <button
      type="button"
      onClick={onPick}
      className={`w-full text-left rounded-xl border p-3 transition flex items-start gap-3
        ${selected ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10" : "border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/70"}`}
    >
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800/50 grid place-items-center shrink-0">
        {avatarSigned ? <img src={avatarSigned} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium text-gray-900 dark:text-gray-100">{a.name}</div>
          {selected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        </div>
        {a.description && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {a.description}
          </div>
        )}
      </div>
    </button>
  );
};

export const ResourceModal = React.memo(function ResourceModal({
  title,
  submitLabel,
  draft,
  setDraft,
  onClose,
  onSubmit,
  projectId,
  submitting,
  /** opcional: melhora edição com prévias reais */
  mode,                // "create" | "edit"
  resourceId,          // id do resource sendo editado
}: {
  title: string;
  submitLabel: string;
  draft: any;
  setDraft: (fn: (d: any) => any) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  projectId: string;
  submitting: boolean;
  mode?: "create" | "edit";
  resourceId?: string | null;
}) {
  const [step, setStep] = React.useState<Step>("dados");

  // assets locais (carregados aqui)
  const [assets, setAssets] = React.useState<AssetCard[]>([]);
  const [loadingAssets, setLoadingAssets] = React.useState(true);

  // autores existentes
  const [authors, setAuthors] = React.useState<AuthorLite[]>([]);
  const [authorsLoading, setAuthorsLoading] = React.useState(false);
  const [authorMode, setAuthorMode] = React.useState<AuthorMode>("new");
  const [authorFilter, setAuthorFilter] = React.useState("");

  const hasAuthorFields = draft?.type === "blog_post";

  // resource existente p/ prévias no editar
  const [existing, setExisting] = React.useState<ExistingResource | null>(null);

  // carrega resource atual (somente se edit + id)
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (mode !== "edit" || !resourceId) { setExisting(null); return; }
      const { data, error } = await supabase
        .from("resources")
        .select("id, type, thumbnail_path, author_image_path, file_path, url")
        .eq("id", resourceId)
        .single();
      if (!active) return;
      if (error) { setExisting(null); return; }
      setExisting(data as ExistingResource);
    })();
    return () => { active = false; };
  }, [mode, resourceId]);

  // signed urls para recursos existentes
  const existingCover = useSignedUrl(existing?.thumbnail_path || undefined, [existing?.thumbnail_path]);
  const existingAuthorAvatar = useSignedUrl(existing?.author_image_path || undefined, [existing?.author_image_path]);
  const existingFileSigned = useSignedUrl(existing?.file_path || undefined, [existing?.file_path]);

  // previews locais para arquivos recém-selecionados
  const localCover = useObjectUrl(draft?.capa || null);
  const localAuthor = useObjectUrl(draft?.autorImg || null);
  const localVideo = useObjectUrl(draft?.videoArquivo || null);
  const localDoc = useObjectUrl(draft?.docArquivo || null);

  const loadAssets = React.useCallback(async () => {
    setLoadingAssets(true);
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, type, img_link, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setAssets(error ? [] : (data ?? []) as any);
    setLoadingAssets(false);
  }, [projectId]);

  const loadAuthors = React.useCallback(async () => {
    setAuthorsLoading(true);
    const { data, error } = await supabase
      .from("resources")
      .select("author_name, author_description, author_image_path")
      .eq("project_id", projectId)
      .eq("type", "blog_post")
      .not("author_name", "is", null);

    if (error) {
      setAuthors([]);
      setAuthorsLoading(false);
      return;
    }
    const uniq = new Map<string, AuthorLite>();
    (data ?? []).forEach((r: any) => {
      const key = String(r.author_name || "").trim().toLowerCase();
      if (!key) return;
      if (!uniq.has(key)) {
        uniq.set(key, {
          name: r.author_name,
          description: r.author_description ?? null,
          image_path: r.author_image_path ?? null,
        });
      }
    });
    const list = Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    setAuthors(list);
    setAuthorsLoading(false);

    const currentName = String(draft?.autorNome ?? "").trim().toLowerCase();
    if (list.length && currentName && list.find(a => a.name.trim().toLowerCase() === currentName)) {
      setAuthorMode("existing");
    } else if (!list.length) {
      setAuthorMode("new");
    }
  }, [projectId, draft?.autorNome]);

  React.useEffect(() => { loadAssets(); }, [loadAssets]);
  React.useEffect(() => { if (hasAuthorFields) loadAuthors(); }, [hasAuthorFields, loadAuthors]);

  /** IDs estáveis por mount */
  const auto = React.useId();
  const ids = React.useMemo(() => ({
    nome: `res_nome_${auto}`,
    desc: `res_desc_${auto}`,
    videoUrl: `res_vurl_${auto}`,
    playlistUrl: `res_purl_${auto}`,
    docUrl: `res_durl_${auto}`,
    conteudo: `res_cont_${auto}`,
    autorNome: `res_anome_${auto}`,
    autorDesc: `res_adesc_${auto}`,
    authorFilter: `res_afilter_${auto}`,
  }), [auto]);

  // validações
  const coreValid = React.useMemo(() => {
    const d = draft;
    const nomeOK = !!(d?.nome && d.nome.trim().length > 0);
    if (!nomeOK) return false;
    switch (d?.type) {
      case "video":
        return d.origemVideo === "upload" ? !!d.videoArquivo : !!(d.videoUrl && d.videoUrl.trim());
      case "playlist":
        return !!(d.playlistUrl && d.playlistUrl.trim());
      case "doc":
        return !!d.docArquivo || !!(d.docUrl && d.docUrl.trim());
      case "blog_post":
        return !!(d.conteudo && d.conteudo.trim());
      default:
        return false;
    }
  }, [draft]);

  const accessValid = React.useMemo(() => {
    if (draft?.acesso === "public") return true;
    return !!(draft?.assetObrigatorioId && draft.assetObrigatorioId.trim());
  }, [draft?.acesso, draft?.assetObrigatorioId]);

  // helpers ui
  const field = React.useCallback((label: string, children: React.ReactNode) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  ), []);

  // handlers
  const setNome = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, nome: e.target.value })), [setDraft]);
  const setDescricao = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(d => ({ ...d, descricao: e.target.value })), [setDraft]);
  const setVideoUrl = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, videoUrl: e.target.value })), [setDraft]);
  const setPlaylistUrl = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, playlistUrl: e.target.value })), [setDraft]);
  const setDocUrl = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, docUrl: e.target.value })), [setDraft]);
  const setConteudo = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(d => ({ ...d, conteudo: e.target.value })), [setDraft]);
  const setAutorNome = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, autorNome: e.target.value })), [setDraft]);
  const setAutorDesc = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(d => ({ ...d, autorDescricao: e.target.value })), [setDraft]);
  const setOrigemVideo = React.useCallback((opt: "upload" | "link") => setDraft(d => ({ ...d, origemVideo: opt })), [setDraft]);

  const onPick = React.useCallback(
    (fieldName: "videoArquivo" | "docArquivo" | "capa" | "autorImg", accept: "video" | "doc" | "image") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        if (!f) { setDraft(d => ({ ...d, [fieldName]: null })); return; }
        const msg = validateFile(f, accept);
        if (msg) { alert(msg); return; }
        setDraft(d => ({ ...d, [fieldName]: f }));
      },
    [setDraft]
  );

  const setAcesso = React.useCallback((acc: "public" | "private") => {
    setDraft(d => ({ ...d, acesso: acc, assetObrigatorioId: acc === "public" ? "" : d.assetObrigatorioId }));
  }, [setDraft]);

  const selectAsset = React.useCallback((id: string) => setDraft(d => ({ ...d, assetObrigatorioId: id })), [setDraft]);

  const pickExistingAuthor = React.useCallback((a: AuthorLite) => {
    setDraft(d => ({ ...d, autorNome: a.name, autorDescricao: a.description ?? "", autorImg: null }));
  }, [setDraft]);

  /* ───────────────────────── UI: passo "dados" ───────────────────────── */

  const VideoSection = (
    <>
      <Input id={ids.nome} label="Nome" value={draft.nome || ""} onChange={setNome} placeholder="Ex.: Aula 01 – Introdução" required />
      {field("Descrição",
        <textarea
          id={ids.desc}
          value={draft.descricao || ""}
          onChange={setDescricao}
          placeholder="Um breve resumo do vídeo"
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      )}

      {/* Prévia do vídeo atual (editar) */}
      {mode === "edit" && existing?.type === "video" && (existingFileSigned || existing?.url) && !localVideo && draft.origemVideo === "upload" && (
        field("Vídeo atual",
          <div className="rounded-xl border border-gray-300 dark:border-gray-700/50 overflow-hidden">
            {existingFileSigned ? (
              <video src={existingFileSigned} className="w-full aspect-video object-cover bg-black/70" controls={false} muted playsInline preload="metadata" />
            ) : (
              <a href={existing?.url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 text-sm text-blue-600 dark:text-blue-400">
                <Play className="w-4 h-4" /> Abrir link do vídeo
              </a>
            )}
          </div>
        )
      )}

      {field("Fonte do Vídeo", (
        <div className="flex gap-3">
          {(["upload","link"] as const).map(opt => (
            <label key={opt}
              className={`px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                draft.origemVideo === opt
                  ? "border-blue-500/50 bg-blue-50 dark:bg-blue-500/10"
                  : "border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/70"
              }`}
            >
              <input
                type="radio"
                name="origemVideo"
                value={opt}
                checked={draft.origemVideo === opt}
                onChange={() => setOrigemVideo(opt)}
                className="mr-2"
              />
              {opt === "upload" ? "Upload" : "Link externo"}
            </label>
          ))}
        </div>
      ))}

      {draft.origemVideo === "upload" ? (
        field("Arquivo de Vídeo (até 1GB)", (
          <label className="w-full flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
            <input type="file" accept="video/*" className="hidden" onChange={onPick("videoArquivo","video")} />
            <Upload className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {draft.videoArquivo ? `${draft.videoArquivo.name} • ${(draft.videoArquivo.size/1024/1024).toFixed(1)} MB` : "Clique para enviar ou arraste"}
            </span>
          </label>
        ))
      ) : (
        <Input id={ids.videoUrl} label="URL do Vídeo" value={draft.videoUrl || ""} onChange={setVideoUrl} placeholder="https://…" />
      )}

      {/* Capa (mostrar a existente se houver e não selecionou nova) */}
      {field("Capa do Vídeo (opcional)",
        <>
          {!localCover && mode === "edit" && existingCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={existingCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          {localCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={localCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          <label className="w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={onPick("capa","image")} />
            <ReplaceIcon className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{draft.capa ? "Trocar capa (selecionada)" : (existingCover ? "Trocar capa" : "Enviar capa")}</span>
          </label>
        </>
      )}
    </>
  );

  const PlaylistSection = (
    <>
      <Input id={ids.nome} label="Nome" value={draft.nome || ""} onChange={setNome} placeholder="Ex.: Playlist Mentoria – Semana 1" required />
      {field("Descrição",
        <textarea
          id={ids.desc}
          value={draft.descricao || ""}
          onChange={setDescricao}
          placeholder="O que esta playlist contém?"
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      )}
      <Input id={ids.playlistUrl} label="URL da Playlist" value={draft.playlistUrl || ""} onChange={setPlaylistUrl} placeholder="https://…" required />

      {field("Capa da Playlist (opcional)",
        <>
          {!localCover && mode === "edit" && existingCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={existingCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          {localCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={localCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          <label className="w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={onPick("capa","image")} />
            <ReplaceIcon className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{draft.capa ? "Trocar capa (selecionada)" : (existingCover ? "Trocar capa" : "Enviar capa")}</span>
          </label>
        </>
      )}
    </>
  );

  const DocSection = (
    <>
      <Input id={ids.nome} label="Nome do Documento" value={draft.nome || ""} onChange={setNome} placeholder="Ex.: Guia de Onboarding" required />
      {field("Descrição",
        <textarea
          id={ids.desc}
          value={draft.descricao || ""}
          onChange={setDescricao}
          placeholder="Breve descrição"
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      )}

      {/* arquivo atual (editar) */}
      {mode === "edit" && existing?.type === "doc" && (existingFileSigned || existing?.url) && !localDoc && (
        field("Documento atual",
          <div className="rounded-xl border border-gray-300 dark:border-gray-700/50 p-3 flex items-center gap-2">
            <FileIcon className="w-5 h-5 text-gray-500" />
            {existingFileSigned ? (
              <a href={existingFileSigned} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400">Abrir arquivo</a>
            ) : (
              <a href={existing?.url ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400">Abrir link</a>
            )}
          </div>
        )
      )}

      {field("Arquivo (PDF/DOC/DOCX) até 1GB",
        <label className="w-full flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onPick("docArquivo","doc")}
          />
          <Upload className="w-8 h-8 text-gray-500 mb-2" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {draft.docArquivo ? `${draft.docArquivo.name} • ${(draft.docArquivo.size/1024/1024).toFixed(1)} MB` : "Clique para enviar ou arraste"}
          </span>
        </label>
      )}

      <Input id={ids.docUrl} label="URL do Documento (alternativa ao upload)" value={draft.docUrl || ""} onChange={setDocUrl} placeholder="https://…" />

      {field("Capa do Documento (opcional)",
        <>
          {!localCover && mode === "edit" && existingCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={existingCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          {localCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={localCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          <label className="w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={onPick("capa","image")} />
            <ReplaceIcon className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{draft.capa ? "Trocar capa (selecionada)" : (existingCover ? "Trocar capa" : "Enviar capa")}</span>
          </label>
        </>
      )}
    </>
  );

  const PostSection = (
    <>
      <Input id={ids.nome} label="Título" value={draft.nome || ""} onChange={setNome} placeholder="Título do post" required />
      {field("Conteúdo",
        <textarea
          id={ids.conteudo}
          value={draft.conteudo || ""}
          onChange={setConteudo}
          placeholder="Escreva seu post…"
          rows={6}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          required
        />
      )}

      {/* CAPA ACIMA DO AUTOR (e com prévia assinada) */}
      {field("Capa do Post (opcional)",
        <>
          {!localCover && mode === "edit" && existingCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={existingCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          {localCover && (
            <div className="mb-2 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700/50">
              <img src={localCover} className="w-full max-h-48 object-cover" />
            </div>
          )}
          <label className="w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={onPick("capa","image")} />
            <ReplaceIcon className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{draft.capa ? "Trocar capa (selecionada)" : (existingCover ? "Trocar capa" : "Enviar capa")}</span>
          </label>
        </>
      )}

      {/* Autor: seletor Novo/Existente */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
          Autor do Post
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuthorMode("new")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              authorMode === "new"
                ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10"
                : "border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/70"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Criar novo autor
          </button>
          <button
            type="button"
            onClick={() => setAuthorMode("existing")}
            disabled={!authors.length}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              authorMode === "existing"
                ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10"
                : "border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/70"
            } ${!authors.length ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <Users className="w-4 h-4" /> Selecionar autor existente
          </button>
        </div>
      </div>

      {authorMode === "existing" ? (
        <div className="space-y-3">
          {authorsLoading ? (
            <div className="rounded-xl border border-gray-300 dark:border-gray-700/50 p-6 animate-pulse opacity-70">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800/50 rounded mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-black/5" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Input
                  id={ids.authorFilter}
                  label="Filtrar autores"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  placeholder="Digite para filtrar pelo nome…"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 bottom-3.5" />
              </div>
              {authors.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {authors
                    .filter(a => a.name.toLowerCase().includes(authorFilter.toLowerCase()))
                    .map((a) => (
                      <AuthorCard
                        key={a.name}
                        a={a}
                        selected={String(draft.autorNome || "").trim().toLowerCase() === a.name.trim().toLowerCase()}
                        onPick={() => pickExistingAuthor(a)}
                      />
                    ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700/50 p-6 text-center text-sm text-gray-600 dark:text-gray-400">
                  Nenhum autor encontrado neste projeto.
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input id={ids.autorNome} label="Nome do Autor" value={draft.autorNome || ""} onChange={setAutorNome} placeholder="Ex.: Maria Silva" />
          {field("Imagem do Autor",
            <>
              {/* avatar atual se existir (editar) e não selecionou novo */}
              {!localAuthor && mode === "edit" && existingAuthorAvatar && (
                <div className="mb-2 w-full flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700/50">
                    <img src={existingAuthorAvatar} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs text-gray-500">Imagem atual</div>
                </div>
              )}
              <label className="w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={onPick("autorImg","image")} />
                <ReplaceIcon className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {draft.autorImg ? "Trocar imagem (selecionada)" : (existingAuthorAvatar ? "Trocar imagem" : "Enviar imagem")}
                </span>
              </label>
              {localAuthor && (
                <div className="mt-2 w-full">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700/50">
                    <img src={localAuthor} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {authorMode === "new" ? field("Descrição do Autor",
        <textarea
          id={ids.autorDesc}
          value={draft.autorDescricao || ""}
          onChange={setAutorDesc}
          placeholder="Breve bio do autor"
          rows={2}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      ) : null}
    </>
  );

  const PassoDados = React.useMemo(() => {
    switch (draft.type) {
      case "video": return VideoSection;
      case "playlist": return PlaylistSection;
      case "doc": return DocSection;
      case "blog_post": return PostSection;
      default: return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.type, draft.nome, draft.descricao, draft.origemVideo, draft.videoArquivo, draft.videoUrl,
    draft.playlistUrl, draft.docArquivo, draft.docUrl, draft.capa,
    draft.conteudo, draft.autorImg, draft.autorNome, draft.autorDescricao,
    ids, setNome, setDescricao, setVideoUrl, setPlaylistUrl, setDocUrl, setConteudo, setAutorNome, setAutorDesc, setOrigemVideo, onPick, field,
    authors, authorsLoading, authorMode, authorFilter, pickExistingAuthor,
    existing, existingCover, existingAuthorAvatar, existingFileSigned,
    localCover, localAuthor, localVideo, localDoc,
    mode
  ]);

  // passo: acesso
  const PassoAcesso = React.useMemo(() => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OptionCard
          selected={draft.acesso === "public"}
          onClick={() => setAcesso("public")}
          icon={<Eye className="w-5 h-5 text-green-600 dark:text-green-500" />}
          title="Público"
          desc="Esse conteúdo ficará disponível para todos os usuários que acessarem a plataforma."
        />
        <OptionCard
          selected={draft.acesso === "private"}
          onClick={() => setAcesso("private")}
          icon={<Lock className="w-5 h-5 text-amber-600 dark:text-amber-500" />}
          title="Privado"
          desc="Esse conteúdo ficará restrito. Selecione um asset para liberar o acesso."
        />
      </div>

      {draft.acesso === "private" && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
            Escolha um asset para liberar o acesso
          </div>
          {loadingAssets ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-black/5" />)}
            </div>
          ) : (
            <AssetsGrid
              assets={assets}
              selectedId={draft.assetObrigatorioId || ""}
              onSelect={selectAsset}
            />
          )}
        </div>
      )}
    </>
  ), [draft.acesso, draft.assetObrigatorioId, assets, loadingAssets, setAcesso, selectAsset]);

  const Footer = React.useMemo(() => (
    <div className="flex items-center justify-between gap-3 pt-3 sticky bottom-0 bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm rounded-b-xl border-t border-gray-200 dark:border-gray-800/50">
      {step === "acesso" ? (
        <Button type="button" variant="secondary" onClick={() => setStep("dados")} disabled={submitting}>
          Voltar
        </Button>
      ) : <div />}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>

        {step === "dados" ? (
          <Button type="button" onClick={() => setStep("acesso")} disabled={!coreValid}>
            Definir acesso
          </Button>
        ) : (
          <Button type="submit" onClick={onSubmit} disabled={submitting || !accessValid}>
            {submitting ? "Salvando…" : submitLabel}
          </Button>
        )}
      </div>
    </div>
  ), [step, submitting, coreValid, accessValid, onClose, onSubmit]);

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</div>

      <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-6">
        {step === "dados" ? PassoDados : PassoAcesso}
      </div>

      {Footer}
    </div>
  );
});

// opções (público/privado)
const OptionCard = React.memo(function OptionCard({
  selected, onClick, icon, title, desc,
}: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border w-full transition
        ${selected
          ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10"
          : "border-gray-300 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/70"}`}
    >
      <div className="flex items-center gap-3 mb-1">
        {icon}
        <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
    </button>
  );
});
