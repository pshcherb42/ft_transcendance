'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = 'http://localhost:3001';

export default function LoginPage() 
{
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() 
  {
    setLoading(true);
    setError(null);

    try 
    {
      const res = await fetch(`${API_BASE}/auth/login`, 
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) 
      {
        throw new Error(data?.message || 'Credencials incorrectes');
      }
      if (!data.accessToken) 
      {
        throw new Error('Resposta invàlida del servidor');
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/game');
    } 
    catch (err: any) 
    {
      setError(err.message);
    } 
    finally 
    {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Login</h1>
      <input
        placeholder="Username or email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: '100%', marginBottom: 12, padding: 8 }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 12, padding: 8 }}
      />
      <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 10 }}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      <button
        type="button"
        onClick={() => (window.location.href = `${API_BASE}/auth/google`)}
        style={{ width: '100%', padding: 10, marginTop: 12 }}
      >
        Sign in with Google
      </button>
      <button
        type="button"
        onClick={() => (window.location.href = `${API_BASE}/auth/42`)}
        style={{ width: '100%', padding: 10, marginTop: 12 }}
      >
        Sign in with 42
      </button>
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
    </main>
  );
}
