import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Sparkles, ExternalLink } from "lucide-react";
import type { UiProject } from "../../pages/ProjectDetailPage";

export const ProjectHeader: React.FC<{ project: UiProject }> = ({ project }) => {
  const isClub = project.type === "exclusive_club";
  const isRedirect = project.type === "simple_redirect";

  const typeLabel =
    project.type === "exclusive_club"
      ? "Content hub"
      : project.type === "profile_card"
      ? "Profile card"
      : "Redirect Simples";

  const typeBadgeClass =
    project.type === "exclusive_club"
      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20"
      : project.type === "profile_card"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20";

  return (
    <div className="grid grid-cols-[auto_auto_1fr] grid-rows-[auto_auto_auto] gap-x-4 gap-y-2">
      {/* Back button */}
      <Link
        to="/projects"
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 self-center"
        aria-label="Back to projects"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* Logo (only row 1, aligns with name) */}
      <div className="mt-2 shrink-0 w-12 h-12 rounded-xl border border-black/5 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 grid place-items-center self-center">
        {project.icon ? (
          <img alt="" src={project.icon} className="w-12 h-12 rounded-xl object-cover" />
        ) : isClub ? (
          <Sparkles className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        ) : isRedirect ? (
          <ExternalLink className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        ) : (
          <LayoutGrid className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        )}
      </div>

      {/* Row 1: name */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate self-center">
        {project.name}
      </h1>

      {/* Row 2: badges */}
      <div className="col-start-3 flex flex-wrap items-center gap-2 min-w-0">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            typeBadgeClass,
          ].join(" ")}
        >
          {typeLabel}
        </span>

        {isClub && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
            showroom: {project.showroom_mode ? "on" : "off"}
          </span>
        )}

        {project.destination_url && (
          <button
            type="button"
            onClick={() => window.open(project.destination_url!, "_blank", "noopener,noreferrer")}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 ring-1 ring-zinc-200/60 dark:ring-zinc-700/60 hover:underline"
            title={project.destination_url}
          >
            Destino
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        )}
      </div>

      {/* Row 3: owners */}
      <div className="col-start-3 flex items-center gap-2 flex-wrap">
        {project.owners.slice(0, 3).map((o) => (
          <span
            key={o}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 px-2.5 py-1.5 text-sm text-zinc-800 dark:text-zinc-200"
            title={o}
          >
            <span className="w-6 h-6 grid place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold">
              {o
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("") || "•"}
            </span>
            <span className="truncate max-w-[10rem]">{o}</span>
          </span>
        ))}
        {project.owners.length > 3 && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            +{project.owners.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
};
