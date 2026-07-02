import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ShoppingCart, Star, FileText, ShieldCheck, ArrowLeft, Minus, Plus } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

export const ProductDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      toast.success(`${product.name} (${quantity} шт.) добавлен в корзину`);
    }
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

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="font-heading font-bold text-2xl mb-2">Товар не найден</h2>
          <Link to="/catalog">
            <Button>Вернуться в каталог</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="product-detail-page">
      <div className="container mx-auto px-4">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-slate-600 hover:text-teal-600 mb-6" data-testid="back-to-catalog">
          <ArrowLeft className="w-4 h-4" />
          Назад к каталогу
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
              <div className="aspect-square bg-slate-100 relative">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-9xl">💊</div>
                )}
                {product.is_promotion && (
                  <div className="absolute top-4 right-4 bg-secondary text-white px-4 py-2 rounded-full font-semibold">
                    Акция
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl p-8 border border-slate-200" data-testid="product-info">
              <div className="mb-4">
                <Badge variant="outline" className="mb-3">{product.category}</Badge>
                {product.seller?.is_verified && (
                  <Badge className="ml-2 bg-teal-100 text-teal-700 hover:bg-teal-100">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {t('product.verifiedSupplier')}
                  </Badge>
                )}
              </div>

              <h1 className="font-heading font-bold text-3xl mb-4" data-testid="product-name">
                {product.name}
              </h1>

              {product.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-slate-600">({product.reviews_count} отзывов)</span>
                </div>
              )}

              <div className="mb-6">
                <span className="text-4xl font-bold text-teal-600" data-testid="product-price">${product.price}</span>
              </div>

              <div className="space-y-3 mb-6">
                {product.manufacturer && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Производитель:</span>
                    <span className="font-medium">{product.manufacturer}</span>
                  </div>
                )}
                {product.active_substance && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Активное вещество:</span>
                    <span className="font-medium">{product.active_substance}</span>
                  </div>
                )}
                {product.form && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Форма выпуска:</span>
                    <span className="font-medium">{product.form}</span>
                  </div>
                )}
                {product.animal_type && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Для животных:</span>
                    <span className="font-medium">{product.animal_type}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Наличие:</span>
                  <span className={`font-medium ${product.in_stock ? 'text-green-600' : 'text-orange-600'}`}>
                    {product.in_stock ? t('product.inStock') : t('product.outOfStock')}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-2">Описание:</h3>
                <p className="text-slate-600 leading-relaxed">{product.description}</p>
              </div>

              {product.certificates?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t('product.certificate')}:
                  </h3>
                  <div className="flex gap-2">
                    {product.certificates.map((cert, idx) => (
                      <a
                        key={idx}
                        href={cert}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        Сертификат {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-slate-200 rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="decrease-quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="px-6 font-semibold" data-testid="quantity-value">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="increase-quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleAddToCart}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-500 hover:shadow-lg hover:shadow-teal-900/20"
                  size="lg"
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {t('product.addToCart')}
                </Button>
              </div>

              {product.seller && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold mb-2">Продавец:</h3>
                  <p className="text-slate-600">{product.seller.company || 'Компания'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
