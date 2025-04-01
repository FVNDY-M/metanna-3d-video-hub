
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  LineChart, Line, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Film, Calendar, AlertTriangle, Eye } from 'lucide-react';

// Interface for video data
interface VideoData {
  id: string;
  title: string;
  visibility: 'public' | 'private';
  is_suspended: boolean;
  suspension_end_date: string | null;
  created_at: string;
  user_id: string;
  category: string;
  views: number;
}

// Interface for time series data
interface TimeSeriesData {
  name: string;
  count: number;
  public?: number;
  private?: number;
  suspended?: number;
}

// Interface for a video creator
interface Creator {
  id: string;
  username: string;
}

const VideoReports = () => {
  const [timeRange, setTimeRange] = useState<string>('6');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [visibilityTab, setVisibilityTab] = useState<string>('all');

  // Fetch video data
  const { data: videoData, isLoading } = useQuery({
    queryKey: ['admin-video-reports', timeRange, categoryFilter],
    queryFn: async () => {
      // Get videos with detailed information
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error("Error fetching videos:", videosError);
        throw new Error("Failed to fetch video data");
      }

      // Fetch usernames for videos
      const userIds = [...new Set(videos.map(video => video.user_id))];
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      if (creatorsError) {
        console.error("Error fetching creators:", creatorsError);
      }

      // Map creators to videos
      const videosWithCreators = videos.map(video => {
        const creator = creators?.find(c => c.id === video.user_id);
        return {
          ...video,
          creator: creator || { id: video.user_id, username: 'Unknown' }
        };
      });

      // Generate monthly video counts for time series data
      const months = parseInt(timeRange);
      const timeSeriesData: TimeSeriesData[] = [];
      
      for (let i = months; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthName = format(date, 'MMM yyyy');
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const videosInMonth = videos.filter(video => {
          const videoDate = parseISO(video.created_at);
          return videoDate >= monthStart && videoDate <= monthEnd;
        });
        
        const publicVideos = videosInMonth.filter(v => v.visibility === 'public' && !v.is_suspended).length;
        const privateVideos = videosInMonth.filter(v => v.visibility === 'private').length;
        const suspendedVideos = videosInMonth.filter(v => v.is_suspended).length;
        
        timeSeriesData.push({
          name: monthName,
          count: videosInMonth.length,
          public: publicVideos,
          private: privateVideos,
          suspended: suspendedVideos
        });
      }

      // Calculate video statistics
      const totalVideos = videos.length;
      const publicVideos = videos.filter(video => video.visibility === 'public' && !video.is_suspended);
      const privateVideos = videos.filter(video => video.visibility === 'private');
      const suspendedVideos = videos.filter(video => video.is_suspended);
      
      const categoryCounts = {};
      videos.forEach(video => {
        if (!categoryCounts[video.category]) {
          categoryCounts[video.category] = 0;
        }
        categoryCounts[video.category]++;
      });
      
      const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value
      }));

      return {
        videos: videosWithCreators,
        timeSeriesData,
        stats: {
          total: totalVideos,
          public: publicVideos.length,
          private: privateVideos.length,
          suspended: suspendedVideos.length
        },
        categoryData,
        suspendedVideos: suspendedVideos.map(video => ({
          ...video,
          creator: creators?.find(c => c.id === video.user_id) || { id: video.user_id, username: 'Unknown' }
        }))
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Filter videos based on selected tab
  const getFilteredVideos = () => {
    if (!videoData?.videos) return [];
    
    let filtered = [...videoData.videos];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(video => video.category === categoryFilter);
    }
    
    // Apply visibility filter
    if (visibilityTab === 'public') {
      filtered = filtered.filter(video => video.visibility === 'public' && !video.is_suspended);
    } else if (visibilityTab === 'private') {
      filtered = filtered.filter(video => video.visibility === 'private');
    } else if (visibilityTab === 'suspended') {
      filtered = filtered.filter(video => video.is_suspended);
    }
    
    return filtered;
  };

  // Get unique categories for filter
  const getCategories = () => {
    if (!videoData?.videos) return [];
    const categories = [...new Set(videoData.videos.map(video => video.category))];
    return categories.sort();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  };

  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <AdminLayout title="Video Reports & Insights">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Film className="h-5 w-5 text-metanna-blue mr-2" />
                  <span className="text-2xl font-bold">{videoData?.stats.total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Public Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-2xl font-bold">{videoData?.stats.public.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Private Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Film className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-2xl font-bold">{videoData?.stats.private.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Suspended Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-2xl font-bold">{videoData?.stats.suspended.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/3 lg:w-1/4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 Months</SelectItem>
                  <SelectItem value="6">Last 6 Months</SelectItem>
                  <SelectItem value="12">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-1/3 lg:w-1/4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getCategories().map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Series Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Videos Created Over Time
              </CardTitle>
              <CardDescription>
                Number of videos created per month over the past {timeRange} months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={videoData?.timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="public" name="Public Videos" stackId="a" fill="#4ade80" />
                    <Bar dataKey="private" name="Private Videos" stackId="a" fill="#94a3b8" />
                    <Bar dataKey="suspended" name="Suspended Videos" stackId="a" fill="#f87171" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Video Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={videoData?.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {videoData?.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Suspended Videos */}
            <Card>
              <CardHeader>
                <CardTitle>Suspended Videos</CardTitle>
                <CardDescription>
                  Videos currently suspended and their reactivation dates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {videoData?.suspendedVideos.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No suspended videos
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Reactivation Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {videoData?.suspendedVideos.map((video) => (
                          <TableRow key={video.id}>
                            <TableCell className="font-medium truncate max-w-[200px]">
                              {video.title}
                            </TableCell>
                            <TableCell>{video.creator.username}</TableCell>
                            <TableCell>
                              {video.suspension_end_date ? (
                                formatDate(video.suspension_end_date)
                              ) : (
                                <span className="text-red-500">Indefinite</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Video Listing */}
          <Card>
            <CardHeader>
              <CardTitle>Video List</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={visibilityTab} onValueChange={setVisibilityTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Videos</TabsTrigger>
                  <TabsTrigger value="public">Public</TabsTrigger>
                  <TabsTrigger value="private">Private</TabsTrigger>
                  <TabsTrigger value="suspended">Suspended</TabsTrigger>
                </TabsList>
                
                <TabsContent value={visibilityTab}>
                  {getFilteredVideos().length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      No videos found
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Views</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredVideos().map((video) => (
                            <TableRow key={video.id}>
                              <TableCell className="font-medium truncate max-w-[200px]">
                                {video.title}
                              </TableCell>
                              <TableCell>{video.creator.username}</TableCell>
                              <TableCell>{video.category}</TableCell>
                              <TableCell>
                                {video.is_suspended ? (
                                  <Badge variant="destructive">Suspended</Badge>
                                ) : video.visibility === 'public' ? (
                                  <Badge variant="default" className="bg-green-500">Public</Badge>
                                ) : (
                                  <Badge variant="outline">Private</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(video.created_at)}</TableCell>
                              <TableCell>{video.views.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};

export default VideoReports;
