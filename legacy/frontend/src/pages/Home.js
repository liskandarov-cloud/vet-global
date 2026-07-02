import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { ShieldCheck, Truck, Award, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../utils/api';

export const Home = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchPromotions();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await api.get('/products?is_promotion=true&limit=4');
      setPromotions(response.data.products);
    } catch (error) {
      console.error('Failed to fetch promotions', error);
    }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      <section className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-72 h-72 bg-teal-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-6 leading-tight" data-testid="hero-title">
                {t('hero.title')}
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl" data-testid="hero-subtitle">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/catalog">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:shadow-lg hover:shadow-teal-900/20 transition-all"
                    data-testid="cta-catalog-btn"
                  >
                    {t('hero.browse')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/suppliers">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50"
                    data-testid="cta-suppliers-btn"
                  >
                    {t('nav.suppliers')}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: ShieldCheck, title: 'Проверенные поставщики', desc: 'Все продавцы проходят верификацию' },
              { icon: Award, title: 'Система лояльности', desc: 'Зарабатывайте VetPoints' },
              { icon: Truck, title: 'Быстрая доставка', desc: 'Оперативная обработка заказов' },
              { icon: TrendingUp, title: 'Лучшие цены', desc: 'Прямые поставки от производителей' }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="text-center p-6 rounded-xl hover:bg-slate-50 transition-colors"
                data-testid={`feature-${idx}`}
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-slate-50 to-white" data-testid="categories-section">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">{t('categories.title')}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Полный ассортимент ветеринарных товаров для всех видов животных
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category, idx) => (
              <Link
                key={category.id}
                to={`/catalog?category=${category.slug}`}
                data-testid={`category-${category.slug}`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:border-teal-200 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-2xl">💊</span>
                    </div>
                    <h3 className="font-heading font-semibold text-slate-900">{category.name}</h3>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {promotions.length > 0 && (
        <section className="py-20 bg-white" data-testid="promotions-section">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-12">
              <h2 className="font-heading font-bold text-3xl md:text-4xl">{t('nav.promotions')}</h2>
              <Link to="/promotions">
                <Button variant="outline" data-testid="view-all-promotions">
                  Все акции
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {promotions.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`} data-testid={`promo-product-${product.id}`}>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all group">
                    <div className="aspect-square bg-slate-100 relative overflow-hidden">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                      )}
                      {product.is_promotion && (
                        <div className="absolute top-2 right-2 bg-secondary text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Акция
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-2xl font-bold text-teal-600">${product.price}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-to-r from-teal-600 to-emerald-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl mb-6">
            Начните работу с VetGlobal уже сегодня
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Присоединяйтесь к крупнейшему B2B маркетплейсу ветеринарных товаров
          </p>
          <Link to="/catalog">
            <Button size="lg" className="bg-white text-teal-600 hover:bg-slate-50" data-testid="cta-bottom-btn">
              {t('hero.cta')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
