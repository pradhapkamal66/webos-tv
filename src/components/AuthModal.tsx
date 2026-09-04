/**
 * StreamGlass TV - Authentication Modal
 * Supports 1-click Google Sign-In and Email ID login/signup with real-time Firebase connection.
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      setSuccessMsg('Successfully signed in with Google!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use Email sign-in.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again or use Email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password, displayName.trim());
        setSuccessMsg('Account created! Signed in to Firebase Realtime.');
      } else {
        await signInWithEmail(email.trim(), password);
        setSuccessMsg('Welcome back! Signed in to Firebase Realtime.');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If you are new, switch to "Create Account".');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email already has an account. Please switch to "Sign In".');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="auth-modal"
        className="w-[480px] bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white">
                {isSignUp ? 'Create StreamGlass Account' : 'Sign in to StreamGlass TV'}
              </h2>
              <p className="text-xs text-neutral-400">
                Sync videos, custom audio tracks & posters real-time in Firebase
              </p>
            </div>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* 1-Click Google Sign-In */}
        <div className="flex flex-col gap-2">
          <button
            id="btn-google-signin"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            {/* Google Vector Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[11px] text-neutral-500 uppercase tracking-widest font-mono">or with email</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 text-xs">
          {isSignUp && (
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Your Name / Profile</span>
              </label>
              <input
                id="input-auth-name"
                type="text"
                placeholder="e.g. John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Email Address</span>
            </label>
            <input
              id="input-auth-email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Password</span>
            </label>
            <input
              id="input-auth-password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/40 transition-all focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create one"}
            </button>
          </div>

          {/* Security & Cloud Badge */}
          <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Firebase Firestore Realtime
            </span>
            <span className="text-neutral-500 font-mono">Database: Google Cloud</span>
          </div>
        </form>
      </div>
    </div>
  );
};
