import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, Play, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDocuments, createDocument, updateDocument, deleteDocument } from '@/lib/firebase-db';
import { orderBy } from 'firebase/firestore';

interface AudioAlert {
  id: string;
  name: string;
  description: string | null;
  audioUrl: string | null; // Alterado para camelCase
  triggerEvent: string; // Alterado para camelCase
  isActive: boolean; // Alterado para camelCase
}

const eventOptions = [
  { value: 'new_order', label: 'Novo Pedido', defaultAudio: '/audios/novopedido.mp3' },
  { value: 'new_order_online', label: 'Novo Pedido Online', defaultAudio: '/audios/novopedidoonline.mp3' },
  { value: 'kitchen_delay', label: 'Atraso na Cozinha', defaultAudio: '/audios/atrasocozinha.mp3' },
  { value: 'table_delay', label: 'Atraso na Mesa', defaultAudio: '/audios/atrasomesa.mp3' },
  { value: 'low_stock', label: 'Estoque Baixo', defaultAudio: '/audios/estoquebaixo.mp3' },
  { value: 'order_cancelled', label: 'Pedido Cancelado', defaultAudio: '' },
  { value: 'payment_received', label: 'Pagamento Recebido', defaultAudio: '' },
];

export function AudioManager() {
  const [audioAlerts, setAudioAlerts] = useState<AudioAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerEvent: '', // Alterado para camelCase
    audioUrl: '', // Alterado para camelCase
    isActive: true, // Alterado para camelCase
  });

  useEffect(() => {
    fetchAudioAlerts();
  }, []);

  const fetchAudioAlerts = async () => {
    try {
      // Usando getDocuments com orderBy
      const data = await getDocuments('audioAlerts', [orderBy('createdAt', 'asc')]);
      
      // Conversão de snake_case para camelCase (se necessário, mas o Firestore usa o que definimos)
      const alerts = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || null,
        audioUrl: item.audioUrl || null,
        triggerEvent: item.triggerEvent,
        isActive: item.isActive,
      })) as AudioAlert[];

      setAudioAlerts(alerts);
    } catch (error) {
      console.error('Error fetching audio alerts:', error);
      toast.error('Erro ao carregar alertas sonoros');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventValue: string) => {
    const event = eventOptions.find(e => e.value === eventValue);
    setFormData({ 
      ...formData, 
      triggerEvent: eventValue,
      audioUrl: event?.defaultAudio || formData.audioUrl,
      name: event?.label || formData.name,
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.triggerEvent) {
      toast.error('Nome e tipo de evento são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        // Usando updateDocument
        await updateDocument('audioAlerts', editingId, {
          name: formData.name,
          description: formData.description,
          triggerEvent: formData.triggerEvent,
          audioUrl: formData.audioUrl,
          isActive: formData.isActive,
        });

        toast.success('Alerta sonoro atualizado!');
      } else {
        // Usando createDocument
        await createDocument('audioAlerts', {
          name: formData.name,
          description: formData.description,
          triggerEvent: formData.triggerEvent,
          audioUrl: formData.audioUrl,
          isActive: formData.isActive,
        });

        toast.success('Alerta sonoro criado!');
      }

      setFormData({
        name: '',
        description: '',
        triggerEvent: '',
        audioUrl: '',
        isActive: true,
      });
      setEditingId(null);
      fetchAudioAlerts();
    } catch (error) {
      console.error('Error saving audio alert:', error);
      toast.error('Erro ao salvar alerta sonoro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este alerta sonoro?')) return;

    try {
      // Usando deleteDocument
      await deleteDocument('audioAlerts', id);

      toast.success('Alerta sonoro excluído!');
      fetchAudioAlerts();
    } catch (error) {
      console.error('Error deleting audio alert:', error);
      toast.error('Erro ao excluir alerta sonoro');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      // Usando updateDocument
      await updateDocument('audioAlerts', id, { isActive: isActive });

      fetchAudioAlerts();
      toast.success(isActive ? 'Alerta ativado' : 'Alerta desativado');
    } catch (error) {
      console.error('Error toggling audio alert:', error);
      toast.error('Erro ao atualizar alerta');
    }
  };

  const playAudio = (url: string) => {
    if (!url) {
      toast.error('URL de áudio não configurada');
      return;
    }
    const audio = new Audio(url);
    audio.play().catch(() => toast.error('Erro ao reproduzir áudio'));
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Volume2 className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">
              {editingId ? 'Editar Alerta Sonoro' : 'Novo Alerta Sonoro'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure alertas personalizados para eventos do sistema
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="triggerEvent">Tipo de Evento *</Label>
            <Select
              value={formData.triggerEvent}
              onValueChange={handleEventChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {eventOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Alerta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Pedido Pronto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audioUrl">URL/Caminho do Áudio</Label>
            <div className="flex gap-2">
              <Input
                id="audioUrl"
                value={formData.audioUrl}
                onChange={(e) => setFormData({ ...formData, audioUrl: e.audioUrl })}
                placeholder="/audios/novopedido.mp3"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => playAudio(formData.audioUrl)}
                disabled={!formData.audioUrl}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use /audios/[nome].mp3 para arquivos locais ou URL externa
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Alerta ativo</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="gap-2">
              <Upload className="h-4 w-4" />
              {editingId ? 'Atualizar' : 'Adicionar'} Alerta
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: '',
                    description: '',
                    triggerEvent: '',
                    audioUrl: '',
                    isActive: true,
                  });
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alertas Cadastrados</h3>
        {audioAlerts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum alerta sonoro cadastrado
          </Card>
        ) : (
          audioAlerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{alert.name}</h4>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {eventOptions.find((e) => e.value === alert.triggerEvent)?.label}
                    </span>
                  </div>
                  {alert.description && (
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                  )}
                  {alert.audioUrl && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {alert.audioUrl}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alert.isActive}
                    onCheckedChange={(checked) => handleToggle(alert.id, checked)}
                  />
                  {alert.audioUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => playAudio(alert.audioUrl!)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(alert.id);
                      setFormData({
                        name: alert.name,
                        description: alert.description || '',
                        triggerEvent: alert.triggerEvent,
                        audioUrl: alert.audioUrl || '',
                        isActive: alert.isActive,
                      });
                    }}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
