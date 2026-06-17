'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';

type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    fetch('http://localhost:3001/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('No s’ha pogut carregar l’usuari');
        }
        return res.json();
      })
      .then((data) => setUser(data))
      .catch((err) => {
        setError(err.message);
        if (err.message.includes('401')) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <main>Loading perfil...</main>;
  }

  if (error) {
    return (
      <main>
        <p style={{ color: 'red' }}>{error}</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <main style={{ maxWidth: 520, margin: '0 auto', padding: 20 }}>
        <h1>Perfil</h1>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <img
            src={user.avatarUrl ?? '/default-avatar.png'}
            alt="Avatar"
            width={120}
            height={120}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <p><strong>Usuari:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.id}</p>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
