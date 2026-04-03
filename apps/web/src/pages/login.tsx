import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(email: string, name: string) {
    setLoading(name);
    try {
      await login(email, 'Fencetastic2024!');
      navigate('/');
    } catch {
      alert('Login failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent mb-2">
          Fencetastic
        </h1>
        <p className="text-muted-foreground mb-8">Select your account</p>
        <div className="grid gap-4">
          <button
            onClick={() => handleSelect('adnaan@fencetastic.com', 'Adnaan')}
            className="p-6 rounded-lg border-2 hover:border-brand-purple transition-colors bg-white text-left"
            disabled={loading !== null}
          >
            <p className="text-lg font-semibold">Adnaan</p>
            <p className="text-sm text-muted-foreground">adnaan@fencetastic.com</p>
          </button>
          <button
            onClick={() => handleSelect('meme@fencetastic.com', 'Meme')}
            className="p-6 rounded-lg border-2 hover:border-brand-cyan transition-colors bg-white text-left"
            disabled={loading !== null}
          >
            <p className="text-lg font-semibold">Meme</p>
            <p className="text-sm text-muted-foreground">meme@fencetastic.com</p>
          </button>
        </div>
        {loading && (
          <p className="mt-4 text-sm text-muted-foreground">Signing in as {loading}...</p>
        )}
      </div>
    </div>
  );
}
