
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

// Define type for JSON from Supabase
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Define specific types for our settings
interface UploadLimits {
  max_file_size_mb: number;
  allowed_formats: string[];
}

interface ModerationSettings {
  auto_flag_keywords: string[];
  require_approval: boolean;
}

interface PlatformSettings {
  upload_limits: UploadLimits;
  moderation_settings: ModerationSettings;
}

const PlatformSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>({
    upload_limits: {
      max_file_size_mb: 500,
      allowed_formats: ['mp4', 'mov', 'webm']
    },
    moderation_settings: {
      auto_flag_keywords: [],
      require_approval: false
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Parse the JSON data from setting_value
        const settingsData = data.setting_value as Json;
        
        if (typeof settingsData === 'object' && settingsData !== null) {
          const uploadLimits = (settingsData as any).upload_limits;
          const moderationSettings = (settingsData as any).moderation_settings;
          
          setSettings({
            upload_limits: typeof uploadLimits === 'object' && uploadLimits 
              ? uploadLimits as UploadLimits 
              : settings.upload_limits,
            moderation_settings: typeof moderationSettings === 'object' && moderationSettings 
              ? moderationSettings as ModerationSettings
              : settings.moderation_settings
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast("Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  };
  
  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: settings as unknown as Json
        })
        .eq('id', 1);
        
      if (error) throw error;
      
      toast("Platform settings have been updated successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast("Failed to save platform settings");
    } finally {
      setSaving(false);
    }
  };
  
  const handleUploadLimitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      upload_limits: {
        ...prevSettings.upload_limits,
        [name]: name === 'max_file_size_mb' ? parseInt(value, 10) : value
      }
    }));
  };
  
  const handleModerationSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prevSettings => {
      if (type === 'checkbox') {
        return {
          ...prevSettings,
          moderation_settings: {
            ...prevSettings.moderation_settings,
            [name]: checked
          }
        };
      } else {
        return {
          ...prevSettings,
          moderation_settings: {
            ...prevSettings.moderation_settings,
            [name]: value.split(',').map(keyword => keyword.trim())
          }
        };
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload Limits</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Limits</CardTitle>
              <CardDescription>Configure the limits for video uploads.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="max_file_size_mb">Max File Size (MB)</Label>
                <Input 
                  type="number" 
                  id="max_file_size_mb" 
                  name="max_file_size_mb"
                  value={settings.upload_limits.max_file_size_mb.toString()}
                  onChange={handleUploadLimitsChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="allowed_formats">Allowed Formats (comma-separated)</Label>
                <Input 
                  type="text" 
                  id="allowed_formats" 
                  name="allowed_formats"
                  value={settings.upload_limits.allowed_formats.join(', ')}
                  onChange={handleUploadLimitsChange}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Settings</CardTitle>
              <CardDescription>Configure moderation settings for the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="auto_flag_keywords">Auto-Flag Keywords (comma-separated)</Label>
                <Input 
                  type="text" 
                  id="auto_flag_keywords" 
                  name="auto_flag_keywords"
                  value={settings.moderation_settings.auto_flag_keywords.join(', ')}
                  onChange={handleModerationSettingsChange}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="require_approval">Require Approval for New Videos</Label>
                <Switch 
                  id="require_approval" 
                  name="require_approval"
                  checked={settings.moderation_settings.require_approval}
                  onCheckedChange={(checked) => {
                    setSettings(prevSettings => ({
                      ...prevSettings,
                      moderation_settings: {
                        ...prevSettings.moderation_settings,
                        require_approval: checked
                      }
                    }));
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformSettingsPage;
