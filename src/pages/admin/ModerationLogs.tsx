
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Filter, X, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import AdminLayout from '@/components/AdminLayout';

// Import DateRange type from react-day-picker
import { DateRange } from 'react-day-picker';

const ModerationLogs = () => {
  // States for filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };
  
  // Format filter date for display
  const formatFilterDate = (date: Date | undefined) => {
    if (!date) return "";
    return format(date, 'MMM d, yyyy');
  };
  
  // Format the action type for display
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Fetch moderation logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['moderation-logs', actionTypeFilter, targetTypeFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('moderation_actions')
        .select(`
          *,
          admin:profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false });
      
      // Apply action type filter
      if (actionTypeFilter !== 'all') {
        query = query.ilike('action_type', `%${actionTypeFilter}%`);
      }
      
      // Apply target type filter
      if (targetTypeFilter !== 'all') {
        query = query.eq('target_type', targetTypeFilter);
      }
      
      // Apply date filter
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        // Add one day to include the end date
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching moderation logs:", error);
        throw new Error("Failed to fetch moderation logs");
      }
      
      return data || [];
    }
  });
  
  // Get the unique action types from the logs for filter
  const uniqueActionTypes = React.useMemo(() => {
    if (!logs) return [];
    const types = [...new Set(logs.map(log => log.action_type))];
    return types.sort();
  }, [logs]);
  
  // View details for a log entry
  const viewLogDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };
  
  // Render target link based on target type
  const renderTargetLink = (log: any) => {
    if (!log) return null;
    
    switch (log.target_type) {
      case 'video':
        return (
          <Link 
            to={`/video/${log.target_id}`}
            className="text-metanna-blue hover:underline inline-flex items-center gap-1"
          >
            <LinkIcon className="h-3 w-3" />
            <span>View Video</span>
          </Link>
        );
      case 'user':
        // We need to get the username for the user, we're using the details for now
        return log.details?.username ? (
          <Link 
            to={`/profile/${log.details.username}`}
            className="text-metanna-blue hover:underline inline-flex items-center gap-1"
          >
            <LinkIcon className="h-3 w-3" />
            <span>View Profile</span>
          </Link>
        ) : null;
      default:
        return null;
    }
  };
  
  return (
    <AdminLayout title="Moderation Logs">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActionTypes.map(type => (
              <SelectItem key={type} value={type}>
                {formatActionType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Filter by target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Targets</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[240px] justify-start text-left font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {formatFilterDate(dateRange.from)} - {formatFilterDate(dateRange.to)}
                  </>
                ) : (
                  formatFilterDate(dateRange.from)
                )
              ) : (
                "Select date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActionTypeFilter('all');
            setTargetTypeFilter('all');
            setDateRange({
              from: subDays(new Date(), 7),
              to: new Date(),
            });
          }}
          className="h-9"
        >
          <X className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </div>
      
      {/* Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : logs?.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-600 mb-1">No moderation logs found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your filter criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="hidden md:table-cell">Admin</TableHead>
                <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {formatActionType(log.action_type)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {log.target_type}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {log.admin?.username || "Unknown"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => viewLogDetails(log)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Log Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Moderation Action Details</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Action Type</div>
                  <div className="font-medium mt-1">{formatActionType(selectedLog.action_type)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Target Type</div>
                  <div className="font-medium mt-1 capitalize">{selectedLog.target_type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Performed By</div>
                  <div className="font-medium mt-1">{selectedLog.admin?.username || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Date & Time</div>
                  <div className="font-medium mt-1">{formatDate(selectedLog.created_at)}</div>
                </div>
              </div>
              
              {selectedLog.details && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Details</div>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    {selectedLog.action_type === 'video_edit' && (
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Previous Title:</span> {selectedLog.details.previous_title}
                        </div>
                        <div>
                          <span className="font-medium">New Title:</span> {selectedLog.details.new_title}
                        </div>
                        <div>
                          <span className="font-medium">Updated Fields:</span>{' '}
                          {selectedLog.details.updated_fields?.join(', ') || 'None'}
                        </div>
                      </div>
                    )}
                    
                    {(selectedLog.action_type === 'user_suspend' || selectedLog.action_type === 'video_suspend') && (
                      <div>
                        <span className="font-medium">Reason:</span> {selectedLog.details.reason}
                      </div>
                    )}
                    
                    {selectedLog.action_type === 'user_suspend' && (
                      <div>
                        <span className="font-medium">Username:</span> {selectedLog.details.username}
                      </div>
                    )}
                    
                    {selectedLog.action_type === 'video_suspend' && (
                      <div>
                        <span className="font-medium">Video Title:</span> {selectedLog.details.video_title}
                      </div>
                    )}
                    
                    {/* Display other detail types as needed */}
                  </div>
                </div>
              )}
              
              {renderTargetLink(selectedLog)}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ModerationLogs;
