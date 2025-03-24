
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  UserX, 
  ShieldAlert,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ModerationAction {
  id: string;
  admin_id: string;
  target_id: string;
  target_type: 'user' | 'video';
  action_type: 'suspend' | 'delete' | 'restore' | 'edit';
  details: any;
  created_at: string;
  admin?: {
    username: string;
    avatar_url: string | null;
  };
}

const ModerationLogs: React.FC = () => {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<{[key: string]: {username: string, avatar_url: string | null}}>({}); 

  const fetchModerationActions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('moderation_actions')
        .select()
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // We need to fetch the admin usernames
      const adminIds = [...new Set((data || []).map(action => action.admin_id))];
      
      if (adminIds.length > 0) {
        const { data: adminData, error: adminError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', adminIds);
          
        if (adminError) throw adminError;
        
        const adminMap = (adminData || []).reduce((acc, admin) => {
          acc[admin.id] = {
            username: admin.username,
            avatar_url: admin.avatar_url
          };
          return acc;
        }, {} as {[key: string]: {username: string, avatar_url: string | null}});
        
        setAdmins(adminMap);
      }
      
      // Type casting here to convert string to specific literal types
      setActions((data || []).map(item => ({
        ...item,
        target_type: item.target_type === 'user' ? 'user' : 'video',
        action_type: item.action_type as 'suspend' | 'delete' | 'restore' | 'edit'
      })));
    } catch (error) {
      console.error('Error fetching moderation actions:', error);
      toast("Failed to load moderation logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationActions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'suspend':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'restore':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'edit':
        return <Edit3 className="h-5 w-5 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-500" />;
      default:
        return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getActionLabel = (action: ModerationAction) => {
    const targetType = action.target_type === 'user' ? 'User' : 'Environment';
    
    switch (action.action_type) {
      case 'suspend':
        return `${targetType} Suspended`;
      case 'restore':
        return `${targetType} Restored`;
      case 'edit':
        return `${targetType} Edited`;
      case 'delete':
        return `${targetType} Deleted`;
      default:
        return 'Unknown Action';
    }
  };

  const getActionDescription = (action: ModerationAction) => {
    if (action.target_type === 'user') {
      if (action.action_type === 'suspend') {
        return `Suspended user "${action.details?.username || 'Unknown'}"`;
      } else if (action.action_type === 'restore') {
        return `Restored user "${action.details?.username || 'Unknown'}"`;
      }
    } else if (action.target_type === 'video') {
      if (action.action_type === 'suspend') {
        return `Suspended environment "${action.details?.title || 'Unknown'}"`;
      } else if (action.action_type === 'restore') {
        return `Restored environment "${action.details?.title || 'Unknown'}"`;
      } else if (action.action_type === 'edit') {
        return `Edited environment "${action.details?.original_title || 'Unknown'}" to "${action.details?.new_title || 'Unknown'}"`;
      } else if (action.action_type === 'delete') {
        return `Deleted environment "${action.details?.title || 'Unknown'}"`;
      }
    }
    
    return 'Performed moderation action';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Moderation Logs</h1>
        <Button onClick={fetchModerationActions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <div className="w-10 h-10 border-4 border-t-metanna-blue border-b-metanna-blue border-r-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Target Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.length > 0 ? (
                actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getActionIcon(action.action_type)}
                        <span className="font-medium">{getActionLabel(action)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={admins[action.admin_id]?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-purple-600 text-white">
                            {(admins[action.admin_id]?.username || 'A').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{admins[action.admin_id]?.username || 'Unknown admin'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {getActionDescription(action)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {action.target_type === 'user' ? (
                          <>
                            <UserX className="h-4 w-4 mr-1 text-indigo-500" />
                            <span>User</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-1 text-emerald-500" />
                            <span>Environment</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(action.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No moderation actions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default ModerationLogs;
