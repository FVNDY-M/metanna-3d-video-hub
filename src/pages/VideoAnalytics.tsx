
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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useToast } from '@/components/ui/use-toast';
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<VideoAnalyticsData[]>([]);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  
  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId) {
        toast({
          title: "Error",
          description: "No video ID provided",
          variant: "destructive"
        });
        navigate('/your-videos');
        return;
      }

      try {
        // Get session to check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Authentication required",
            description: "Please log in to view video analytics",
            variant: "destructive"
          });
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
          toast({
            title: "Error",
            description: "Unable to fetch video details or you don't have access to this video",
            variant: "destructive"
          });
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
          toast({
            title: "Error",
            description: "Unable to fetch analytics data",
            variant: "destructive"
          });
          return;
        }

        setAnalyticsData(analyticsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [videoId, navigate, toast]);

  // Filter data based on time range
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

  // Format data for charts
  const chartData = filteredData.map(item => ({
    period: format(parseISO(item.period_start), 'MMM dd'),
    views: item.views,
    likes: item.likes_count,
    comments: item.comments_count,
    timeSpent: Math.round(item.time_spent / 60) // Convert seconds to minutes
  })).reverse(); // Reverse to show chronological order

  // Calculate totals
  const totalViews = filteredData.reduce((sum, item) => sum + item.views, 0);
  const totalLikes = filteredData.reduce((sum, item) => sum + item.likes_count, 0);
  const totalComments = filteredData.reduce((sum, item) => sum + item.comments_count, 0);
  const totalTimeSpent = filteredData.reduce((sum, item) => sum + item.time_spent, 0);
  
  // Format time spent in hours and minutes
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
          <div className="flex gap-2">
            <Button 
              variant={timeRange === 'week' ? 'default' : 'outline'} 
              onClick={() => setTimeRange('week')}
            >
              Last 7 days
            </Button>
            <Button 
              variant={timeRange === 'month' ? 'default' : 'outline'} 
              onClick={() => setTimeRange('month')}
            >
              Last 30 days
            </Button>
            <Button 
              variant={timeRange === 'all' ? 'default' : 'outline'} 
              onClick={() => setTimeRange('all')}
            >
              All time
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total views in selected period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Watch Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTimeSpent(totalTimeSpent)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total time spent watching
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Likes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total likes in selected period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total comments in selected period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="data">Raw Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
                <CardDescription>
                  Tracking how your video is performing over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ChartContainer
                      config={{
                        views: { label: 'Views', color: '#3b82f6' },
                        timeSpent: { label: 'Watch Time (min)', color: '#10b981' }
                      }}
                    >
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="views" 
                          stroke="#3b82f6" 
                          strokeWidth={2} 
                          dot={{ r: 4 }} 
                          activeDot={{ r: 6 }} 
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="timeSpent" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                          dot={{ r: 4 }} 
                          activeDot={{ r: 6 }} 
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-60">
                    <p className="text-muted-foreground">No data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="engagement">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>
                  Comparing likes and comments over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ChartContainer
                      config={{
                        likes: { label: 'Likes', color: '#ec4899' },
                        comments: { label: 'Comments', color: '#8b5cf6' }
                      }}
                    >
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="likes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="comments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-60">
                    <p className="text-muted-foreground">No data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Raw Analytics Data</CardTitle>
                <CardDescription>
                  Weekly analytics breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                          <TableHead className="text-right">Watch Time</TableHead>
                          <TableHead className="text-right">Likes</TableHead>
                          <TableHead className="text-right">Comments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {format(parseISO(item.period_start), 'MMM dd, yyyy')} - {format(parseISO(item.period_end), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">{item.views.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatTimeSpent(item.time_spent)}</TableCell>
                            <TableCell className="text-right">{item.likes_count.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.comments_count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-8">
                    <p className="text-muted-foreground">No data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Video Overall Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Video Performance</CardTitle>
            <CardDescription>
              Lifetime metrics for this video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Total Views</span>
                <span className="text-2xl font-bold">{videoDetails.views.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Total Likes</span>
                <span className="text-2xl font-bold">{videoDetails.likes_count.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Total Comments</span>
                <span className="text-2xl font-bold">{videoDetails.comments_count.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default VideoAnalytics;
