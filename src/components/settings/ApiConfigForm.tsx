'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiProvider, PROVIDER_CONFIGS, ApiConfigResponse, ApiTestRequest } from '@/types/api-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface ApiConfigFormProps {
  initialConfig?: ApiConfigResponse | null;
  onSave: (config: { provider: ApiProvider; apiKey: string; baseUrl?: string; model: string }) => void;
  onDelete: () => void;
  isSaving?: boolean;
}

export function ApiConfigForm({ initialConfig, onSave, onDelete, isSaving }: ApiConfigFormProps) {
  const [provider, setProvider] = useState<ApiProvider>(initialConfig?.provider || ApiProvider.KIMI);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl || '');
  const [model, setModel] = useState(initialConfig?.model || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllama, setIsLoadingOllama] = useState(false);

  const config = PROVIDER_CONFIGS[provider];

  // 缓存Ollama模型结果
  const [ollamaCache, setOllamaCache] = useState<Record<string, string[]>>({});
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastUrl = useRef<string>('');
  
  // 加载Ollama模型列表 - 带防抖和缓存
  const loadOllamaModels = useCallback(async (url: string) => {
    if (provider !== ApiProvider.OLLAMA) return;
    
    const targetUrl = url || config.defaultBaseUrl;
    
    // 防止重复加载相同的URL
    if (targetUrl === lastUrl.current && ollamaCache[targetUrl]) {
      setOllamaModels(ollamaCache[targetUrl]);
      return;
    }
    
    // 使用缓存
    if (ollamaCache[targetUrl]) {
      setOllamaModels(ollamaCache[targetUrl]);
      return;
    }
    
    setIsLoadingOllama(true);
    try {
      const response = await fetch(`/api/user/api-config/ollama-models?baseUrl=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();
      const models = data.models || [];
      
      // 缓存结果
      setOllamaCache(prev => ({ ...prev, [targetUrl]: models }));
      setOllamaModels(models);
      lastUrl.current = targetUrl;
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
      setOllamaModels([]);
    } finally {
      setIsLoadingOllama(false);
    }
  }, [provider, config.defaultBaseUrl, ollamaCache]);

  // 防抖的Ollama模型加载
  const debouncedLoadOllamaModels = useCallback((url: string) => {
    if (provider !== ApiProvider.OLLAMA) return;
    
    // 清除之前的定时器
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // 设置新的定时器（500ms防抖）
    debounceTimer.current = setTimeout(() => {
      loadOllamaModels(url);
    }, 500);
  }, [provider, loadOllamaModels]);

  useEffect(() => {
    if (provider === ApiProvider.OLLAMA) {
      const targetUrl = baseUrl || config.defaultBaseUrl;
      debouncedLoadOllamaModels(targetUrl);
    }
    // 设置默认模型 (only when provider changes)
    if (provider !== initialConfig?.provider) {
      setModel(config.models[0]?.value || '');
    }

    return () => {
      // Cleanup timer on unmount
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [provider, baseUrl, initialConfig?.provider, config.defaultBaseUrl, config.models, debouncedLoadOllamaModels]);

  const handleTest = async () => {
    if (config.requiresApiKey && !apiKey.trim()) {
      setTestResult({ success: false, message: '请输入API密钥' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testConfig: ApiTestRequest = {
        provider,
        apiKey: apiKey || (initialConfig ? 'placeholder' : ''),
        baseUrl: baseUrl || undefined,
        model,
      };

      const response = await fetch('/api/user/api-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig),
      });

      const result = await response.json();
      setTestResult(result);
    } catch {
      setTestResult({ 
        success: false, 
        message: '测试失败：网络错误' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (config.requiresApiKey && !apiKey.trim()) {
      setTestResult({ success: false, message: '请输入API密钥' });
      return;
    }

    if (!model) {
      setTestResult({ success: false, message: '请选择模型' });
      return;
    }

    onSave({
      provider,
      apiKey,
      baseUrl: baseUrl || undefined,
      model,
    });
  };

  const handleDelete = () => {
    if (confirm('确定要删除API配置吗？删除后将使用系统默认API。')) {
      onDelete();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API配置</CardTitle>
        <CardDescription>
          配置您自己的大模型API，支持OpenAI、Kimi、DeepSeek和Ollama本地模型
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>API提供商</Label>
          <Select value={provider} onValueChange={(value) => setProvider(value as ApiProvider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label} - {config.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>基础URL</Label>
          <Input
            type="url"
            placeholder={config.defaultBaseUrl}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            默认: {config.defaultBaseUrl}
          </p>
        </div>

        {config.requiresApiKey && (
          <div className="space-y-2">
            <Label>API密钥</Label>
            <Input
              type="password"
              placeholder="输入您的API密钥"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              您的API密钥将被安全加密存储
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>模型选择</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {provider === ApiProvider.OLLAMA ? (
                isLoadingOllama ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    加载模型列表...
                  </div>
                ) : ollamaModels.length > 0 ? (
                  ollamaModels.map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    未找到Ollama模型，请确保Ollama已运行
                  </div>
                )
              ) : (
                config.models.map((modelOption) => (
                  <SelectItem key={modelOption.value} value={modelOption.value}>
                    {modelOption.label}
                    {modelOption.description && (
                      <span className="text-sm text-muted-foreground ml-2">
                        - {modelOption.description}
                      </span>
                    )}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            variant="outline"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                测试中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                测试API
              </>
            )}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSaving || isTesting}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </Button>

          {initialConfig && (
            <Button
              type="button"
              onClick={handleDelete}
              variant="destructive"
              disabled={isSaving}
            >
              删除配置
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>提示：</strong> 点击"测试API"按钮验证配置是否正确，
            只有验证成功的API才能正常使用。
          </p>
          <p>
            获取 {config.label} API密钥：
            <a
              href={
                provider === ApiProvider.OPENAI ? 'https://platform.openai.com/api-keys' :
                provider === ApiProvider.KIMI ? 'https://platform.moonshot.cn/console/api-keys' :
                provider === ApiProvider.DEEPSEEK ? 'https://platform.deepseek.com/api_keys' :
                'https://ollama.ai/download'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              前往官网 <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}