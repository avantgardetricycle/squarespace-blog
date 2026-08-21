import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Eye,
  TrendingUp,
  Users,
  Search,
  MousePointer,
  ExternalLink,
  Clock,
  BarChart3,
  Settings,
  CheckCircle2,
  AlertCircle,
  Mail,
  Download,
} from "lucide-react";
import { getDashboardMe, type DashboardMe } from "@/api/auth";
import { NoBlogsPlaceholder } from "@/app/components/NoBlogsPlaceholder";
import { GoogleAnalyticsModal, type GAConfig } from "@/app/components/GoogleAnalyticsModal";

interface AnalyticsData {
  keyMetrics: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgTimeOnPage: string;
    avgReadPercent: number;
    pctChange: number;
  };
  pageViewsData: Array<{ date: string; views: number; uniqueVisitors: number }>;
  perPostAnalytics: Array<{
    postId: string;
    title: string;
    views: number;
    readPercent: number;
    avgTimeOnPage: string;
    avgTimeOnPageSeconds: number;
    publishedAt: string | null;
    author: string;
  }>;
  clickTrackingData: Array<{ element: string; clicks: number; ctr: number }>;
  searchAnalyticsData: Array<{ term: string; searches: number; clicks: number; ctr: number }>;
  authorAnalyticsData: Array<{
    name: string;
    posts: number;
    totalViews: number;
    avgReadPercent: number;
    avgTimeOnPage: string;
    engagement: number;
  }>;
  readPercentDistribution: Array<{ range: string; count: number; color: string }>;
}

function timeRangeDays(range: string): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 365;
}

function emptyPageViewsSeries(range: string): AnalyticsData["pageViewsData"] {
  const days = timeRangeDays(range);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: 0,
      uniqueVisitors: 0,
    };
  });
}

