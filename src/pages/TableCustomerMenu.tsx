import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { getDocument, getDocuments, createDocument, updateDocument } from "@/lib/firebase-db";
import { where, query, orderBy } from "firebase/firestore";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function TableCustomerMenu() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const [table, setTable] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [itemNotes, setItemNotes] = useState("");

  useEffect(() => {
    if (tableId) {
      loadData();
    }
  }, [tableId]);

  const loadData = async () => {
    if (!tableId) return;
    try {
      // Load table info
      const tableData = await getDocument('tables', tableId);
      setTable(tableData);

      // Load active order for this table
      const activeOrders = await getDocuments('orders', [
        where('tableId', '==', tableId),
        where('status', 'in', ['new', 'confirmed', 'preparing']),
        orderBy('createdAt', 'desc')
      ]);
      
      const activeOrder = activeOrders.length > 0 ? activeOrders[0] : null;
      
      if (activeOrder) {
        // Load order items for the active order
        const orderItems = await getDocuments('orderItems', [
          where('orderId', '==', activeOrder.id)
        ]);
        setOrder({ ...activeOrder, orderItems });
      } else {
        setOrder(null);
      }

      // Load menu items
      const items = await getDocuments('menuItems', [
        where('isAvailable', '==', true),
        orderBy('sortOrder')
      ]);
      setMenuItems(items || []);

      // Load categories
      const cats = await getDocuments('categories', [
        where('isActive', '==', true),
        orderBy('sortOrder')
      ]);
      setCategories(cats || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.promotionalPrice || item.price,
        quantity: 1
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const handleFinishOrder = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderNumber = `M${table?.number}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      if (order) {
        // Update existing order
        const newItems = cart.map(item => ({
          orderId: order.id,
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          notes: itemNotes || null,
          createdAt: now,
        }));

        // Firestore não tem insert many nativo, mas o createDocument aceita
        // Vou usar um loop simples para garantir a inserção
        const itemPromises = newItems.map(item => createDocument('orderItems', item));
        await Promise.all(itemPromises);

        // Recalcular total
        const allItems = await getDocuments('orderItems', [where('orderId', '==', order.id)]);
        const newTotal = allItems.reduce((sum: number, i: any) => sum + i.totalPrice, 0);

        await updateDocument('orders', order.id, {
          total: newTotal,
          subtotal: newTotal,
          updatedAt: now
        });

      } else {
        // Create new order
        const newOrderData = {
          orderNumber,
          tableId,
          deliveryType: 'dine_in',
          status: 'new',
          total: total,
          subtotal: total,
          createdAt: now,
          updatedAt: now,
        };

        const newOrderRef = await createDocument('orders', newOrderData);
        const newOrderId = newOrderRef.id;

        const orderItems = cart.map(item => ({
          orderId: newOrderId,
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          notes: itemNotes || null,
          createdAt: now,
        }));

        const itemPromises = orderItems.map(item => createDocument('orderItems', item));
        await Promise.all(itemPromises);

        await updateDocument('tables', tableId, { status: 'occupied' });
      }

      toast.success('Pedido enviado com sucesso!');
      setCart([]);
      setItemNotes('');
      loadData();
    } catch (error) {
      console.error('❌ Erro geral ao finalizar pedido:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tableId || !table) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Mesa não encontrada</h2>
          <p className="text-muted-foreground">Escaneie o QR Code da mesa para fazer seu pedido</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-6 py-4">
        <h1 className="text-2xl font-bold">Mesa {table.number}</h1>
        <p className="text-sm opacity-90">Faça seu pedido</p>
      </div>

      <div className="flex gap-6 p-6 max-w-7xl mx-auto">
        {/* Menu Items */}
        <div className="flex-1">
          <Input
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                )}
                <h4 className="font-semibold mb-1">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center">
                  {item.promotionalPrice ? (
                    <div>
                      <span className="font-bold text-green-600">
                        R$ {item.promotionalPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        R$ {item.price.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold">R$ {item.price.toFixed(2)}</span>
                  )}
                  <Button size="sm" onClick={() => addToCart(item)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-96 sticky top-6 h-fit">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="font-semibold">Seu Pedido</h3>
            </div>

            <div className="space-y-3 mb-4 max-h-96 overflow-auto">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Nenhum item adicionado
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Observações do pedido (ex: sem cebola, ponto da carne)"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
              
              <div className="flex justify-between font-bold text-lg border-t pt-4">
                <span>Total:</span>
                <span>R$ {totalAmount.toFixed(2)}</span>
              </div>

              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handleFinishOrder}
                disabled={cart.length === 0}
              >
                <Check className="h-5 w-5" />
                Enviar Pedido
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
