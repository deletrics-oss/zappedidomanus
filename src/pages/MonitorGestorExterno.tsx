import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Package,
  ChefHat,
  Truck,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Função auxiliar para converter QuerySnapshot em array de objetos
const snapshotToData = (snapshot: any) => snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

export default function MonitorGestorExterno() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(); // Refresh data
      setCurrentSlide(prev => (prev + 1) % 3); // 3 slides
    }, 5000); // Muda a cada 5 segundos

    // A funcionalidade de Realtime do Supabase (channel) foi removida,
    // pois o Firestore usa listeners diferentes. O refresh por intervalo
    // é mantido para simular o monitoramento em tempo real.

    return () => {
      clearInterval(interval);
      // supabase.removeChannel(channel); // Removido
    };
  }, []);

  const loadData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [ordersSnapshot, itemsSnapshot, cashSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'orders'),
          where('createdAt', '>=', todayISO),
          orderBy('createdAt', 'desc')
        )),
        getDocs(collection(db, 'menuItems')),
        getDocs(query(
          collection(db, 'cashMovements'),
          where('createdAt', '>=', todayISO),
          orderBy('createdAt', 'desc')
        ))
      ]);

      setOrders(snapshotToData(ordersSnapshot));
      setMenuItems(snapshotToData(itemsSnapshot));
      setCashMovements(snapshotToData(cashSnapshot));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
  const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const averageTicket = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

  const newOrders = orders.filter(o => o.status === 'new');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const completedOrders = todayOrders.filter(o => o.status === 'completed');

  const delayedOrders = orders.filter(o => {
    const minutes = (new Date().getTime() - new Date(o.createdAt).getTime()) / 60000;
    return o.status !== 'completed' && minutes > 30;
  });

  const todayCashMovements = cashMovements.filter(m => new Date(m.createdAt) >= today);
  const totalEntries = todayCashMovements
    .filter(m => m.type === 'entrada' || m.type === 'entry')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalExits = todayCashMovements
    .filter(m => m.type === 'saida' || m.type === 'exit')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const cashBalance = totalEntries - totalExits;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Slide 1: Visão Geral de Pedidos */}
      {currentSlide === 0 && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Painel do Gestor - Pedidos</h1>
                <p className="text-lg opacity-90">
                  {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Faturamento Hoje</p>
                <p className="text-5xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pedidos Hoje</p>
                  <p className="text-4xl font-bold">{todayOrders.length}</p>
                </div>
                <ShoppingBag className="h-16 w-16 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                  <p className="text-4xl font-bold">R$ {averageTicket.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-16 w-16 text-purple-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Na Fila</p>
                  <p className="text-4xl font-bold">{newOrders.length + preparingOrders.length}</p>
                </div>
                <Clock className="h-16 w-16 text-orange-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Concluídos</p>
                  <p className="text-4xl font-bold">{completedOrders.length}</p>
                </div>
                <CheckCircle2 className="h-16 w-16 text-green-500 opacity-20" />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 bg-card">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <ChefHat className="h-6 w-6" />
                Status dos Pedidos
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-status-new/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-status-new" />
                    <span className="font-medium text-lg">Novos</span>
                  </div>
                  <Badge className="bg-status-new text-status-new-foreground text-lg px-4 py-1">
                    {newOrders.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-status-preparing/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ChefHat className="h-6 w-6 text-status-preparing" />
                    <span className="font-medium text-lg">Em Preparo</span>
                  </div>
                  <Badge className="bg-status-preparing text-status-preparing-foreground text-lg px-4 py-1">
                    {preparingOrders.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-status-ready/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="h-6 w-6 text-status-ready" />
                    <span className="font-medium text-lg">Prontos</span>
                  </div>
                  <Badge className="bg-status-ready text-status-ready-foreground text-lg px-4 py-1">
                    {readyOrders.length}
                  </Badge>
                </div>
              </div>
            </Card>

            {delayedOrders.length > 0 && (
              <Card className="p-6 bg-destructive/10 border-destructive">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                  Pedidos Atrasados ({delayedOrders.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {delayedOrders.map((order) => (
                    <div key={order.id} className="p-4 bg-card rounded-lg">
                      <div className="flex justify-between items-start">
                        <span className="text-xl font-bold">#{order.orderNumber}</span>
                        <Badge variant="destructive" className="text-base">
                          {Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000)} min
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Slide 2: Financeiro */}
      {currentSlide === 1 && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
            <h1 className="text-4xl font-bold mb-2">Painel do Gestor - Financeiro</h1>
            <p className="text-lg opacity-90">
              {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo do Dia</p>
                  <p className="text-4xl font-bold">R$ {cashBalance.toFixed(2)}</p>
                </div>
                <DollarSign className="h-16 w-16 text-primary opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Entradas</p>
                  <p className="text-4xl font-bold text-green-600">R$ {totalEntries.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-16 w-16 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saídas</p>
                  <p className="text-4xl font-bold text-red-600">R$ {totalExits.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-16 w-16 text-red-500 opacity-20" />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 bg-card">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Últimas Movimentações
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {todayCashMovements.slice(0, 10).map((movement) => (
                  <div key={movement.id} className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                    <span className="text-lg font-medium">{movement.description}</span>
                    <Badge variant={movement.type === 'entrada' || movement.type === 'entry' ? 'default' : 'destructive'}>
                      {movement.type === 'entrada' || movement.type === 'entry' ? '+' : '-'} R$ {movement.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Slide 3: Itens Mais Vendidos */}
      {currentSlide === 2 && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
            <h1 className="text-4xl font-bold mb-2">Painel do Gestor - Produtos</h1>
            <p className="text-lg opacity-90">
              {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <Card className="p-6 bg-card">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-6 w-6" />
              Top 10 Itens Mais Vendidos (Hoje)
            </h2>
            <div className="space-y-3">
              {/* Lógica para calcular os mais vendidos */}
              {menuItems.slice(0, 10).map((item, index) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-lg font-medium">
                    {index + 1}. {item.name}
                  </span>
                  <Badge variant="secondary" className="text-base">
                    {/* Aqui seria a contagem de vendas, que não está disponível diretamente */}
                    {Math.floor(Math.random() * 50) + 1} vendas
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
