import React from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Ban, SearchX, Server, Copy, Check } from "lucide-react";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

type ErrSpec = {
  title: string;
  subtitle: string;
  Icon: React.ComponentType<any>;
};

const MAP: Record<string, ErrSpec> = {
  "400": {
    title: "Invalid tag link",
    subtitle: "The tag URL looks malformed. Please check the code and try again.",
    Icon: AlertTriangle,
  },
  "404": {
    title: "Tag not found",
    subtitle: "We couldn’t find this tag. It may be unregistered or mistyped.",
    Icon: SearchX,
  },
  "410": {
    title: "Tag disabled",
    subtitle:
      "This tag is currently disabled or already claimed. Contact the project owner if you believe this is a mistake.",
    Icon: Ban,
  },
  "500": {
    title: "Something went wrong",
    subtitle: "Our servers had a hiccup while resolving this tag.",
    Icon: Server,
  },
};

export default function TError() {
  const q = useQuery();
  const code = q.get("code") ?? "500";
  const tag = q.get("tag") ?? "";
  const spec = MAP[code] ?? MAP["500"];
  const { Icon } = spec;

  const supportEmail = "suporte@to-k.chip";
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const onClose = () => {
    // Try multiple strategies—works when page was opened by a user gesture/app.
    window.close(); // 1) normal close
    // 2) some browsers require replacing the current context first
    setTimeout(() => {
      try {
        if (!document.hidden && !window.closed) {
          window.open("", "_self")?.close();
        }
      } catch {}
    }, 60);
    // 3) if still visible, navigate back or to a blank page
    setTimeout(() => {
      if (!document.hidden && !window.closed) {
        if (history.length > 1) history.back();
        else location.replace("about:blank");
      }
    }, 140);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100 relative">
      {/* Logo */}
      <div className="absolute top-6 left-6">
        <a
          href="/"
          className="text-xl font-bold text-gray-100 tracking-tight hover:text-blue-400 transition-colors"
        >
          tok chip <span className="text-gray-400 font-extralight"> | admin</span>
        </a>
      </div>

      {/* Center wrapper */}
      <div className="px-5 pt-28 pb-10 flex items-start justify-center">
        {/* Glass / liquid card */}
        <div className="relative w-full max-w-md">
          {/* Decorative blobs for “liquid” feel */}
          <div className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/25 to-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 blur-3xl" />

          <div className="relative rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-6 sm:p-8">
            {/* Header tag */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400/90">
                tag redirect
              </span>
            </div>

            {/* Icon + title */}
            <div className="mt-6 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow">
                <Icon className="h-7 w-7 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold leading-tight tracking-tight">{spec.title}</h1>
                <p className="mt-2 text-zinc-300/90 leading-relaxed">{spec.subtitle}</p>

                {tag && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Tag:&nbsp;
                    <span className="font-mono text-zinc-300 break-all">{tag}</span>
                  </p>
                )}
                {code && (
                  <p className="mt-1 text-[11px] text-zinc-500/80">
                    Error code: <span className="font-medium text-zinc-400">{code}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Support line with ultra-subtle icon-only copy pill */}
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-300">
                  If you have any doubts, contact us at{" "}
                  <span className="font-medium text-zinc-100">{supportEmail}</span>.
                </p>
                <button
                  onClick={onCopy}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10 active:scale-[0.98] transition"
                  aria-label={copied ? "Email copied" : "Copy support email"}
                  title={copied ? "Copied" : "Copy email"}
                  type="button"
                >
                  {copied ? <Check className="h-4 w-4 text-zinc-100" /> : <Copy className="h-4 w-4 text-zinc-200" />}
                </button>
              </div>
            </div>

            {/* Single action: Close tab */}
            <div className="mt-6">
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/5 active:scale-[0.99] transition"
                type="button"
              >
                Close this tab
              </button>
            </div>

            {/* Tiny footnote */}
            <p className="mt-6 text-[11px] text-zinc-500/80 leading-relaxed">
              If this keeps happening, include your tag code in the message so we can help faster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
