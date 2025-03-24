
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Ban, Edit, Check, RefreshCw, Search, UserX, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  subscriber_count: number;
  created_at: string;
  is_suspended: boolean;
  role: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuspendUser = async (user: UserProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: !user.is_suspended })
        .eq('id', user.id);
      
      if (error) throw error;

      // Log moderation action
      await supabase.from('moderation_actions').insert({
        admin_id: (await supabase.auth.getSession()).data.session?.user.id,
        target_id: user.id,
        target_type: 'user',
        action_type: user.is_suspended ? 'restore' : 'suspend',
        details: {
          username: user.username,
          action: user.is_suspended ? 'unsuspended' : 'suspended'
        }
      });
      
      toast({
        title: user.is_suspended ? "User Restored" : "User Suspended",
        description: `${user.username} has been ${user.is_suspended ? 'restored' : 'suspended'}.`
      });
      
      // Update the local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u
      ));
    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole}`
      });
      
      // Update the local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      setUserDialogOpen(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const openUserDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={fetchUsers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <div className="w-10 h-10 border-4 border-t-metanna-blue border-b-metanna-blue border-r-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                        <AvatarFallback className="bg-metanna-blue text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.username}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </TableCell>
                    <TableCell>{user.subscriber_count}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      {user.is_suspended ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openUserDetails(user)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={user.is_suspended ? "outline" : "ghost"}
                        size="icon"
                        onClick={() => handleSuspendUser(user)}
                        className={`h-8 w-8 ${
                          user.is_suspended ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {user.is_suspended ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* User Details Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">User Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} alt={selectedUser.username} />
                  <AvatarFallback className="bg-metanna-blue text-white">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser.username}</h3>
                  <p className="text-sm text-gray-500">Joined {formatDate(selectedUser.created_at)}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">User Role</h4>
                  <div className="flex space-x-2">
                    <Button
                      variant={selectedUser.role === 'user' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateRole(selectedUser.id, 'user')}
                      className="flex-1"
                    >
                      <User className="h-4 w-4 mr-2" />
                      User
                    </Button>
                    <Button
                      variant={selectedUser.role === 'admin' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateRole(selectedUser.id, 'admin')}
                      className="flex-1"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">User Status</h4>
                  <Button
                    variant={selectedUser.is_suspended ? 'outline' : 'destructive'}
                    onClick={() => handleSuspendUser(selectedUser)}
                    className="w-full"
                  >
                    {selectedUser.is_suspended ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Restore User
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend User
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
