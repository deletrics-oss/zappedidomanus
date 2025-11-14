import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createDocument, updateDocument } from '@/lib/firebase-db';
import { useAuth } from '@/hooks/useAuth';

interface AddComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Array<{ id: string; number: number; status: string }>;
  onSuccess: () => void;
}

export function AddComandaDialog({ open, onOpenChange, tables, onSuccess }: AddComandaDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableId, setTableId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Generate order number
      const orderNumber = `CMD${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      const newOrderData = {
        orderNumber: orderNumber,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        deliveryType: 'dine_in',
        status: 'new',
        tableId: tableId || null,
        subtotal: 0,
        deliveryFee: 0,
        serviceFee: 0,
        discount: 0,
        total: 0,
        paymentMethod: 'pending',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };

      await createDocument('orders', newOrderData);

      // Update table status if table was selected
      if (tableId) {
        await updateDocument('tables', tableId, { status: 'occupied' });
      }

      toast.success('Comanda criada com sucesso!');
      setCustomerName('');
      setCustomerPhone('');
      setTableId('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      toast.error('Erro ao criar comanda');
    } finally {
      setLoading(false);
    }
  };

  const availableTables = tables.filter(t => t.status === 'free');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Comanda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Nome do Cliente (opcional)</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Digite o nome do cliente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Telefone (opcional)</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="table">Mesa (opcional)</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma mesa" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    Mesa {table.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar Comanda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
