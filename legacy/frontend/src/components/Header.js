import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { ShoppingCart, User, LogOut, Menu, Globe } from 'lucide-react';
import AuthModal from './AuthModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ru' ? 'uz' : 'ru');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'seller':
        return '/seller';
      case 'buyer':
        return '/dashboard';
      default:
        return '/';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-100 shadow-sm" data-testid="header">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 flex items-center justify-center">
                <span className="text-white font-heading font-bold text-lg">V</span>
              </div>
              <span className="font-heading font-bold text-xl text-slate-900">VetGlobal</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/catalog"
                className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
                data-testid="catalog-link"
              >
                {t('nav.catalog')}
              </Link>
              <Link
                to="/promotions"
                className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
                data-testid="promotions-link"
              >
                {t('nav.promotions')}
              </Link>
              <Link
                to="/suppliers"
                className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
                data-testid="suppliers-link"
              >
                {t('nav.suppliers')}
              </Link>
              <Link
                to="/blog"
                className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
                data-testid="blog-link"
              >
                {t('nav.blog')}
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                data-testid="language-toggle"
                className="gap-2"
              >
                <Globe className="w-4 h-4" />
                {i18n.language.toUpperCase()}
              </Button>

              <Link to="/cart" className="relative" data-testid="cart-link">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary text-white text-xs flex items-center justify-center" data-testid="cart-count">
                      {itemCount}
                    </span>
                  )}
                </Button>
              </Link>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="user-menu">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(getDashboardRoute())} data-testid="profile-link">
                      {t('nav.profile')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuth(true);
                  }}
                  className="hidden md:flex bg-gradient-to-r from-teal-600 to-emerald-500 hover:shadow-lg hover:shadow-teal-900/20 transition-all"
                  data-testid="login-btn"
                >
                  {t('nav.login')}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-4 px-4 space-y-2" data-testid="mobile-menu">
            <Link
              to="/catalog"
              className="block py-2 text-slate-600 hover:text-teal-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.catalog')}
            </Link>
            <Link
              to="/promotions"
              className="block py-2 text-slate-600 hover:text-teal-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.promotions')}
            </Link>
            <Link
              to="/suppliers"
              className="block py-2 text-slate-600 hover:text-teal-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.suppliers')}
            </Link>
            <Link
              to="/blog"
              className="block py-2 text-slate-600 hover:text-teal-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.blog')}
            </Link>
            {!user && (
              <Button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuth(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-4"
              >
                {t('nav.login')}
              </Button>
            )}
          </div>
        )}
      </header>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        mode={authMode}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />
    </>
  );
};
