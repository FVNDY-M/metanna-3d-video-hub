import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Users, Heart, MessageSquare, Eye, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import AdminLayout from '@/components/AdminLayout';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

interface AdminProfile {
  id: string;
  username: string;
}

interface ModerationAction {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  admin_id: string;
  created_at: string;
  details: any;
  admin?: AdminProfile;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  normalUsers: number;
}

interface VideoStats {
  totalVideos: number;
  publicVideos: number;
  privateVideos: number;
  suspendedVideos: number;
}

interface TimeSeriesData {
  name: string;
  totalUsers: number;
  activeUsers?: number;
  normalUsers?: number;
}

interface DashboardStats {
  videoStats: VideoStats;
  userStats: UserStats;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalInteractions: number;
  recentActions: ModerationAction[];
  timeSeriesData: TimeSeriesData[];
}

const AdminDashboard = () => {
  const [selectedUserTab, setSelectedUserTab] = useState<string>('all');
  const navigate = useNavigate();

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id, visibility, is_suspended');

      if (videosError) {
        console.error("Error fetching videos data:", videosError);
        throw new Error("Failed to fetch videos statistics");
      }

      const totalVideos = videosData.length;
      const publicVideos = videosData.filter(video => video.visibility === 'public' && !video.is_suspended).length;
      const privateVideos = videosData.filter(video => video.visibility === 'private').length;
      const suspendedVideos = videosData.filter(video => video.is_suspended).length;

      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error("Error fetching users count:", usersError);
        throw new Error("Failed to fetch users statistics");
      }

      const { count: totalLikes, error: likesError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true });

      if (likesError) {
        console.error("Error fetching likes count:", likesError);
        throw new Error("Failed to fetch likes statistics");
      }

      const { count: totalComments, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true });

      if (commentsError) {
        console.error("Error fetching comments count:", commentsError);
        throw new Error("Failed to fetch comments statistics");
      }

      const { data: recentActions, error: actionsError } = await supabase
        .from('moderation_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (actionsError) {
        console.error("Error fetching moderation actions:", actionsError);
        throw new Error("Failed to fetch moderation actions");
      }

      const { data: creatorIdsData, error: creatorQueryError } = await supabase
        .from('videos')
        .select('user_id')
        .eq('visibility', 'public');

      if (creatorQueryError) {
        console.error("Error fetching creator IDs:", creatorQueryError);
        throw new Error("Failed to fetch creator IDs");
      }
      
      const creatorIds = creatorIdsData.map(item => item.user_id);

      const { data: contentCreators, error: creatorError } = await supabase
        .from('profiles')
        .select('id')
        .in('id', creatorIds);

      if (creatorError) {
        console.error("Error fetching content creators:", creatorError);
        throw new Error("Failed to fetch creator statistics");
      }

      const activeUsers = contentCreators?.length || 0;
      const normalUsers = totalUsers - activeUsers;
      
      const { data: videoViewsData, error: viewsError } = await supabase
        .from('videos')
        .select('views');
      
      if (viewsError) {
        console.error("Error fetching views:", viewsError);
        throw new Error("Failed to fetch views statistics");
      }

      const timeSeriesData: TimeSeriesData[] = [
        { name: 'Jan', totalUsers: totalUsers - 50, activeUsers: activeUsers - 10, normalUsers: normalUsers - 40 },
        { name: 'Feb', totalUsers: totalUsers - 40, activeUsers: activeUsers - 8, normalUsers: normalUsers - 32 },
        { name: 'Mar', totalUsers: totalUsers - 30, activeUsers: activeUsers - 6, normalUsers: normalUsers - 24 },
        { name: 'Apr', totalUsers: totalUsers - 20, activeUsers: activeUsers - 4, normalUsers: normalUsers - 16 },
        { name: 'May', totalUsers: totalUsers - 10, activeUsers: activeUsers - 2, normalUsers: normalUsers - 8 },
        { name: 'Jun', totalUsers: totalUsers, activeUsers: activeUsers, normalUsers: normalUsers }
      ];

      let actionsWithAdmins: ModerationAction[] = [];
      if (recentActions && recentActions.length > 0) {
        const adminIds = [...new Set(recentActions.map(action => action.admin_id))];
        
        const { data: adminProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', adminIds);
          
        if (profilesError) {
          console.error("Error fetching admin profiles:", profilesError);
          actionsWithAdmins = recentActions as ModerationAction[];
        } else {
          actionsWithAdmins = recentActions.map(action => {
            const adminProfile = adminProfiles?.find(profile => profile.id === action.admin_id);
            return {
              ...action,
              admin: adminProfile || { id: action.admin_id, username: 'Unknown' }
            };
          }) as ModerationAction[];
        }
      }

      const totalViews = videoViewsData.reduce((sum, video) => sum + (video.views || 0), 0);
      
      return {
        videoStats: {
          totalVideos,
          publicVideos,
          privateVideos,
          suspendedVideos
        },
        userStats: {
          totalUsers: totalUsers,
          activeUsers: activeUsers,
          normalUsers: normalUsers
        },
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalViews: totalViews,
        totalInteractions: totalLikes + totalComments + totalViews,
        recentActions: actionsWithAdmins,
        timeSeriesData: timeSeriesData
      } as DashboardStats;
    },
    refetchInterval: 60000,
  });

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getChartData = () => {
    if (!statsData?.timeSeriesData) return [];
    
    switch (selectedUserTab) {
      case 'active':
        return statsData.timeSeriesData.map(item => ({
          name: item.name,
          users: item.activeUsers || 0
        }));
      case 'normal':
        return statsData.timeSeriesData.map(item => ({
          name: item.name,
          users: item.normalUsers || 0
        }));
      case 'all':
      default:
        return statsData.timeSeriesData.map(item => ({
          name: item.name,
          active: item.activeUsers || 0,
          normal: item.normalUsers || 0,
          total: item.totalUsers
        }));
    }
  };

  return (
    <AdminLayout title="Dashboard">
      {isStatsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-metanna-blue"
              onClick={() => navigate('/admin/reports/videos')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <Film className="h-5 w-5 text-metanna-blue mr-2" />
                    <span className="text-2xl font-bold">{statsData?.videoStats.totalVideos.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500 mt-1 space-y-1">
                    <div className="flex justify-between">
                      <span>Public:</span>
                      <span className="font-medium text-green-600">{statsData?.videoStats.publicVideos.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Private:</span>
                      <span className="font-medium text-gray-600">{statsData?.videoStats.privateVideos.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Suspended:</span>
                      <span className="font-medium text-red-600">{statsData?.videoStats.suspendedVideos.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="flex items-center mb-1">
                    <Users className="h-5 w-5 text-metanna-purple mr-2" />
                    <span className="text-2xl font-bold">{statsData?.userStats.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>Active: {statsData?.userStats.activeUsers.toLocaleString()}</span>
                    <span>Normal: {statsData?.userStats.normalUsers.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-2xl font-bold">{statsData?.totalViews.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Heart className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-2xl font-bold">{statsData?.totalInteractions.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                User Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedUserTab} onValueChange={setSelectedUserTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Users</TabsTrigger>
                  <TabsTrigger value="active">Active Users</TabsTrigger>
                  <TabsTrigger value="normal">Normal Users</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active" name="Active Users" fill="#8884d8" />
                      <Bar dataKey="normal" name="Normal Users" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="active" className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" name="Active Users" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="normal" className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" name="Normal Users" stroke="#82ca9d" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Moderation Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {statsData?.recentActions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No recent moderation actions
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action Type</TableHead>
                      <TableHead>Target Type</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statsData?.recentActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">{formatActionType(action.action_type)}</TableCell>
                        <TableCell className="capitalize">{action.target_type}</TableCell>
                        <TableCell>{action.admin?.username || 'Unknown'}</TableCell>
                        <TableCell>{formatDate(action.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
