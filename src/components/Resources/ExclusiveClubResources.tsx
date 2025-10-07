// src/components/resources/ExclusiveClubResources.tsx
import * as React from "react";
import {
  Plus, Video, List, FileText, PenTool, Eye, Lock, Trash2, Edit3, Play,
  File as FileIcon, Image as ImageIcon, Copy as CopyIcon, ExternalLink, Link as LinkIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CornerDownRight
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ResourceModal, CreateDraft, MAX_BYTES, extFromMime } from "./ResourceModal";

/* ───────────────────────── Types ───────────────────────── */
type ResourceRow = {
  id: string;
  project_id: string;
  access_type: "public" | "private";
  required_asset_id: string | null;
  type: "video" | "playlist" | "doc" | "blog_post";
  name: string;
  description: string | null;
  content: string | null;
  url: string | null;
  file_path: string | null;
  thumbnail_path: string | null;
  author_image_path: string | null;
  image_url: string | null;
  author_name: string | null;
  author_description: string | null;
  created_at: string;
};

type AssetLite = { id: string; name: string };

const typeConfig = {
  video: { label: "Vídeos", one: "Vídeo", icon: Video, color: "text-red-500" },
  playlist: { label: "Playlists", one: "Playlist", icon: List, color: "text-blue-500" },
  doc: { label: "Documentos", one: "Documento", icon: FileText, color: "text-green-600" },
  blog_post: { label: "Posts", one: "Post", icon: PenTool, color: "text-purple-500" },
} as const;

/* ───────────────────────── Draft helper ───────────────────────── */
const emptyDraftFor = (t: "video" | "playlist" | "doc" | "blog_post"): CreateDraft => {
  if (t === "video") {
    return {
      type: "video",
      nome: "",
      descricao: "",
      acesso: "private",
      assetObrigatorioId: "",
      origemVideo: "upload",
      videoArquivo: null,
      videoUrl: "",
      capa: null,
    };
  }
  if (t === "playlist") {
    return {
      type: "playlist",
      nome: "",
      descricao: "",
      acesso: "private",
      assetObrigatorioId: "",
      playlistUrl: "",
      capa: null,
    } as any;
  }
  if (t === "doc") {
    return {
      type: "doc",
      nome: "",
      descricao: "",
      acesso: "private",
      assetObrigatorioId: "",
      docArquivo: null,
      docUrl: "",
      capa: null,
    } as any;
  }
  return {
    type: "blog_post",
    nome: "",
    descricao: "",
    acesso: "private",
    assetObrigatorioId: "",
    conteudo: "",
    capa: null,
    autorImg: null,
    autorNome: "",
    autorDescricao: "",
  } as any;
};

