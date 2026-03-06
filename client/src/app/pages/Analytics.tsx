import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
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

// Mock data for analytics
const pageViewsData = [
  { date: "Mar 1", views: 2400, uniqueVisitors: 1800 },
  { date: "Mar 3", views: 3200, uniqueVisitors: 2200 },
  { date: "Mar 5", views: 2800, uniqueVisitors: 1900 },
  { date: "Mar 7", views: 3800, uniqueVisitors: 2600 },
  { date: "Mar 9", views: 4200, uniqueVisitors: 3100 },
  { date: "Mar 11", views: 3600, uniqueVisitors: 2400 },
  { date: "Mar 13", views: 4800, uniqueVisitors: 3400 },
  { date: "Mar 15", views: 5200, uniqueVisitors: 3800 },
  { date: "Mar 17", views: 4600, uniqueVisitors: 3200 },
  { date: "Mar 19", views: 5400, uniqueVisitors: 4000 },
  { date: "Mar 21", views: 6100, uniqueVisitors: 4500 },
  { date: "Mar 23", views: 5800, uniqueVisitors: 4200 },
  { date: "Mar 25", views: 6400, uniqueVisitors: 4800 },
  { date: "Mar 27", views: 7200, uniqueVisitors: 5400 },
  { date: "Mar 29", views: 6800, uniqueVisitors: 5000 },
];

const searchAnalyticsData = [
  { term: "productivity tips", searches: 142, clicks: 89, ctr: 62.7 },
  { term: "remote work", searches: 128, clicks: 76, ctr: 59.4 },
  { term: "morning routine", searches: 95, clicks: 71, ctr: 74.7 },
  { term: "minimalism", searches: 87, clicks: 52, ctr: 59.8 },
  { term: "slow living", searches: 73, clicks: 58, ctr: 79.5 },
  { term: "creativity", searches: 64, clicks: 41, ctr: 64.1 },
  { term: "work life balance", searches: 58, clicks: 44, ctr: 75.9 },
  { term: "wellness", searches: 52, clicks: 35, ctr: 67.3 },
];

const mostReadPostsLastWeek = [
  {
    title: "Finding balance in a busy creative life",
    views: 2847,
    readPercent: 78,
    avgTimeOnPage: "4:32",
    author: "Sarah Clarke",
  },
  {
    title: "My morning ritual and why it works",
    views: 2103,
    readPercent: 82,
    avgTimeOnPage: "3:18",
    author: "Sarah Clarke",
  },
  {
    title: "The case for slow living",
    views: 1894,
    readPercent: 65,
    avgTimeOnPage: "5:12",
    author: "Sarah Clarke",
  },
  {
    title: "On creative blocks and how to overcome them",
    views: 1652,
    readPercent: 71,
    avgTimeOnPage: "4:05",
    author: "Michael Chen",
  },
  {
    title: "Tools that changed my workflow",
    views: 1438,
    readPercent: 88,
    avgTimeOnPage: "2:54",
    author: "Emily Rodriguez",
  },
];

const mostReadPostsLast30Days = [
  {
    title: "Finding balance in a busy creative life",
    views: 12847,
    readPercent: 76,
    avgTimeOnPage: "4:28",
    author: "Sarah Clarke",
  },
  {
    title: "The ultimate guide to minimalist design",
    views: 9834,
    readPercent: 69,
    avgTimeOnPage: "6:42",
    author: "Michael Chen",
  },
  {
    title: "My morning ritual and why it works",
    views: 8921,
    readPercent: 81,
    avgTimeOnPage: "3:22",
    author: "Sarah Clarke",
  },
  {
    title: "Building sustainable habits",
    views: 7654,
    readPercent: 74,
    avgTimeOnPage: "5:01",
    author: "Emily Rodriguez",
  },
  {
    title: "Remote work: 2 years later",
    views: 6892,
    readPercent: 67,
    avgTimeOnPage: "4:15",
    author: "Sarah Clarke",
  },
];

const mostReadPostsAllTime = [
  {
    title: "The ultimate guide to minimalist design",
    views: 45821,
    readPercent: 72,
    avgTimeOnPage: "6:38",
    author: "Michael Chen",
  },
  {
    title: "Finding balance in a busy creative life",
    views: 38942,
    readPercent: 77,
    avgTimeOnPage: "4:31",
    author: "Sarah Clarke",
  },
  {
    title: "My journey to becoming a full-time creator",
    views: 32156,
    readPercent: 85,
    avgTimeOnPage: "7:14",
    author: "Sarah Clarke",
  },
  {
    title: "Building sustainable habits",
    views: 28734,
    readPercent: 75,
    avgTimeOnPage: "5:08",
    author: "Emily Rodriguez",
  },
  {
    title: "The tools I use every day",
    views: 25198,
    readPercent: 91,
    avgTimeOnPage: "3:42",
    author: "Michael Chen",
  },
];

