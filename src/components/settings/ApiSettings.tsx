'use client';

import { useState, useEffect } from 'react';
import { ApiConfigResponse, PROVIDER_CONFIGS } from '@/types/api-config';
import { ApiConfigForm } from './ApiConfigForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ApiSettings() {
  const [config, setConfig] = useState<ApiConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/api-config');
      const data = await response.json();
      
      if (response.ok) {
        setConfig(data);
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error('Failed to load API config:', error);
      setError('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (newConfig: any) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/user/api-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      const result = await response.json();

      if (response.ok) {
        setConfig(result);
      } else {
        setError(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save API config:', error);
      setError('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/user/api-config', {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfig(null);
      } else {
        setError('删除失败');
      }
    } catch (error) {
      console.error('Failed to delete API config:', error);
      setError('删除配置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API配置</CardTitle>
            <CardDescription>
              加载中...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API配置管理</CardTitle>
          <CardDescription>
            管理您的大模型API配置，支持多种主流AI提供商
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{PROVIDER_CONFIGS[config.provider].label}</span>
                    {config.isValidated ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已验证
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        未验证
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    模型: {config.model}
                  </p>
                  {config.baseUrl && (
                    <p className="text-sm text-muted-foreground">
                      地址: {config.baseUrl}
                    </p>
                  )}
                </div>
              </div>

              <Alert>
                <AlertDescription className="flex items-center justify-between">
                  <span>当前正在使用您配置的{PROVIDER_CONFIGS[config.provider].label} API</span>
                  <Button variant="ghost" size="sm" onClick={handleDelete}>
                    删除配置
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>当前使用系统默认的Kimi API</span>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://platform.moonshot.cn/console/api-keys" target="_blank" rel="noopener noreferrer">
                    获取API密钥 <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <ApiConfigForm
        initialConfig={config}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={saving}
      />
    </div>
  );
}