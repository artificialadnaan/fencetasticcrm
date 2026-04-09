import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? 'Fencetastic2024!';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(email: string, name: string) {
    setLoading(name);
    setError(null);
    try {
      await login(email, DEV_PASSWORD);
      navigate('/');
    } catch {
      setError(`Failed to sign in as ${name}. Please try again.`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="shell-canvas min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-slate-950 text-lg font-semibold text-white shadow-[0_18px_48px_rgba(4,10,24,0.25)]">
          F
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Fencetastic
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Select your account to continue</p>

        {error && (
          <div className="mt-6 rounded-[24px] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          <button
            onClick={() => handleSelect('adnaan@fencetastic.com', 'Adnaan')}
            className="shell-panel rounded-[24px] p-6 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
            disabled={loading !== null}
          >
            <p className="text-lg font-semibold text-slate-950">Adnaan</p>
            <p className="mt-1 text-sm text-slate-500">adnaan@fencetastic.com</p>
          </button>
          <button
            onClick={() => handleSelect('meme@fencetastic.com', 'Meme')}
            className="shell-panel rounded-[24px] p-6 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
            disabled={loading !== null}
          >
            <p className="text-lg font-semibold text-slate-950">Meme</p>
            <p className="mt-1 text-sm text-slate-500">meme@fencetastic.com</p>
          </button>
        </div>
        {loading && (
          <p className="mt-6 text-sm text-slate-500">Signing in as {loading}...</p>
        )}
      </div>
    </div>
  );
}
