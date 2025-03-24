import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, TrendingUp, Clock, Heart, MessageSquare } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { toast } from '@/components/ui/use-toast';
import EmptyState from '@/components/EmptyState';

interface VideoAnalyticsData {
  id: string;
  video_id: string;
  period_start: string;
  period_end: string;
  views: number;
  time_spent: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface VideoDetails {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  views: number;
  likes_count: number;
  comments_count: number;
}

const VideoAnalytics = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<VideoAnalyticsData[]>([]);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  
  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId) {
        toast("No video ID provided");
        navigate('/your-videos');
        return;
      }

      try {
        // Get session to check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast("Please log in to view video analytics");
          navigate('/login');
          return;
        }

        // Fetch video details
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .eq('user_id', session.user.id)
          .single();

        if (videoError || !videoData) {
          toast("Unable to fetch video details or you don't have access to this video");
          navigate('/your-videos');
          return;
        }

        setVideoDetails({
          id: videoData.id,
          title: videoData.title,
          thumbnail_url: videoData.thumbnail_url,
          created_at: videoData.created_at,
          views: videoData.views,
          likes_count: videoData.likes_count,
          comments_count: videoData.comments_count
        });

        // Fetch analytics data
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('video_analytics')
          .select('*')
          .eq('video_id', videoId)
          .order('period_start', { ascending: false });

        if (analyticsError) {
          console.error('Error fetching analytics data:', analyticsError);
          toast("Unable to fetch analytics data");
          return;
        }

        setAnalyticsData(analyticsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [videoId, navigate]);

  const getFilteredData = () => {
    if (!analyticsData.length) return [];
    
    const now = new Date();
    
    if (timeRange === 'week') {
      const lastWeek = subDays(now, 7);
      return analyticsData.filter(item => new Date(item.period_end) >= lastWeek);
    } else if (timeRange === 'month') {
      const lastMonth = subDays(now, 30);
      return analyticsData.filter(item => new Date(item.period_end) >= lastMonth);
    }
    
    return analyticsData;
  };

  const filteredData = getFilteredData();

  const chartData = filteredData.map(item => ({
    period: format(parseISO(item.period_start), 'MMM dd'),
    views: item.views,
    likes: item.likes_count,
    comments: item.comments_count,
    timeSpent: Math.round(item.time_spent / 60)
  })).reverse();

  const totalViews = filteredData.reduce((sum, item) => sum + item.views, 0);
  const totalLikes = filteredData.reduce((sum, item) => sum + item.likes_count, 0);
  const totalComments = filteredData.reduce((sum, item) => sum + item.comments_count, 0);
  const totalTimeSpent = filteredData.reduce((sum, item) => sum + item.time_spent, 0);

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="outline" size="icon" onClick={() => navigate('/your-videos')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Loading Analytics...</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-100 rounded-lg animate-pulse mb-8"></div>
          <div className="h-80 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      </PageLayout>
    );
  }

  if (!videoDetails) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <EmptyState 
            title="Video not found" 
            description="The requested video could not be found or you don't have permission to view its analytics."
            icon={<BarChart3 className="h-12 w-12 text-gray-400" />}
          />
          <div className="flex justify-center mt-6">
            <Button onClick={() => navigate('/your-videos')}>
              Back to Your Videos
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/your-videos')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold truncate">{videoDetails.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={timeRange === 'week' ? 'default' : 'outline'} 
              onClick={() => setTimeRange('week')}
              size="sm"
            >
              Last 7 days
            </Button>
            <Button 
              variant={timeRange === 'month' ? 'default' : 'outline'} 
              onClick={() => setTimeRange('month')}
              size="sm"
            >
              Last 30 days
            </Button>
            <Button 
              variant={timeRange === 'all' ? 'default' : 'outline'} 
              onClick={() => setTimeRange('all')}
              size="sm"
            >
              All time
            </Button>
          </div>
        </div>

        <

