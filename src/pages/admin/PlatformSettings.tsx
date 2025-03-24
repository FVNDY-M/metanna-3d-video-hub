
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Save } from 'lucide-react';

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
      allowed_formats: ['mp4', 'mov', 'webm']
    },
    moderation_settings: {
      auto_flag_keywords: ['offensive', 'explicit'],
      require_approval: false
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');
      
      if (error) throw error;
      
      const uploadLimits = data.find(setting => setting.setting_key === 'upload_limits');
      const moderationSettings = data.find(setting => setting.setting_key === 'moderation_settings');
      
      if (uploadLimits) {
        setSettings(prev => ({
          ...prev,
          upload_limits: uploadLimits.setting_value
        }));
      }
      
      if (moderationSettings) {
        setSettings(prev => ({
          ...prev,
          moderation_settings: moderationSettings.setting_value
        }));
      }
      
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast("Failed to load platform settings");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const saveSettings = async (settingKey: 'upload_limits' | 'moderation_settings') => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          setting_value: settings[settingKey],
          updated_by: (await supabase.auth.getSession()).data.session?.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);
        
      if (error) throw error;
      
      toast("Settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleMaxFileSizeChange = (value: string) => {
    const size = parseInt(value);
    if (!isNaN(size)) {
      setSettings(prev => ({
        ...prev,
        upload_limits: {
          ...prev.upload_limits,
          max_file_size_mb: size
        }
      }));
    }
  };
  
  const handleAllowedFormatsChange = (value: string) => {
    const formats = value.split(',').map(format => format.trim().toLowerCase());
    setSettings(prev => ({
      ...prev,
      upload_limits: {
        ...prev.upload_limits,
        allowed_formats: formats
      }
    }));
  };
  
  const handleAutoFlagKeywordsChange = (value: string) => {
    const keywords = value.split(',').map(keyword => keyword.trim().toLowerCase());
    setSettings(prev => ({
      ...prev,
      moderation_settings: {
        ...prev.moderation_settings,
        auto_flag_keywords: keywords
      }
    }));
  };
  
  const handleRequireApprovalChange = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      moderation_settings: {
        ...prev.moderation_settings,
        require_approval: checked
      }
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="w-10 h-10 border-4 border-t-metanna-blue border-b-metanna-blue border-r-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <Button onClick={fetchSettings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Tabs defaultValue="upload_limits" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upload_limits">Upload Limits</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload_limits">
          <Card>
            <CardHeader>
              <CardTitle>Upload Limits</CardTitle>
              <CardDescription>
                Configure file size limits and allowed formats for video uploads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="max_file_size">Maximum File Size (MB)</Label>
                <Input
                  id="max_file_size"
                  type="number"
                  value={settings.upload_limits.max_file_size_mb}
                  onChange={(e) => handleMaxFileSizeChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="allowed_formats">Allowed File Formats</Label>
                <Input
                  id="allowed_formats"
                  placeholder="mp4, mov, webm"
                  value={settings.upload_limits.allowed_formats.join(', ')}
                  onChange={(e) => handleAllowedFormatsChange(e.target.value)}
                />
                <p className="text-sm text-gray-500">Enter formats separated by commas.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="ml-auto" 
                onClick={() => saveSettings('upload_limits')}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Settings</CardTitle>
              <CardDescription>
                Configure automatic moderation rules and approval workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="flag_keywords">Auto-Flag Keywords</Label>
                <Input
                  id="flag_keywords"
                  placeholder="offensive, explicit"
                  value={settings.moderation_settings.auto_flag_keywords.join(', ')}
                  onChange={(e) => handleAutoFlagKeywordsChange(e.target.value)}
                />
                <p className="text-sm text-gray-500">Enter keywords separated by commas. Videos containing these words will be automatically flagged for review.</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require_approval"
                  checked={settings.moderation_settings.require_approval}
                  onCheckedChange={handleRequireApprovalChange}
                />
                <Label htmlFor="require_approval">
                  Require manual approval for all new uploads
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="ml-auto" 
                onClick={() => saveSettings('moderation_settings')}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformSettings;
