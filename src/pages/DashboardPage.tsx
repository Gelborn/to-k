import React from "react";
import { ArrowUpRight, ArrowDownRight, Users2, FolderOpen, Tag as TagIcon, ShieldCheck } from "lucide-react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../lib/supabase";

// ──────────────────────────────────────────────────────────────────────────────
// Small utility: format numbers nicely
// ──────────────────────────────────────────────────────────────────────────────
const formatNumber = (n?: number | null) =>
  (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ──────────────────────────────────────────────────────────────────────────────
// Date helpers (7 days buckets, local timezone-safe)
// ──────────────────────────────────────────────────────────────────────────────
type DayPoint = { key: string; label: string };

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function dateKeyLocal(d: Date) {
  // YYYY-MM-DD (local)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateLabelLocal(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function lastNDaysMeta(n: number): DayPoint[] {
  const today0 = startOfDayLocal(new Date());
  const start = addDays(today0, -(n - 1));
  const out: DayPoint[] = [];
  for (let i = 0; i < n; i++) {
    const dt = addDays(start, i);
    out.push({ key: dateKeyLocal(dt), label: dateLabelLocal(dt) });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
/** BigStatCard – prominent KPI tile */
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
        "ring-1 ring-transparent group-hover:ring-blue-500/20",
      ].join(" ")}
    >
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
        const { count: projectsCount, error: pErr } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true });
        if (pErr) throw pErr;

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
// Series hook – REAL data for last 7 days (customers & redirects)
// ──────────────────────────────────────────────────────────────────────────────
function useDashboardSeries() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customersSeries, setCustomersSeries] = React.useState<Array<{ day: string; newCustomers: number }>>([]);
  const [redirectsSeries, setRedirectsSeries] = React.useState<Array<{ day: string; redirects: number }>>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build 7-day buckets (local days)
      const days = lastNDaysMeta(7);
      const baseCustomers: Record<string, number> = Object.fromEntries(days.map(d => [d.key, 0]));
      const baseRedirects: Record<string, number> = Object.fromEntries(days.map(d => [d.key, 0]));

      // Fetch customers created in the last 7 local days window:
      // start inclusive at local 00:00 of day[0], end exclusive local 00:00 of day after last
      const startLocal = (() => {
        const d0 = days[0].key; // YYYY-MM-DD local
        // convert to Date local midnight
        const [y, m, d] = d0.split("-").map(Number);
        return new Date(y, (m - 1), d, 0, 0, 0, 0);
      })();
      const endLocalExclusive = addDays(startOfDayLocal(new Date()), 1); // tomorrow 00:00 local

      // Convert to ISO UTC bounds for DB filter
      const startISO = new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000).toISOString();
      const endISO = new Date(endLocalExclusive.getTime() - endLocalExclusive.getTimezoneOffset() * 60000).toISOString();

      // 1) Customers created
      {
        const { data, error } = await supabase
          .from("profiles")
          .select("created_at", { head: false })
          .eq("role", "customer")
          .gte("created_at", startISO)
          .lt("created_at", endISO);
        if (error) throw error;

        (data ?? []).forEach((row: any) => {
          const dt = new Date(row.created_at);
          // map UTC timestamp into local bucket
          const local = startOfDayLocal(dt);
          const key = dateKeyLocal(local);
          if (baseCustomers[key] !== undefined) baseCustomers[key] += 1;
        });
      }

      // 2) Redirects (taps) created
      {
        const { data, error } = await supabase
          .from("taps")
          .select("created_at", { head: false })
          .gte("created_at", startISO)
          .lt("created_at", endISO);
        if (error) throw error;

        (data ?? []).forEach((row: any) => {
          const dt = new Date(row.created_at);
          const local = startOfDayLocal(dt);
          const key = dateKeyLocal(local);
          if (baseRedirects[key] !== undefined) baseRedirects[key] += 1;
        });
      }

      // Compose series in label order
      setCustomersSeries(days.map(d => ({ day: d.label, newCustomers: baseCustomers[d.key] ?? 0 })));
      setRedirectsSeries(days.map(d => ({ day: d.label, redirects: baseRedirects[d.key] ?? 0 })));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load chart series");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + realtime
  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const ch = supabase
      .channel("dashboard_series_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "taps" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { loading, error, customersSeries, redirectsSeries, reload: load };
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
  const { loading: countsLoading, error: countsError, counts } = useDashboardCounts();
  const { loading: seriesLoading, error: seriesError, customersSeries, redirectsSeries } = useDashboardSeries();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <BigStatCard
          title="Projects"
          value={counts.projects}
          loading={countsLoading}
          trend="up"
          icon={<FolderOpen className="h-6 w-6 text-indigo-500" />}
        />
        <BigStatCard
          title="Owners"
          value={counts.owners}
          loading={countsLoading}
          trend="flat"
          icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
        />
        <BigStatCard
          title="Members"
          value={counts.customers}
          loading={countsLoading}
          trend="up"
          icon={<Users2 className="h-6 w-6 text-fuchsia-500" />}
        />
        <BigStatCard
          title="Tags"
          value={counts.tags}
          loading={countsLoading}
          trend="down"
          icon={<TagIcon className="h-6 w-6 text-amber-500" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
            New members by day
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
          {seriesLoading && <div className="mt-3 h-3 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />}
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
          {seriesLoading && <div className="mt-3 h-3 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />}
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

      {(countsError || seriesError) && (
        <p className="text-sm text-rose-600">
          {countsError || seriesError}
        </p>
      )}
    </div>
  );
};
