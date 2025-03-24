
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowUp,
  ArrowDown,
  Users,
  Video,
  Eye,
  MessageSquare,
  ThumbsUp,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeLabel }) => {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-metanna-blue bg-metanna-blue/10 p-2 rounded-full">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {change > 0 ? (
              <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
            )}
            <span className={change > 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(change)}%
            </span>
            {changeLabel && <span className="ml-1 text-gray-500">{changeLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalViews: 0,
    avgEngagement: 0,
    totalLikes: 0,
    totalComments: 0,
    avgTimeSpent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch total users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        // Fetch total videos
        const { count: videoCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true });
        
        // Fetch total views
        const { data: viewsData } = await supabase
          .from('videos')
          .select('views')
          .order('created_at', { ascending: false });
          
        const totalViews = viewsData?.reduce((sum, video) => sum + video.views, 0) || 0;
        
        // Fetch total likes
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true });
        
        // Fetch total comments
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true });
        
        // Calculate average engagement (likes + comments per video)
        const avgEngagement = videoCount ? ((likesCount || 0) + (commentsCount || 0)) / videoCount : 0;
        
        // For avg time spent, we'll use a placeholder since we don't have real data
        const avgTimeSpent = 180; // 3 minutes per view as an example
        
        setStats({
          totalUsers: userCount || 0,
          totalVideos: videoCount || 0,
          totalViews,
          avgEngagement: parseFloat(avgEngagement.toFixed(2)),
          totalLikes: likesCount || 0,
          totalComments: commentsCount || 0,
          avgTimeSpent,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-10 h-10 border-4 border-t-metanna-blue border-b-metanna-blue border-r-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={<Users className="h-5 w-5" />} 
          change={5.2} 
          changeLabel="vs last month" 
        />
        <StatCard 
          title="Total Environments" 
          value={stats.totalVideos} 
          icon={<Video className="h-5 w-5" />} 
          change={12.5} 
          changeLabel="vs last month" 
        />
        <StatCard 
          title="Total Views" 
          value={stats.totalViews.toLocaleString()} 
          icon={<Eye className="h-5 w-5" />} 
          change={8.1} 
          changeLabel="vs last month" 
        />
        <StatCard 
          title="Avg. Time Spent" 
          value={formatTime(stats.avgTimeSpent)} 
          icon={<Clock className="h-5 w-5" />} 
          change={3.2} 
          changeLabel="vs last month" 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Likes" 
          value={stats.totalLikes.toLocaleString()} 
          icon={<ThumbsUp className="h-5 w-5" />} 
        />
        <StatCard 
          title="Comments" 
          value={stats.totalComments.toLocaleString()} 
          icon={<MessageSquare className="h-5 w-5" />} 
        />
        <StatCard 
          title="Avg. Engagement per Video" 
          value={stats.avgEngagement.toLocaleString()} 
          icon={<Users className="h-5 w-5" />} 
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-500">
          Welcome to the admin dashboard. From here you can manage users, content, and platform settings.
          Use the navigation menu to access different administration tools.
        </p>
        <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded border border-blue-200">
          <p className="font-medium">Admin Credentials</p>
          <p className="text-sm mt-1">Email: admin@metanna.com</p>
          <p className="text-sm">Password: Admin123!</p>
          <p className="text-xs mt-2">For security reasons, please change this password after your first login.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
