// src/components/Projects/tabs/TagsTab.tsx
import React from "react";
import {
  Plus, Calendar, Hash, Shield, Box, ChevronDown, Users, Copy, Check as CheckIcon, Zap
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";
import toast from "react-hot-toast";

export type TagRow = {
  id: string;
  project_id: string;
  asset_id?: string | null;
  public_id: string;
  nfc_uid: string;
  claim_mode: "code" | "secure_tap" | "first_to_claim";
  status: "active" | "disabled" | "claimed";
  created_at: string;
  assets?: { id: string; name: string | null } | null;
  tag_claims?: Array<{
    claimed_by_profile_id?: string | null;
    claimed_at?: string | null;
    profiles?: {
      id: string;
      display_name: string | null;
      email: string | null;
      profile_cards?: Array<{ username: string | null }> | null;
    } | null;
  }> | null;
};

type AssetLite = { id: string; name: string | null };

type ProjectLite = {
  id: string;
  name: string;
  destination_url: string | null;
  type: "profile_card" | "exclusive_club" | "simple_redirect" | null;
};

const APP_URL =
  (import.meta as any)?.env?.VITE_APP_URL ||
  (import.meta as any)?.env?.APP_URL ||
  "https://tok-chip.vercel.app";

const PUBLIC_ID_RE = /^[A-Za-z0-9\-_]{4,64}$/;
const normalizeNfc = (s: string) => s.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
const showEnds = (s: string, start = 6, end = 4) =>
  s.length <= start + end ? s : `${s.slice(0, start)}…${s.slice(-end)}`;
const fmtBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

// edge invoke com corpo legível
async function invokeEdgeJson(fn: string, body: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const url = `${supabase.functions.url}/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, json };
}

// Select reutilizável
const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
> = ({ label, error, className = "", children, ...rest }) => (
  <label className="grid gap-1.5">
    {label && (
      <span className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    )}
    <div className="relative">
      <select
        {...rest}
        className={[
          "appearance-none w-full pr-10 pl-3 py-2 rounded-lg",
          "bg-white dark:bg-zinc-900 border",
          error
            ? "border-red-500 focus:ring-2 focus:ring-red-400"
            : "border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500",
          "text-zinc-900 dark:text-zinc-100 outline-none transition",
          className,
        ].join(" ")}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
        aria-hidden
      />
    </div>
    {error && <span className="text-xs text-red-600">{error}</span>}
  </label>
);

export const TagsTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [project, setProject] = React.useState<ProjectLite | null>(null);
  const [rows, setRows] = React.useState<TagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // assets do projeto (opcional no modal)
  const [assets, setAssets] = React.useState<AssetLite[]>([]);

  // modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<{
    nfc_uid: string;
    asset_id: string; // opcional
    claim_mode: "code" | "secure_tap" | "first_to_claim";
  }>({
    nfc_uid: "",
    asset_id: "",
    claim_mode: "first_to_claim",
  });
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof typeof draft, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [postCreateLink, setPostCreateLink] = React.useState<string>("");
  const firstFieldRef = React.useRef<HTMLInputElement>(null);

  const isValid = React.useMemo(() => {
    const nfc = normalizeNfc(draft.nfc_uid);
    return !!nfc && !!draft.claim_mode;
  }, [draft]);

  // loads
  const loadProject = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id,name,destination_url,type")
      .eq("id", projectId)
      .maybeSingle();
    if (error) {
      toast.error("Falha ao carregar projeto.");
      return;
    }
    setProject((data ?? null) as ProjectLite | null);
  }, [projectId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tags")
      .select(`
        id, project_id, asset_id, public_id, nfc_uid, claim_mode, status, created_at,
        assets(id,name),
        tag_claims:tag_claims(
          claimed_by_profile_id, claimed_at,
          profiles:profiles!tag_claims_claimed_by_profile_id_fkey(
            id, display_name, email,
            profile_cards:profile_cards!profile_cards_profile_id_fkey(username)
          )
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as TagRow[]);
    }
    setLoading(false);
  }, [projectId]);

  const loadAssets = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id,name,project_id")
      .eq("project_id", projectId)
      .order("name", { ascending: true });
    if (error) {
      toast.error("Falha ao carregar assets.");
      return;
    }
    setAssets(((data ?? []) as any[]).map(a => ({ id: a.id, name: a.name })) as AssetLite[]);
  }, [projectId]);

  React.useEffect(() => { loadProject(); }, [loadProject]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadAssets(); }, [loadAssets]);

  // realtime
  React.useEffect(() => {
    const ch = supabase
      .channel("tags_live_" + projectId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tags", filter: `project_id=eq.${projectId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tag_claims" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, load]);

  const openModal = () => {
    setDraft({ nfc_uid: "", asset_id: "", claim_mode: "first_to_claim" });
    setFieldErrors({});
    setPostCreateLink("");
    setIsModalOpen(true);
  };

  // helpers
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copiado!"); }
    catch { toast.error("Não foi possível copiar."); }
  };

  const claimedByText = (t: TagRow) => {
    const claims = Array.isArray(t.tag_claims) ? t.tag_claims : [];
    const names: string[] = [];
    const seen = new Set<string>();
    for (const c of claims) {
      const prof = c?.profiles;
      if (!prof) continue;
      if (seen.has(prof.id)) continue;
      seen.add(prof.id);
      names.push(prof.display_name || prof.email || showEnds(prof.id, 6, 4));
    }
    const text = names.join(", ");
    return { text, title: text };
  };

  const usernameFromClaims = (t: TagRow): string | null => {
    if (!t.tag_claims?.length) return null;
    const sorted = [...t.tag_claims].sort((a, b) => (a.claimed_at ?? "").localeCompare(b.claimed_at ?? "")).reverse();
    for (const c of sorted) {
      const prof = c.profiles;
      const username = prof?.profile_cards?.[0]?.username ?? null;
      if (username) return username;
    }
    return null;
  };

  const publicLinkFor = (t: Pick<TagRow, "public_id">) =>
    `${APP_URL.replace(/\/+$/, "")}/t/${t.public_id}`;

  const currentRedirectFor = (t: TagRow): string => {
    const base = (project?.destination_url || "").replace(/\/+$/, "");
    const type = (project?.type || "") as string;
    if (!base) return "—";

    if (type === "simple_redirect") return base;

    if (type === "profile_card") {
      if (t.status === "claimed") {
        const uname = usernameFromClaims(t);
        return uname ? `${base}/p/${uname}` : `${base}/p/{username}`;
      }
      return `${base}/t/{token}`;
    }
    // exclusive_club e demais
    return `${base}/t/{token}`;
  };

  // Create via edge function com projectId travado
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validação cliente
    const next: Partial<Record<keyof typeof draft, string>> = {};
    const nfc = normalizeNfc(draft.nfc_uid);
    if (!nfc) next.nfc_uid = "Informe um NFC UID válido (hex).";
    if (!draft.claim_mode) next.claim_mode = "Obrigatório.";
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      // 1) gera public_id via RPC
      const { data: pidData, error: pidErr } = await supabase.rpc("rpc_generate_public_id", { len: 10 });
      if (pidErr) throw pidErr;
      const public_id: string = (pidData as any) ?? "";
      if (!public_id || !PUBLIC_ID_RE.test(public_id)) {
        throw new Error("Falha ao gerar public_id.");
      }

      // 2) cria a tag via Edge
      const body = {
        project_id: projectId,               // travado no projeto
        asset_id: draft.asset_id || null,    // opcional
        public_id,
        nfc_uid: nfc,
        claim_mode: draft.claim_mode,
      };

      const { ok, json, status } = await invokeEdgeJson("admin_create_tag", body);
      if (!ok) {
        const serverMsg: string = json?.error || json?.message || json?.msg || `Edge function error (${status})`;
        if (/public_id already exists/i.test(serverMsg)) {
          toast.error("public_id já está em uso. Tente novamente.");
        } else if (/nfc_uid already in use/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, nfc_uid: "Este NFC UID já está em uso." }));
        } else if (/nfc_uid is required/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, nfc_uid: "Informe um NFC UID válido." }));
        } else if (/asset_id must belong/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, asset_id: "O asset deve pertencer a este projeto." }));
        } else if (/invalid asset_id/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, asset_id: "Asset inválido." }));
        } else if (/claim_mode must be one of/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, claim_mode: "Modo de claim não suportado." }));
        } else if (/Auth required|Forbidden/i.test(serverMsg)) {
          toast.error(serverMsg);
        } else {
          toast.error(serverMsg);
        }
        return;
      }

      const link = `${APP_URL.replace(/\/+$/, "")}/t/${public_id}`;
      setPostCreateLink(link);
      toast.success("Tag criada! Cadastre o link no chip.");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao criar tag.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status (enable/disable) -> texto sem fundo
  const toggleStatus = async (row: TagRow) => {
    const next = row.status === "disabled" ? "active" : "disabled";
    try {
      const { error } = await supabase.from("tags").update({ status: next }).eq("id", row.id);
      if (error) throw error;
      toast.success(`Tag ${next === "disabled" ? "ativada" : "desativada"}.`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao atualizar status.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Tags do Projeto</h2>
        </div>
        <Button onClick={openModal} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Nova Tag
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white/60 dark:bg-zinc-900/60 h-40 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-gray-900/50 p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/50 grid place-items-center mb-4 border border-gray-200 dark:border-gray-800/50">
            <Hash className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nenhuma tag criada</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crie tags para associar aos seus assets e claims.
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Dados da tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Claim Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Claimed por</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Redirect atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {rows.map((t) => {
                  const claim = claimedByText(t);
                  const publicLink = publicLinkFor(t);
                  const redirect = currentRedirectFor(t);

                  return (
                    <tr key={t.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                      {/* Dados da tag (UID + link + criada em) */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="text-xs text-zinc-600 dark:text-zinc-300">
                            <span className="uppercase tracking-wider">CHIP UID:</span>{" "}
                            <code title={t.nfc_uid}>{showEnds(t.nfc_uid, 8, 6)}</code>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <a
                              href={publicLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[22rem]"
                              title={publicLink}
                            >
                              {publicLink}
                            </a>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              onClick={() => copy(publicLink)}
                              title="Copiar link público"
                            >
                              <Copy className="w-4 h-4 text-zinc-500" />
                            </button>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-500 dark:text-zinc-500" />
                            criada em {fmtBR(t.created_at)}
                          </div>
                        </div>
                      </td>

                      {/* Claim mode */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center text-gray-700 dark:text-gray-200">
                          {t.claim_mode === "secure_tap" ? <Shield className="w-4 h-4 mr-2" /> : t.claim_mode === "code" ? <Hash className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                          <span className="uppercase text-xs tracking-wider">{t.claim_mode}</span>
                        </div>
                      </td>

                      {/* Status + ativar/desativar (texto sem fundo) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={[
                              "px-2 py-1 rounded-md text-xs font-medium",
                              t.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : t.status === "claimed"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 ring-1 ring-red-400/50",
                            ].join(" ")}
                          >
                            {t.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleStatus(t)}
                            className="text-xs underline text-black dark:text-white hover:opacity-80"
                            title={t.status === "disabled" ? "Ativar" : "Desativar"}
                          >
                            {t.status === "disabled" ? "Ativar?" : "Desativar?"}
                          </button>
                        </div>
                      </td>

                      {/* Asset */}
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center min-w-0">
                          <Box className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                          <span className="block max-w-[18rem] whitespace-normal break-words" title={t.assets?.name ?? undefined}>
                            {t.assets?.name ?? "Sem asset"}
                          </span>
                        </div>
                      </td>

                      {/* Claimed por — branco no tema escuro */}
                      <td className="px-6 py-4 text-sm align-top">
                        {claim.text ? (
                          <div className="flex items-start gap-2 min-w-0">
                            <Users className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
                            <span
                              className="block max-w-[28rem] whitespace-normal break-words leading-snug text-gray-900 dark:text-white"
                              title={claim.title}
                            >
                              {claim.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>

                      {/* Redirect atual */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {redirect !== "—" ? (
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={redirect.replace("{token}", "token").replace("{username}", "username")}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline max-w-[22rem] truncate"
                              title={redirect}
                            >
                              {redirect}
                            </a>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              onClick={() => copy(redirect)}
                              title="Copiar redirect atual"
                            >
                              <Copy className="w-4 h-4 text-zinc-500" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-600 dark:text-gray-400">
                      Nenhuma tag encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar: sem public_id; gera no submit e mostra sucesso */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Tag"
        size="lg"
        initialFocusRef={firstFieldRef}
      >
        {postCreateLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckIcon className="w-5 h-5" />
              <span className="font-medium">Tag criada com sucesso!</span>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="text-sm text-zinc-700 dark:text-zinc-200">Cadastre este link público no chip:</div>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={postCreateLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {postCreateLink}
                </a>
                <button type="button" className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => copy(postCreateLink)}>
                  <Copy className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Input
                  ref={firstFieldRef as any}
                  label="NFC UID (hex)"
                  value={draft.nfc_uid}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, nfc_uid: e.target.value }));
                    setFieldErrors((x) => ({ ...x, nfc_uid: undefined }));
                  }}
                  placeholder="AA BB CC DD ou AABBCCDD"
                  required
                  error={fieldErrors.nfc_uid}
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-zinc-500">Vamos normalizar para hex maiúsculo (ignoramos não-hex).</p>
              </div>

              <div className="md:col-span-2">
                <Select
                  label="Asset (opcional)"
                  value={draft.asset_id}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, asset_id: e.target.value }));
                    setFieldErrors((x) => ({ ...x, asset_id: undefined }));
                  }}
                  error={fieldErrors.asset_id}
                >
                  <option value="">Sem asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name ?? a.id}</option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2">
                <Select
                  label="Modo de claim"
                  value={draft.claim_mode}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, claim_mode: e.target.value as "code" | "secure_tap" | "first_to_claim" }));
                    setFieldErrors((x) => ({ ...x, claim_mode: undefined }));
                  }}
                  error={fieldErrors.claim_mode}
                  required
                >
                  <option value="first_to_claim">first_to_claim</option>
                  <option value="secure_tap" disabled>secure_tap (em breve)</option>
                  <option value="code" disabled>code (em breve)</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid || submitting}>
                {submitting ? "Criando…" : "Criar Tag"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
