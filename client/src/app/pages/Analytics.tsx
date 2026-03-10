import { useState, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
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
} from "lucide-react";
import { getDashboardMe, type DashboardMe } from "@/api/auth";
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
  mostReadPosts: Array<{
    postId: string;
    title: string;
    views: number;
    readPercent: number;
    avgTimeOnPage: string;
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

const emptyAnalytics: AnalyticsData = {
  keyMetrics: {
    totalPageViews: 0,
    uniqueVisitors: 0,
    avgTimeOnPage: "0:00",
    avgReadPercent: 0,
    pctChange: 0,
  },
  pageViewsData: [],
  mostReadPosts: [],
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
  const [mostReadPeriod, setMostReadPeriod] = useState("30days");
  const [gaConfig, setGaConfig] = useState<GAConfig | null>(null);
  const [gaModalOpen, setGaModalOpen] = useState(false);

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
    const params = new URLSearchParams({ timeRange, mostReadPeriod });
    fetch(`/api/analytics/${encodeURIComponent(siteKey)}?${params}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAnalytics(data ?? emptyAnalytics);
      })
      .catch(() => setAnalytics(emptyAnalytics))
      .finally(() => setLoading(false));
  }, [siteKey, timeRange, mostReadPeriod]);

  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/analytics/ga/${encodeURIComponent(siteKey)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGaConfig(data ?? { connected: false, measurementId: null, metricsEnabled: [] }))
      .catch(() => setGaConfig({ connected: false, measurementId: null, metricsEnabled: [] }));
  }, [siteKey]);

  const data = analytics ?? emptyAnalytics;

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] p-6 flex items-center justify-center">
        <div className="text-[#6b6b6b]">Loading analytics…</div>
      </div>
    );
  }

  if (!me?.sites.length) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] p-6 flex items-center justify-center">
        <div className="text-[#6b6b6b] text-center">
          Add a blog in the dashboard to view analytics.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-[#0a0a0a] mb-2">Analytics</h1>
          <p className="text-[#6b6b6b] font-light">
            Track your blog's performance and reader engagement
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {me && me.sites.length > 1 && (
            <Select
              value={siteKey ?? undefined}
              onValueChange={(v) => setSearchParams({ siteKey: v })}
            >
              <SelectTrigger className="w-[180px] bg-white border-[#e4e3de]">
                <SelectValue placeholder="Select blog" />
              </SelectTrigger>
              <SelectContent>
                {me.sites.map((s) => (
                  <SelectItem key={s.id} value={s.siteKey}>
                    {s.name || s.url || "Unnamed blog"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-white border-[#e4e3de]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
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
                : (() => {
                    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
                    const points = Math.min(days, 14);
                    return Array.from({ length: points }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (points - 1 - i));
                      return {
                        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        views: 0,
                        uniqueVisitors: 0,
                      };
                    });
                  })()
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
            />
            <YAxis stroke="#6b6b6b" style={{ fontSize: "12px" }} />
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

      {/* Most Read Posts */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-xl text-[#0a0a0a]">Most Read Posts</h3>
          <Tabs value={mostReadPeriod} onValueChange={setMostReadPeriod}>
            <TabsList className="bg-[#f7f6f3]">
              <TabsTrigger value="week">Last Week</TabsTrigger>
              <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
              <TabsTrigger value="alltime">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-4">
          {data.mostReadPosts.length === 0 ? (
            <div className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-[#e4e3de] bg-[#f7f6f3]/50">
              <div className="w-8 h-8 rounded-full bg-[#e4e3de] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-[#e4e3de] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#e4e3de] rounded w-1/2" />
              </div>
              <div className="text-[#6b6b6b] text-sm">No data available</div>
            </div>
          ) : data.mostReadPosts.map((post, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg border border-[#e4e3de] hover:border-[#5B4FE8] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#f7f6f3] flex items-center justify-center font-heading text-[#5B4FE8] font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[#0a0a0a] mb-1 truncate">
                  {post.title || "Untitled"}
                </h4>
                <div className="flex items-center gap-4 text-xs text-[#6b6b6b]">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{post.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>{post.avgTimeOnPage} avg. time</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
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
          ))}
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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.readPercentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, count }: { range: string; count: number }) =>
                  `${range}: ${count.toLocaleString()}`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {data.readPercentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e4e3de",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
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
