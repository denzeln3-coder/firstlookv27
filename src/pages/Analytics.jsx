import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Eye, ThumbsUp, Users, Calendar, Clock, MousePointerClick, MessageCircle, Bookmark, Share2, Target, BarChart3, PieChart as PieChartIcon, Activity, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Analytics() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: userPitches = [], isLoading } = useQuery({
    queryKey: ['userPitches', user?.id],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: user.id }, '-created_date'),
    enabled: !!user
  });

  const { data: allViews = [] } = useQuery({
    queryKey: ['pitchViews', user?.id],
    queryFn: async () => {
      const pitchIds = userPitches.map(p => p.id);
      if (pitchIds.length === 0) return [];
      const allViews = await base44.entities.PitchView.list();
      return allViews.filter(v => pitchIds.includes(v.pitch_id));
    },
    enabled: userPitches.length > 0
  });

  const { data: allClicks = [] } = useQuery({
    queryKey: ['linkClicks', user?.id],
    queryFn: async () => {
      const pitchIds = userPitches.map(p => p.id);
      if (pitchIds.length === 0) return [];
      const allClicks = await base44.entities.LinkClick.list();
      return allClicks.filter(c => pitchIds.includes(c.pitch_id));
    },
    enabled: userPitches.length > 0
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['comments', user?.id],
    queryFn: async () => {
      const pitchIds = userPitches.map(p => p.id);
      if (pitchIds.length === 0) return [];
      const allComments = await base44.entities.Comment.list();
      return allComments.filter(c => pitchIds.includes(c.pitch_id));
    },
    enabled: userPitches.length > 0
  });

  const { data: allBookmarks = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      const pitchIds = userPitches.map(p => p.id);
      if (pitchIds.length === 0) return [];
      const allBookmarks = await base44.entities.Bookmark.list();
      return allBookmarks.filter(b => pitchIds.includes(b.pitch_id));
    },
    enabled: userPitches.length > 0
  });

  const { data: allUpvotes = [] } = useQuery({
    queryKey: ['upvotes', user?.id],
    queryFn: async () => {
      const pitchIds = userPitches.map(p => p.id);
      if (pitchIds.length === 0) return [];
      const allUpvotes = await base44.entities.Upvote.list();
      return allUpvotes.filter(u => pitchIds.includes(u.pitch_id));
    },
    enabled: userPitches.length > 0
  });

  // Filter data by time range
  const getFilteredData = (data) => {
    if (timeRange === 'all') return data;
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return data.filter(item => new Date(item.created_date) >= cutoff);
  };

  const filteredViews = getFilteredData(allViews);
  const filteredClicks = getFilteredData(allClicks);
  const filteredComments = getFilteredData(allComments);
  const filteredBookmarks = getFilteredData(allBookmarks);
  const filteredUpvotes = getFilteredData(allUpvotes);

  // Core metrics
  const totalUpvotes = userPitches.reduce((sum, p) => sum + (p.upvote_count || 0), 0);
  const avgUpvotes = userPitches.length > 0 ? Math.round(totalUpvotes / userPitches.length) : 0;
  const publishedPitches = userPitches.filter(p => p.is_published).length;
  const totalViews = filteredViews.length;
  const uniqueViewers = new Set(filteredViews.filter(v => v.user_id).map(v => v.user_id)).size;
  const avgWatchTime = filteredViews.length > 0 
    ? Math.round(filteredViews.reduce((sum, v) => sum + (v.watch_time_seconds || 0), 0) / filteredViews.length) 
    : 0;
  const totalClicks = filteredClicks.length;
  const totalComments = filteredComments.length;
  const totalBookmarks = filteredBookmarks.length;
  
  // Advanced metrics
  const clickThroughRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;
  const engagementRate = totalViews > 0 ? (((filteredUpvotes.length + totalComments + totalBookmarks) / totalViews) * 100).toFixed(1) : 0;
  const completionRate = filteredViews.length > 0 ? ((filteredViews.filter(v => v.completed).length / filteredViews.length) * 100).toFixed(1) : 0;
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;
  const viewsGrowth = calculateGrowth(filteredViews);
  const engagementGrowth = calculateGrowth([...filteredUpvotes, ...filteredComments, ...filteredBookmarks]);

  // Helper function to calculate growth
  function calculateGrowth(data) {
    if (data.length === 0) return 0;
    const now = new Date();
    const halfPoint = new Date(now.getTime() - (timeRange === '7d' ? 3.5 : timeRange === '30d' ? 15 : 45) * 24 * 60 * 60 * 1000);
    const recentData = data.filter(item => new Date(item.created_date) >= halfPoint);
    const oldData = data.filter(item => new Date(item.created_date) < halfPoint);
    if (oldData.length === 0) return recentData.length > 0 ? 100 : 0;
    return Math.round(((recentData.length - oldData.length) / oldData.length) * 100);
  }

  // Chart data - performance over time
  const performanceChartData = React.useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
    const dateArray = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return date.toISOString().split('T')[0];
    });

    return dateArray.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: filteredViews.filter(v => v.created_date?.startsWith(date)).length,
      upvotes: filteredUpvotes.filter(u => u.created_date?.startsWith(date)).length,
      comments: filteredComments.filter(c => c.created_date?.startsWith(date)).length,
      clicks: filteredClicks.filter(c => c.created_date?.startsWith(date)).length
    }));
  }, [filteredViews, filteredUpvotes, filteredComments, filteredClicks, timeRange]);

  // Top performing pitches
  const topPitches = React.useMemo(() => {
    return userPitches.map(pitch => {
      const pitchViews = filteredViews.filter(v => v.pitch_id === pitch.id);
      const pitchUpvotes = filteredUpvotes.filter(u => u.pitch_id === pitch.id);
      const pitchComments = filteredComments.filter(c => c.pitch_id === pitch.id);
      const pitchClicks = filteredClicks.filter(c => c.pitch_id === pitch.id);
      const pitchBookmarks = filteredBookmarks.filter(b => b.pitch_id === pitch.id);
      
      return {
        ...pitch,
        views: pitchViews.length,
        upvotes: pitchUpvotes.length,
        comments: pitchComments.length,
        clicks: pitchClicks.length,
        bookmarks: pitchBookmarks.length,
        engagementScore: pitchUpvotes.length * 3 + pitchComments.length * 5 + pitchBookmarks.length * 4 + pitchClicks.length * 2
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 5);
  }, [userPitches, filteredViews, filteredUpvotes, filteredComments, filteredClicks, filteredBookmarks]);

  // Engagement breakdown for pie chart
  const engagementBreakdown = [
    { name: 'Upvotes', value: filteredUpvotes.length, color: '#6366F1' },
    { name: 'Comments', value: totalComments, color: '#22C55E' },
    { name: 'Bookmarks', value: totalBookmarks, color: '#F59E0B' },
    { name: 'Clicks', value: totalClicks, color: '#EC4899' }
  ];

  // Category performance
  const categoryPerformance = React.useMemo(() => {
    const categories = {};
    userPitches.forEach(pitch => {
      if (!pitch.category) return;
      if (!categories[pitch.category]) {
        categories[pitch.category] = { category: pitch.category, views: 0, upvotes: 0 };
      }
      categories[pitch.category].views += filteredViews.filter(v => v.pitch_id === pitch.id).length;
      categories[pitch.category].upvotes += filteredUpvotes.filter(u => u.pitch_id === pitch.id).length;
    });
    return Object.values(categories).sort((a, b) => b.views - a.views);
  }, [userPitches, filteredViews, filteredUpvotes]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Not Logged In</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Analytics'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#09090B] z-20 border-b border-[#27272A]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[#FAFAFA] text-[20px] font-bold">Analytics Dashboard</h1>
          <BarChart3 className="w-5 h-5 text-[#6366F1]" />
        </div>
        
        {/* Time Range Selector */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {[
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
            { value: 'all', label: 'All Time' }
          ].map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                timeRange === range.value
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#18181B] text-[#71717A] hover:bg-[#27272A]'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-32 px-4 pb-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#A1A1AA]">Loading analytics...</p>
          </div>
        ) : userPitches.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-[#3F3F46] mx-auto mb-4" />
            <h2 className="text-[#FAFAFA] text-[20px] font-bold mb-2">No Data Yet</h2>
            <p className="text-[#71717A] text-[14px] mb-6">Record your first pitch to start tracking analytics</p>
            <button
              onClick={() => navigate(createPageUrl('RecordPitch'))}
              className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition"
            >
              Record Your First Pitch
            </button>
          </div>
        ) : (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-5 h-5 text-[#6366F1]" />
                  {viewsGrowth !== 0 && (
                    <span className={`text-[10px] font-bold ${viewsGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {viewsGrowth > 0 ? '+' : ''}{viewsGrowth}%
                    </span>
                  )}
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{totalViews.toLocaleString()}</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Total Views</span>
              </div>

              <div className="bg-gradient-to-br from-[#22C55E]/10 to-[#10B981]/10 border border-[#22C55E]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-[#22C55E]" />
                  {engagementGrowth !== 0 && (
                    <span className={`text-[10px] font-bold ${engagementGrowth > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {engagementGrowth > 0 ? '+' : ''}{engagementGrowth}%
                    </span>
                  )}
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{engagementRate}%</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Engagement Rate</span>
              </div>

              <div className="bg-gradient-to-br from-[#F59E0B]/10 to-[#F97316]/10 border border-[#F59E0B]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{conversionRate}%</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Conversion Rate</span>
              </div>

              <div className="bg-gradient-to-br from-[#EC4899]/10 to-[#DB2777]/10 border border-[#EC4899]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-[#EC4899]" />
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{avgWatchTime}s</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Avg Watch Time</span>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{uniqueViewers.toLocaleString()}</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Unique Viewers</span>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <ThumbsUp className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{filteredUpvotes.length.toLocaleString()}</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Upvotes</span>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <MessageCircle className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{totalComments.toLocaleString()}</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Comments</span>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Bookmark className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="text-[#FAFAFA] text-[28px] font-bold leading-none mb-1">{totalBookmarks.toLocaleString()}</div>
                <span className="text-[#71717A] text-[11px] uppercase tracking-wide font-medium">Bookmarks</span>
              </div>
            </div>

            {/* Performance Over Time Chart */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 mb-6">
              <h2 className="text-[#FAFAFA] text-[18px] font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#6366F1]" />
                Performance Over Time
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceChartData}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="upvotesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="date" stroke="#71717A" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#71717A" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181B', 
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      color: '#FAFAFA'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="views" stroke="#6366F1" fillOpacity={1} fill="url(#viewsGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="upvotes" stroke="#22C55E" fillOpacity={1} fill="url(#upvotesGradient)" strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" stroke="#F59E0B" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement Breakdown & Completion Rate */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                <h2 className="text-[#FAFAFA] text-[18px] font-bold mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-[#6366F1]" />
                  Engagement Breakdown
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={engagementBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {engagementBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#18181B', 
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                        color: '#FAFAFA'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                <h2 className="text-[#FAFAFA] text-[18px] font-bold mb-4">Key Performance Indicators</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#A1A1AA] text-[13px]">Video Completion Rate</span>
                      <span className="text-[#FAFAFA] text-[16px] font-bold">{completionRate}%</span>
                    </div>
                    <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#A1A1AA] text-[13px]">Click-Through Rate</span>
                      <span className="text-[#FAFAFA] text-[16px] font-bold">{clickThroughRate}%</span>
                    </div>
                    <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] rounded-full transition-all"
                        style={{ width: `${clickThroughRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#A1A1AA] text-[13px]">Engagement Rate</span>
                      <span className="text-[#FAFAFA] text-[16px] font-bold">{engagementRate}%</span>
                    </div>
                    <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#22C55E] to-[#10B981] rounded-full transition-all"
                        style={{ width: `${Math.min(100, parseFloat(engagementRate))}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#27272A]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-[#FAFAFA] text-[20px] font-bold">{publishedPitches}</div>
                        <div className="text-[#71717A] text-[11px]">Published</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[#FAFAFA] text-[20px] font-bold">{avgUpvotes}</div>
                        <div className="text-[#71717A] text-[11px]">Avg Upvotes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Performance */}
            {categoryPerformance.length > 0 && (
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 mb-6">
                <h2 className="text-[#FAFAFA] text-[18px] font-bold mb-4">Performance by Category</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="category" stroke="#71717A" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#71717A" style={{ fontSize: '11px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#18181B', 
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                        color: '#FAFAFA'
                      }} 
                    />
                    <Bar dataKey="views" fill="#6366F1" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="upvotes" fill="#22C55E" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Performing Pitches */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 mb-6">
              <h2 className="text-[#FAFAFA] text-[18px] font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#F59E0B]" />
                Top Performing Pitches
              </h2>
              {topPitches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#71717A] text-[14px]">No data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topPitches.map((pitch, index) => (
                    <button
                      key={pitch.id}
                      onClick={() => {
                        localStorage.setItem('selectedPitchId', pitch.id);
                        navigate(createPageUrl('Demo'));
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-[#09090B] rounded-xl hover:bg-[#27272A] transition-all group"
                    >
                      <div className="text-[#71717A] text-[20px] font-bold w-8">#{index + 1}</div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex-shrink-0">
                        {pitch.thumbnail_url ? (
                          <img src={pitch.thumbnail_url} alt={pitch.startup_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-[16px] font-bold">
                            {pitch.startup_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-[#FAFAFA] text-[14px] font-semibold truncate group-hover:text-[#6366F1] transition">
                          {pitch.startup_name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[#71717A] text-[11px] flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {pitch.views}
                          </span>
                          <span className="text-[#71717A] text-[11px] flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {pitch.upvotes}
                          </span>
                          <span className="text-[#71717A] text-[11px] flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {pitch.comments}
                          </span>
                          <span className="text-[#71717A] text-[11px] flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3" /> {pitch.clicks}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#F59E0B] text-[18px] font-bold">{pitch.engagementScore}</div>
                        <div className="text-[#71717A] text-[9px] uppercase">Score</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* All Pitches Performance */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
              <h2 className="text-[#FAFAFA] text-[18px] font-bold mb-4">All Pitches</h2>
              <div className="space-y-2">
                {userPitches.map((pitch) => {
                  const pitchViews = filteredViews.filter(v => v.pitch_id === pitch.id).length;
                  const pitchUpvotes = filteredUpvotes.filter(u => u.pitch_id === pitch.id).length;
                  const pitchComments = filteredComments.filter(c => c.pitch_id === pitch.id).length;
                  const pitchClicks = filteredClicks.filter(c => c.pitch_id === pitch.id).length;
                  
                  return (
                    <button
                      key={pitch.id}
                      onClick={() => {
                        localStorage.setItem('selectedPitchId', pitch.id);
                        navigate(createPageUrl('Demo'));
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-[#09090B] rounded-lg hover:bg-[#27272A] transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex-shrink-0">
                        {pitch.thumbnail_url ? (
                          <img src={pitch.thumbnail_url} alt={pitch.startup_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-[14px] font-bold">
                            {pitch.startup_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-[#FAFAFA] text-[13px] font-semibold truncate group-hover:text-[#6366F1] transition">
                          {pitch.startup_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            pitch.is_published ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#71717A]/20 text-[#71717A]'
                          }`}>
                            {pitch.is_published ? 'Published' : 'Draft'}
                          </span>
                          {pitch.category && (
                            <span className="text-[#71717A] text-[10px]">{pitch.category}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <div className="text-center">
                          <div className="text-[#FAFAFA] font-bold">{pitchViews}</div>
                          <div className="text-[#71717A] text-[9px]">views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[#FAFAFA] font-bold">{pitchUpvotes}</div>
                          <div className="text-[#71717A] text-[9px]">upvotes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[#FAFAFA] font-bold">{pitchClicks}</div>
                          <div className="text-[#71717A] text-[9px]">clicks</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}