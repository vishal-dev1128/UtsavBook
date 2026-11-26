import { ConfirmationResult } from 'firebase/auth';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  KeyRound,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMandal } from '../context/MandalContext';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../lib/firebase';
import { Language } from '../types';

function formatE164Phone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return null;
}

function mapPhoneAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const message = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed') {
    return 'Phone Sign-In is disabled in Firebase Console (auth/operation-not-allowed). Enable Authentication → Sign-in method → Phone in Firebase Console, or sign in with Google below.';
  }
  if (code === 'auth/billing-not-enabled') {
    return 'Real SMS OTP requires Firebase Blaze billing (auth/billing-not-enabled). For free testing, add your number under Firebase Console → Authentication → Sign-in method → Phone → "Phone numbers for testing", or sign in with Google below.';
  }
  if (code === 'auth/unauthorized-domain' || code === 'auth/app-not-authorized') {
    return `This domain (${window.location.hostname}) is not authorized in Firebase Console (${code}). Add it under Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/captcha-check-failed' || code === 'auth/invalid-app-credential') {
    return `reCAPTCHA verification failed (${code}). Ensure ${window.location.hostname} is added to Firebase Console → Authentication → Settings → Authorized domains and retry.`;
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Invalid mobile number format. Enter a valid 10-digit Indian mobile number (e.g. 9822044110).';
  }
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
    return `Too many OTP requests (${code}). Please wait a few minutes and try again.`;
  }
  if (code === 'auth/invalid-verification-code') {
    return 'Incorrect 6-digit OTP. Please check the code and try again.';
  }
  if (code === 'auth/code-expired') {
    return 'OTP has expired. Go back and request a new OTP.';
  }
  return code ? `${message} (${code})` : message;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिन्दी' },
];

export function LoginPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const {
    user,
    dataLoading,
    loadError,
    retryLoad,
    needsOnboarding,
    mandal,
    language,
    setLanguage,
    tr,
    loginWithGoogle,
    logout,
    createMandal,
    joinMandalByCode,
  } = useMandal();

  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Onboarding tabs: create vs join
  const [onboardingTab, setOnboardingTab] = useState<'create' | 'join'>(code ? 'join' : 'create');
  const [mandalName, setMandalName] = useState('');
  const [localName, setLocalName] = useState('');
  const [address, setAddress] = useState('');
  const [estYear, setEstYear] = useState('2026');
  const [utsavName, setUtsavName] = useState('Ganeshotsav');
  const [yearCycle, setYearCycle] = useState('2026-27');
  const [upiId, setUpiId] = useState('');

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const [joinCodeInput, setJoinCodeInput] = useState(code?.toUpperCase() || '');
  const [memberNameInput, setMemberNameInput] = useState('');

  const normalizedRouteCode = code?.trim().toUpperCase() || '';
  const hasPendingRouteJoin = Boolean(
    normalizedRouteCode && (!mandal || mandal.joinCode.toUpperCase() !== normalizedRouteCode)
  );

  const activeLangIndex = Math.max(
    0,
    LANGUAGES.findIndex((l) => l.id === language)
  );

  useEffect(() => {
    if (normalizedRouteCode) {
      setJoinCodeInput(normalizedRouteCode);
      setOnboardingTab('join');
    }
  }, [normalizedRouteCode]);

  useEffect(() => {
    if (user?.displayName && !memberNameInput) {
      setMemberNameInput(user.displayName);
    }
  }, [user?.displayName, memberNameInput]);

  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // Ignore cleanup errors if DOM already unmounted
      }
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
  };

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  useEffect(() => {
    if (!dataLoading && user && mandal && !needsOnboarding && !hasPendingRouteJoin) {
      navigate('/home', { replace: true });
    }
  }, [dataLoading, user, mandal, needsOnboarding, hasPendingRouteJoin, navigate]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const formattedPhone = formatE164Phone(phoneInput);
    if (!formattedPhone) {
      setAuthError('Enter a valid 10-digit Indian mobile number (e.g. 9822044110).');
      return;
    }

    try {
      setBusy(true);
      clearRecaptcha();

      const container = recaptchaContainerRef.current;
      if (!container) throw new Error('reCAPTCHA container missing');

      auth.languageCode = language === 'mr' ? 'mr' : language === 'hi' ? 'hi' : 'en';
      const verifier = new RecaptchaVerifier(auth, container, {
        size: 'invisible',
      });
      recaptchaVerifierRef.current = verifier;

      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmResult(result);
    } catch (err) {
      clearRecaptcha();
      setAuthError(mapPhoneAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmResult || otpInput.trim().length < 6) return;
    setAuthError(null);
    try {
      setBusy(true);
      await confirmResult.confirm(otpInput.trim());
    } catch (err) {
      setAuthError(mapPhoneAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      setBusy(true);
      await loginWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateMandal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandalName.trim() || !address.trim()) return;
    setAuthError(null);
    try {
      setBusy(true);
      await createMandal({
        name: mandalName,
        localName,
        address,
        estYear,
        utsavName,
        yearCycle,
        upiId,
      });
      navigate('/home', { replace: true });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not create Mandal.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinMandal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setAuthError(null);
    try {
      setBusy(true);
      await joinMandalByCode(joinCodeInput, memberNameInput, phoneInput);
      navigate('/home', { replace: true });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not join Mandal.');
    } finally {
      setBusy(false);
    }
  };

  const userInitial = (user?.displayName || user?.email || user?.phoneNumber || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] text-slate-900 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overscroll-y-contain selection:bg-blue-500/15">
      {/* 120fps Compositor-Only Keyframes (transform + opacity only) */}
      <style>{`
        @keyframes loginCardReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, 14px, 0) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes stepFadeSlide {
          0% {
            opacity: 0;
            transform: translate3d(0, 8px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes ambientOrbFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.65;
          }
          50% {
            transform: translate3d(-8px, 6px, 0) scale(1.08);
            opacity: 0.95;
          }
        }
        .animate-login-card {
          will-change: transform, opacity;
          animation: loginCardReveal 0.48s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-step-in {
          will-change: transform, opacity;
          animation: stepFadeSlide 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-orb {
          will-change: transform, opacity;
          animation: ambientOrbFloat 7.5s ease-in-out infinite;
        }
      `}</style>

      <div className="flex-1 w-full max-w-[440px] mx-auto px-4 py-5 flex flex-col justify-between gap-4">
        {/* Top Utility & Brand Hero Section */}
        <div className="space-y-3.5">
          {/* Top Bar: Trust Pill + Sliding 3-Language Switcher */}
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-login-card flex items-center justify-between gap-2"
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-900 bg-white/95 backdrop-blur-xl px-3 py-1.5 rounded-full border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.05)]">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Digital Mandal Ledger</span>
            </div>

            {/* 120fps Sliding Language Pill */}
            <div className="relative grid grid-cols-3 p-0.5 rounded-full bg-slate-200/75 border border-slate-200/80">
              <div
                aria-hidden="true"
                style={{
                  width: 'calc((100% - 4px) / 3)',
                  transform: `translate3d(${activeLangIndex * 100}%, 0, 0)`,
                  willChange: 'transform',
                }}
                className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 rounded-full bg-white shadow-[0_2px_6px_-1px_rgba(16,24,40,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
              {LANGUAGES.map((l) => {
                const isActive = language === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id)}
                    className={`relative z-10 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors duration-200 touch-manipulation ${
                      isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liquid-Glass Hero Brand Card */}
          <div
            style={{ animationDelay: '55ms' }}
            className="animate-login-card relative overflow-hidden rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/90 p-5 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.09),inset_0_1px_0_0_rgba(255,255,255,1)]"
          >
            {/* Specular Top Highlight */}
            <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            {/* Ambient Emerald & Amber Glows */}
            <div className="pointer-events-none animate-orb absolute -right-10 -top-12 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/18 via-amber-300/12 to-transparent blur-2xl" />
            <div className="pointer-events-none absolute -right-8 -top-8 w-36 h-36 rounded-full border-[12px] border-blue-500/[0.04]" />

            <div className="relative z-10 flex flex-col items-center text-center gap-1.5 py-0.5">
              {/* UtsavBook official full lockup (Logo + Text) */}
              <img
                src="/logo-full.png"
                alt="UtsavBook"
                className="w-40 sm:w-44 h-auto object-contain mix-blend-multiply select-none"
              />
              <p className="text-xs text-slate-500 font-semibold leading-snug">
                {tr('tagline')}
              </p>
            </div>

            <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-500 truncate">
                Ganeshotsav · Navratri · Shiv Jayanti
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 font-extrabold shrink-0">
                5 Free Trial Receipts
              </span>
            </div>
          </div>
        </div>

        {/* Main Auth / Onboarding / Status Card */}
        {!user ? (
          <div
            style={{ animationDelay: '110ms' }}
            className="animate-login-card bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-5 space-y-4 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.08)]"
          >
            <div>
              <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
                {code ? `Join Mandal (${code.toUpperCase()})` : 'Sign in to UtsavBook'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Phone OTP or Google sign-in for Mandal Treasurers & Karyakartas
              </p>
            </div>

            <div ref={recaptchaContainerRef} id="recaptcha-container" />

            {!confirmResult ? (
              <form onSubmit={handleSendOtp} className="animate-step-in space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mobile Number (+91)
                  </label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      placeholder="98220 44110"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full h-12 pl-10 pr-3.5 rounded-2xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-bold text-slate-900 placeholder:text-slate-400 tabular-nums focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-sm font-extrabold shadow-sm shadow-blue-600/20 inline-flex items-center justify-center gap-2 transition-all touch-manipulation"
                >
                  <span>{busy ? 'Sending OTP...' : 'Send Phone OTP'}</span>
                  {!busy && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="animate-step-in space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Enter 6-digit OTP
                    </label>
                    <span className="text-[11px] font-semibold text-blue-700 tabular-nums">
                      Sent to {phoneInput}
                    </span>
                  </div>
                  <div className="relative group">
                    <KeyRound className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-12 pl-10 pr-3.5 rounded-2xl bg-[#F5F7FB] border border-slate-200/90 text-base font-mono font-bold tracking-[0.25em] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearRecaptcha();
                      setConfirmResult(null);
                      setOtpInput('');
                      setAuthError(null);
                    }}
                    className="h-12 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.97] text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1 transition-all touch-manipulation"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={busy || otpInput.length < 6}
                    className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-sm font-extrabold shadow-sm shadow-blue-600/20 transition-all touch-manipulation"
                  >
                    {busy ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </div>
              </form>
            )}

            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-slate-200/80" />
              <span className="shrink mx-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                Or continue with
              </span>
              <div className="flex-grow border-t border-slate-200/80" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="w-full h-12 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 border border-slate-200/95 text-sm font-bold text-slate-800 flex items-center justify-center gap-2.5 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.06)] transition-all touch-manipulation"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {authError && (
              <div className="animate-step-in p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium leading-relaxed">
                {authError}
              </div>
            )}
          </div>
        ) : loadError ? (
          <div
            style={{ animationDelay: '110ms' }}
            className="animate-login-card bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-6 text-center space-y-4 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.08)]"
          >
            <div className="space-y-1.5">
              <p className="text-sm font-extrabold text-rose-600">
                Could not load your Mandal ledger
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{loadError}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void retryLoad()}
                className="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition-all"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-xs font-bold text-slate-700 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : !dataLoading && (needsOnboarding || !mandal) ? (
          <div
            style={{ animationDelay: '110ms' }}
            className="animate-login-card bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-5 space-y-4 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.08)]"
          >
            {/* Signed-In User Bar */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                  {userInitial}
                </span>
                <div className="text-xs text-slate-500 truncate">
                  <strong className="text-slate-900 font-bold">
                    {user.displayName || user.email || user.phoneNumber || 'User'}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 active:scale-95 px-2 py-1 rounded-lg hover:bg-rose-50 transition-all shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* 120fps Sliding 2-Segment Onboarding Switcher */}
            <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80">
              <div
                aria-hidden="true"
                style={{
                  width: 'calc((100% - 8px) / 2)',
                  transform: `translate3d(${onboardingTab === 'create' ? 0 : 100}%, 0, 0)`,
                  willChange: 'transform',
                }}
                className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(16,24,40,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
              <button
                type="button"
                onClick={() => setOnboardingTab('create')}
                className={`relative z-10 h-9 rounded-xl text-xs font-bold transition-colors duration-200 touch-manipulation ${
                  onboardingTab === 'create'
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create New Mandal
              </button>
              <button
                type="button"
                onClick={() => setOnboardingTab('join')}
                className={`relative z-10 h-9 rounded-xl text-xs font-bold transition-colors duration-200 touch-manipulation ${
                  onboardingTab === 'join'
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Join via Invite Code
              </button>
            </div>

            {onboardingTab === 'create' ? (
              <form
                key="create-form"
                onSubmit={handleCreateMandal}
                className="animate-step-in space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Mandal Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shree Ganesh Mandal"
                      value={mandalName}
                      onChange={(e) => setMandalName(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Marathi / Hindi Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. श्री गणेश मित्र मंडळ"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 font-devanagari focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Area / Society / City *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Manjri Bk, Pune"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Est. Year
                    </label>
                    <input
                      type="text"
                      value={estYear}
                      onChange={(e) => setEstYear(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:bg-white focus:border-blue-500/60 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Utsav
                    </label>
                    <select
                      value={utsavName}
                      onChange={(e) => setUtsavName(e.target.value)}
                      className="w-full h-11 px-2 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500/60 transition-all"
                    >
                      <option value="Ganeshotsav">Ganeshotsav</option>
                      <option value="Navratri">Navratri</option>
                      <option value="Shiv Jayanti">Shiv Jayanti</option>
                      <option value="Dahi Handi">Dahi Handi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Cycle
                    </label>
                    <input
                      type="text"
                      value={yearCycle}
                      onChange={(e) => setYearCycle(e.target.value)}
                      className="w-full h-11 px-2.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:bg-white focus:border-blue-500/60 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Mandal UPI ID (For QR collection)
                  </label>
                  <input
                    type="text"
                    placeholder="mandalname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-sm font-extrabold shadow-sm shadow-blue-600/20 transition-all touch-manipulation"
                >
                  {busy ? 'Creating Mandal...' : 'Create Mandal & Start Book'}
                </button>
              </form>
            ) : (
              <form
                key="join-form"
                onSubmit={handleJoinMandal}
                className="animate-step-in space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Mandal Join Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MND-2WG6"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-mono font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Omkar More"
                      value={memberNameInput}
                      onChange={(e) => setMemberNameInput(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-sm font-extrabold shadow-sm shadow-blue-600/20 inline-flex items-center justify-center gap-2 transition-all touch-manipulation"
                >
                  <Users className="w-4 h-4" />
                  <span>{busy ? 'Joining...' : 'Join as Karyakarta'}</span>
                </button>
              </form>
            )}

            {authError && (
              <div className="animate-step-in p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium">
                {authError}
              </div>
            )}
          </div>
        ) : !dataLoading && mandal && hasPendingRouteJoin ? (
          <div
            style={{ animationDelay: '110ms' }}
            className="animate-login-card bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-5 space-y-4 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.08)]"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                  {userInitial}
                </span>
                <strong className="text-xs text-slate-900 font-bold truncate">
                  {user.displayName || user.email || user.phoneNumber || 'User'}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 shrink-0"
              >
                Sign Out
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 space-y-1">
              <div className="text-xs font-extrabold text-amber-900">
                Committee Invite: {normalizedRouteCode}
              </div>
              <p className="text-[11px] text-amber-950/80 leading-relaxed">
                You are currently viewing <strong>{mandal.name}</strong> ({mandal.joinCode}). Join{' '}
                <strong>{normalizedRouteCode}</strong> as a Karyakarta (Collector)?
              </p>
            </div>

            <form onSubmit={handleJoinMandal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omkar More"
                  value={memberNameInput}
                  onChange={(e) => setMemberNameInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all touch-manipulation"
                >
                  <Users className="w-4 h-4" />
                  <span>{busy ? 'Joining...' : `Join ${normalizedRouteCode}`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/home', { replace: true })}
                  className="h-11 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-xs font-bold text-slate-700 transition-all touch-manipulation"
                >
                  Keep {mandal.joinCode}
                </button>
              </div>
            </form>

            {authError && (
              <div className="animate-step-in p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium">
                {authError}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{ animationDelay: '110ms' }}
            className="animate-login-card bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-7 text-center space-y-3 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.08)]"
          >
            <div className="w-9 h-9 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-extrabold text-slate-900">Loading your Mandal ledger...</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              Sign out / Switch account
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 px-2 leading-relaxed">
          Simple, shared & transparent hisaab for Ganeshotsav, Navratri & Shiv Jayanti mandals.
        </p>
      </div>
    </div>
  );
}