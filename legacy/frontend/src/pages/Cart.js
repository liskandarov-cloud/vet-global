import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

export const Cart = () => {
  const { t } = useTranslation();
  const { cart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    buyer_name: user?.full_name || '',
    buyer_phone: user?.phone || '',
    buyer_company: user?.company || ''
  });

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Корзина пуста');
      return;
    }

    if (!user && (!checkoutData.buyer_name || !checkoutData.buyer_phone)) {
      toast.error('Заполните имя и телефон');
      return;
    }

    setLoading(true);
    try {
      const orderItems = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const orderPayload = {
        items: orderItems,
        vet_points_used: 0
      };

      if (!user) {
        orderPayload.buyer_name = checkoutData.buyer_name;
        orderPayload.buyer_phone = checkoutData.buyer_phone;
        orderPayload.buyer_company = checkoutData.buyer_company;
      }

      const response = await api.post('/orders', orderPayload);

      toast.success('Заказ успешно оформлен! Вы получите 1% VetPoints после доставки.');
      clearCart();
      
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Checkout failed', error);
      toast.error(error.response?.data?.detail || 'Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12" data-testid="cart-page">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center bg-white rounded-xl p-12 border border-slate-200" data-testid="empty-cart">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="font-heading font-bold text-2xl mb-2">{t('cart.empty')}</h2>
            <p className="text-slate-600 mb-6">Добавьте товары в корзину, чтобы оформить заказ</p>
            <Link to="/catalog">
              <Button className="bg-gradient-to-r from-teal-600 to-emerald-500" data-testid="continue-shopping">
                {t('cart.continue')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="cart-page">
      <div className="container mx-auto px-4">
        <h1 className="font-heading font-bold text-4xl mb-8" data-testid="cart-title">{t('cart.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4" data-testid="cart-items">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-6 border border-slate-200 flex gap-4"
                data-testid={`cart-item-${item.id}`}
              >
                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-3xl">💊</span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                  <p className="text-teal-600 font-bold mb-3">${item.price}</p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        data-testid={`decrease-${item.id}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="px-4 font-semibold" data-testid={`quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        data-testid={`increase-${item.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`remove-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-xl" data-testid={`subtotal-${item.id}`}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-slate-200 sticky top-20" data-testid="checkout-form">
              <h2 className="font-heading font-semibold text-xl mb-6">Оформление заказа</h2>

              {user ? (
                <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-100">
                  <p className="text-sm font-medium text-teal-900 mb-1">Заказ оформляется на:</p>
                  <p className="text-sm text-teal-700">{user.full_name}</p>
                  <p className="text-sm text-teal-700">{user.phone}</p>
                  {user.company && <p className="text-sm text-teal-700">{user.company}</p>}
                  <p className="text-xs text-teal-600 mt-2">💎 Вы получите 1% VetPoints после доставки</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="buyer_name">Ваше имя *</Label>
                    <Input
                      id="buyer_name"
                      value={checkoutData.buyer_name}
                      onChange={(e) => setCheckoutData({ ...checkoutData, buyer_name: e.target.value })}
                      placeholder="Иван Иванов"
                      data-testid="buyer-name-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyer_phone">Телефон *</Label>
                    <Input
                      id="buyer_phone"
                      value={checkoutData.buyer_phone}
                      onChange={(e) => setCheckoutData({ ...checkoutData, buyer_phone: e.target.value })}
                      placeholder="+998901234567"
                      data-testid="buyer-phone-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyer_company">Компания (необязательно)</Label>
                    <Input
                      id="buyer_company"
                      value={checkoutData.buyer_company}
                      onChange={(e) => setCheckoutData({ ...checkoutData, buyer_company: e.target.value })}
                      placeholder="Название компании"
                      data-testid="buyer-company-input"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-6 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Товары ({cart.length}):</span>
                  <span className="font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>{t('cart.total')}:</span>
                  <span className="text-teal-600" data-testid="cart-total">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:shadow-lg"
                size="lg"
                data-testid="checkout-btn"
              >
                {loading ? t('common.loading') : t('cart.checkout')}
              </Button>

              <Link to="/catalog">
                <Button variant="outline" className="w-full mt-3" data-testid="continue-shopping-btn">
                  {t('cart.continue')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
