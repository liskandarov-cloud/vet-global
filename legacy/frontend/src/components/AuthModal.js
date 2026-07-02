import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner';

const AuthModal = ({ open, onClose, mode, onSwitchMode }) => {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    company: '',
    inn: '',
    role: 'buyer'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast.success(t('common.success'));
        onClose();
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        await register({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          company: formData.company,
          inn: formData.inn,
          role: formData.role
        });
        toast.success(t('common.success'));
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              data-testid="email-input"
            />
          </div>

          <div>
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              data-testid="password-input"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  data-testid="confirm-password-input"
                />
              </div>

              <div>
                <Label htmlFor="full_name">{t('auth.fullName')}</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  data-testid="fullname-input"
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('auth.phone')}</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  data-testid="phone-input"
                />
              </div>

              <div>
                <Label htmlFor="company">{t('auth.company')}</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  data-testid="company-input"
                />
              </div>

              <div>
                <Label htmlFor="inn">{t('auth.inn')}</Label>
                <Input
                  id="inn"
                  name="inn"
                  value={formData.inn}
                  onChange={handleChange}
                  data-testid="inn-input"
                />
              </div>

              <div>
                <Label>{t('auth.role')}</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="buyer" id="buyer" data-testid="role-buyer" />
                    <Label htmlFor="buyer" className="font-normal cursor-pointer">
                      {t('auth.buyer')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="seller" id="seller" data-testid="role-seller" />
                    <Label htmlFor="seller" className="font-normal cursor-pointer">
                      {t('auth.seller')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-600 to-emerald-500"
            disabled={loading}
            data-testid="submit-btn"
          >
            {loading ? t('common.loading') : mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
          </Button>

          <div className="text-center text-sm text-slate-600">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <button
              type="button"
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="text-teal-600 hover:underline font-medium"
              data-testid="switch-mode-btn"
            >
              {mode === 'login' ? t('auth.registerBtn') : t('auth.loginBtn')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
