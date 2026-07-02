import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, Filter, ShoppingCart, Star } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

export const Catalog = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    in_stock: searchParams.get('in_stock') || 'all'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.in_stock && filters.in_stock !== 'all') params.append('in_stock', filters.in_stock === 'true');
      params.append('limit', '20');

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Failed to fetch products', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    toast.success(`${product.name} добавлен в корзину`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="catalog-page">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl mb-4" data-testid="catalog-title">{t('nav.catalog')}</h1>
          <p className="text-slate-600">Найдите нужные ветеринарные товары для вашего бизнеса</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1" data-testid="filters-sidebar">
            <div className="bg-white rounded-xl p-6 border border-slate-200 sticky top-20">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-teal-600" />
                <h2 className="font-heading font-semibold text-lg">{t('common.filter')}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Поиск</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Поиск товаров..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                      data-testid="search-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('categories.title')}</label>
                  <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Наличие</label>
                  <Select value={filters.in_stock || 'all'} onValueChange={(value) => handleFilterChange('in_stock', value === 'all' ? '' : value)}>
                    <SelectTrigger data-testid="stock-select">
                      <SelectValue placeholder="Все товары" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все товары</SelectItem>
                      <SelectItem value="true">В наличии</SelectItem>
                      <SelectItem value="false">Под заказ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilters({ search: '', category: '', in_stock: '' });
                    setSearchParams({});
                  }}
                  data-testid="clear-filters"
                >
                  Сбросить фильтры
                </Button>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">{t('common.loading')}</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200" data-testid="no-products">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="font-heading font-semibold text-xl mb-2">Товары не найдены</h3>
                <p className="text-slate-600">Попробуйте изменить фильтры поиска</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="products-grid">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
                    data-testid={`product-card-${product.id}`}
                  >
                    <Link to={`/products/${product.id}`}>
                      <div className="aspect-square bg-slate-100 relative overflow-hidden">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">💊</div>
                        )}
                        {product.is_promotion && (
                          <div className="absolute top-2 right-2 bg-secondary text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Акция
                          </div>
                        )}
                        {!product.in_stock && (
                          <div className="absolute top-2 left-2 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Под заказ
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-4">
                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 hover:text-teal-600 transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      
                      {product.manufacturer && (
                        <p className="text-sm text-slate-500 mb-2">Производитель: {product.manufacturer}</p>
                      )}

                      {product.rating > 0 && (
                        <div className="flex items-center gap-1 mb-3">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{product.rating}</span>
                          <span className="text-sm text-slate-500">({product.reviews_count})</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-teal-600">${product.price}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          className="bg-gradient-to-r from-teal-600 to-emerald-500"
                          data-testid={`add-to-cart-${product.id}`}
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          В корзину
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
