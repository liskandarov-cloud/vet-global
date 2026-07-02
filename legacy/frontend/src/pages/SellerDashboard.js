import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Package, ShoppingCart, DollarSign, Plus } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

export const SellerDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/orders')
      ]);
      
      const myProducts = productsRes.data.products.filter((p) => p.seller_id === user.id);
      setProducts(myProducts);
      
      // Фильтр заказов с товарами продавца
      const myProductIds = myProducts.map((p) => p.id);
      const myOrders = ordersRes.data.filter((order) =>
        order.items.some((item) => myProductIds.includes(item.product_id))
      );
      setOrders(myOrders);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => {
    const myRevenue = order.items
      .filter((item) => products.find((p) => p.id === item.product_id))
      .reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    return sum + myRevenue;
  }, 0);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status?status=${newStatus}`);
      toast.success('Статус заказа обновлен');
      fetchData();
    } catch (error) {
      toast.error('Ошибка обновления статуса');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="seller-dashboard">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-4xl mb-2" data-testid="dashboard-title">
              Кабинет продавца
            </h1>
            <p className="text-slate-600">Добро пожаловать, {user?.full_name}!</p>
          </div>
          <Button className="bg-gradient-to-r from-teal-600 to-emerald-500" data-testid="add-product-btn">
            <Plus className="w-5 h-5 mr-2" />
            Добавить товар
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Товары</CardTitle>
              <Package className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="products-count">{products.length}</div>
              <p className="text-xs text-slate-600 mt-1">В каталоге</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Заказы</CardTitle>
              <ShoppingCart className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="orders-count">{orders.length}</div>
              <p className="text-xs text-slate-600 mt-1">Всего получено</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Доход</CardTitle>
              <DollarSign className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="revenue">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-slate-600 mt-1">За все время</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Мои товары</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12" data-testid="no-products">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-slate-600 mb-4">У вас пока нет товаров</p>
                  <Button className="bg-gradient-to-r from-teal-600 to-emerald-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить первый товар
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto" data-testid="products-list">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:border-teal-200 transition-colors"
                      data-testid={`product-${product.id}`}
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-2xl">💊</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-slate-600">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-teal-600">${product.price}</p>
                        <p className="text-sm text-slate-600">{product.in_stock ? 'В наличии' : 'Под заказ'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Заказы на мои товары</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12" data-testid="no-orders">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-slate-600">Пока нет заказов</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto" data-testid="orders-list">
                  {orders.map((order) => {
                    const myItems = order.items.filter((item) =>
                      products.find((p) => p.id === item.product_id)
                    );
                    const myTotal = myItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    
                    return (
                      <div
                        key={order.id}
                        className="border border-slate-200 rounded-lg p-4 hover:border-teal-200 transition-colors"
                        data-testid={`order-${order.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">#{order.id.slice(0, 8)}</span>
                              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{order.buyer_name}</p>
                            <p className="text-sm text-slate-500">{order.buyer_phone}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(order.created_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-teal-600">${myTotal.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 pt-2 mb-3">
                          <p className="text-sm font-medium mb-1">Мои товары в заказе:</p>
                          {myItems.map((item, idx) => (
                            <p key={idx} className="text-sm text-slate-600">
                              • {item.product_name} × {item.quantity}
                            </p>
                          ))}
                        </div>
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              data-testid={`confirm-${order.id}`}
                            >
                              Подтвердить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                              data-testid={`cancel-${order.id}`}
                            >
                              Отменить
                            </Button>
                          </div>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                            className="w-full"
                            data-testid={`process-${order.id}`}
                          >
                            В обработку
                          </Button>
                        )}
                        {order.status === 'processing' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                            className="w-full"
                            data-testid={`ship-${order.id}`}
                          >
                            Отправлено
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="w-full bg-green-600 hover:bg-green-700"
                            data-testid={`deliver-${order.id}`}
                          >
                            Доставлено
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
