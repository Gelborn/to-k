import React from "react";
import {
  Plus, Calendar, Hash, RefreshCw, Link as LinkIcon,
  Shield, Zap, Box, Power, PowerOff, ChevronDown, Users
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

type ProjectLite = { id: string; name: string };
type AssetLite   = { id: string; name: string | null };

type TagRow = {
  id: string;
  project_id: string | null;
  asset_id: string | null;
  public_id: string;
  nfc_uid: string;
  claim_mode: "code" | "secure_tap" | "first_to_claim";
  status: "active" | "disabled" | "claimed";
  created_at: string;
  updated_at: string | null;
  projects?: { id: string; name: string } | null;
  assets?: { id: string; name: string | null } | null;
  tag_claims?: Array<{
    profiles?: { id: string; display_name: string | null; email: string | null } | null;
  }> | null;
};

const PUBLIC_ID_RE = /^[A-Za-z0-9\-_]{4,64}$/;
const normalizeNfc = (s: string) => s.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
const showEnds = (s: string, start = 6, end = 4) =>
  s.length <= start + end ? s : `${s.slice(0, start)}…${s.slice(-end)}`;
const fmtBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Reliable edge-invoke with readable error body */
async function invokeEdgeJson(fn: string, body: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const url = `${supabase.functions.url}/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* plain text/no body */ }
  return { ok: res.ok, status: res.status, json };
}

export const TagsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [tags, setTags] = React.useState<TagRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectLite[]>([]);
  const [assets, setAssets] = React.useState<AssetLite[]>([]);

  // header controls
  const [projectFilter, setProjectFilter] = React.useState<string>("");

  // create form
  const [form, setForm] = React.useState({
    public_id: "",
    nfc_uid: "",
    project_id: "",
    asset_id: "",
    claim_mode: "first_to_claim" as "code" | "secure_tap" | "first_to_claim",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form, string>>>({});
  const firstFieldRef = React.useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isValid = React.useMemo(() => {
    const nfc = normalizeNfc(form.nfc_uid);
    return (
      !!form.project_id &&
      !!form.claim_mode &&
      !!form.public_id &&
      PUBLIC_ID_RE.test(form.public_id) &&
      !!nfc
    );
  }, [form]);

  // ----- Loaders -------------------------------------------------------------
  const loadProjects = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id,name")
      .order("name", { ascending: true });
    if (error) {
      toast.error("Failed to load projects.");
      return;
    }
    setProjects((data ?? []) as ProjectLite[]);
  }, []);

  const loadAssetsForProject = React.useCallback(async (projectId: string) => {
    if (!projectId) {
      setAssets([]);
      return;
    }
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
  }, []);

  const loadTags = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tags")
        .select(`
          id,project_id,asset_id,public_id,nfc_uid,claim_mode,status,created_at,updated_at,
          projects(id,name),
          assets(id,name),
          tag_claims:tag_claims(
            profiles:profiles!tag_claims_claimed_by_profile_id_fkey(id, display_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (projectFilter) query = query.eq("project_id", projectFilter);

      const { data, error } = await query;
      if (error) {
        toast.error("Failed to load tags.");
        return;
      }
      setTags((data ?? []) as TagRow[]);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  React.useEffect(() => { loadProjects(); }, [loadProjects]);
  React.useEffect(() => { loadTags(); }, [loadTags]);
  React.useEffect(() => { loadAssetsForProject(form.project_id); }, [form.project_id, loadAssetsForProject]);

  // ----- Row action: disable / enable ----------------------------------------
  const toggleStatus = async (row: TagRow) => {
    const next = row.status === "disabled" ? "active" : "disabled";
    try {
      const { error } = await supabase.from("tags").update({ status: next }).eq("id", row.id);
      if (error) throw error;
      toast.success(`Tag ${next === "disabled" ? "disabled" : "enabled"}.`);
      await loadTags();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update status.");
    }
  };

  // ----- Reusable Select (custom chevron) ------------------------------------
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

  // ----- Helpers --------------------------------------------------------------
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

  // ----- Create flow ----------------------------------------------------------
  const onOpen = () => {
    setForm({ public_id: "", nfc_uid: "", project_id: "", asset_id: "", claim_mode: "first_to_claim" });
    setErrors({});
    setAssets([]);
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof typeof form, string>> = {};
    if (!form.project_id) next.project_id = "Project is required.";
    if (!form.public_id || !PUBLIC_ID_RE.test(form.public_id)) next.public_id = "4–64 chars, letters/numbers/“-”/“_” only.";
    const nfc = normalizeNfc(form.nfc_uid);
    if (!nfc) next.nfc_uid = "Provide a valid hex UID.";
    if (!form.claim_mode) next.claim_mode = "Claim mode is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = {
        project_id: form.project_id.trim(),
        asset_id: form.asset_id?.trim() || null,
        public_id: form.public_id.trim(),
        nfc_uid: normalizeNfc(form.nfc_uid.trim()),
        claim_mode: form.claim_mode,
      };

      const { ok, json, status } = await invokeEdgeJson("admin_create_tag", body);

      if (!ok) {
        const serverMsg: string =
          json?.error || json?.message || json?.msg || `Edge function error (${status})`;

        if (/public_id already exists/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, public_id: "This public_id is already in use." }));
        } else if (/nfc_uid already in use/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, nfc_uid: "This NFC UID is already in use." }));
        } else if (/public_id must match/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, public_id: "Invalid public_id pattern." }));
        } else if (/nfc_uid is required/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, nfc_uid: "Provide a valid NFC UID." }));
        } else if (/asset_id must belong/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, asset_id: "Asset must belong to selected project." }));
        } else if (/invalid project_id/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, project_id: "Invalid project." }));
        } else if (/invalid asset_id/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, asset_id: "Invalid asset." }));
        } else if (/claim_mode must be one of/i.test(serverMsg)) {
          setErrors((e) => ({ ...e, claim_mode: "Unsupported claim mode." }));
        } else if (/Auth required|Forbidden/i.test(serverMsg)) {
          toast.error(serverMsg);
        } else {
          toast.error(serverMsg);
        }
        return;
      }

      toast.success("Tag created!");
      setIsModalOpen(false);
      setForm({ public_id: "", nfc_uid: "", project_id: "", asset_id: "", claim_mode: "secure_tap" });
      await loadTags();
    } catch (err: any) {
      const fallback = err?.message ?? "Failed to create tag.";
      toast.error(fallback);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- UI ------------------------------------------------------------------
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Title */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tags</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage all tags</p>
      </div>

      {/* Header controls: left = project select, right = actions */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:w-auto">
          <div className="w-60">
            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end">
          <Button variant="secondary" onClick={loadTags} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={onOpen}>
            <Plus className="w-4 h-4 mr-2" />
            New Tag
          </Button>
        </div>
      </div>

      {/* Table (sem rolagem lateral; manter linhas únicas onde possível) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-visible">
          <table className="w-full table-auto">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                {/* ID removido */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Public ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">NFC UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Claim Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Claimed by</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {tags.map((t) => {
                const claim = claimedByText(t);
                return (
                  <tr key={t.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Public ID — preferir uma linha, encurtando visual */}
                    <td className="px-6 py-4">
                      <div className="flex items-center min-w-0">
                        <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2 shrink-0" />
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate" title={t.public_id}>
                          {showEnds(t.public_id, 10, 6)}
                        </span>
                      </div>
                    </td>

                    {/* NFC UID — NÃO PODE quebrar */}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center text-gray-700 dark:text-gray-200 min-w-0 max-w-[12rem] overflow-hidden">
                        <LinkIcon className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                        <code className="text-xs whitespace-nowrap truncate" title={t.nfc_uid}>
                          {showEnds(t.nfc_uid, 8, 6)}
                        </code>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className="flex items-center text-gray-700 dark:text-gray-200">
                        {t.claim_mode === "secure_tap" ? <Shield className="w-4 h-4 mr-2" /> : t.claim_mode === "code" ? <Hash className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                        <span className="uppercase text-xs tracking-wider">{t.claim_mode}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm whitespace-nowrap">
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

                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {t.projects?.name ?? "—"}
                    </td>

                    {/* Asset — pode quebrar uma linha se necessário */}
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center min-w-0">
                        <Box className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                        <span className="block max-w-[18rem] whitespace-normal break-words" title={t.assets?.name ?? undefined}>
                          {t.assets?.name ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Claimed by — comma separated; pode quebrar se faltar espaço */}
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

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => toggleStatus(t)} title={t.status === "disabled" ? "Enable" : "Disable"}>
                          {t.status === "disabled" ? (<><Power className="w-4 h-4 mr-2" /> Enable</>) : (<><PowerOff className="w-4 h-4 mr-2" /> Disable</>)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && tags.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-600 dark:text-gray-400">
                    No tags found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
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
                value={form.public_id}
                onChange={(e) => {
                  setForm({ ...form, public_id: e.target.value });
                  setErrors((x) => ({ ...x, public_id: undefined }));
                }}
                placeholder="e.g. VIP-ALPHA-001"
                required
                error={errors.public_id}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-zinc-500">Allowed: letters, numbers, “-”, “_” (4–64 chars).</p>
            </div>

            <div>
              <Input
                label="NFC UID (hex)"
                value={form.nfc_uid}
                onChange={(e) => {
                  setForm({ ...form, nfc_uid: e.target.value });
                  setErrors((x) => ({ ...x, nfc_uid: undefined }));
                }}
                placeholder="AA BB CC DD or AABBCCDD"
                required
                error={errors.nfc_uid}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-zinc-500">We’ll normalize to uppercase hex (non-hex chars ignored).</p>
            </div>

            <div>
              <Select
                label="Project"
                value={form.project_id}
                onChange={(e) => {
                  setForm({ ...form, project_id: e.target.value, asset_id: "" });
                  setErrors((x) => ({ ...x, project_id: undefined }));
                }}
                error={errors.project_id}
                required
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                label="Asset (optional)"
                value={form.asset_id}
                onChange={(e) => {
                  setForm({ ...form, asset_id: e.target.value });
                  setErrors((x) => ({ ...x, asset_id: undefined }));
                }}
                error={errors.asset_id}
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
                value={form.claim_mode}
                onChange={(e) => {
                  setForm({ ...form, claim_mode: e.target.value as any });
                  setErrors((x) => ({ ...x, claim_mode: undefined }));
                }}
                error={errors.claim_mode}
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
