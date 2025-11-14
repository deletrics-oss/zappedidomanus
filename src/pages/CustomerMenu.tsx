import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Search, 
  Menu as MenuIcon, 
  X, 
  Plus, 
  Minus,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  Home,
  ShoppingBag,
  User,
  MessageCircle,
  LogOut,
  Gift,
  Package
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CustomizeItemDialog } from '@/components/dialogs/CustomizeItemDialog';
import { useCEP } from '@/hooks/useCEP';
import { getDocuments, getDocument, createDocument, updateDocument } from '@/lib/firebase-db';
import { where, orderBy } from 'firebase/firestore';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotionalPrice: number | null;
  imageUrl: string | null;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CartItem extends MenuItem {
  quantity: number;
  customizations?: any[];
  finalPrice?: number;
  customizationsText?: string;
}

export default function CustomerMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  
  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCPF, setCustomerCPF] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'cash'>('pix');
  const [address, setAddress] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
    complement: '',
    reference: ''
  });
  const [observations, setObservations] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [customerLoyalty, setCustomerLoyalty] = useState<any>(null);
  const { buscarCEP, loading: cepLoading } = useCEP();

  useEffect(() => {
    loadData();
    loadRestaurantSettings();
    // Load saved customer data
    const savedName = localStorage.getItem('customerName');
    const savedPhone = localStorage.getItem('customerPhone');
    const savedCPF = localStorage.getItem('customerCPF');
    if (savedName) setCustomerName(savedName);
    if (savedPhone) {
      setCustomerPhone(savedPhone);
      loadCustomerLoyalty(savedPhone);
    }
    if (savedCPF) setCustomerCPF(savedCPF);
  }, []);

  const loadData = async () => {
    try {
      const categoriesRes = await getDocuments('categories', [where('isActive', '==', true), orderBy('sortOrder')]);
      const itemsRes = await getDocuments('menuItems', [where('isAvailable', '==', true), orderBy('sortOrder')]);

      setCategories(categoriesRes as Category[]);
      setMenuItems(itemsRes as MenuItem[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar o cardápio');
    }
  };

  const loadRestaurantSettings = async () => {
    try {
      // No Firestore, settings é um documento único
      const data = await getDocument('restaurantSettings', 'config');
      
      if (data) setRestaurantSettings(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadCustomerLoyalty = async (phone: string) => {
    if (!phone) return;
    
    try {
      const data = await getDocuments('customers', [where('phone', '==', phone)]);
      
      if (data && data.length > 0) {
        const customer = data[0];
        setCustomerLoyalty(customer);
        setLoyaltyPoints(customer.loyaltyPoints || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar fidelidade:', error);
    }
  };

  const loadCustomerOrders = async () => {
    if (!customerPhone) {
      toast.error('Informe seu telefone para ver seus pedidos');
      return;
    }
    
    try {
      const orders = await getDocuments('orders', [
        where('customerPhone', '==', customerPhone),
        orderBy('createdAt', 'desc')
      ]);
      
      // Simular join para orderItems
      const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
        const items = await getDocuments('orderItems', [where('orderId', '==', order.id)]);
        return { ...order, orderItems: items };
      }));

      if (ordersWithItems) {
        setCustomerOrders(ordersWithItems);
        setOrdersDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = async (item: MenuItem) => {
    // Check if item has variations
    const variations = await getDocuments('itemVariations', [
      where('menuItemId', '==', item.id),
      where('isActive', '==', true)
    ]);

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
    const variationsPrice = customizations.reduce((sum, v) => sum + (v.priceAdjustment || 0), 0);
    const finalPrice = (item.promotionalPrice || item.price) + variationsPrice;

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      customizations,
      finalPrice,
      customizationsText: customizations.map(c => c.name).join(', ')
    };

    setCart(prev => {
      const existingIndex = prev.findIndex((i: any) => 
        i.id === item.id && 
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
      );
      
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        };
        return newCart;
      }
      return [...prev, cartItem];
    });
    
    toast.success(`${item.name} adicionado ao carrinho!`);
  };

  const updateQuantity = (item: CartItem, delta: number) => {
    setCart(prev => {
      const updated = prev.map(i => {
        if (i === item) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return i;
      }).filter(i => i.quantity > 0);
      return updated;
    });
  };

  const removeFromCart = (item: CartItem) => {
    setCart(prev => prev.filter(i => i !== item));
  };

  const applyCoupon = async () => {
    if (!couponCode) return;

    try {
      const coupons = await getDocuments('coupons', [
        where('code', '==', couponCode.toUpperCase()),
        where('isActive', '==', true)
      ]);

      const data = coupons.length > 0 ? coupons[0] : null;

      if (!data) {
        toast.error('Cupom inválido ou expirado');
        return;
      }

      if (data.currentUses >= data.maxUses) {
        toast.error('Cupom esgotado');
        return;
      }

      if (cartTotal < data.minOrderValue) {
        toast.error(`Pedido mínimo de R$ ${data.minOrderValue.toFixed(2)}`);
        return;
      }

      setAppliedCoupon(data);
      toast.success('Cupom aplicado!');
    } catch (error) {
      console.error('Erro ao aplicar cupom:', error);
      toast.error('Erro ao aplicar cupom');
    }
  };

  const cartTotal = cart.reduce((sum, item: any) => {
    const price = item.finalPrice || item.promotionalPrice || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const couponDiscount = appliedCoupon 
    ? appliedCoupon.type === 'percentage' 
      ? (cartTotal * appliedCoupon.discountValue) / 100
      : appliedCoupon.discountValue
    : 0;

  // Pontos: cada ponto vale conforme configuração (padrão R$ 0.01)
  const loyaltyDiscount = useLoyaltyPoints && pointsToUse > 0
    ? pointsToUse * (restaurantSettings?.loyaltyRedemptionValue || 0.01)
    : 0;

  const deliveryFee = deliveryType === 'delivery' ? 5.00 : 0;
  const total = Math.max(0, cartTotal + deliveryFee - couponDiscount - loyaltyDiscount);

  const handleCEPSearch = async () => {
    if (!address.zipcode) {
      toast.error('Digite um CEP');
      return;
    }

    const cepData = await buscarCEP(address.zipcode);
    if (cepData) {
      setAddress({
        ...address,
        street: cepData.street,
        neighborhood: cepData.neighborhood,
        city: cepData.city,
        state: cepData.state,
      });
    } else {
      toast.error('CEP não encontrado');
    }
  };

  const handleFinishOrder = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    if (deliveryType === 'delivery' && (!address.street || !address.number)) {
      toast.error('Preencha o endereço de entrega');
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error('Preencha seu nome e telefone');
      return;
    }

    try {
      const now = new Date().toISOString();
      
      // 1. Save customer data
      localStorage.setItem('customerName', customerName);
      localStorage.setItem('customerPhone', customerPhone);
      if (customerCPF) localStorage.setItem('customerCPF', customerCPF);

      let customerId = customerLoyalty?.id;
      if (!customerId) {
        const newCustomerRef = await createDocument('customers', {
          name: customerName,
          phone: customerPhone,
          cpf: customerCPF || null,
          loyaltyPoints: 0,
          createdAt: now,
        });
        customerId = newCustomerRef.id;
      } else {
        await updateDocument('customers', customerId, {
          name: customerName,
          cpf: customerCPF || null,
          updatedAt: now,
        });
      }

      // 2. Create order
      const orderNumber = `WEB${Date.now().toString().slice(-6)}`;
      const orderData = {
        orderNumber,
        customerId,
        customerName,
        customerPhone,
        deliveryType,
        status: 'new',
        subtotal: cartTotal,
        deliveryFee,
        discount: couponDiscount + loyaltyDiscount,
        total,
        paymentMethod,
        address: deliveryType === 'delivery' ? address : null,
        observations,
        couponCode: appliedCoupon?.code || null,
        loyaltyPointsUsed: useLoyaltyPoints ? pointsToUse : 0,
        createdAt: now,
        updatedAt: now,
      };

      const orderRef = await createDocument('orders', orderData);
      const orderId = orderRef.id;

      // 3. Create order items
      const itemPromises = cart.map(item => createDocument('orderItems', {
        orderId,
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.finalPrice || item.promotionalPrice || item.price,
        totalPrice: (item.finalPrice || item.promotionalPrice || item.price) * item.quantity,
        customizations: item.customizations || [],
        notes: item.customizationsText || null,
        createdAt: now,
      }));
      await Promise.all(itemPromises);

      // 4. Update coupon usage
      if (appliedCoupon) {
        await updateDocument('coupons', appliedCoupon.id, {
          currentUses: appliedCoupon.currentUses + 1,
          updatedAt: now,
        });
      }

      // 5. Update loyalty points (deduct used points)
      if (useLoyaltyPoints && pointsToUse > 0) {
        await updateDocument('customers', customerId, {
          loyaltyPoints: loyaltyPoints - pointsToUse,
          updatedAt: now,
        });
      }

      toast.success('Pedido enviado com sucesso! Acompanhe seu pedido na seção "Meus Pedidos".');
      setCart([]);
      setCheckoutOpen(false);
      setAppliedCoupon(null);
      setCouponCode('');
      setUseLoyaltyPoints(false);
      setPointsToUse(0);
      loadCustomerLoyalty(customerPhone); // Reload loyalty points
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header and Menu */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">
            {restaurantSettings?.name || 'Cardápio Digital'}
          </h1>
          <div className="flex items-center space-x-4">
            <Sheet open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" onClick={loadCustomerOrders}>
                  <ShoppingBag className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Meus Pedidos</DialogTitle>
                  <DialogDescription>Acompanhe o status dos seus últimos pedidos.</DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  {customerOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground">Nenhum pedido encontrado.</p>
                  ) : (
                    customerOrders.map(order => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Pedido #{order.orderNumber}</h4>
                          <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Total: R$ {order.total.toFixed(2)}</p>
                        <ul className="text-sm mt-2 space-y-1">
                          {order.orderItems.map((item: any) => (
                            <li key={item.id}>{item.quantity}x {item.name}</li>
                          ))}
                        </ul>
                      </Card>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="default" className="relative gap-1">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-bold">{cart.length}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Seu Pedido</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4 flex-1 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">Seu carrinho está vazio.</p>
                  ) : (
                    cart.map((item, index) => (
                      <Card key={index} className="p-3 flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            R$ {item.finalPrice?.toFixed(2) || item.price.toFixed(2)}
                          </p>
                          {item.customizationsText && (
                            <p className="text-xs text-muted-foreground italic">{item.customizationsText}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item, -1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-bold">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item, 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(item)}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
                <div className="sticky bottom-0 bg-white pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total:</span>
                    <span>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    disabled={cart.length === 0}
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    Finalizar Pedido
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-6">
          <Input
            placeholder="Buscar no cardápio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Search className="h-5 w-5" />
          </Button>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">Todos</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
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
                  <Button onClick={() => handleAddToCart(item)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>Preencha os dados para concluir sua compra.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Dados do Cliente */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Seus Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF na Nota (opcional)</Label>
                <Input id="cpf" value={customerCPF} onChange={(e) => setCustomerCPF(e.target.value)} />
              </div>

              <h3 className="text-lg font-semibold border-b pb-2 pt-4">2. Entrega</h3>
              <Tabs value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'delivery' | 'pickup')}>
                <TabsList className="w-full">
                  <TabsTrigger value="delivery" className="flex-1 gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery
                  </TabsTrigger>
                  <TabsTrigger value="pickup" className="flex-1 gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Retirada
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {deliveryType === 'delivery' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zipcode">CEP *</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="zipcode" 
                          value={address.zipcode} 
                          onChange={(e) => setAddress({ ...address, zipcode: e.target.value })} 
                          required 
                        />
                        <Button type="button" onClick={handleCEPSearch} disabled={cepLoading}>
                          {cepLoading ? 'Buscando...' : 'Buscar'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="street">Rua *</Label>
                      <Input id="street" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número *</Label>
                      <Input id="number" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input id="neighborhood" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento (opcional)</Label>
                      <Input id="complement" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Ponto de Referência (opcional)</Label>
                    <Input id="reference" value={address.reference} onChange={(e) => setAddress({ ...address, reference: e.target.value })} />
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold border-b pb-2 pt-4">3. Pagamento</h3>
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'pix' | 'credit_card' | 'cash')}>
                <TabsList className="w-full">
                  <TabsTrigger value="pix" className="flex-1 gap-2">
                    <Smartphone className="h-4 w-4" />
                    PIX
                  </TabsTrigger>
                  <TabsTrigger value="credit_card" className="flex-1 gap-2">
                    <CreditCard className="h-4 w-4" />
                    Cartão
                  </TabsTrigger>
                  <TabsTrigger value="cash" className="flex-1 gap-2">
                    <Banknote className="h-4 w-4" />
                    Dinheiro
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <h3 className="text-lg font-semibold border-b pb-2 pt-4">4. Observações</h3>
              <Textarea
                placeholder="Observações do pedido (ex: sem cebola, ponto da carne)"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </div>

            {/* Coluna 2: Resumo do Pedido */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4 sticky top-4">
                <h3 className="text-lg font-semibold mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.finalPrice || item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t mt-3 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Entrega:</span>
                    <span>R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Desconto Cupom:</span>
                      <span>- R$ {couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Desconto Fidelidade:</span>
                      <span>- R$ {loyaltyDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between font-bold text-xl border-t mt-3 pt-3">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Cupom de Desconto</h4>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Código do Cupom" 
                      value={couponCode} 
                      onChange={(e) => setCouponCode(e.target.value)} 
                    />
                    <Button type="button" onClick={applyCoupon}>Aplicar</Button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-green-600">Cupom {appliedCoupon.code} aplicado!</p>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Fidelidade</h4>
                  <p className="text-sm">Você tem {loyaltyPoints} pontos (R$ {(loyaltyPoints * (restaurantSettings?.loyaltyRedemptionValue || 0.01)).toFixed(2)})</p>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="useLoyalty" 
                      checked={useLoyaltyPoints} 
                      onChange={(e) => setUseLoyaltyPoints(e.target.checked)} 
                      className="h-4 w-4 text-primary"
                    />
                    <Label htmlFor="useLoyalty">Usar pontos neste pedido</Label>
                  </div>
                  {useLoyaltyPoints && (
                    <Input 
                      type="number" 
                      placeholder="Pontos a usar" 
                      value={pointsToUse} 
                      onChange={(e) => setPointsToUse(Math.min(loyaltyPoints, parseInt(e.target.value) || 0))}
                      max={loyaltyPoints}
                    />
                  )}
                </div>

                <Button 
                  className="w-full mt-4" 
                  size="lg" 
                  onClick={handleFinishOrder}
                  disabled={cart.length === 0}
                >
                  Confirmar e Pagar R$ {total.toFixed(2)}
                </Button>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Customization Dialog */}
      <CustomizeItemDialog 
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        item={selectedItem}
        onAddToCart={(item, customizations) => {
          addToCart(item, customizations);
          setCustomizeDialogOpen(false);
        }}
      />
    </div>
  );
}