const emptyAnalytics: AnalyticsData = {
  keyMetrics: {
    totalPageViews: 0,
    uniqueVisitors: 0,
    avgTimeOnPage: "0:00",
    avgReadPercent: 0,
    pctChange: 0,
  },
  pageViewsData: [],
  perPostAnalytics: [],
  clickTrackingData: [],
  searchAnalyticsData: [],
  authorAnalyticsData: [],
  readPercentDistribution: [
    { range: "0-25%", count: 0, color: "#ef4444" },
    { range: "26-50%", count: 0, color: "#f59e0b" },
    { range: "51-75%", count: 0, color: "#10B981" },
    { range: "76-100%", count: 0, color: "#5B4FE8" },
  ],
};

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteKey = searchParams.get("siteKey");
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [postSort, setPostSort] = useState<
    "views" | "date_posted" | "read_percent" | "avg_time"
  >("views");
  const [postLimit, setPostLimit] = useState<number | "all">(5);
  const [gaConfig, setGaConfig] = useState<GAConfig | null>(null);
  const [gaModalOpen, setGaModalOpen] = useState(false);
  const [leadsData, setLeadsData] = useState<{
    summary: { totalNewsletter: number; totalLeadMagnet: number; total: number };
    leads: Array<{ id: string; email: string; name: string | null; type: string; resourceTitle: string | null; createdAt: string }>;
  } | null>(null);

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!me || me.sites.length === 0) return;
    if (!siteKey) {
      setSearchParams({ siteKey: me.sites[0].siteKey }, { replace: true });
      return;
    }
    const validSite = me.sites.some((s) => s.siteKey === siteKey);
    if (!validSite) {
      setSearchParams({ siteKey: me.sites[0].siteKey }, { replace: true });
    }
  }, [me, siteKey, setSearchParams]);

  useEffect(() => {
    if (!siteKey) return;
    setLoading(true);
    const params = new URLSearchParams({ timeRange });
    fetch(`/api/analytics/${encodeURIComponent(siteKey)}?${params}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload) {
          setAnalytics(emptyAnalytics);
          return;
        }
        const d = payload as AnalyticsData & { mostReadPosts?: AnalyticsData["perPostAnalytics"] };
        if (!d.perPostAnalytics?.length && Array.isArray(d.mostReadPosts) && d.mostReadPosts.length > 0) {
          d.perPostAnalytics = d.mostReadPosts.map((p) => ({
            ...p,
            avgTimeOnPageSeconds: 0,
            publishedAt: null,
          }));
        }
        setAnalytics({ ...emptyAnalytics, ...d });
      })
      .catch(() => setAnalytics(emptyAnalytics))
      .finally(() => setLoading(false));
  }, [siteKey, timeRange]);

  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/analytics/ga/${encodeURIComponent(siteKey)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGaConfig(data ?? { connected: false, measurementId: null, metricsEnabled: [] }))
      .catch(() => setGaConfig({ connected: false, measurementId: null, metricsEnabled: [] }));
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;
    const params = new URLSearchParams({ timeRange, format: "json" });
    fetch(`/api/analytics/${encodeURIComponent(siteKey)}/leads?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLeadsData(data ?? { summary: { totalNewsletter: 0, totalLeadMagnet: 0, total: 0 }, leads: [] }))
      .catch(() => setLeadsData({ summary: { totalNewsletter: 0, totalLeadMagnet: 0, total: 0 }, leads: [] }));
  }, [siteKey, timeRange]);

  const data = analytics ?? emptyAnalytics;
  const readPercentTotal = data.readPercentDistribution.reduce((s, d) => s + d.count, 0);

  const sortedPerPostAnalytics = useMemo(() => {
    const list = [...(data.perPostAnalytics ?? [])];
    const cmp = (
      a: (typeof list)[0],
      b: (typeof list)[0],
    ): number => {
      switch (postSort) {
        case "views":
          return b.views - a.views || a.title.localeCompare(b.title);
        case "read_percent":
          return b.readPercent - a.readPercent || b.views - a.views;
        case "avg_time":
          return (
            b.avgTimeOnPageSeconds - a.avgTimeOnPageSeconds || b.views - a.views
          );
        case "date_posted": {
          const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          if (ta !== tb) return tb - ta;
          return b.views - a.views;
        }
        default:
          return 0;
      }
    };
    list.sort(cmp);
    if (postLimit === "all") return list;
    return list.slice(0, postLimit);
  }, [data.perPostAnalytics, postSort, postLimit]);

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] p-6 flex items-center justify-center">
        <div className="text-[#6b6b6b]">Loading analytics…</div>
      </div>
    );
  }

  if (!me?.sites.length) {
    return <NoBlogsPlaceholder />;
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-4xl text-[#0a0a0a] mb-2">Analytics</h1>
        <p className="text-[#6b6b6b] font-light">
          Track your blog's performance and reader engagement
        </p>
        <div className="flex items-center gap-3 flex-wrap mt-4">
          {me && me.sites.length > 1 && (
            <Select
              value={siteKey ?? undefined}
              onValueChange={(v) => setSearchParams({ siteKey: v })}
            >
              <SelectTrigger className="w-[200px] h-10 bg-white border-[#e4e3de] text-base">
                <SelectValue placeholder="Select blog" />
              </SelectTrigger>
              <SelectContent>
                {me.sites.map((s) => (
                  <SelectItem key={s.id} value={s.siteKey} className="text-base">
                    {s.name || s.url || "Unnamed blog"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-[#e4e3de] text-base">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d" className="text-base">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-base">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-base">Last 90 days</SelectItem>
              <SelectItem value="12m" className="text-base">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Google Analytics Integration Card */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#f7f6f3] flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-[#5B4FE8]" />
            </div>
            <div>
              <h3 className="font-heading text-xl text-[#0a0a0a] mb-1">
                Google Analytics Integration
              </h3>
              <p className="text-sm text-[#6b6b6b] mb-3">
                {gaConfig?.connected
                  ? "Your Google Analytics is connected and syncing data"
                  : "Connect your Google Analytics account to see Traffic Sources, Top Referrers, and New vs. Returning Visitors"}
              </p>
              {gaConfig?.connected ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-[#10B981]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Connected</span>
                  </div>
                  <div className="text-sm text-[#6b6b6b] font-mono">
                    {gaConfig.measurementId}
                  </div>
                  {gaConfig.metricsEnabled.length > 0 && (
                    <div className="text-xs text-[#6b6b6b] mt-1">
                      Tracking: {gaConfig.metricsEnabled.map((m) => {
                        if (m === "traffic_sources") return "Traffic Sources";
                        if (m === "top_referrers") return "Top Referrers";
                        if (m === "new_vs_returning") return "New vs. Returning";
                        return m;
                      }).join(", ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                  <AlertCircle className="w-4 h-4" />
                  <span>Not connected</span>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => setGaModalOpen(true)}
            className={
              gaConfig?.connected
                ? "bg-[#f7f6f3] text-[#6b6b6b] hover:bg-[#e4e3de] border border-[#e4e3de] shrink-0"
                : "bg-[#5B4FE8] text-white hover:bg-[#4a3fd4] shrink-0"
            }
          >
            {gaConfig?.connected ? (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Google Analytics
              </>
            )}
          </Button>
        </div>
      </Card>

      <GoogleAnalyticsModal
        open={gaModalOpen}
        onOpenChange={setGaModalOpen}
        siteKey={siteKey ?? ""}
        config={gaConfig}
        onSaved={() => {
          if (!siteKey) return;
          fetch(`/api/analytics/ga/${encodeURIComponent(siteKey)}`, { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setGaConfig(data ?? { connected: false, measurementId: null, metricsEnabled: [] }))
            .catch(() => setGaConfig({ connected: false, measurementId: null, metricsEnabled: [] }));
        }}
      />

      {/* Leads & Subscribers */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#f7f6f3] flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-[#5B4FE8]" />
            </div>
            <div>
              <h3 className="font-heading text-xl text-[#0a0a0a] mb-1">
                Leads & Subscribers
              </h3>
              <p className="text-sm text-[#6b6b6b] mb-3">
                Newsletter subscribers and lead magnet signups from your blog
              </p>
              {leadsData && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-[#0a0a0a] font-medium">
                    {leadsData.summary.totalNewsletter} newsletter
                  </span>
                  <span className="text-[#0a0a0a] font-medium">
                    {leadsData.summary.totalLeadMagnet} lead magnet
                  </span>
                  <span className="text-[#6b6b6b]">
                    {leadsData.summary.total} total
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-[#e4e3de]"
            onClick={() => {
              if (!siteKey) return;
              const params = new URLSearchParams({ timeRange, format: "csv" });
              fetch(`/api/analytics/${encodeURIComponent(siteKey)}/leads?${params}`, { credentials: "include" })
                .then((res) => res.ok ? res.text() : null)
                .then((csv) => {
                  if (csv) {
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `leads-${siteKey}-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                });
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>
        {leadsData && leadsData.leads.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4e3de]">
                  <th className="text-left py-2 pr-4 font-medium text-[#6b6b6b]">Email</th>
                  <th className="text-left py-2 pr-4 font-medium text-[#6b6b6b]">Name</th>
                  <th className="text-left py-2 pr-4 font-medium text-[#6b6b6b]">Type</th>
                  <th className="text-left py-2 pr-4 font-medium text-[#6b6b6b]">Resource</th>
                  <th className="text-left py-2 font-medium text-[#6b6b6b]">Date</th>
                </tr>
              </thead>
              <tbody>
                {leadsData.leads.slice(0, 20).map((lead) => (
                  <tr key={lead.id} className="border-b border-[#e4e3de]/50">
                    <td className="py-2 pr-4">{lead.email}</td>
                    <td className="py-2 pr-4">{lead.name || "—"}</td>
                    <td className="py-2 pr-4 capitalize">{lead.type.replace("_", " ")}</td>
                    <td className="py-2 pr-4">{lead.resourceTitle || "—"}</td>
                    <td className="py-2">{new Date(lead.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leadsData.leads.length > 20 && (
              <p className="text-xs text-[#6b6b6b] mt-2">
                Showing 20 of {leadsData.leads.length}. Download CSV for full list.
              </p>
            )}
          </div>
        )}
        {leadsData && leadsData.leads.length === 0 && (
          <p className="text-sm text-[#6b6b6b] mt-4">
            No leads or subscribers yet. Add Email Capture or Lead Magnet modules in Configure to start collecting.
          </p>
        )}
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#5B4FE8]/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#5B4FE8]" />
            </div>
            {data.keyMetrics.totalPageViews > 0 && (
              <span className={`text-xs font-medium ${data.keyMetrics.pctChange >= 0 ? "text-[#10B981]" : "text-[#ef4444]"}`}>
                {data.keyMetrics.pctChange >= 0 ? "+" : ""}{data.keyMetrics.pctChange}%
              </span>
            )}
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">
            {data.keyMetrics.totalPageViews >= 1000
              ? (data.keyMetrics.totalPageViews / 1000).toFixed(1) + "k"
              : data.keyMetrics.totalPageViews.toLocaleString()}
          </div>
          <div className="text-sm text-[#6b6b6b]">Total Page Views</div>
        </Card>

        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#10B981]" />
            </div>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">
            {data.keyMetrics.uniqueVisitors >= 1000
              ? (data.keyMetrics.uniqueVisitors / 1000).toFixed(1) + "k"
              : data.keyMetrics.uniqueVisitors.toLocaleString()}
          </div>
          <div className="text-sm text-[#6b6b6b]">Unique Visitors</div>
        </Card>

        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#8F86F0]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#8F86F0]" />
            </div>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">
            {data.keyMetrics.totalPageViews > 0 ? data.keyMetrics.avgTimeOnPage : "—"}
          </div>
          <div className="text-sm text-[#6b6b6b]">Avg. Time on Page</div>
        </Card>

        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
            </div>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">
            {data.keyMetrics.totalPageViews > 0 ? `${data.keyMetrics.avgReadPercent}%` : "—"}
          </div>
          <div className="text-sm text-[#6b6b6b]">Avg. Read Percent</div>
        </Card>
      </div>

      {/* Page Views Chart */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <h3 className="font-heading text-xl text-[#0a0a0a] mb-6">
          Page Views & Visitors
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={
              data.pageViewsData.length > 0
                ? data.pageViewsData
                : emptyPageViewsSeries(timeRange)
            }
          >
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B4FE8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#5B4FE8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e3de" />
            <XAxis
              dataKey="date"
              stroke="#6b6b6b"
              style={{ fontSize: "12px" }}
              minTickGap={24}
            />
            <YAxis
              stroke="#6b6b6b"
              style={{ fontSize: "12px" }}
              domain={[0, "auto"]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e4e3de",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#5B4FE8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorViews)"
              name="Page Views"
            />
            <Area
              type="monotone"
              dataKey="uniqueVisitors"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVisitors)"
              name="Unique Visitors"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Per-Post Analytics */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-heading text-xl text-[#0a0a0a]">Per-Post Analytics</h3>
            <p className="text-xs text-[#6b6b6b] mt-1">
              Metrics match the dashboard time range above (e.g. Last 7 / 30 / 90 days or 12 months).
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#6b6b6b] whitespace-nowrap">Sort by</span>
              <Select value={postSort} onValueChange={(v) => setPostSort(v as typeof postSort)}>
                <SelectTrigger className="h-9 w-[200px] bg-white">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="views">Views (high → low)</SelectItem>
                  <SelectItem value="date_posted">Date posted (newest first)</SelectItem>
                  <SelectItem value="read_percent">Read % (high → low)</SelectItem>
                  <SelectItem value="avg_time">Avg. read time (high → low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#6b6b6b] whitespace-nowrap">Show</span>
              <Select
                value={postLimit === "all" ? "all" : String(postLimit)}
                onValueChange={(v) =>
                  setPostLimit(v === "all" ? "all" : Number.parseInt(v, 10))
                }
              >
                <SelectTrigger className="h-9 w-[120px] bg-white">
                  <SelectValue placeholder="Count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 posts</SelectItem>
                  <SelectItem value="10">10 posts</SelectItem>
                  <SelectItem value="25">25 posts</SelectItem>
                  <SelectItem value="50">50 posts</SelectItem>
                  <SelectItem value="100">100 posts</SelectItem>
                  <SelectItem value="all">All posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {(data.perPostAnalytics ?? []).length === 0 ? (
            <div className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-[#e4e3de] bg-[#f7f6f3]/50">
              <div className="w-8 h-8 rounded-full bg-[#e4e3de] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-[#e4e3de] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#e4e3de] rounded w-1/2" />
              </div>
              <div className="text-[#6b6b6b] text-sm">No data available</div>
            </div>
          ) : (
            sortedPerPostAnalytics.map((post, index) => (
              <div
                key={post.postId}
                className="flex items-center gap-4 p-4 rounded-lg border border-[#e4e3de] hover:border-[#5B4FE8] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#f7f6f3] flex items-center justify-center font-heading text-[#5B4FE8] font-semibold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[#0a0a0a] mb-1 truncate">
                    {post.title || "Untitled"}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6b6b6b]">
                    <span>By {post.author}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>
                      Posted{" "}
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span>{post.views.toLocaleString()} views</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{post.avgTimeOnPage} avg. time</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#0a0a0a]">
                      {post.readPercent}%
                    </div>
                    <div className="text-xs text-[#6b6b6b]">read</div>
                  </div>
                  <div className="w-20">
                    <div className="h-2 bg-[#f7f6f3] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5B4FE8] rounded-full"
                        style={{ width: `${post.readPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Tracking */}
        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-center gap-3 mb-6">
            <MousePointer className="w-5 h-5 text-[#5B4FE8]" />
            <h3 className="font-heading text-xl text-[#0a0a0a]">Click Tracking</h3>
          </div>
          <div className="space-y-3">
            {data.clickTrackingData.length === 0 ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 bg-[#e4e3de] rounded w-24" />
                      <div className="h-4 bg-[#e4e3de] rounded w-16" />
                    </div>
                    <div className="h-2 bg-[#f7f6f3] rounded-full" />
                  </div>
                ))}
                <div className="pt-4 text-center text-[#6b6b6b] text-sm">No data available</div>
              </div>
            ) : data.clickTrackingData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#0a0a0a] font-medium">
                    {item.element}
                  </span>
                  <span className="text-[#6b6b6b]">
                    {item.clicks.toLocaleString()} clicks
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#f7f6f3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5B4FE8] rounded-full"
                      style={{ width: `${item.ctr * 5}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#6b6b6b] w-12 text-right">
                    {item.ctr}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Read Percent Distribution */}
        <Card className="bg-white border-[#e4e3de] p-6">
          <h3 className="font-heading text-xl text-[#0a0a0a] mb-6">
            Read Percent Distribution
          </h3>
          {data.readPercentDistribution.every((d) => d.count === 0) ? (
            <div className="h-[300px] flex flex-col items-center justify-center">
              <div className="w-[200px] h-[200px] rounded-full border-2 border-dashed border-[#e4e3de] bg-[#f7f6f3]/50 flex items-center justify-center">
                <span className="text-[#6b6b6b] text-sm text-center px-4">No data available</span>
              </div>
            </div>
          ) : (
            <div>
              {/*
                Recharts (and most SVG pies) have no automatic non-overlapping labels on slices.
                Slice labels are omitted; counts and % appear in the list below and in the tooltip.
              */}
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.readPercentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    paddingAngle={0}
                    label={false}
                    dataKey="count"
                  >
                    {data.readPercentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as {
                        range: string;
                        count: number;
                        color: string;
                      };
                      const pct =
                        readPercentTotal > 0
                          ? ((p.count / readPercentTotal) * 100).toFixed(1)
                          : "0";
                      return (
                        <div className="rounded-md border border-[#e4e3de] bg-white px-3 py-2 text-sm shadow-sm">
                          <div className="font-medium text-[#0a0a0a]">{p.range}</div>
                          <div className="text-[#6b6b6b]">
                            {p.count.toLocaleString()} sessions ({pct}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 border-t border-[#e4e3de] pt-4">
                {data.readPercentDistribution.map((d) => {
                  const pct =
                    readPercentTotal > 0 ? (d.count / readPercentTotal) * 100 : 0;
                  return (
                    <div
                      key={d.range}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: d.color }}
                          aria-hidden
                        />
                        <span className="font-medium text-[#0a0a0a]">{d.range}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[#6b6b6b]">
                        {d.count.toLocaleString()}{" "}
                        <span className="text-[#0a0a0a]">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Search Analytics */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-5 h-5 text-[#5B4FE8]" />
          <h3 className="font-heading text-xl text-[#0a0a0a]">Search Analytics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e4e3de]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Search Term
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Searches
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Clicks
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody>
              {data.searchAnalyticsData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#6b6b6b]">
                    No data available
                  </td>
                </tr>
              ) : data.searchAnalyticsData.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-[#e4e3de] hover:bg-[#f7f6f3] transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-[#0a0a0a]">
                    {item.term}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#6b6b6b] text-right">
                    {item.searches.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#6b6b6b] text-right">
                    {item.clicks.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#5B4FE8]/10 text-[#5B4FE8] font-medium">
                      {item.ctr}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Author Analytics */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-[#5B4FE8]" />
          <h3 className="font-heading text-xl text-[#0a0a0a]">
            Per-Author Analytics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e4e3de]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Author
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Posts
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Total Views
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Avg. Read %
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Avg. Time
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#6b6b6b]">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody>
              {data.authorAnalyticsData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6b6b6b]">
                    No data available
                  </td>
                </tr>
              ) : data.authorAnalyticsData.map((author, index) => (
                <tr
                  key={index}
                  className="border-b border-[#e4e3de] hover:bg-[#f7f6f3] transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B4FE8] to-[#8F86F0] flex items-center justify-center text-white font-semibold text-sm">
                        {author.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium text-[#0a0a0a]">
                        {author.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-[#6b6b6b] text-right">
                    {author.posts}
                  </td>
                  <td className="py-4 px-4 text-sm text-[#6b6b6b] text-right">
                    {author.totalViews.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-medium">
                      {author.avgReadPercent}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-[#6b6b6b] text-right">
                    {author.avgTimeOnPage}
                  </td>
                  <td className="py-4 px-4 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#5B4FE8]/10 text-[#5B4FE8] font-medium">
                      {author.engagement}/10
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
