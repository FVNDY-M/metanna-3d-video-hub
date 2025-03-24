
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Trash2, Plus } from 'lucide-react';

interface PlatformSettings {
  upload_limits: {
    max_file_size_mb: number;
    allowed_formats: string[];
  };
  moderation_settings: {
    auto_flag_keywords: string[];
    require_approval: boolean;
  };
}

const PlatformSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>({
    upload_limits: {
      max_file_size_mb: 500,
      allowed_formats: ['mp4', 'mov', 'webm'],
    },
    moderation_settings: {
      auto_flag_keywords: ['offensive', 'explicit'],
      require_approval: false,
    },
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newFormat, setNewFormat] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value');
      
      if (error) throw error;
      
      const settingsMap = (data || []).reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, any>);
      
      setSettings({
        upload_limits: settingsMap.upload_limits || settings.upload_limits,
        moderation_settings: settingsMap.moderation_settings || settings.moderation_settings,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load platform settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Update upload limits
      const { error: uploadError } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'upload_limits',
          setting_value: settings.upload_limits,
          updated_by: (await supabase.auth.getSession()).data.session?.user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (uploadError) throw uploadError;
      
      // Update moderation settings
      const { error: moderationError } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'moderation_settings',
          setting_value: settings.moderation_settings,
          updated_by: (await supabase.auth.getSession()).data.session?.user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (moderationError) throw moderationError;
      
      toast({
        title: "Settings Saved",
        description: "Platform settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save platform settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFormat = () => {
    if (!newFormat.trim()) return;
    
    const formats = [...settings.upload_limits.allowed_formats];
    if (!formats.includes(newFormat.toLowerCase().trim())) {
      formats.push(newFormat.toLowerCase().trim());
      setSettings({
        ...settings,
        upload_limits: {
          ...settings.upload_limits,
          allowed_formats: formats
        }
      });
    }
    
    setNewFormat('');
  };

  const handleRemoveFormat = (format: string) => {
    const formats = settings.upload_limits.allowed_formats.filter(f => f !== format);
    setSettings({
      ...settings,
      upload_limits: {
        ...settings.upload_limits,
        allowed_formats: formats
      }
    });
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    
    const keywords = [...settings.moderation_settings.auto_flag_keywords];
    if (!keywords.includes(newKeyword.toLowerCase().trim())) {
      keywords.push(newKeyword.toLowerCase().trim());
      setSettings({
        ...settings,
        moderation_settings: {
          ...settings.moderation_settings,
          auto_flag_keywords: keywords
        }
      });
    }
    
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    const keywords = settings.moderation_settings.auto_flag_keywords.filter(k => k !== keyword);
    setSettings({
      ...settings,
      moderation_settings: {
        ...settings.moderation_settings,
        auto_flag_keywords: keywords
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-10 h-10 border-4 border-t-metanna-blue border-b-metanna-blue border-r-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Settings</CardTitle>
            <CardDescription>
              Configure the upload limits and allowed file formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="maxFileSize" className="text-sm font-medium">
                Maximum File Size (MB)
              </label>
              <Input
                id="maxFileSize"
                type="number"
                value={settings.upload_limits.max_file_size_mb}
                onChange={(e) => setSettings({
                  ...settings,
                  upload_limits: {
                    ...settings.upload_limits,
                    max_file_size_mb: parseInt(e.target.value) || 0
                  }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Allowed File Formats
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.upload_limits.allowed_formats.map((format) => (
                  <div 
                    key={format} 
                    className="flex items-center bg-metanna-blue/10 text-metanna-blue rounded-lg px-3 py-1"
                  >
                    <span>{format}</span>
                    <button 
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveFormat(format)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex mt-2">
                <Input
                  placeholder="Add new format (e.g., mp4)"
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="rounded-r-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFormat()}
                />
                <Button 
                  onClick={handleAddFormat}
                  className="rounded-l-none"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Moderation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Moderation Settings</CardTitle>
            <CardDescription>
              Configure automatic content moderation rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 mb-6">
              <Checkbox 
                id="requireApproval" 
                checked={settings.moderation_settings.require_approval}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  moderation_settings: {
                    ...settings.moderation_settings,
                    require_approval: checked === true
                  }
                })}
              />
              <label 
                htmlFor="requireApproval" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Require admin approval for new uploads
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Auto-flag Keywords
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.moderation_settings.auto_flag_keywords.map((keyword) => (
                  <div 
                    key={keyword} 
                    className="flex items-center bg-red-100 text-red-800 rounded-lg px-3 py-1"
                  >
                    <span>{keyword}</span>
                    <button 
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex mt-2">
                <Input
                  placeholder="Add flagged keyword"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="rounded-r-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button 
                  onClick={handleAddKeyword}
                  className="rounded-l-none"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformSettings;