/* ───────────────────────── Signed URLs (privado) ───────────────────────── */
async function createSignedUrlFromFullPath(fullPath: string, expiresInSec = 60 * 30): Promise<string | null> {
  if (!fullPath) return null;
  const [bucket, ...rest] = fullPath.split("/");
  const key = rest.join("/");
  if (!bucket || !key) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(key, expiresInSec);
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

/* Para PDFs privados: pegue o signed URL → blob → objectURL */
function useObjectUrlFromSigned(fullPath?: string | null) {
  const signed = useSignedUrl(fullPath, [fullPath]);
  const [objUrl, setObjUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let revoked = false;
    let current: string | null = null;
    (async () => {
      try {
        if (!signed) { setObjUrl(null); return; }
        const res = await fetch(signed);
        if (!res.ok) throw new Error("fetch-failed");
        const blob = await res.blob();
        current = URL.createObjectURL(blob);
        if (!revoked) setObjUrl(current);
      } catch {
        setObjUrl(null);
      }
    })();
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [signed]);

  return objUrl;
}

/* ───────────────────────── Utils visual/YouTube ───────────────────────── */
const youTubeId = (u?: string | null) => {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v");
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
  } catch {}
  return null;
};
const youTubeThumb = (u?: string | null) => {
  const id = youTubeId(u);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const DocFallback = () => (
  <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 border border-gray-200 dark:border-gray-800/50 grid place-items-center">
    <div className="flex items-center gap-2 text-gray-500">
      <FileIcon className="w-6 h-6" />
      <span className="text-sm font-medium">Prévia indisponível</span>
    </div>
  </div>
);

const ImageFallback = ({ label = "Sem capa" }: { label?: string }) => (
  <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 border border-gray-200 dark:border-gray-800/50 grid place-items-center">
    <div className="flex items-center gap-2 text-gray-500">
      <ImageIcon className="w-6 h-6" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  </div>
);

/* ───────────────────────── PDF Preview (Card): sempre renderiza canvas ───────────────────────── */
/* ───────────────── PDF Preview (Card) com cancelamento e fundo branco ──────────────── */
const PdfFirstPage: React.FC<{ pdfUrl: string }> = ({ pdfUrl }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = React.useRef<any | null>(null);
  const pdfRef = React.useRef<any | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      // cancela render anterior
      try { renderTaskRef.current?.cancel(); } catch {}
      renderTaskRef.current = null;
      setReady(false);

      try {
        const pdfjsLib: any = await import("pdfjs-dist");
        // worker 4.x (.mjs)
        try {
          const ver = pdfjsLib.version?.trim() || "4.8.69";
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
        } catch {}

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          isEvalSupported: false,
          useWorkerFetch: true,
          disableCreateObjectURL: false,
        });
        const pdf = await loadingTask.promise;
        if (!mounted) return;
        pdfRef.current = pdf;

        const page = await pdf.getPage(1);
        if (!mounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: 0.6 * dpr });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // reset transform & fundo branco pra evitar inversão/escurecer
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        (canvas.style as any).backgroundColor = "#fff";

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (mounted) setReady(true);
      } catch (e) {
        // fallback: tenta sem worker
        try {
          const pdfjsLib: any = await import("pdfjs-dist");
          const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            isEvalSupported: false,
            disableWorker: true,
            useWorkerFetch: true,
            disableCreateObjectURL: false,
          });
          const pdf = await loadingTask.promise;
          if (!mounted) return;
          pdfRef.current = pdf;

          const page = await pdf.getPage(1);
          const canvas = canvasRef.current;
          if (!canvas) return;

          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: 0.6 * dpr });

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
          canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
          (canvas.style as any).backgroundColor = "#fff";

          const renderTask = page.render({ canvasContext: ctx, viewport });
          renderTaskRef.current = renderTask;
          await renderTask.promise;

          if (mounted) setReady(true);
        } catch {
          if (mounted) setReady(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
      try { renderTaskRef.current?.cancel(); } catch {}
      renderTaskRef.current = null;
      try { pdfRef.current?.destroy?.(); } catch {}
      pdfRef.current = null;
    };
  }, [pdfUrl]);

  return (
    <div className="aspect-[16/10] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800/50 bg-white grid place-items-center">
      <canvas ref={canvasRef} className={`max-w-full h-auto ${ready ? "" : "hidden"}`} />
      {!ready && <DocFallback />}
    </div>
  );
};

