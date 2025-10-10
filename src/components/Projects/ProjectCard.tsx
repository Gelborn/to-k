import React from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink, LayoutGrid, Sparkles, Calendar, Users, Activity, Image as ImageIcon
} from "lucide-react";

type UiProject = {
  id: string;
  name: string;
  type: "profile_card" | "exclusive_club" | "simple_redirect";
  showroom_mode?: boolean;
  destination_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  lastActivityAt?: string | null;
  customersCount?: number;
  // ---- novos
  project_img?: string | null;      // imagem de capa do projeto (bucket público)
  description?: string | null;      // descrição curta
  icon?: string | null;             // legado (ainda suportado como fallback)
  owners: string[];
};

export const ProjectCard: React.FC<{ project: UiProject }> = ({ project }) => {
  const isClub = project.type === "exclusive_club";
  const isRedirect = project.type === "simple_redirect";

  const cover = project.project_img || project.icon || null;

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
      : "Redirect simples";

  const typeBadgeClass =
    project.type === "exclusive_club"
      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/20"
      : project.type === "profile_card"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/20"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/20";

  // ---------------- Icon by type (fallback quando não há imagem) ----------------
  const FallbackIcon = isClub ? Sparkles : isRedirect ? ExternalLink : LayoutGrid;

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
      {/* COVER */}
      <div className="relative aspect-video w-full overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fb = (e.currentTarget.parentElement?.querySelector("[data-fallback]") as HTMLElement) ?? null;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}

        {/* Fallback cover */}
        <div
          data-fallback
          className={`absolute inset-0 ${cover ? "hidden" : "flex"} items-center justify-center
                      bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-black/30 grid place-items-center border border-white/40 dark:border-white/10">
            <FallbackIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
          </div>
        </div>

        {/* Overlay com título e ações */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                {project.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    "backdrop-blur-sm", typeBadgeClass,
                  ].join(" ")}
                >
                  {typeLabel}
                </span>

                {isClub && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium
                               backdrop-blur-sm bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25"
                    title={`Showroom ${project.showroom_mode ? "ligado" : "desligado"}`}
                  >
                    showroom: {project.showroom_mode ? "on" : "off"}
                  </span>
                )}
              </div>
            </div>

            {project.destination_url && (
              <button
                type="button"
                onClick={openDest}
                title="Abrir destino em nova aba"
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white/90 dark:bg-zinc-900/90 px-2.5 py-1.5
                           text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-white
                           border border-white/70 dark:border-white/10 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="px-5 pt-4 pb-4 flex-1 space-y-4">
        {/* Descrição */}
        {project.description ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
            {project.description}
          </p>
        ) : (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {isRedirect
              ? "Redireciona os scans diretamente para a URL configurada."
              : isClub
              ? "Área com conteúdo protegido e acesso por tags."
              : "Perfil escaneável com links e ações rápidas."}
          </div>
        )}

        {/* Owners */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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

      {/* FOOTER */}
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
          className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
          title="Clientes únicos que já fizeram claim"
        >
          <Users className="w-4 h-4 opacity-70" />
          <span className="tabular-nums">{usersCount}</span>
        </div>
      </div>
    </Link>
  );
};
