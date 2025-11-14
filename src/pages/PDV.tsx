import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Printer, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, orderBy, limit, addDoc } from 'firebase/firestore';
import { generatePrintReceipt } from "@/components/PrintReceipt";
import { toast as sonnerToast } from "sonner";
import { OrderDetailsDialog } from "@/components/dialogs/OrderDetailsDialog";
import { CustomizeItemDialog } from "@/components/dialogs/CustomizeItemDialog";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: any[];
  finalPrice?: number;
  customizationsText?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function PDV() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup" | "dine_in" | "online" | "counter">("dine_in");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tables, setTables] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [restaurantName, setRestaurantName] = useState("Restaurante");
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [recentlyClosedOrders, setRecentlyClosedOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "pending">("new");
  const [includeServiceFee, setIncludeServiceFee] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [printOnClose, setPrintOnClose] = useState(true);
  const [shouldPrint, setShouldPrint] = useState(true);
  const [selectedClosedOrder, setSelectedClosedOrder] = useState<any | null>(null);
  const [closedOrderDialogOpen, setClosedOrderDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadMenuItems();
    loadTables();
    loadRestaurantSettings();
    loadPendingOrders();
    loadRecentlyClosedOrders();

    // Atualizar pedidos pendentes em tempo real
    const q = query(collection(db, "orders"), where("status", "in", ["new", "confirmed", "preparing", "ready"]));
    const unsubscribe = onSnapshot(q, () => {
      loadPendingOrders();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadRestaurantSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'restaurant');
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : null;

      if (data?.name) {
        setRestaurantName(data.name);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadCategories = async () => {
    const q = query(collection(db, 'categories'), where('is_active', '==', true), orderBy('sort_order'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (data) setCategories(data);
  };

  const loadMenuItems = async () => {
    const q = query(collection(db, 'menu_items'), where('is_available', '==', true), orderBy('sort_order'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (data) setMenuItems(data);
  };

  const loadTables = async () => {
    const q = query(collection(db, 'tables'), orderBy('number'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (data) setTables(data);
  };

  const loadPendingOrders = async () => {
    try {
      const q = query(
        collection(db, 'orders'), 
        where('status', 'in', ['new', 'confirmed', 'preparing', 'ready']),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        order_items: doc.data().order_items || [] // Assuming nested items
      }));

      if (orders) setPendingOrders(orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos pendentes:', error);
    }
  };

  const loadRecentlyClosedOrders = async () => {
    try {
      const q = query(
        collection(db, 'orders'), 
        where('status', '==', 'completed'),
        orderBy('completed_at', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        order_items: doc.data().order_items || [] // Assuming nested items
      }));

      if (orders) setRecentlyClosedOrders(orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos fechados:', error);
    }
  };

  const handleSelectPendingOrder = (order: any) => {
    setCurrentOrder(order);
    sonnerToast.info(`Pedido ${order.order_number} carregado no caixa`);
  };

  const handleViewClosedOrder = (order: any) => {
    setSelectedClosedOrder(order);
    setClosedOrderDialogOpen(true);
  };

  const handleCloseCurrentOrder = async () => {
    if (!currentOrder) return;

    try {
      // Atualizar pedido como completo
      const orderRef = doc(db, 'orders', currentOrder.id);
      await updateDoc(orderRef, { 
        status: 'completed',
        completed_at: new Date()
      });

      // No error object from updateDoc in Firebase, assuming success if no exception is thrown

      // Liberar mesa se for pedido no local
      if (currentOrder.table_id) {
        const tableRef = doc(db, 'tables', currentOrder.table_id);
        await updateDoc(tableRef, { status: 'free' });
      }

      // Registrar entrada no caixa
      const paymentMethodMap: any = {
        'cash': 'Dinheiro',
        'credit_card': 'Cartão',
        'debit_card': 'Cartão',
      }; // <-- FECHAMENTO DO OBJETO ADICIONADO AQUI

      // A função addDoc deve ser chamada com await se estiver dentro de um bloco try/catch
      // e se quisermos garantir que a operação termine antes de prosseguir.
      // Como o erro original era de sintaxe, e não de await, vou manter o await.
      // As variáveis total e orderNumber são acessadas via currentOrder.
      await addDoc(collection(db, 'cash_movements'), {
        type: 'entrada',
        amount: currentOrder.total, // CORRIGIDO: Usando currentOrder.total
        category: 'Venda',
        description: `Pedido ${currentOrder.order_number}`, // CORRIGIDO: Usando currentOrder.order_number
        payment_method: paymentMethodMap[paymentMethod] || 'Dinheiro',
        movement_date: new Date().toISOString().split('T')[0],
        createdAt: new Date()
      });

      sonnerToast.success(`Pedido ${currentOrder.order_number} fechado com sucesso!`);
      
      // Imprimir recibo se opção estiver marcada
      if (printOnClose) {
        const tableNum = currentOrder.table_id && currentOrder.tables
          ? currentOrder.tables.number 
          : undefined;
        generatePrintReceipt(currentOrder, restaurantName, tableNum, 'customer');
      }
      
      setCurrentOrder(null);
      loadPendingOrders();
      loadRecentlyClosedOrders();
      loadTables();
    } catch (error) {
      console.error('Erro ao fechar pedido:', error);
      sonnerToast.error('Erro ao fechar pedido');
    }
  };

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  const handleAddToCart = async (item: MenuItem) => {
    // Check if item has variations
    const q = query(
        collection(db, 'item_variations'), 
        where('menu_item_id', '==', item.id),
        where('is_active', '==', true)
      );
      const snapshot = await getDocs(q);
      const variations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (variations && variations.length > 0) {
      // Open customization dialog
      setSelectedItem(item);
      setCustomizeDialogOpen(true);
    } else {
      // Add directly to cart
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, customizations: any[] = []) => {
    // Calculate price with variations
    const variationsPrice = customizations.reduce((sum, v) => sum + (v.price_adjustment || 0), 0);
    const finalPrice = (item.promotional_price || item.price) + variationsPrice;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.promotional_price || item.price,
      quantity: 1,
      customizations,
      finalPrice,
      customizationsText: customizations.map(c => c.name).join(', ')
    };

    setCart(prev => {
      const existingIndex = prev.findIndex(i => 
        i.id === item.id && 
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
      );
      
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }
      return [...prev, cartItem];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTable("");
    setDeliveryType("dine_in");
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.finalPrice || item.price) * item.quantity,
    0
  );

  const serviceFee = includeServiceFee ? subtotal * 0.1 : 0;
  const total = subtotal + serviceFee;

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de criar um pedido.",
        variant: "destructive",
      });
      return;
    }

    if (deliveryType === "dine_in" && !selectedTable) {
      toast({
        title: "Mesa não selecionada",
        description: "Selecione uma mesa para pedidos no local.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Criar o pedido principal
      const newOrder = {
        order_number: Date.now().toString().slice(-6), // Simples número de pedido
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_type: deliveryType,
        status: 'new',
        table_id: selectedTable || null,
        subtotal: subtotal,
        service_fee: serviceFee,
        discount: 0,
        total: total,
        payment_method: paymentMethod,
        delivery_address: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), newOrder);
      const orderId = orderRef.id;

      // 2. Adicionar os itens do pedido
      const orderItems = cart.map(item => ({
        order_id: orderId,
        menu_item_id: item.id,
        name: item.name + (item.customizationsText ? ` (${item.customizationsText})` : ''),
        quantity: item.quantity,
        unit_price: item.finalPrice || item.price,
        total_price: (item.finalPrice || item.price) * item.quantity,
        notes: item.customizationsText || null,
        created_at: new Date(),
      }));

      // Adicionar itens em lote (melhor performance)
      const batch = db.batch();
      orderItems.forEach(item => {
        const itemRef = doc(collection(db, 'order_items'));
        batch.set(itemRef, item);
      });
      await batch.commit();

      // 3. Atualizar status da mesa (se for dine_in)
      if (selectedTable) {
        const tableRef = doc(db, 'tables', selectedTable);
        await updateDoc(tableRef, { status: 'occupied' });
      }

      // 4. Limpar carrinho e notificar
      clearCart();
      loadPendingOrders();
      loadTables();
      sonnerToast.success(`Pedido ${newOrder.order_number} criado com sucesso!`);

      // 5. Imprimir pedido para a cozinha
      if (shouldPrint) {
        const tableNum = tables.find(t => t.id === selectedTable)?.number;
        generatePrintReceipt({ ...newOrder, id: orderId, order_items: orderItems }, restaurantName, tableNum, 'kitchen');
      }

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Não foi possível finalizar o pedido. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!currentOrder) return;

    try {
      // 1. Atualizar o pedido principal
      const orderRef = doc(db, 'orders', currentOrder.id);
      await updateDoc(orderRef, {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_type: deliveryType,
        table_id: selectedTable || null,
        subtotal: subtotal,
        service_fee: serviceFee,
        total: total,
        payment_method: paymentMethod,
        updated_at: new Date(),
      });

      // 2. Remover itens antigos e adicionar novos (simplificação)
      // Em um cenário real, seria melhor comparar e atualizar, mas para este exemplo, vamos simplificar.
      
      // Remover itens antigos (se houver)
      const oldItemsQuery = query(collection(db, 'order_items'), where('order_id', '==', currentOrder.id));
      const oldItemsSnapshot = await getDocs(oldItemsQuery);
      
      const deleteBatch = db.batch();
      oldItemsSnapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();

      // Adicionar novos itens
      const orderItems = cart.map(item => ({
        order_id: currentOrder.id,
        menu_item_id: item.id,
        name: item.name + (item.customizationsText ? ` (${item.customizationsText})` : ''),
        quantity: item.quantity,
        unit_price: item.finalPrice || item.price,
        total_price: (item.finalPrice || item.price) * item.quantity,
        notes: item.customizationsText || null,
        created_at: new Date(),
      }));

      const addBatch = db.batch();
      orderItems.forEach(item => {
        const itemRef = doc(collection(db, 'order_items'));
        addBatch.set(itemRef, item);
      });
      await addBatch.commit();

      // 3. Limpar carrinho e notificar
      clearCart();
      setCurrentOrder(null);
      loadPendingOrders();
      sonnerToast.success(`Pedido ${currentOrder.order_number} atualizado com sucesso!`);

    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        title: "Erro ao atualizar pedido",
        description: "Não foi possível atualizar o pedido. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrder) return;

    try {
      // 1. Atualizar pedido como cancelado
      const orderRef = doc(db, 'orders', currentOrder.id);
      await updateDoc(orderRef, { 
        status: 'cancelled',
        updated_at: new Date()
      });

      // 2. Liberar mesa (se aplicável)
      if (currentOrder.table_id) {
        const tableRef = doc(db, 'tables', currentOrder.table_id);
        await updateDoc(tableRef, { status: 'free' });
      }

      // 3. Limpar e notificar
      clearCart();
      setCurrentOrder(null);
      loadPendingOrders();
      loadTables();
      sonnerToast.info(`Pedido ${currentOrder.order_number} cancelado.`);

    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      sonnerToast.error('Erro ao cancelar pedido');
    }
  };

  const handleLoadOrderToCart = async (order: any) => {
    try {
      // 1. Carregar itens do pedido
      const itemsQuery = query(collection(db, 'order_items'), where('order_id', '==', order.id));
      const itemsSnapshot = await getDocs(itemsQuery);
      const orderItems = itemsSnapshot.docs.map(doc => doc.data());

      // 2. Mapear para o formato do carrinho
      const newCart: CartItem[] = orderItems.map(item => ({
        id: item.menu_item_id,
        name: item.name,
        price: item.unit_price,
        quantity: item.quantity,
        customizations: [], // Simplificado, assumindo que as customizações estão no nome/notes
        finalPrice: item.unit_price,
        customizationsText: item.notes,
      }));

      // 3. Atualizar estados
      setCart(newCart);
      setCurrentOrder(order);
      setCustomerName(order.customer_name || '');
      setCustomerPhone(order.customer_phone || '');
      setSelectedTable(order.table_id || '');
      setDeliveryType(order.delivery_type);
      setPaymentMethod(order.payment_method);
      setIncludeServiceFee(order.service_fee > 0);
      setActiveTab('new');

      sonnerToast.info(`Pedido ${order.order_number} carregado para edição.`);

    } catch (error) {
      console.error('Erro ao carregar pedido para edição:', error);
      sonnerToast.error('Erro ao carregar pedido para edição');
    }
  };

  const handleCustomizeItem = (item: MenuItem) => {
    setSelectedItem(item);
    setCustomizeDialogOpen(true);
  };

  const handleSaveCustomization = (item: MenuItem, customizations: any[]) => {
    addToCart(item, customizations);
    setCustomizeDialogOpen(false);
    setSelectedItem(null);
  };

  const getTableNumber = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.number || 'N/A';
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Coluna de Itens do Menu */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Cardápio</h1>
        
        {/* Filtro de Categorias */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex space-x-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="flex-shrink-0"
            >
              Todas
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="p-3 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleAddToCart(item)}
            >
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xl font-bold text-primary">
                    R$ {item.promotional_price ? item.promotional_price.toFixed(2).replace('.', ',') : item.price.toFixed(2).replace('.', ',')}
                  </span>
                  {item.promotional_price && (
                    <span className="text-sm text-muted-foreground line-through ml-2">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  <Button size="sm" className="ml-auto">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Coluna do Carrinho e Pedidos */}
      <div className="w-full max-w-md border-l flex flex-col bg-background">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "new" | "pending")} className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="new" className="rounded-none">
              <ShoppingCart className="h-4 w-4 mr-2" /> Novo Pedido
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-none">
              <Clock className="h-4 w-4 mr-2" /> Pedidos Pendentes ({pendingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex-1 flex flex-col p-4 overflow-y-auto">
            {/* Detalhes do Pedido */}
            <div className="space-y-4 mb-4">
              <h2 className="text-xl font-semibold">Detalhes</h2>
              
              {/* Tipo de Entrega */}
              <div className="space-y-2">
                <Label>Tipo de Pedido</Label>
                <Select value={deliveryType} onValueChange={(value) => setDeliveryType(value as "delivery" | "pickup" | "dine_in" | "online" | "counter")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Mesa / Balcão</SelectItem>
                    <SelectItem value="pickup">Retirada</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="online">Online (App/Site)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Mesa (se dine_in) */}
              {deliveryType === "dine_in" && (
                <div className="space-y-2">
                  <Label>Mesa</Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a mesa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.filter(t => t.status === 'free' || t.id === selectedTable).map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          Mesa {table.number} {table.status === 'occupied' && table.id !== selectedTable ? '(Ocupada)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Dados do Cliente */}
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nome do Cliente</Label>
                <Input
                  id="customer-name"
                  placeholder="Nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Telefone</Label>
                <Input
                  id="customer-phone"
                  placeholder="(99) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Itens do Carrinho */}
            <h2 className="text-xl font-semibold mb-2 flex justify-between items-center">
              Carrinho ({cart.length})
              <Button variant="ghost" size="sm" onClick={clearCart} disabled={cart.length === 0}>
                <Trash2 className="h-4 w-4 mr-1" /> Limpar
              </Button>
            </h2>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {cart.map((item, index) => (
                <Card key={index} className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.customizationsText && (
                      <p className="text-xs text-muted-foreground italic">{item.customizationsText}</p>
                    )}
                    <p className="text-sm text-primary">
                      R$ {(item.finalPrice || item.price).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-muted-foreground pt-10">Adicione itens ao carrinho.</p>
              )}
            </div>

            {/* Resumo e Ações */}
            <div className="mt-4 pt-4 border-t space-y-3 flex-shrink-0">
              <div className="flex justify-between items-center">
                <Label htmlFor="service-fee">Incluir Taxa de Serviço (10%)</Label>
                <input
                  type="checkbox"
                  id="service-fee"
                  checked={includeServiceFee}
                  onChange={(e) => setIncludeServiceFee(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
              </div>
              <div className="flex justify-between font-medium">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {includeServiceFee && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa de Serviço (10%):</span>
                  <span>R$ {serviceFee.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-primary">
                <span>Total:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>

              {/* Método de Pagamento */}
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "cash" | "credit_card" | "debit_card" | "pix")}>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="r1" />
                      <Label htmlFor="r1">Dinheiro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="credit_card" id="r2" />
                      <Label htmlFor="r2">Crédito</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="debit_card" id="r3" />
                      <Label htmlFor="r3">Débito</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pix" id="r4" />
                      <Label htmlFor="r4">Pix</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Opções de Impressão */}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="print-kitchen"
                    checked={shouldPrint}
                    onChange={(e) => setShouldPrint(e.target.checked)}
                    className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="print-kitchen">Imprimir para Cozinha</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="print-close"
                    checked={printOnClose}
                    onChange={(e) => setPrintOnClose(e.target.checked)}
                    className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="print-close">Imprimir Recibo ao Fechar</Label>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                {currentOrder ? (
                  <>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleCloseCurrentOrder}
                      disabled={cart.length === 0}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Fechar Pedido (R$ {total.toFixed(2).replace('.', ',')})
                    </Button>
                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1" 
                        variant="outline" 
                        onClick={handleUpdateOrder}
                        disabled={cart.length === 0}
                      >
                        Atualizar Pedido
                      </Button>
                      <Button 
                        className="flex-1" 
                        variant="destructive" 
                        onClick={handleCancelOrder}
                      >
                        Cancelar Pedido
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={handleCreateOrder}
                    disabled={cart.length === 0 || (deliveryType === 'dine_in' && !selectedTable)}
                  >
                    Criar Pedido
                  </Button>
                )}
                
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="flex-1 flex flex-col p-4 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Pedidos em Andamento</h2>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">Pedido #{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.delivery_type === 'dine_in' && order.table_id ? `Mesa ${getTableNumber(order.table_id)}` : order.delivery_type}
                      </p>
                      <Badge 
                        className="mt-1"
                        variant={order.status === 'new' ? 'default' : order.status === 'confirmed' ? 'secondary' : 'outline'}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => handleLoadOrderToCart(order)}
                        className="h-auto p-0"
                      >
                        Carregar para Caixa
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {pendingOrders.length === 0 && (
                <p className="text-center text-muted-foreground pt-10">Nenhum pedido pendente.</p>
              )}
            </div>

            <h2 className="text-xl font-semibold mt-6 mb-4 border-t pt-4">Últimos Fechados</h2>
            <div className="space-y-3 flex-shrink-0">
              {recentlyClosedOrders.map((order) => (
                <Card key={order.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">Pedido #{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.delivery_type === 'dine_in' && order.table_id ? `Mesa ${getTableNumber(order.table_id)}` : order.delivery_type}
                      </p>
                      <Badge className="mt-1" variant="success">
                        Fechado
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => handleViewClosedOrder(order)}
                        className="h-auto p-0"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {recentlyClosedOrders.length === 0 && (
                <p className="text-center text-muted-foreground pt-4">Nenhum pedido fechado recentemente.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <OrderDetailsDialog 
        isOpen={closedOrderDialogOpen}
        onOpenChange={setClosedOrderDialogOpen}
        order={selectedClosedOrder}
        restaurantName={restaurantName}
        tables={tables}
      />

      <CustomizeItemDialog
        isOpen={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        item={selectedItem}
        onSave={handleSaveCustomization}
      />
    </div>
  );
}
