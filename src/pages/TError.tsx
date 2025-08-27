import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Ban, SearchX, Server, ArrowLeft } from "lucide-react";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

type ErrSpec = {
  title: string;
  subtitle: string;
  Icon: React.ComponentType<any>;
  actionLabel: string;
};

const MAP: Record<string, ErrSpec> = {
  "400": {
    title: "Invalid tag link",
    subtitle: "The tag URL looks malformed. Please check the code and try again.",
    Icon: AlertTriangle,
    actionLabel: "Go to Home",
  },
  "404": {
    title: "Tag not found",
    subtitle: "We couldn’t find this tag. It may be unregistered or mistyped.",
    Icon: SearchX,
    actionLabel: "Go to Home",
  },
  "410": {
    title: "Tag disabled",
    subtitle:
      "This tag is currently disabled or already claimed. Contact the project owner if you believe this is a mistake.",
    Icon: Ban,
    actionLabel: "Contact support",
  },
  "500": {
    title: "Something went wrong",
    subtitle: "Our servers had a hiccup while resolving this tag.",
    Icon: Server,
    actionLabel: "Try again",
  },
};

export default function TError() {
  const q = useQuery();
  const code = q.get("code") ?? "500";
  const tag = q.get("tag") ?? "";
  const spec = MAP[code] ?? MAP["500"];
  const { Icon } = spec;

  const primaryHref =
    code === "410"
      ? "mailto:support@to-k.chip?subject=Tag%20help&body=Tag:%20" + encodeURIComponent(tag)
      : "/";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="to-k" className="h-6 w-auto opacity-90" />
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">tag redirect</span>
        </div>

        <div className="mt-6 flex items-start gap-4">
          <div className="rounded-xl bg-white/10 p-3">
            <Icon className="h-6 w-6 text-zinc-100" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{spec.title}</h1>
            <p className="mt-1 text-zinc-400">{spec.subtitle}</p>
            {tag && (
              <p className="mt-2 text-xs text-zinc-500">
                Tag: <span className="font-mono text-zinc-300">{tag}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-zinc-900 px-4 py-2 text-sm font-semibold shadow hover:opacity-95 transition"
          >
            {spec.actionLabel}
          </a>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-xs text-zinc-500">
          If you keep seeing this, send us the tag code so we can help quickly.
        </div>
      </div>
    </div>
  );
}
