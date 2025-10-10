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

  const FallbackIcon = isClub ? Sparkles : isRedirect ? ExternalLink : LayoutGrid;
  const cover = project.project_img || project.icon || null;

  return (
    <div className="space-y-4">
      {/* HERO / COVER */}
      <div className="relative h-44 sm:h-56 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fb = (e.currentTarget.parentElement?.querySelector("[data-fallback]") as HTMLElement) ?? null;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}

        {/* Fallback */}
        <div
          data-fallback
          className={`absolute inset-0 ${cover ? "hidden" : "flex"} items-center justify-center`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-black/30 grid place-items-center border border-white/40 dark:border-white/10">
            <FallbackIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
          </div>
        </div>

        {/* Overlay + back */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <Link
          to="/projects"
          className="absolute top-3 left-3 p-2 rounded-xl bg-white/80 dark:bg-zinc-900/70 border border-white/50 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-white hover:shadow transition"
          aria-label="Back to projects"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Title + badges on cover */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {project.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm",
                    typeBadgeClass,
                  ].join(" ")}
                >
                  {typeLabel}
                </span>

                {isClub && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25">
                    showroom: {project.showroom_mode ? "on" : "off"}
                  </span>
                )}

                {project.destination_url && (
                  <button
                    type="button"
                    onClick={() => window.open(project.destination_url!, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-white/90 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-white/60 dark:ring-white/10 hover:bg-white"
                    title={project.destination_url ?? undefined}
                  >
                    Destino
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Owners + Description */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Description */}
        <div className="bg-white dark:bg-gray-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-4">
          {project.description ? (
            <p className="text-sm sm:text-base text-zinc-800 dark:text-zinc-200">
              {project.description}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isRedirect
                ? "Redireciona os scans diretamente para a URL configurada."
                : isClub
                ? "Área com conteúdo protegido e acesso por tags."
                : "Perfil escaneável com links e ações rápidas."}
            </p>
          )}
        </div>

        {/* Owners */}
        <div className="bg-white dark:bg-gray-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Owners
          </div>
          {project.owners.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {project.owners.slice(0, 6).map((o) => (
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
              {project.owners.length > 6 && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  +{project.owners.length - 6} more
               s </span>
              )}
            </div>
          ) : (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">—</div>
          )}
        </div>
      </div>
    </div>
  );
};
