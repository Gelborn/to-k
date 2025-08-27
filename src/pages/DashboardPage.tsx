import React from "react";
import { ArrowUpRight, ArrowDownRight, Users2, FolderOpen, Tag as TagIcon, ShieldCheck } from "lucide-react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, defs } from "recharts";
import { supabase } from "../lib/supabase";

// ──────────────────────────────────────────────────────────────────────────────
// Small utility: format numbers nicely
// ──────────────────────────────────────────────────────────────────────────────
const formatNumber = (n?: number | null) =>
  (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ──────────────────────────────────────────────────────────────────────────────
// BigStatCard – prominent KPI tile
// ──────────────────────────────────────────────────────────────────────────────
function BigStatCard({
  title,
  value,
  icon,
  trend,
  loading,
}: {
  title: string;
  value?: number | null;
  icon: React.ReactNode;
  trend?: "up" | "down" | "flat";
  loading?: boolean;
}) {
  const trendIcon =
    trend === "up" ? (
      <ArrowUpRight className="w-4 h-4" />
    ) : trend === "down" ? (
      <ArrowDownRight className="w-4 h-4" />
    ) : null;

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl",
        "border border-gray-200 dark:border-gray-800/60",
        "bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm",
        "p-6 shadow-sm transition hover:shadow-md hover:border-blue-400/30",
        "ring-1 ring-transparent group-hover:ring-blue-500/20", // subtle hover ring
      ].join(" ")}
    >
      {/* Subtle glow (more sober than before) */}
      <div
        className={[
          "pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full",
          "bg-gradient-to-tr from-blue-400/10 via-fuchsia-400/5 to-transparent",
          "blur-2xl group-hover:from-blue-400/20 group-hover:via-fuchsia-400/10",
        ].join(" ")}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            {icon}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {loading ? (
                <span className="inline-block h-6 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              ) : (
                (value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
              )}
            </p>
          </div>
        </div>

        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              trend === "up"
                ? "text-emerald-600 ring-emerald-600/20 bg-emerald-500/5"
                : trend === "down"
                ? "text-rose-600 ring-rose-600/20 bg-rose-500/5"
                : "text-gray-600 ring-gray-600/20 bg-gray-500/5"
            }`}
          >
            {trendIcon}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock chart data – replace with API data when available
// ──────────────────────────────────────────────────────────────────────────────
const last14Days = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
});

const customersSeries = last14Days.map((label, i) => ({
  day: label,
  newCustomers: Math.max(0, Math.round(4 + Math.sin(i / 2) * 3 + (i % 3)))
}));

const redirectsSeries = last14Days.map((label, i) => ({
  day: label,
  redirects: Math.max(0, Math.round(40 + Math.cos(i / 2.5) * 18 + (i % 5)))
}));

// ──────────────────────────────────────────────────────────────────────────────
// Data fetching hook – live counts via Supabase
// ──────────────────────────────────────────────────────────────────────────────
function useDashboardCounts() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState({
    projects: 0,
    owners: 0,
    customers: 0,
    tags: 0,
  });

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // projects count
        const { count: projectsCount, error: pErr } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true });
        if (pErr) throw pErr;

        // owners & customers from profiles (assuming 'role' enum)
        const { count: ownersCount, error: oErr } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "owner");
        if (oErr) throw oErr;

        const { count: customersCount, error: cErr } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "customer");
        if (cErr) throw cErr;

        // tags count
        const { count: tagsCount, error: tErr } = await supabase
          .from("tags")
          .select("id", { count: "exact", head: true });
        if (tErr) throw tErr;

        if (!isMounted) return;
        setCounts({
          projects: projectsCount ?? 0,
          owners: ownersCount ?? 0,
          customers: customersCount ?? 0,
          tags: tagsCount ?? 0,
        });
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message ?? "Failed to load dashboard counts");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { loading, error, counts };
}

// ──────────────────────────────────────────────────────────────────────────────
// Pretty tooltip for charts
// ──────────────────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {p.name}: {formatNumber(p.value)}
      </p>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ──────────────────────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { loading, error, counts } = useDashboardCounts();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <BigStatCard
          title="Projects"
          value={counts.projects}
          loading={loading}
          trend="up"
          icon={<FolderOpen className="h-6 w-6 text-indigo-500" />}
        />
        <BigStatCard
          title="Owners"
          value={counts.owners}
          loading={loading}
          trend="flat"
          icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
        />
        <BigStatCard
          title="Customers"
          value={counts.customers}
          loading={loading}
          trend="up"
          icon={<Users2 className="h-6 w-6 text-fuchsia-500" />}
        />
        <BigStatCard
          title="Tags"
          value={counts.tags}
          loading={loading}
          trend="down"
          icon={<TagIcon className="h-6 w-6 text-amber-500" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
            New customers by day
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customersSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCustomers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" className="text-gray-500 dark:text-gray-400" />
                <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" className="text-gray-500 dark:text-gray-400" />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="newCustomers" name="New" strokeWidth={2} stroke="currentColor" fill="url(#gradCustomers)" className="text-indigo-500" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
            Redirects by day
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={redirectsSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" className="text-gray-500 dark:text-gray-400" />
                <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" className="text-gray-500 dark:text-gray-400" />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="redirects" name="Redirects" strokeWidth={2} stroke="currentColor" dot={false} className="text-emerald-500" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lower cards: activity + status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: "New project created", time: "2 hours ago", type: "project" },
              { action: "Tag added to profile", time: "4 hours ago", type: "tag" },
              { action: "User account created", time: "6 hours ago", type: "account" },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-gray-100 dark:bg-gray-800/30 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-4 ${
                      activity.type === "project"
                        ? "bg-indigo-400"
                        : activity.type === "tag"
                        ? "bg-emerald-400"
                        : "bg-fuchsia-400"
                    }`}
                  />
                  <span className="text-gray-800 dark:text-gray-300 text-sm font-medium">
                    {activity.action}
                  </span>
                </div>
                <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">System Status</h3>
          <div className="space-y-4">
            {[
              { service: "API Server", status: "operational" },
              { service: "Database", status: "operational" },
              { service: "File Storage", status: "operational" },
            ].map((service, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 bg-gray-100 dark:bg-gray-800/30 rounded-xl">
                <span className="text-gray-800 dark:text-gray-300 text-sm font-medium">
                  {service.service}
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full mr-3 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-500 text-xs font-semibold capitalize tracking-wider">
                    {service.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
};
