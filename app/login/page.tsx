'use client';

/**
 * Beautiful login/register page with animations, glassmorphism,
 * real-time validation, and guest mode.
 */

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthContext';
import { useFormValidation, type PasswordStrength } from '@/lib/validation/formValidator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isGuest,
    isEmailVerified,
    loading: authLoading,
    signInWithEmail,
    signInWithGoogle,
    register,
    resendVerificationEmail,
  } = useAuth();

  const {
    emailError,
    passwordStrength,
    validateEmailField,
    validatePasswordField,
    validateRequiredField,
    resetValidation,
  } = useFormValidation();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && !isGuest && user && isEmailVerified) {
      router.replace('/');
    }
  }, [authLoading, isGuest, user, isEmailVerified, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setResendDisabled(false);
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [resendCountdown]);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.success) {
      router.replace('/');
    } else if (result.error.message) {
      setError(result.error.message);
    }
    setGoogleLoading(false);
  }, [signInWithGoogle, router]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email.trim()) { setError('Email jest wymagany'); return; }
      if (!password.trim()) { setError('Hasło jest wymagane'); return; }
      if (mode === 'register' && !displayName.trim()) { setError('Imię jest wymagane'); return; }
      if (mode === 'register' && !passwordStrength.isValid) { setError('Hasło nie spełnia wymagań'); return; }

      setSubmitting(true);
      try {
        if (mode === 'register') {
          const result = await register(email, password, displayName);
          if (!result.success) { setError(result.error.message); setSubmitting(false); return; }
        } else {
          const result = await signInWithEmail(email, password);
          if (!result.success) { setError(result.error.message); setSubmitting(false); return; }
        }
        router.replace('/');
      } catch {
        setError('Wystąpił nieoczekiwany błąd.');
        setSubmitting(false);
      }
    },
    [email, password, displayName, mode, passwordStrength.isValid, register, signInWithEmail, router]
  );

  const handleModeSwitch = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    resetValidation();
  }, [resetValidation]);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Verification banner
  const showVerificationBanner = !isGuest && user && !isEmailVerified;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-border/50 shadow-xl backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Verification Banner */}
            <AnimatePresence>
              {showVerificationBanner && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-700 dark:text-orange-300"
                >
                  Zweryfikuj email, aby odblokować pełne funkcje.
                  <button
                    onClick={async () => {
                      await resendVerificationEmail();
                      setResendDisabled(true);
                      setResendCountdown(60);
                    }}
                    disabled={resendDisabled}
                    className="ml-2 font-medium underline disabled:opacity-50"
                  >
                    {resendDisabled ? `Wyślij ponownie (${resendCountdown}s)` : 'Wyślij ponownie'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.6 } }}
              >
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                  <path d="M11 25c0-5 4-9 9-9s9 4 9 9H11z" fill="white"/>
                  <rect x="9" y="25" width="22" height="3" rx="1.5" fill="white"/>
                  <rect x="18.5" y="12" width="3" height="5" rx="1.5" fill="white"/>
                </svg>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-2xl font-bold">
                  <span className="text-foreground">Na</span>
                  <span className="text-primary">Etacie</span>
                </h1>
              </motion.div>
              <motion.p
                className="text-sm text-muted-foreground mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {mode === 'login'
                  ? 'Zaloguj się, aby śledzić swoje oferty pracy'
                  : 'Dołącz, aby mieć pełny dostęp do ogłoszeń'}
              </motion.p>
            </div>

            {/* Google Sign-In */}
            <Button
              variant="outline"
              className="w-full h-11 gap-3 mb-4"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
              )}
              Kontynuuj z Google
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-card text-muted-foreground">lub</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    key="name-field"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Twoje imię"
                        value={displayName}
                        onChange={(e) => { setDisplayName(e.target.value); validateRequiredField('Display Name', e.target.value); }}
                        className="pl-10"
                        disabled={submitting}
                        maxLength={100}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); validateEmailField(e.target.value); }}
                  className={cn('pl-10', emailError && 'border-destructive')}
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <p className="text-xs text-destructive -mt-2 ml-1">{emailError}</p>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? '8+ znaków, duża litera, cyfra' : 'Hasło'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (mode === 'register') validatePasswordField(e.target.value); }}
                  className="pl-10 pr-10"
                  disabled={submitting}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              <AnimatePresence>
                {mode === 'register' && password.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1.5"
                  >
                    <PasswordStrengthBar strength={passwordStrength} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button type="submit" className="w-full h-11 gap-2" disabled={submitting || googleLoading}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Mode switch */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === 'login' ? 'Nie masz konta?' : 'Masz już konto?'}{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
                className="text-primary font-medium hover:underline"
              >
                {mode === 'login' ? 'Zarejestruj się' : 'Zaloguj się'}
              </button>
            </p>

            {/* Guest / Read-Only mode */}
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <Button
                variant="outline"
                className="w-full text-foreground font-semibold gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/60 transition-all shadow-xs"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('naetacie_read_only_guest', 'true');
                  }
                  router.replace('/');
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                👀 Wejdź bez rejestracji (Tryb Odczytu / Read-Only)
              </Button>
              <p className="text-[11px] text-center text-muted-foreground/80">
                Pełny dostęp do podglądu mapy i wyszukiwania ofert • Bez podawania emaila
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// --- Password Strength Bar ---

function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
  const criteria = [
    { met: strength.hasMinLength, label: '8+ znaków' },
    { met: strength.hasUppercase, label: 'Duża litera' },
    { met: strength.hasLowercase, label: 'Mała litera' },
    { met: strength.hasDigit, label: 'Cyfra' },
  ];

  const percentage = (strength.score / 4) * 100;
  const color = percentage <= 25 ? 'bg-destructive' : percentage <= 50 ? 'bg-orange-500' : percentage <= 75 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {/* Criteria */}
      <div className="grid grid-cols-2 gap-1">
        {criteria.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.met ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground/50" />
            )}
            <span className={c.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
