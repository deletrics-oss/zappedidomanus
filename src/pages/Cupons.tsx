import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Copy, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { getDocuments, createDocument, deleteDocument, updateDocument } from "@/lib/firebase-db";
import { orderBy } from "firebase/firestore";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  discountValue: number;
  minOrderValue: number;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

export default function Cupons() {
  const [cupons, setCupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed" | "free_shipping">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [minOrderValue, setMinOrderValue] = useState(0);
  const [maxUses, setMaxUses] = useState(100);

  useEffect(() => {
    loadCupons();
  }, []);

  const loadCupons = async () => {
    try {
      const data = await getDocuments('coupons', [orderBy('createdAt', 'desc')]);
      
      // Mapeamento para o formato da interface
      const mappedCupons = data.map(doc => ({
        id: doc.id,
        code: doc.code,
        type: doc.type,
        discountValue: doc.discountValue || 0,
        minOrderValue: doc.minOrderValue || 0,
        maxUses: doc.maxUses || 0,
        currentUses: doc.currentUses || 0,
        isActive: doc.isActive || false,
      })) as Coupon[];

      setCupons(mappedCupons);
    } catch (error) {
      console.error("Erro ao carregar cupons:", error);
      toast.error("Erro ao carregar cupons.");
    }
  };

  const handleCreateCoupon = async () => {
    if (!code) {
      toast.error('Insira um código para o cupom');
      return;
    }

    try {
      await createDocument('coupons', {
        code: code.toUpperCase(),
        type,
        discountValue,
        minOrderValue,
        maxUses,
        currentUses: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      toast.success('Cupom criado com sucesso!');
      setCode('');
      setDiscountValue(0);
      setMinOrderValue(0);
      setMaxUses(100);
      loadCupons();
    } catch (error: any) {
      console.error('Erro ao criar cupom:', error);
      toast.error('Erro ao criar cupom: ' + (error.message || 'Verifique o console.'));
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este cupom?')) return;

    try {
      await deleteDocument('coupons', id);
      
      toast.success('Cupom deletado');
      loadCupons();
    } catch (error) {
      console.error('Erro ao deletar cupom:', error);
      toast.error('Erro ao deletar cupom');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDocument('coupons', id, { isActive: !currentStatus });

      toast.success('Status atualizado');
      loadCupons();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Cupons de Desconto</h1>
        </div>
        <p className="text-muted-foreground">Crie e gerencie cupons promocionais</p>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Criar Novo Cupom</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código do Cupom *</Label>
            <Input 
              id="code" 
              placeholder="Ex: PRIMEIRACOMPRA" 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">Use letras maiúsculas e números</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Desconto</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  <SelectItem value="free_shipping">Frete Grátis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor do Desconto</Label>
              <Input 
                id="value" 
                type="number" 
                placeholder="10"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-order">Valor Mínimo do Pedido (R$)</Label>
              <Input 
                id="min-order" 
                type="number" 
                placeholder="0"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-uses">Limite de Usos</Label>
              <Input 
                id="max-uses" 
                type="number" 
                placeholder="100"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreateCoupon} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Criar Cupom
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {cupons.map((cupom) => (
          <Card key={cupom.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-primary">{cupom.code}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyCoupon(cupom.code)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    className={cupom.isActive ? 'bg-green-500' : 'bg-gray-500'}
                    onClick={() => handleToggleActive(cupom.id, cupom.isActive)}
                    style={{ cursor: 'pointer' }}
                  >
                    {cupom.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive"
                onClick={() => handleDeleteCoupon(cupom.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto:</span>
                <span className="font-medium">
                  {cupom.type === 'percentage' ? `${cupom.discountValue}%` : 
                   cupom.type === 'fixed' ? `R$ ${cupom.discountValue}` : 'Frete Grátis'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pedido mínimo:</span>
                <span className="font-medium">R$ {Number(cupom.minOrderValue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usos:</span>
                <span className="font-medium">{cupom.currentUses} / {cupom.maxUses}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6 bg-orange-50 dark:bg-orange-950 border-orange-200">
        <div className="flex items-start gap-3">
          <Ticket className="h-6 w-6 text-orange-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Dicas para Cupons Efetivos</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Use códigos curtos e fáceis de lembrar (ex: NATAL10, PRIMEIR...)</li>
              <li>• Estabeleça um valor mínimo para incentivar pedidos maiores</li>
              <li>• Limite o número de usos para criar senso de urgência</li>
              <li>• Divulgue seus cupons nas redes sociais e WhatsApp</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
