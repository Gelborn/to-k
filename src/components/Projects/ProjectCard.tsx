import React from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink, LayoutGrid, Sparkles, Calendar, Users, Activity
} from "lucide-react";

type UiProject = {
  id: string;
  name: string;
  type: "profile_card" | "exclusive_club" | "simple_redirect";
  showroom_mode?: boolean;
  destination_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  lastActivityAt?: string | null;  // ← NOVO
  customersCount?: number;         // ← NOVO: # perfis distintos que claimaram
  icon?: string | null;
  owners: string[];
};

export const ProjectCard: React.FC<{ project: UiProject }> = ({ project }) => {
  const isClub = project.type === "exclusive_club";
  const isRedirect = project.type === "simple_redirect";

  const initials = (s?: string | null) =>
    (s || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "•";

  const openDest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (project.destination_url) {
      window.open(project.destination_url, "_blank", "noopener,noreferrer");
    }
  };

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

  const fmtDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("pt-BR") : "—";

  const usersCount = project.customersCount ?? 0;

  // ---------------- Type label + badge styles ----------------
  const typeLabel =
    project.type === "exclusive_club"
      ? "Content hub"
      : project.type === "profile_card"
      ? "Profile card"
      : "Redirect Simples";

  const typeBadgeClass =
    project.type === "exclusive_club"
      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/20"
      : project.type === "profile_card"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/20"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/20";

  // ---------------- Icon by type ----------------
  const TypeIcon = project.icon
    ? null
    : isClub
    ? Sparkles
    : isRedirect
    ? ExternalLink
    : LayoutGrid;

  return (
    <Link
      to={`/projects/${project.id}`}
      className={[
        "group relative flex flex-col h-full overflow-hidden",
        "rounded-2xl border bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-sm",
        "border-gray-200 dark:border-gray-800/60",
        "transition hover:shadow-md hover:border-blue-400/30",
        "ring-1 ring-transparent group-hover:ring-blue-500/20",
      ].join(" ")}
    >
      {/* Subtle glow layer */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full 
                   bg-gradient-to-tr from-blue-400/10 via-fuchsia-400/5 to-transparent 
                   blur-2xl group-hover:from-blue-400/20 group-hover:via-fuchsia-400/10"
      />

      {/* Header / Icon */}
      <div className="p-5 pb-3 flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl border border-black/5 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 grid place-items-center">
          {project.icon ? (
            <img alt="" src={project.icon} className="w-12 h-12 rounded-xl object-cover" />
          ) : TypeIcon ? (
            <TypeIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          ) : null}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600">
            {project.name}
          </h3>

          {/* Badges */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                typeBadgeClass,
              ].join(" ")}
            >
              {typeLabel}
            </span>

            {isClub && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium
                           bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                title={`Showroom ${project.showroom_mode ? "ligado" : "desligado"}`}
              >
                showroom: {project.showroom_mode ? "on" : "off"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-3 pb-4 flex-1 space-y-4">
        {/* Destination (especialmente relevante para Redirect Simples) */}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Destino
          </div>
          {project.destination_url ? (
            <button
              type="button"
              onClick={openDest}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:underline truncate max-w-full"
              title={project.destination_url}
            >
              <span className="truncate">{project.destination_url}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          ) : (
            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">—</div>
          )}
        </div>

        {/* Owners */}
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Owners
          </div>
          {project.owners.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {project.owners.slice(0, 4).map((owner, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 px-2.5 py-1.5"
                  title={owner}
                >
                  <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                    {initials(owner)}
                  </div>
                  <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate max-w-[10rem]">
                    {owner}
                  </span>
                </div>
              ))}
              {project.owners.length > 4 && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  +{project.owners.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">—</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4 opacity-70" />
            <span title={fmtDateTime(project.created_at)}>Criado {fmtDate(project.created_at)}</span>
          </span>

          {project.lastActivityAt && (
            <span className="inline-flex items-center gap-1.5">
              <Activity className="w-4 h-4 opacity-70" />
              <span title={fmtDateTime(project.lastActivityAt)}>
                Última atividade {fmtDate(project.lastActivityAt)}
              </span>
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          title="Clientes únicos que já fizeram claim"
        >
          <Users className="w-4 h-4 opacity-70" />
          <span className="tabular-nums">{usersCount}</span>
        </div>
      </div>
    </Link>
  );
};
