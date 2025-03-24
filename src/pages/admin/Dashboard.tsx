
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Users, Heart, MessageSquare, Eye, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import AdminLayout from '@/components/AdminLayout';

const AdminDashboard = () => {
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Fetch platform statistics in parallel
      const [
        { count: totalVideos, error: videosError },
        { count: totalUsers, error: usersError },
        { count: totalLikes, error: likesError },
        { count: totalComments, error: commentsError },
        { data: recentActions, error: actionsError }
      ] = await Promise.all([
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('likes').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase
          .from('moderation_actions')
          .select('*, admin:profiles!admin_id(username)')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (videosError || usersError || likesError || commentsError || actionsError) {
        console.error("Error fetching stats:", videosError || usersError || likesError || commentsError || actionsError);
        throw new Error("Failed to fetch dashboard statistics");
      }

      // Get views count by summing all video views
      const { data: videosData, error: viewsError } = await supabase
        .from('videos')
        .select('views');
      
      if (viewsError) {
        console.error("Error fetching views:", viewsError);
        throw new Error("Failed to fetch views statistics");
      }

      const totalViews = videosData.reduce((sum, video) => sum + (video.views || 0), 0);
      
      return {
        totalVideos: totalVideos,
        totalUsers: totalUsers,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalViews: totalViews,
        totalInteractions: totalLikes + totalComments + totalViews,
        recentActions: recentActions || []
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Format the action type for display
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format the date for display
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

  return (
    <AdminLayout title="Dashboard">
      {isStatsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Film className="h-5 w-5 text-metanna-blue mr-2" />
                  <span className="text-2xl font-bold">{statsData?.totalVideos.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-metanna-purple mr-2" />
                  <span className="text-2xl font-bold">{statsData?.totalUsers.toLocaleString()}</span>
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

          {/* Recent Moderation Actions */}
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