/* ───────────────────────── PDF Viewer (Modal) ───────────────────────── */
/* ───────────────── PDF Viewer (Modal) com render imediato + rAF + ResizeObserver ───────────── */
const PdfViewer: React.FC<{ src: string }> = ({ src }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const renderTaskRef = React.useRef<any | null>(null);
  const pdfRef = React.useRef<any | null>(null);

  const [page, setPage] = React.useState(1);
  const [numPages, setNumPages] = React.useState(1);
  const [scale, setScale] = React.useState(0.7); // 70% inicial
  const [loading, setLoading] = React.useState(true);

  // util: aguardar próximo frame (garante que o modal já pintou)
  const nextFrame = React.useCallback(
    () => new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
    []
  );

  // util: renderizar pagina com cancelamento e fundo branco
  const renderPage = React.useCallback(
    async (pageNumber: number, zoom: number) => {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;

      try { renderTaskRef.current?.cancel(); } catch {}
      renderTaskRef.current = null;
      setLoading(true);

      try {
        const pageObj = await pdf.getPage(pageNumber);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pageObj.getViewport({ scale: zoom * dpr });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // reset + tamanho + fundo branco
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        (canvas.style as any).backgroundColor = "#fff";

        const task = pageObj.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        // se foi cancelado, ok
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // carregar documento
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const pdfjsLib: any = await import("pdfjs-dist");
        try {
          const ver = pdfjsLib.version?.trim() || "4.8.69";
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
        } catch {}

        const loadingTask = pdfjsLib.getDocument({
          url: src,
          isEvalSupported: false,
          useWorkerFetch: true,
          disableCreateObjectURL: false,
        });
        const pdf = await loadingTask.promise;
        if (!mounted) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages || 1);
        setPage(1);

        // 🔑 aguarda 2 frames para o modal pintar, então renderiza já a primeira página
        await nextFrame();
        await nextFrame();
        await renderPage(1, 0.7);
      } catch {
        // fallback sem worker
        try {
          const pdfjsLib: any = await import("pdfjs-dist");
          const loadingTask = pdfjsLib.getDocument({
            url: src,
            isEvalSupported: false,
            disableWorker: true,
            useWorkerFetch: true,
            disableCreateObjectURL: false,
          });
          const pdf = await loadingTask.promise;
          if (!mounted) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages || 1);
          setPage(1);

          await nextFrame();
          await nextFrame();
          await renderPage(1, 0.7);
        } catch (err) {
          console.error("PDF load error:", err);
          toast.error("Falha ao carregar PDF.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      try { renderTaskRef.current?.cancel(); } catch {}
      renderTaskRef.current = null;
      try { pdfRef.current?.destroy?.(); } catch {}
      pdfRef.current = null;
    };
  }, [src, nextFrame, renderPage]);

  // re-render quando muda página/zoom
  React.useEffect(() => {
    renderPage(page, scale);
  }, [page, scale, renderPage]);

  // re-render quando o container muda de tamanho (abre/fecha/resize do modal)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // re-render a página atual no mesmo zoom
      renderPage(page, scale);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [page, scale, renderPage]);

  const canPrev = page > 1;
  const canNext = page < (numPages || 1);

  return (
    <div className="w-full" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1">
          <Button variant="secondary" onClick={() => canPrev && setPage(p => p - 1)} disabled={!canPrev}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <Button variant="secondary" onClick={() => canNext && setPage(p => p + 1)} disabled={!canNext}>
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <div className="ml-3 text-sm text-gray-600 dark:text-gray-300">
            Página {page} / {numPages}
          </div>
        </div>
        <div className="inline-flex items-center gap-2">
          <Button variant="secondary" onClick={() => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(2)))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="text-sm w-16 text-center text-gray-700 dark:text-gray-200">
            {Math.round(scale * 100)}%
          </div>
          <Button variant="secondary" onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(2)))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="ml-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-white/10 text-sm text-gray-800 dark:text-gray-100"
            title="Abrir em nova aba"
          >
            Abrir <CornerDownRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="w-full border rounded-xl border-gray-200 dark:border-gray-800/60 bg-white grid place-items-center min-h-[60vh]">
        <canvas ref={canvasRef} className={`max-w-full h-auto ${loading ? "opacity-60" : "opacity-100"}`} />
      </div>
    </div>
  );
};

/* ───────────────────────── Badges/Chips ───────────────────────── */
const typeBadge = (t: keyof typeof typeConfig) => typeConfig[t].color;

/** Chip “Gated” — unificado para público/privado */
const GatedChip: React.FC<{ access: "public" | "private"; assetName?: string | null }> = ({ access, assetName }) => {
  if (access === "public") {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800/60 bg-white/70 dark:bg-zinc-900/50 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
        <Eye className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
        <span className="font-medium">Público</span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-600 dark:text-gray-400">qualquer um com login pode acessar</span>
      </div>
    );
  }
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800/60 bg-white/70 dark:bg-zinc-900/50 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
      <Lock className="w-3.5 h-3.5 text-amber-500" />
      <span className="font-medium">Privado</span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-600 dark:text-gray-400">precisa do ativo</span>
      <span className="font-semibold text-gray-900 dark:text-gray-100">“{assetName ?? "…" }”</span>
    </div>
  );
};

/* Pequena faixa de link com copiar */
const ExternalLinkBar: React.FC<{ url: string }> = ({ url }) => {
  const display = url.length > 40 ? url.slice(0, 40) + "…" : url;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado!"); }
    catch { toast.error("Falha ao copiar link."); }
  };
  return (
    <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800/60 bg-gray-50/70 dark:bg-zinc-900/40 px-2.5 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <LinkIcon className="w-3.5 h-3.5 text-gray-600 dark:text-white" />
        <a href={url} target="_blank" rel="noreferrer" className="truncate text-xs text-blue-700 dark:text-blue-300 hover:underline">{display}</a>
      </div>
      <div className="flex items-center gap-1.5 pl-2 shrink-0">
        <a
          title="Abrir"
          href={url}
          target="_blank"
          rel="noreferrer"
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <ExternalLink className="w-4 h-4 text-gray-700 dark:text-white" />
        </a>
        <button
          title="Copiar"
          onClick={copy}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <CopyIcon className="w-4 h-4 text-gray-700 dark:text-white" />
        </button>
      </div>
    </div>
  );
};

