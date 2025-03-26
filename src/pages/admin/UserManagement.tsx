
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, X, Ban, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';

const UserManagement = () => {
  // States for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // States for suspension modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  
  // Fetch users
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply status filter
      if (statusFilter === 'suspended') {
        query = query.eq('is_suspended', true);
      } else if (statusFilter === 'active') {
        query = query.eq('is_suspended', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
      
      return data || [];
    }
  });
  
  // Filtered users based on search query
  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle user suspension/restoration
  const handleToggleSuspension = async () => {
    if (!selectedUser) return;
    
    const isSuspending = !selectedUser.is_suspended;
    
    try {
      // Update user status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_suspended: isSuspending })
        .eq('id', selectedUser.id);
      
      if (updateError) throw updateError;
      
      // Log the moderation action
      const { error: logError } = await supabase
        .from('moderation_actions')
        .insert({
          admin_id: (await supabase.auth.getSession()).data.session?.user.id,
          action_type: isSuspending ? 'user_suspend' : 'user_restore',
          target_type: 'user',
          target_id: selectedUser.id,
          details: { 
            username: selectedUser.username,
            reason: isSuspending ? suspensionReason || "Policy violation" : "Account review completed"
          }
        });
      
      if (logError) throw logError;
      
      toast.success(
        isSuspending 
          ? `User ${selectedUser.username} has been suspended` 
          : `User ${selectedUser.username} has been restored`
      );
      
      refetch();
    } catch (error) {
      console.error("Error toggling user suspension:", error);
      toast.error("Failed to update user status");
    } finally {
      setIsSuspendDialogOpen(false);
      setSelectedUser(null);
      setSuspensionReason('');
    }
  };
  
  // Open suspend/restore dialog
  const openSuspendDialog = (user: any) => {
    setSelectedUser(user);
    setIsSuspendDialogOpen(true);
    setSuspensionReason('');
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };
  
  return (
    <AdminLayout title="User Management">
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name or bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="suspended">Suspended Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : filteredUsers?.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-600 mb-1">No users found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id} className={user.is_suspended ? "bg-red-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-metanna-blue text-white">
                          {user.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        {user.bio && (
                          <div className="text-xs text-gray-500 line-clamp-1">{user.bio}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="capitalize">{user.role || 'user'}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.subscriber_count.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {user.is_suspended ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant={user.is_suspended ? "outline" : "ghost"}
                        size="sm" 
                        onClick={() => openSuspendDialog(user)}
                        title={user.is_suspended ? "Restore user" : "Suspend user"}
                        className={user.is_suspended ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}
                        disabled={user.role === 'admin'} // Don't allow suspending admins
                      >
                        {user.is_suspended ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        title="View profile"
                      >
                        <Link to={`/profile/${user.username}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Suspend/Restore User Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.is_suspended ? "Restore User Account" : "Suspend User Account"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_suspended 
                ? "This will reactivate the user's account, allowing them to access the platform again."
                : "This will prevent the user from accessing their account and their content will be hidden."
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-metanna-blue text-white">
                    {selectedUser.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedUser.username}</h4>
                  {selectedUser.role && (
                    <p className="text-sm text-gray-500">Role: {selectedUser.role}</p>
                  )}
                </div>
              </div>
              
              {!selectedUser.is_suspended && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for suspension</label>
                  <Textarea 
                    value={suspensionReason} 
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="Provide a reason for suspension (optional)"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleToggleSuspension}
              variant={selectedUser?.is_suspended ? "default" : "destructive"}
            >
              {selectedUser?.is_suspended ? "Restore Account" : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UserManagement;
