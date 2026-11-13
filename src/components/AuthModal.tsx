import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoleType } from '../types';
import { X, Lock, Mail, User as UserIcon, Phone, CheckCircle2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

const REGISTER_ROLE_OPTIONS: Array<{ value: RoleType; label: string }> = [
  { value: 'artist', label: 'Bireysel Sanatçı' },
  { value: 'ensemble_leader', label: 'Topluluk / Grup' },
  { value: 'business_owner', label: 'Mekân / İşletme' },
  { value: 'venue_manager', label: 'Sahne Yöneticisi' },
  { value: 'technical_provider', label: 'Teknik Sağlayıcı' },
  { value: 'organizer', label: 'Organizatör / Festival' },
  { value: 'audience', label: 'Sanatsever / İzleyici' },
];

export const AuthModal: React.FC = () => {
  const { authModalMode, setAuthModalMode, login, demoLogin, register, resetPassword, runtimeConfig } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [role, setRole] = useState<RoleType>('artist');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!authModalMode) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      if (authModalMode === 'login') {
        if (!email || !password) {
          setFeedback({ type: 'error', message: 'Lütfen e-posta ve şifre alanlarını doldurunuz.' });
          return;
        }
        const res = await login(email, password);
        if (res.success) {
          setFeedback({ type: 'success', message: 'Başarıyla giriş yapıldı!' });
        } else {
          setFeedback({ type: 'error', message: res.error || 'E-posta veya şifre hatalı.' });
        }
      } else if (authModalMode === 'register') {
        if (!email || !firstName || !password) {
          setFeedback({ type: 'error', message: 'Lütfen ad, e-posta ve en az 6 haneli şifre giriniz.' });
          return;
        }
        const res = await register({
          email,
          password,
          firstName,
          lastName,
          role,
          phone,
          organizationName: organizationName.trim() || undefined,
          city,
        });
        if (res.success) {
          setFeedback({ type: 'success', message: 'Üyeliğiniz oluşturuldu ve oturum açıldı!' });
        } else {
          setFeedback({ type: 'error', message: res.error || 'Kayıt işlemi tamamlanamadı.' });
        }
      } else if (authModalMode === 'forgot_password') {
        if (!email) {
          setFeedback({ type: 'error', message: 'Lütfen kayıtlı e-posta adresinizi giriniz.' });
          return;
        }
        const res = await resetPassword(email);
        setFeedback({ type: res.success ? 'success' : 'error', message: res.message || res.error || 'Talep işlendi.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await demoLogin(demoEmail);
      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Demo girişi yapılamadı.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const needsOrgField = ['ensemble_leader', 'business_owner', 'venue_manager', 'technical_provider', 'organizer'].includes(role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto">
      <div className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-left my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight leading-tight">
              SANAT<span className="text-[#E45424]">.SAHNEDE</span>
            </div>
            <div className="label-caps text-slate-500 dark:text-slate-400 mt-0.5">Kültür &amp; Sahne Ekosistemi</div>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalMode(null)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        {authModalMode !== 'forgot_password' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-display font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setFeedback(null);
              }}
              className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
                authModalMode === 'login'
                  ? 'border-[#E45424] text-[#E45424] bg-white dark:bg-[#111A2E]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('register');
                setFeedback(null);
              }}
              className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
                authModalMode === 'register'
                  ? 'border-[#E45424] text-[#E45424] bg-white dark:bg-[#111A2E]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              Yeni Üye Ol
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              {authModalMode === 'login' && 'Hesabınıza Giriş Yapın'}
              {authModalMode === 'register' && 'Sanat Ekosistemine Katılın'}
              {authModalMode === 'forgot_password' && 'Şifremi Unuttum'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {authModalMode === 'login' && 'Sanatçı, topluluk, mekân veya teknik sağlayıcı hesabınızla devam edin.'}
              {authModalMode === 'register' && 'Size uygun rolü seçerek doğrulanabilir profilinizi ve çalışma alanınızı oluşturun.'}
              {authModalMode === 'forgot_password' && 'Kayıtlı e-posta adresinizi girerek şifre sıfırlama talebi oluşturun.'}
            </p>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {authModalMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">Hesap Türünüz</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {REGISTER_ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`py-2 px-2 text-center rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
                          role === opt.value
                            ? 'border-[#E45424] bg-[#E45424] text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Ad *</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Adınız"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Soyad</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Soyadınız"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                    />
                  </div>
                </div>

                {needsOrgField && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Kurum / Topluluk / Mekân Adı</label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Örn: Boğaziçi Oda Triosu veya Moda Sahnesi"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Telefon</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+90 532 000 00 00"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Şehir</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="İstanbul"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adiniz@sanatsahnede.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                />
              </div>
            </div>

            {authModalMode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">Şifre</label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('forgot_password');
                        setFeedback(null);
                      }}
                      className="text-[11px] font-semibold text-[#1E2B4F] dark:text-orange-400 hover:text-[#E45424] hover:underline cursor-pointer"
                    >
                      Şifremi unuttum?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#E45424]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#E45424] hover:bg-[#c94317] disabled:opacity-60 text-white rounded-xl text-xs font-display font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-2 cursor-pointer"
            >
              <span>
                {submitting
                  ? 'İşleniyor...'
                  : authModalMode === 'login'
                  ? 'Giriş Yap'
                  : authModalMode === 'register'
                  ? 'Hesabı Oluştur ve Başla'
                  : 'Sıfırlama Bağlantısı Gönder'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {authModalMode === 'forgot_password' && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setFeedback(null);
                }}
                className="text-xs text-[#1E2B4F] dark:text-orange-400 hover:text-[#E45424] underline font-semibold cursor-pointer"
              >
                Giriş ekranına geri dön
              </button>
            </div>
          )}

          {/* Isolated Sandbox Quick Demo Switcher */}
          {runtimeConfig.enableDemoQuickLogin && authModalMode === 'login' && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-center gap-1.5 label-caps text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-[#E45424]" />
                <span>Sandbox Demo Hesapları (Şifre: DemoSanat123!)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { name: 'Efe Özkan', role: 'Sanatçı', email: 'efeozkaniletisim@gmail.com' },
                  { name: 'Grand Bosphorus', role: 'İşletme / Kurum', email: 'etkinlik@grandbosphorus.com' },
                  { name: 'İstanbul String Trio', role: 'Topluluk Lideri', email: 'selin@istanbulstringtrio.com' },
                  { name: 'Kadıköy Akustik', role: 'Mekân Yöneticisi', email: 'sahne@kadikoyakustik.com' },
                  { name: 'Ses ve Sahne A.Ş.', role: 'Teknik Sağlayıcı', email: 'teknik@sesvesahne.com' },
                  { name: 'İstanbul Oda Fest.', role: 'Organizatör', email: 'festival@istanbuloda.org' },
                  { name: 'Ece Demirtaş', role: 'Sanatsever / İzleyici', email: 'izleyici@sanatsever.com' },
                  { name: 'Platform Admin', role: 'Yönetim & Denetim', email: 'admin@sahnesanat.com' },
                ].map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemoLogin(d.email)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[10px] truncate">{d.role}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
