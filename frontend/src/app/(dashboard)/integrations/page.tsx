'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Copy, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface ApiKey { id: string; name: string; keyPrefix: string; lastUsedAt?: string; createdAt: string; isActive: boolean; }
interface Webhook { id: string; name: string; url: string; events: string[]; isActive: boolean; createdAt: string; }

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [newWebhookOpen, setNewWebhookOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/integrations/api-keys'),
      api.get('/integrations/webhooks'),
    ]).then(([kr, wr]) => {
      setApiKeys((kr.data as any)?.data ?? []);
      setWebhooks((wr.data as any)?.data ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const createApiKey = async () => {
    try {
      const r = await api.post('/integrations/api-keys', { name: newKeyName });
      const d = (r.data as any)?.data ?? r.data;
      setCreatedKey(d.rawKey ?? d.key ?? '');
      setApiKeys((prev) => [...prev, d]);
      setNewKeyName('');
      toast.success('API key created');
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const deleteApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete API key "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingKeyId(id);
    try {
      await api.delete(`/integrations/api-keys/${id}`);
      toast.success(`API key "${name}" deleted`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeletingKeyId(null);
    }
  };

  const createWebhook = async () => {
    try {
      const r = await api.post('/integrations/webhooks', { name: webhookName, url: webhookUrl, events: ['sale.completed'] });
      setWebhooks((prev) => [...prev, (r.data as any)?.data ?? r.data]);
      setNewWebhookOpen(false);
      setWebhookName('');
      setWebhookUrl('');
      toast.success('Webhook created');
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const deleteWebhook = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete webhook "${name}"? Real-time event notifications will stop.`)) {
      return;
    }
    setDeletingWebhookId(id);
    try {
      await api.delete(`/integrations/webhooks/${id}`);
      toast.success(`Webhook "${name}" deleted`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeletingWebhookId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description="Manage API keys and webhook endpoints" />

      <Tabs defaultValue="api-keys">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewKeyOpen(true)}><Plus className="h-4 w-4 mr-2" />New API Key</Button>
          </div>
          {createdKey && (
            <Card className="border-green-300 bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">API Key created — copy it now, it won't be shown again:</p>
                <div className="flex gap-2">
                  <Input value={createdKey} readOnly className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(createdKey); toast.success('Copied!'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}••••••••</p>
                </div>
                <div className="flex items-center gap-2">
                  {key.lastUsedAt && <span className="text-xs text-muted-foreground">Last used {formatDate(key.lastUsedAt)}</span>}
                  <Badge variant={key.isActive ? 'default' : 'secondary'}>{key.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingKeyId === key.id}
                    onClick={() => deleteApiKey(key.id, key.name)}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    title="Delete API Key"
                  >
                    {deletingKeyId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
            {!loading && apiKeys.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No API keys yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewWebhookOpen(true)}><Plus className="h-4 w-4 mr-2" />New Webhook</Button>
          </div>
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{wh.name}</p>
                  <p className="text-xs text-muted-foreground">{wh.url}</p>
                  <div className="flex gap-1 mt-1">{wh.events?.map((e) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={wh.isActive ? 'default' : 'secondary'}>{wh.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingWebhookId === wh.id}
                    onClick={() => deleteWebhook(wh.id, wh.name)}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    title="Delete Webhook"
                  >
                    {deletingWebhookId === wh.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
            {!loading && webhooks.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No webhooks yet.</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={newKeyOpen} onOpenChange={setNewKeyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Key Name</Label>
            <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production Key" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKeyOpen(false)}>Cancel</Button>
            <Button onClick={() => { createApiKey(); setNewKeyOpen(false); }} disabled={!newKeyName.trim()}>Create Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newWebhookOpen} onOpenChange={setNewWebhookOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Webhook</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="e.g. Order Webhook" /></div>
            <div className="space-y-2"><Label>URL</Label><Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewWebhookOpen(false)}>Cancel</Button>
            <Button onClick={createWebhook} disabled={!webhookName.trim() || !webhookUrl.trim()}>Create Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
