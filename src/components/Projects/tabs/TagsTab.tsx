// src/components/Projects/tabs/TagsTab.tsx
import React from "react";
import {
  Plus, Calendar, Hash, Link as LinkIcon,
  Shield, Box, Power, PowerOff, ChevronDown, Users
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

  // embed claimers
  tag_claims?: Array<{
    profiles?: { id: string; display_name: string | null; email: string | null } | null;
  }> | null;
};

type AssetLite = { id: string; name: string | null };

const PUBLIC_ID_RE = /^[A-Za-z0-9\-_]{4,64}$/;
const normalizeNfc = (s: string) => s.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
const showEnds = (s: string, start = 6, end = 4) =>
  s.length <= start + end ? s : `${s.slice(0, start)}…${s.slice(-end)}`;
const fmtBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

// reliable edge invoke (so we can read JSON errors from non-2xx)
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

// small modern Select with custom chevron + error state
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
  const [rows, setRows] = React.useState<TagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // assets for this project (optional in modal)
  const [assets, setAssets] = React.useState<AssetLite[]>([]);

  // modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<{
    public_id: string;
    nfc_uid: string;
    asset_id: string; // optional
    claim_mode: "code" | "secure_tap" | "first_to_claim";
  }>({
    public_id: "",
    nfc_uid: "",
    asset_id: "",
    claim_mode: "first_to_claim", // default aqui
  });
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof typeof draft, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const firstFieldRef = React.useRef<HTMLInputElement>(null);

  const isValid = React.useMemo(() => {
    const nfc = normalizeNfc(draft.nfc_uid);
    return (
      !!draft.public_id &&
      PUBLIC_ID_RE.test(draft.public_id) &&
      !!nfc &&
      !!draft.claim_mode
    );
  }, [draft]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tags")
      .select(`
        id, project_id, asset_id, public_id, nfc_uid, claim_mode, status, created_at,
        assets(id,name),
        tag_claims:tag_claims(
          profiles:profiles!tag_claims_claimed_by_profile_id_fkey(id, display_name, email)
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
      toast.error("Failed to load assets.");
      return;
    }
    setAssets(((data ?? []) as any[]).map(a => ({ id: a.id, name: a.name })) as AssetLite[]);
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadAssets(); }, [loadAssets]);

  // realtime (keeps in sync)
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
    setDraft({ public_id: "", nfc_uid: "", asset_id: "", claim_mode: "first_to_claim" }); // default aqui também
    setFieldErrors({});
    setIsModalOpen(true);
  };

  // helpers
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

  // Create via edge function with locked projectId
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // client validation
    const next: Partial<Record<keyof typeof draft, string>> = {};
    if (!draft.public_id || !PUBLIC_ID_RE.test(draft.public_id)) {
      next.public_id = "4–64 chars, letters/numbers/“-”/“_” only.";
    }
    const nfc = normalizeNfc(draft.nfc_uid);
    if (!nfc) next.nfc_uid = "Provide a valid hex UID.";
    if (!draft.claim_mode) next.claim_mode = "Required.";
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const body = {
        project_id: projectId,            // locked to current project
        asset_id: draft.asset_id || null, // optional
        public_id: draft.public_id.trim(),
        nfc_uid: nfc,
        claim_mode: draft.claim_mode,     // será "first_to_claim"
      };

      const { ok, json, status } = await invokeEdgeJson("admin_create_tag", body);
      if (!ok) {
        const serverMsg: string = json?.error || json?.message || json?.msg || `Edge function error (${status})`;

        // field-level mapping
        if (/public_id already exists/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, public_id: "This public_id is already in use." }));
        } else if (/nfc_uid already in use/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, nfc_uid: "This NFC UID is already in use." }));
        } else if (/public_id must match/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, public_id: "Invalid public_id pattern." }));
        } else if (/nfc_uid is required/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, nfc_uid: "Provide a valid NFC UID." }));
        } else if (/asset_id must belong/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, asset_id: "Asset must belong to this project." }));
        } else if (/invalid asset_id/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, asset_id: "Invalid asset." }));
        } else if (/claim_mode must be one of/i.test(serverMsg)) {
          setFieldErrors((e) => ({ ...e, claim_mode: "Unsupported claim mode." }));
        } else if (/Auth required|Forbidden/i.test(serverMsg)) {
          toast.error(serverMsg);
        } else {
          toast.error(serverMsg);
        }
        return;
      }

      toast.success("Tag created!");
      setIsModalOpen(false); // close modal
      setDraft({ public_id: "", nfc_uid: "", asset_id: "", claim_mode: "first_to_claim" });
      setFieldErrors({});
      await load(); // refresh now
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create tag.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status (enable/disable) with instant refresh
  const toggleStatus = async (row: TagRow) => {
    const next = row.status === "disabled" ? "active" : "disabled";
    try {
      const { error } = await supabase.from("tags").update({ status: next }).eq("id", row.id);
      if (error) throw error;
      toast.success(`Tag ${next === "disabled" ? "disabled" : "enabled"}.`);
      await load(); // instant refresh
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update status.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Project Tags</h2>
        </div>
        <Button onClick={openModal} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Create Tag
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
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">No tags created</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create tags to associate with your assets and claims.
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  {/* ID removido */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Public ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">NFC UID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Claim Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Claimed by</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {rows.map((t) => {
                  const claim = claimedByText(t);
                  return (
                    <tr key={t.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-gray-100 font-medium" title={t.public_id}>
                            {showEnds(t.public_id)}
                          </span>
                        </div>
                      </td>

                      {/* NFC UID — não quebra */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center text-gray-700 dark:text-gray-200 max-w-[12rem] overflow-hidden">
                          <LinkIcon className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                          <code className="text-xs whitespace-nowrap truncate" title={t.nfc_uid}>
                            {showEnds(t.nfc_uid, 8, 6)}
                          </code>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center text-gray-700 dark:text-gray-200">
                          {t.claim_mode === "secure_tap" ? <Shield className="w-4 h-4 mr-2" /> : <Hash className="w-4 h-4 mr-2" />}
                          <span className="uppercase text-xs tracking-wider">{t.claim_mode}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      </td>

                      {/* Asset — pode quebrar uma linha */}
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center min-w-0">
                          <Box className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                          <span className="block max-w-[18rem] whitespace-normal break-words" title={t.assets?.name ?? undefined}>
                            {t.assets?.name ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* Claimed by — vírgulas; quebra se faltar espaço */}
                      <td className="px-6 py-4 text-sm align-top">
                        {claim.text ? (
                          <div className="flex items-start gap-2 min-w-0">
                            <Users className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
                            <span
                              className="block max-w-[28rem] whitespace-normal break-words leading-snug"
                              title={claim.title}
                            >
                              {claim.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                          {fmtBR(t.created_at)}
                        </div>
                      </td>

                      {/* Actions last — only enable/disable */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => toggleStatus(t)}
                            title={t.status === "disabled" ? "Enable" : "Disable"}
                          >
                            {t.status === "disabled" ? (
                              <><Power className="w-4 h-4 mr-2" /> Enable</>
                            ) : (
                              <><PowerOff className="w-4 h-4 mr-2" /> Disable</>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal (project locked) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Tag"
        size="lg"
        initialFocusRef={firstFieldRef}
      >
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                ref={firstFieldRef as any}
                label="Public ID"
                value={draft.public_id}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, public_id: e.target.value }));
                  setFieldErrors((x) => ({ ...x, public_id: undefined }));
                }}
                placeholder="e.g. VIP-ALPHA-001"
                required
                error={fieldErrors.public_id}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-zinc-500">Allowed: letters, numbers, “-”, “_” (4–64 chars).</p>
            </div>

            <div>
              <Input
                label="NFC UID (hex)"
                value={draft.nfc_uid}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, nfc_uid: e.target.value }));
                  setFieldErrors((x) => ({ ...x, nfc_uid: undefined }));
                }}
                placeholder="AA BB CC DD or AABBCCDD"
                required
                error={fieldErrors.nfc_uid}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-zinc-500">We’ll normalize to uppercase hex (non-hex chars ignored).</p>
            </div>

            <div className="md:col-span-2">
              <Select
                label="Asset (optional)"
                value={draft.asset_id}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, asset_id: e.target.value }));
                  setFieldErrors((x) => ({ ...x, asset_id: undefined }));
                }}
                error={fieldErrors.asset_id}
              >
                <option value="">No asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name ?? a.id}</option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select
                label="Claim Mode"
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
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting ? "Creating…" : "Create Tag"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
