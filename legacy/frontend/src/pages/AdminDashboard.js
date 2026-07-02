import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, Package, ShoppingCart, DollarSign, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, ordersRes, reviewsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=100'),
        api.get('/orders'),
        api.get('/reviews?approved=false')
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setOrders(ordersRes.data);
      setReviews(reviewsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/verify`);
      toast.success('Пользователь верифицирован');
      fetchData();
    } catch (error) {
      toast.error('Ошибка верификации');
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await api.patch(`/reviews/${reviewId}/approve`);
      toast.success('Отзыв одобрен');
      fetchData();
    } catch (error) {
      toast.error('Ошибка одобрения');
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

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      seller: 'bg-blue-100 text-blue-800',
      buyer: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-slate-100 text-slate-800';
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
    <div className="min-h-screen bg-slate-50 py-8" data-testid="admin-dashboard">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="admin-title">
            Админ-панель
          </h1>
          <p className="text-slate-600">Добро пожаловать, {user?.full_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
              <Users className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-users">{stats?.total_users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего товаров</CardTitle>
              <Package className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-products">{stats?.total_products || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              <ShoppingCart className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-orders">{stats?.total_orders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Общий оборот</CardTitle>
              <DollarSign className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-revenue">${stats?.total_revenue?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" data-testid="users-tab">
              Пользователи ({users.length})
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">
              Заказы ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="reviews-tab">
              Модерация ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="users-list">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-teal-200 transition-colors"
                      data-testid={`user-${u.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{u.full_name}</span>
                          <Badge className={getRoleBadge(u.role)}>{u.role}</Badge>
                          {u.is_verified && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Верифицирован
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{u.email}</p>
                        {u.company && <p className="text-sm text-slate-500">{u.company}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {!u.is_verified && u.role === 'seller' && (
                          <Button
                            size="sm"
                            onClick={() => handleVerifyUser(u.id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`verify-${u.id}`}
                          >
                            Верифицировать
                          </Button>
                        )}
                        <span className="text-sm text-slate-500">
                          {u.vet_points_balance?.toFixed(2) || '0.00'} VP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Все заказы платформы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="orders-list">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-teal-200 transition-colors"
                      data-testid={`order-${order.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Заказ #{order.id.slice(0, 8)}</span>
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Покупатель: {order.buyer_name} ({order.buyer_phone})
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(order.created_at).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-teal-600">${order.total}</p>
                          {order.vet_points_earned > 0 && (
                            <p className="text-sm text-slate-500">+{order.vet_points_earned.toFixed(2)} VP</p>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 space-y-1">
                        <p className="text-sm font-medium mb-2">Товары:</p>
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-slate-600">
                            • {item.product_name} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Модерация отзывов</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-12" data-testid="no-reviews">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Нет отзывов на модерации</p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="reviews-list">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border border-slate-200 rounded-lg p-4 hover:border-teal-200 transition-colors"
                        data-testid={`review-${review.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{review.buyer_name}</span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-slate-300'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{review.comment}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(review.created_at).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApproveReview(review.id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`approve-review-${review.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Одобрить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
