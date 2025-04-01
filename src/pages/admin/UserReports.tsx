
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, FileBarChart, Calendar, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface UserData {
  id: string;
  username: string;
  role: string;
  videoCount: number;
  subscriberCount: number;
  created_at: string;
  is_suspended: boolean;
}

interface UserReportStats {
  activeUsers: number;
  normalUsers: number;
  totalUsers: number;
  usersWithMostVideos: UserData[];
  recentlyJoinedUsers: UserData[];
  usersByMonth: {
    month: string;
    totalUsers: number;
    activeUsers: number;
    normalUsers: number;
  }[];
}

const COLORS = ['#8884d8', '#82ca9d'];

const UserReports = () => {
  const [timeRange, setTimeRange] = useState<string>('last6months');
  const [userType, setUserType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: userReportStats, isLoading } = useQuery({
    queryKey: ['user-reports', timeRange, userType],
    queryFn: async () => {
      // Fetch active/content creator users (users who have uploaded videos)
      const { data: creatorIdsData, error: creatorQueryError } = await supabase
        .from('videos')
        .select('user_id')
        .eq('visibility', 'public');

      if (creatorQueryError) {
        console.error("Error fetching creator IDs:", creatorQueryError);
        throw new Error("Failed to fetch creator IDs");
      }
      
      const creatorIds = creatorIdsData.map(item => item.user_id);
      const uniqueCreatorIds = [...new Set(creatorIds)];

      // Get total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error("Error fetching users count:", usersError);
        throw new Error("Failed to fetch users statistics");
      }

      // Get all users with their data
      const { data: usersData, error: usersDataError } = await supabase
        .from('profiles')
        .select('*');

      if (usersDataError) {
        console.error("Error fetching users data:", usersDataError);
        throw new Error("Failed to fetch users data");
      }

      // Get video counts per user
      const userVideoCountMap = new Map<string, number>();
      
      for (const creatorId of uniqueCreatorIds) {
        const { count, error } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', creatorId);
          
        if (!error) {
          userVideoCountMap.set(creatorId, count || 0);
        }
      }
      
      // Create user data list
      const userData: UserData[] = usersData.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        videoCount: userVideoCountMap.get(user.id) || 0,
        subscriberCount: user.subscriber_count,
        created_at: user.created_at,
        is_suspended: user.is_suspended
      }));
      
      // Get users with most videos
      const usersWithMostVideos = [...userData]
        .filter(user => user.videoCount > 0)
        .sort((a, b) => b.videoCount - a.videoCount)
        .slice(0, 10);
        
      // Get recently joined users
      const recentlyJoinedUsers = [...userData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      // Calculate monthly registration data
      const currentDate = new Date();
      let monthsToLookBack = 6;
      
      if (timeRange === 'last12months') {
        monthsToLookBack = 12;
      } else if (timeRange === 'last3months') {
        monthsToLookBack = 3;
      }
      
      const usersByMonth = [];
      
      for (let i = monthsToLookBack - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        const month = format(date, 'MMM yyyy');
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const usersInMonth = userData.filter(user => {
          const userCreatedDate = new Date(user.created_at);
          return userCreatedDate >= monthStart && userCreatedDate <= monthEnd;
        });
        
        const activeUsersInMonth = usersInMonth.filter(user => user.videoCount > 0);
        
        usersByMonth.push({
          month,
          totalUsers: usersInMonth.length,
          activeUsers: activeUsersInMonth.length,
          normalUsers: usersInMonth.length - activeUsersInMonth.length
        });
      }
        
      return {
        totalUsers,
        activeUsers: uniqueCreatorIds.length,
        normalUsers: totalUsers - uniqueCreatorIds.length,
        usersWithMostVideos,
        recentlyJoinedUsers,
        usersByMonth
      } as UserReportStats;
    },
    refetchInterval: 300000, // 5 minutes
  });
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const filteredUsers = userReportStats?.usersWithMostVideos.filter(user => {
    if (searchQuery && !user.username.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (userType === 'active' && user.videoCount === 0) {
      return false;
    }
    
    if (userType === 'normal' && user.videoCount > 0) {
      return false;
    }
    
    return true;
  });

  const pieChartData = userReportStats ? [
    { name: 'Active Users', value: userReportStats.activeUsers },
    { name: 'Normal Users', value: userReportStats.normalUsers }
  ] : [];
  
  return (
    <AdminLayout title="User Reports & Insights">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-metanna-blue mr-2" />
                  <span className="text-2xl font-bold">{userReportStats?.totalUsers.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <FileBarChart className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-2xl font-bold">{userReportStats?.activeUsers.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Users who have uploaded at least one video
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Normal Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-amber-500 mr-2" />
                  <span className="text-2xl font-bold">{userReportStats?.normalUsers.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Users who haven't uploaded any videos
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-gray-600" />
              Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last3months">Last 3 Months</SelectItem>
                    <SelectItem value="last6months">Last 6 Months</SelectItem>
                    <SelectItem value="last12months">Last 12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 mb-1 block">User Type</label>
                <Select value={userType} onValueChange={setUserType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active">Active Users</SelectItem>
                    <SelectItem value="normal">Normal Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Search User</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search by username"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Type Distribution</CardTitle>
                <CardDescription>Breakdown of active vs. normal users</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Registration Trends</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={userReportStats?.usersByMonth}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalUsers" name="All Users" fill="#8884d8" />
                    <Bar dataKey="activeUsers" name="Active Users" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Tables */}
          <Tabs defaultValue="most-active">
            <TabsList className="mb-4">
              <TabsTrigger value="most-active">Most Active Users</TabsTrigger>
              <TabsTrigger value="recent">Recently Joined</TabsTrigger>
            </TabsList>
            
            <TabsContent value="most-active">
              <Card>
                <CardHeader>
                  <CardTitle>Users with Most Video Uploads</CardTitle>
                  <CardDescription>Top content creators by video count</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredUsers && filteredUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Videos</TableHead>
                          <TableHead>Subscribers</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell className="capitalize">{user.role}</TableCell>
                            <TableCell>{user.videoCount}</TableCell>
                            <TableCell>{user.subscriberCount}</TableCell>
                            <TableCell>{formatDate(user.created_at)}</TableCell>
                            <TableCell>
                              {user.is_suspended ? (
                                <Badge variant="destructive">Suspended</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No users match the current filters
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle>Recently Joined Users</CardTitle>
                  <CardDescription>Newest members of the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Videos</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userReportStats?.recentlyJoinedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell className="capitalize">{user.role}</TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>{user.videoCount}</TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AdminLayout>
  );
};

export default UserReports;