const authorAnalyticsData = [
  {
    name: "Sarah Clarke",
    posts: 28,
    totalViews: 142580,
    avgReadPercent: 76,
    avgTimeOnPage: "4:42",
    engagement: 8.4,
  },
  {
    name: "Michael Chen",
    posts: 18,
    totalViews: 98340,
    avgReadPercent: 71,
    avgTimeOnPage: "5:28",
    engagement: 7.2,
  },
  {
    name: "Emily Rodriguez",
    posts: 15,
    totalViews: 76220,
    avgReadPercent: 79,
    avgTimeOnPage: "4:18",
    engagement: 9.1,
  },
  {
    name: "Alex Thompson",
    posts: 12,
    totalViews: 54890,
    avgReadPercent: 68,
    avgTimeOnPage: "3:52",
    engagement: 6.8,
  },
];

const clickTrackingData = [
  { element: "Related Posts Widget", clicks: 3842, ctr: 18.4 },
  { element: "Author Bio Link", clicks: 2956, ctr: 14.2 },
  { element: "Social Share - Twitter", clicks: 2103, ctr: 10.1 },
  { element: "TOC Links", clicks: 1847, ctr: 8.9 },
  { element: "Category Tags", clicks: 1624, ctr: 7.8 },
  { element: "Social Share - Facebook", clicks: 1389, ctr: 6.7 },
  { element: "Newsletter CTA", clicks: 1205, ctr: 5.8 },
  { element: "Breadcrumb Navigation", clicks: 982, ctr: 4.7 },
];

const readPercentDistribution = [
  { range: "0-25%", count: 2847, color: "#ef4444" },
  { range: "26-50%", count: 3621, color: "#f59e0b" },
  { range: "51-75%", count: 5234, color: "#10B981" },
  { range: "76-100%", count: 8912, color: "#5B4FE8" },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [mostReadPeriod, setMostReadPeriod] = useState("week");
  const [gaConnected, setGaConnected] = useState(false);

  const getMostReadData = () => {
    switch (mostReadPeriod) {
      case "week":
        return mostReadPostsLastWeek;
      case "30days":
        return mostReadPostsLast30Days;
      case "alltime":
        return mostReadPostsAllTime;
      default:
        return mostReadPostsLastWeek;
    }
  };

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
        <div className="flex items-center gap-3">
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
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#f7f6f3] flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#5B4FE8]" />
            </div>
            <div>
              <h3 className="font-heading text-xl text-[#0a0a0a] mb-1">
                Google Analytics Integration
              </h3>
              <p className="text-sm text-[#6b6b6b] mb-3">
                {gaConnected
                  ? "Your Google Analytics is connected and syncing data"
                  : "Connect your Google Analytics account to see enhanced metrics"}
              </p>
              {gaConnected ? (
                <div className="flex items-center gap-2 text-sm text-[#10B981]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Connected to GA4 Property</span>
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
            onClick={() => setGaConnected(!gaConnected)}
            className={
              gaConnected
                ? "bg-[#f7f6f3] text-[#6b6b6b] hover:bg-[#e4e3de] border border-[#e4e3de]"
                : "bg-[#5B4FE8] text-white hover:bg-[#4a3fd4]"
            }
          >
            {gaConnected ? (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Manage
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#5B4FE8]/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#5B4FE8]" />
            </div>
            <span className="text-xs text-[#10B981] font-medium">+12.4%</span>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">127.4k</div>
          <div className="text-sm text-[#6b6b6b]">Total Page Views</div>
        </Card>

        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#10B981]" />
            </div>
            <span className="text-xs text-[#10B981] font-medium">+8.2%</span>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">89.2k</div>
          <div className="text-sm text-[#6b6b6b]">Unique Visitors</div>
        </Card>

        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#8F86F0]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#8F86F0]" />
            </div>
            <span className="text-xs text-[#10B981] font-medium">+5.1%</span>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">4:28</div>
          <div className="text-sm text-[#6b6b6b]">Avg. Time on Page</div>
        </Card>

        <Card className="bg-white border-[#e4e3de] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
            </div>
            <span className="text-xs text-[#10B981] font-medium">+18.7%</span>
          </div>
          <div className="font-heading text-3xl text-[#0a0a0a] mb-1">76%</div>
          <div className="text-sm text-[#6b6b6b]">Avg. Read Percent</div>
        </Card>
      </div>

      {/* Page Views Chart */}
      <Card className="bg-white border-[#e4e3de] p-6">
        <h3 className="font-heading text-xl text-[#0a0a0a] mb-6">
          Page Views & Visitors
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={pageViewsData}>
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
          {getMostReadData().map((post, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg border border-[#e4e3de] hover:border-[#5B4FE8] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#f7f6f3] flex items-center justify-center font-heading text-[#5B4FE8] font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[#0a0a0a] mb-1 truncate">
                  {post.title}
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
            {clickTrackingData.map((item, index) => (
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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={readPercentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, count }) =>
                  `${range}: ${count.toLocaleString()}`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {readPercentDistribution.map((entry, index) => (
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
              {searchAnalyticsData.map((item, index) => (
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
              {authorAnalyticsData.map((author, index) => (
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