/* ───────────────────────── Component ───────────────────────── */
export const ExclusiveClubResources: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [active, setActive] = React.useState<"video" | "playlist" | "doc" | "blog_post">("video");

  // lista e assets
  const [rows, setRows] = React.useState<ResourceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [assetNames, setAssetNames] = React.useState<Record<string, string>>({});

  // modal criar/editar
  const [isOpen, setIsOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = React.useState<ResourceRow | null>(null);
  const [draft, setDraft] = React.useState<CreateDraft>(emptyDraftFor("video"));

  // mini player vídeo
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [playerTitle, setPlayerTitle] = React.useState("");
  const [playerSrc, setPlayerSrc] = React.useState<string | null>(null);

  // modal documento (viewer)
  const [docOpen, setDocOpen] = React.useState(false);
  const [docTitle, setDocTitle] = React.useState("");
  const [docSrc, setDocSrc] = React.useState<string | null>(null);

  // nomes de assets
  const [assetMap, setAssetMap] = React.useState<Record<string, string>>({});

  /* ─────────── carregar ─────────── */
  const load = React.useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Falha ao carregar recursos.");
      setRows([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as ResourceRow[];
    setRows(list);

    // nomes dos assets pra mensagem Gated
    const ids = Array.from(new Set(list.map(r => r.required_asset_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: assets, error: aerr } = await supabase
        .from("assets")
        .select("id,name")
        .in("id", ids);
      if (!aerr && assets) {
        const map: Record<string, string> = {};
        (assets as AssetLite[]).forEach(a => map[a.id] = a.name);
        setAssetNames(map);
        setAssetMap(map);
      }
    } else {
      setAssetNames({});
      setAssetMap({});
    }

    setLoading(false);
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  /* ─────────── player / link ─────────── */
  const openPlayer = async (title: string, r: ResourceRow) => {
    if (r.type === "video") {
      if (r.url) {
        // externo (ex: YouTube)
        window.open(r.url, "_blank", "noopener,noreferrer");
        return;
      }
      // interno: precisa signed do file_path
      const signed = await createSignedUrlFromFullPath(r.file_path || "");
      if (!signed) { toast.error("Vídeo indisponível."); return; }
      setPlayerTitle(title);
      setPlayerSrc(signed);
      setPlayerOpen(true);
    } else if (r.type === "playlist") {
      if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    }
  };

  /* ─────────── criar/editar/excluir ─────────── */
  function openCreate(t: "video" | "playlist" | "doc" | "blog_post") {
    setActive(t);
    setMode("create");
    setEditTarget(null);
    setDraft(emptyDraftFor(t));
    setIsOpen(true);
  }

  function openEdit(row: ResourceRow) {
    setActive(row.type);
    setMode("edit");
    setEditTarget(row);

    if (row.type === "video") {
      const origemVideo: "upload" | "link" = row.file_path ? "upload" : "link";
      setDraft({
        type: "video",
        nome: row.name || "",
        descricao: row.description || "",
        acesso: row.access_type,
        assetObrigatorioId: row.required_asset_id || "",
        origemVideo,
        videoArquivo: null,
        videoUrl: row.url || "",
        capa: null,
      } as any);
    } else if (row.type === "playlist") {
      setDraft({
        type: "playlist",
        nome: row.name || "",
        descricao: row.description || "",
        acesso: row.access_type,
        assetObrigatorioId: row.required_asset_id || "",
        playlistUrl: row.url || "",
        capa: null,
      } as any);
    } else if (row.type === "doc") {
      setDraft({
        type: "doc",
        nome: row.name || "",
        descricao: row.description || "",
        acesso: row.access_type,
        assetObrigatorioId: row.required_asset_id || "",
        docArquivo: null,
        docUrl: row.url || "",
        capa: null,
      } as any);
    } else {
      setDraft({
        type: "blog_post",
        nome: row.name || "",
        descricao: row.description || "",
        acesso: row.access_type,
        assetObrigatorioId: row.required_asset_id || "",
        conteudo: row.content || "",
        capa: null,
        autorImg: null,
        autorNome: row.author_name || "",
        autorDescricao: row.author_description || "",
      } as any);
    }

    setIsOpen(true);
  }

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        p_project_id: projectId,
        p_type: draft.type,
        p_name: (draft as any).nome,
        p_description: (draft as any).descricao || null,
        p_content: draft.type === "blog_post" ? (draft as any).conteudo || null : null,
        p_url:
          draft.type === "video"
            ? (draft as any).origemVideo === "link" ? (draft as any).videoUrl || null : null
            : draft.type === "playlist"
            ? (draft as any).playlistUrl || null
            : draft.type === "doc"
            ? ((draft as any).docUrl || null)
            : null,
        p_image_url: null,
        p_access_type: (draft as any).acesso,
        p_author_name: draft.type === "blog_post" ? (draft as any).autorNome || null : null,
        p_author_description: draft.type === "blog_post" ? (draft as any).autorDescricao || null : null,
        p_required_asset_id: (draft as any).acesso === "private" ? (draft as any).assetObrigatorioId || null : null,
      };

      const { data: created, error: fnErr } = await supabase.rpc("resource_create", payload);
      if (fnErr) throw fnErr;
      const res = (created as any)?.[0];
      if (!res?.resource_id) throw new Error("Falha ao criar recurso.");

      const resourceId: string = res.resource_id;
      const filesPrefix: string = res.files_prefix;   // "resource-files/<project>/<resource>/"
      const imagesPrefix: string = res.images_prefix; // "resource-images/<project>/<resource>/"

      const uploads: Array<Promise<any>> = [];
      const patch: Record<string, string | null> = {};

      if ((draft as any).capa) {
        const file: File = (draft as any).capa;
        if (file.size > MAX_BYTES) throw new Error("Capa excede 1GB.");
        const ext = extFromMime(file.type, ".jpg");
        const key = `${imagesPrefix}cover${ext}`.replace(/^resource-images\//, "");
        uploads.push(supabase.storage.from("resource-images").upload(key, file, { upsert: true }));
        patch.thumbnail_path = `resource-images/${key}`;
      }

      if (draft.type === "blog_post" && (draft as any).autorImg) {
        const file: File = (draft as any).autorImg;
        if (file.size > MAX_BYTES) throw new Error("Imagem do autor excede 1GB.");
        const ext = extFromMime(file.type, ".jpg");
        const key = `${imagesPrefix}author${ext}`.replace(/^resource-images\//, "");
        uploads.push(supabase.storage.from("resource-images").upload(key, file, { upsert: true }));
        patch.author_image_path = `resource-images/${key}`;
      }

      if (draft.type === "video" && (draft as any).origemVideo === "upload" && (draft as any).videoArquivo) {
        const f: File = (draft as any).videoArquivo;
        if (f.size > MAX_BYTES) throw new Error("Vídeo excede 1GB.");
        const ext = extFromMime(f.type, ".mp4");
        const key = `${filesPrefix}file${ext}`.replace(/^resource-files\//, "");
        uploads.push(supabase.storage.from("resource-files").upload(key, f, { upsert: true }));
        patch.file_path = `resource-files/${key}`;
      }
      if (draft.type === "doc" && (draft as any).docArquivo) {
        const f: File = (draft as any).docArquivo;
        if (f.size > MAX_BYTES) throw new Error("Documento excede 1GB.");
        const ext = extFromMime(f.type, ".pdf");
        const key = `${filesPrefix}file${ext}`.replace(/^resource-files\//, "");
        uploads.push(supabase.storage.from("resource-files").upload(key, f, { upsert: true }));
        patch.file_path = `resource-files/${key}`;
      }

      if (uploads.length) {
        const results = await Promise.all(uploads);
        const anyErr = results.find(r => r?.error);
        if (anyErr?.error) throw new Error(anyErr.error.message || "Falha ao subir arquivos.");
      }

      if (Object.keys(patch).length) {
        const { error: upErr } = await supabase.rpc("resource_update", {
          p_resource_id: resourceId,
          p_patch: patch,
        } as any);
        if (upErr) throw upErr;
      }

      toast.success("Recurso criado!");
      setIsOpen(false);
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erro ao criar recurso.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !editTarget) return;

    try {
      setSubmitting(true);

      const resourceId = editTarget.id;
      const filesPrefix = `resource-files/${projectId}/${resourceId}/`;
      const imagesPrefix = `resource-images/${projectId}/${resourceId}/`;

      const patch: Record<string, any> = {
        name: (draft as any).nome || "",
        description: (draft as any).descricao || null,
        access_type: (draft as any).acesso,
        required_asset_id: (draft as any).acesso === "private" ? ((draft as any).assetObrigatorioId || null) : null,
      };

      if (draft.type === "blog_post") {
        patch.content = (draft as any).conteudo || null;
        patch.author_name = (draft as any).autorNome || null;
        patch.author_description = (draft as any).autorDescricao || null;
        patch.url = null;
      } else if (draft.type === "video") {
        if ((draft as any).origemVideo === "link") {
          patch.url = (draft as any).videoUrl || null;
          patch.file_path = null;
        } else {
          patch.url = null;
        }
      } else if (draft.type === "playlist") {
        patch.url = (draft as any).playlistUrl || null;
      } else if (draft.type === "doc") {
        if ((draft as any).docArquivo) {
          patch.url = null;
        } else {
          patch.url = (draft as any).docUrl || null;
        }
      }

      const uploads: Array<Promise<any>> = [];

      if ((draft as any).capa) {
        const file: File = (draft as any).capa;
        if (file.size > MAX_BYTES) throw new Error("Capa excede 1GB.");
        const ext = extFromMime(file.type, ".jpg") || ".jpg";
        const key = `${imagesPrefix}cover${ext}`.replace(/^resource-images\//, "");
        uploads.push(supabase.storage.from("resource-images").upload(key, file, { upsert: true }));
        patch.thumbnail_path = `resource-images/${key}`;
      }

      if (draft.type === "blog_post" && (draft as any).autorImg) {
        const f: File = (draft as any).autorImg;
        if (f.size > MAX_BYTES) throw new Error("Imagem do autor excede 1GB.");
        const ext = extFromMime(f.type, ".jpg") || ".jpg";
        const key = `${imagesPrefix}author${ext}`.replace(/^resource-images\//, "");
        uploads.push(supabase.storage.from("resource-images").upload(key, f, { upsert: true }));
        patch.author_image_path = `resource-images/${key}`;
      }

      if (draft.type === "video" && (draft as any).origemVideo === "upload" && (draft as any).videoArquivo) {
        const f: File = (draft as any).videoArquivo;
        if (f.size > MAX_BYTES) throw new Error("Vídeo excede 1GB.");
        const ext = extFromMime(f.type, ".mp4");
        const key = `${filesPrefix}file${ext}`.replace(/^resource-files\//, "");
        uploads.push(supabase.storage.from("resource-files").upload(key, f, { upsert: true }));
        patch.file_path = `resource-files/${key}`;
      }

      if (draft.type === "doc" && (draft as any).docArquivo) {
        const f: File = (draft as any).docArquivo;
        if (f.size > MAX_BYTES) throw new Error("Documento excede 1GB.");
        const ext = extFromMime(f.type, ".pdf");
        const key = `${filesPrefix}file${ext}`.replace(/^resource-files\//, "");
        uploads.push(supabase.storage.from("resource-files").upload(key, f, { upsert: true }));
        patch.file_path = `resource-files/${key}`;
      }

      if (uploads.length) {
        const results = await Promise.all(uploads);
        const anyErr = results.find(r => r?.error);
        if (anyErr?.error) throw new Error(anyErr.error.message || "Falha ao subir arquivos.");
      }

      const { error: upErr } = await supabase.rpc("resource_update", {
        p_resource_id: resourceId,
        p_patch: patch,
      } as any);
      if (upErr) throw upErr;

      toast.success("Recurso atualizado!");
      setIsOpen(false);
      setEditTarget(null);
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erro ao atualizar recurso.");
    } finally {
      setSubmitting(false);
    }
  };

  async function deleteResource(id: string) {
    if (!confirm("Excluir este recurso? Essa ação é permanente.")) return;
    try {
      const { error } = await supabase.rpc("resource_delete", { p_resource_id: id });
      if (error) throw error;
      toast.success("Recurso excluído.");
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erro ao excluir recurso.");
    }
  }

  /* ─────────── Cards helpers ─────────── */
  const CardToolbar: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
        onClick={onEdit}
        title="Editar"
      >
        <Edit3 className="w-4 h-4" />
      </button>
      <button
        className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        onClick={onDelete}
        title="Excluir"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const InfoFooter: React.FC<{ r: ResourceRow }> = ({ r }) => (
    <>
      {r.description && <p className="text-gray-700 dark:text-gray-400 text-sm mt-2">{r.description}</p>}
      <div className="text-[11px] text-gray-500 dark:text-gray-500 font-medium mt-3">
        Criado em {new Date(r.created_at).toLocaleDateString("pt-BR")}
      </div>
    </>
  );

  /* ─────────── Cards por tipo ─────────── */
  const VideoCard: React.FC<{ r: ResourceRow }> = ({ r }) => {
    const coverSigned = useSignedUrl(r.thumbnail_path);
    const fileSigned = useSignedUrl(r.file_path);
    const thumb = coverSigned || youTubeThumb(r.url || undefined) || null;

    const hasInternalVideo = !!r.file_path && !r.url;

    return (
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-300 dark:border-gray-800/50 rounded-2xl overflow-hidden hover:border-gray-400 dark:hover:border-gray-700/70 transition-all duration-200 group shadow-sm">
        <div className="relative">
          <button onClick={() => openPlayer(r.name, r)} className="w-full block">
            {thumb ? (
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={thumb} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : hasInternalVideo && fileSigned ? (
              <div className="relative aspect-[16/10] overflow-hidden bg-black">
                <video
                  src={fileSigned}
                  className="w-full h-full object-cover opacity-90"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : (
              <ImageFallback label="Prévia de vídeo" />
            )}
          </button>
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm ${typeBadge("video")}`}>
            <Video className="w-3.5 h-3.5" />
            Vídeo
          </span>
          <div className="absolute top-3 right-3"><CardToolbar onEdit={() => openEdit(r)} onDelete={() => deleteResource(r.id)} /></div>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h4>
          </div>

          {r.url && <ExternalLinkBar url={r.url} />}

          <GatedChip access={r.access_type} assetName={r.required_asset_id ? assetMap[r.required_asset_id] : undefined} />

          <InfoFooter r={r} />
        </div>
      </div>
    );
  };

  const PlaylistCard: React.FC<{ r: ResourceRow }> = ({ r }) => {
    const coverSigned = useSignedUrl(r.thumbnail_path);
    const img = coverSigned || youTubeThumb(r.url || undefined) || null;

    return (
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-300 dark:border-gray-800/50 rounded-2xl overflow-hidden hover:border-gray-400 dark:hover:border-gray-700/70 transition-all duration-200 group shadow-sm">
        <div className="relative">
          <button onClick={() => openPlayer(r.name, r)} className="w-full block">
            {img ? (
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={img} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            ) : (
              <ImageFallback label="Prévia de playlist" />
            )}
          </button>
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm ${typeBadge("playlist")}`}>
            <List className="w-3.5 h-3.5" />
            Playlist
          </span>
          <div className="absolute top-3 right-3"><CardToolbar onEdit={() => openEdit(r)} onDelete={() => deleteResource(r.id)} /></div>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h4>
          </div>

          {r.url && <ExternalLinkBar url={r.url} />}

          <GatedChip access={r.access_type} assetName={r.required_asset_id ? assetMap[r.required_asset_id] : undefined} />

          <InfoFooter r={r} />
        </div>
      </div>
    );
  };

  const DocCard: React.FC<{ r: ResourceRow }> = ({ r }) => {
    const coverSigned = useSignedUrl(r.thumbnail_path);
    const fileObjUrl = useObjectUrlFromSigned(r.file_path); // para PDF privado
    const urlIsPdf = (r.url || "").toLowerCase().endsWith(".pdf");
    const showPdfPreview = coverSigned ? false : (fileObjUrl || urlIsPdf);

    const openDoc = async () => {
      setDocTitle(r.name);
      if (r.url) {
        setDocSrc(r.url);
        setDocOpen(true);
        return;
      }
      const signed = await createSignedUrlFromFullPath(r.file_path || "");
      if (!signed) { toast.error("Documento indisponível."); return; }
      setDocSrc(signed);
      setDocOpen(true);
    };

    return (
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-300 dark:border-gray-800/50 rounded-2xl overflow-hidden hover:border-gray-400 dark:hover:border-gray-700/70 transition-all duration-200 group shadow-sm">
        <div className="relative">
          <button onClick={openDoc} className="w-full block text-left">
            {coverSigned ? (
              <div className="aspect-[16/10] overflow-hidden">
                <img src={coverSigned} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ) : showPdfPreview ? (
              <PdfFirstPage pdfUrl={fileObjUrl || (r.url as string)} />
            ) : (
              <DocFallback />
            )}
          </button>
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm ${typeBadge("doc")}`}>
            <FileText className="w-3.5 h-3.5" />
            Documento
          </span>
          <div className="absolute top-3 right-3"><CardToolbar onEdit={() => openEdit(r)} onDelete={() => deleteResource(r.id)} /></div>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h4>
          </div>

          {r.url && <ExternalLinkBar url={r.url} />}

          <GatedChip access={r.access_type} assetName={r.required_asset_id ? assetMap[r.required_asset_id] : undefined} />

          <InfoFooter r={r} />
        </div>
      </div>
    );
  };

  const PostCard: React.FC<{ r: ResourceRow }> = ({ r }) => {
    const coverSigned = useSignedUrl(r.thumbnail_path);
    const authorSigned = useSignedUrl(r.author_image_path);
    const excerpt = (r.content || "").replace(/\s+/g, " ").slice(0, 180) + ((r.content || "").length > 180 ? "…" : "");

    return (
      <div className="bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-800/50 rounded-2xl overflow-hidden hover:border-gray-400 dark:hover:border-gray-700/70 transition-all duration-200 group shadow-sm">
        <div className="relative">
          {coverSigned ? (
            <img src={coverSigned} className="w-full h-44 object-cover" loading="lazy" />
          ) : (
            <ImageFallback label="Capa do post" />
          )}
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm ${typeBadge("blog_post")}`}>
            <PenTool className="w-3.5 h-3.5" />
            Post
          </span>
          <div className="absolute top-3 right-3"><CardToolbar onEdit={() => openEdit(r)} onDelete={() => deleteResource(r.id)} /></div>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h4>
          </div>

          {r.description && <p className="text-gray-700 dark:text-gray-400 text-sm mt-1">{r.description}</p>}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{excerpt || "—"}</p>

          <div className="flex items-center gap-3 mt-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800/50 overflow-hidden grid place-items-center">
              {authorSigned ? <img src={authorSigned} className="w-full h-full object-cover" /> : <PenTool className="w-4 h-4 text-gray-400" />}
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">{r.author_name || "Autor"}</div>
              {r.author_description && <div className="text-xs text-gray-500 dark:text-gray-400">{r.author_description}</div>}
            </div>
          </div>

          <GatedChip access={r.access_type} assetName={r.required_asset_id ? assetMap[r.required_asset_id] : undefined} />

          <InfoFooter r={r} />
        </div>
      </div>
    );
  };

  /* ─────────── Render principal ─────────── */
  const filtered = rows.filter(r => r.type === active);
  const ActiveIcon = typeConfig[active].icon;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-300 dark:border-gray-800/50">
        <nav className="flex space-x-8 overflow-x-auto">
          {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((t) => {
            const isActive = active === t;
            const Icon = typeConfig[t].icon;
            return (
              <button
                key={t}
                onClick={() => setActive(t as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? "border-gray-900 dark:border-white text-gray-900 dark:text-gray-100"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? typeConfig[t].color : ""}`} />
                <span>{typeConfig[t].label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Header + botão */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {typeConfig[active].label}
        </h3>
        <Button onClick={() => openCreate(active)} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Novo {typeConfig[active].one}
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-black/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-300 dark:border-gray-800/50 bg-white dark:bg-gray-900/50 p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/50 grid place-items-center mb-4 border border-gray-200 dark:border-gray-800/50">
            <ActiveIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nenhum recurso ainda</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crie seu primeiro {typeConfig[active].one.toLowerCase()} para começar.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => {
            if (r.type === "video") return <VideoCard key={r.id} r={r} />;
            if (r.type === "playlist") return <PlaylistCard key={r.id} r={r} />;
            if (r.type === "doc") return <DocCard key={r.id} r={r} />;
            return <PostCard key={r.id} r={r} />;
          })}
        </div>
      )}

      {/* Player modal (para vídeos internos) */}
      <Modal isOpen={playerOpen} onClose={() => setPlayerOpen(false)} title={playerTitle} size="lg">
        {playerSrc ? (
          <video src={playerSrc} className="w-full aspect-video" controls playsInline />
        ) : (
          <div className="p-6 text-gray-400">Vídeo indisponível.</div>
        )}
      </Modal>

      {/* Modal documento (PDF Viewer minimalista) */}
      <Modal isOpen={docOpen} onClose={() => setDocOpen(false)} title={docTitle} size="lg">
        {docSrc ? (
          <div className="w-full">
            <PdfViewer key={docSrc || "none"} src={docSrc!} />
          </div>
        ) : (
          <div className="p-6 text-gray-400">Documento indisponível.</div>
        )}
      </Modal>

      {/* Modal criar/editar */}
      <Modal
        isOpen={isOpen}
        onClose={() => !submitting && setIsOpen(false)}
        title={`${mode === "create" ? "Novo" : "Editar"} ${typeConfig[active].one}`}
        size="lg"
      >
        <form onSubmit={mode === "create" ? createResource : updateResource} className="space-y-6">
          <ResourceModal
            title={mode === "create" ? "Preencha os dados" : "Edite os dados"}
            submitLabel={mode === "create" ? `Criar ${typeConfig[active].one}` : "Salvar alterações"}
            draft={draft}
            setDraft={setDraft}
            onClose={() => !submitting && setIsOpen(false)}
            onSubmit={mode === "create" ? createResource : updateResource}
            projectId={projectId}
            submitting={submitting}
            mode={mode}
            resourceId={editTarget?.id || null}
          />
        </form>
      </Modal>
    </div>
  );
};
