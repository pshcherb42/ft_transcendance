'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() 
{ 
    const router = useRouter();
    const [error, setError] = useState('');
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => 
    {
        e.preventDefault();
        const form = e.currentTarget;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const username = (form.elements.namedItem('username') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        try 
        {
            const res = await fetch('http://localhost:3001/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
            });
            const data = await res.json();
            if (!res.ok) 
            {
                throw new Error(data.message || 'Error registrant usuari');
            }
            router.push('/login');
        } 
        catch (err: any) 
        {
            setError(err.message);
        }
    };
  return (
        <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
            <h1>Register</h1>
                <form onSubmit={handleRegister}>
                    <input name="email" type="email" placeholder="Email" required style={{ width: '100%', padding: 8, marginBottom: 12 }} />
                    <input name="username" type="text" placeholder="Username" required style={{ width: '100%', padding: 8, marginBottom: 12 }} />
                    <input name="password" type="password" placeholder="Password" required style={{ width: '100%', padding: 8, marginBottom: 12 }} />
                    <button type="submit" style={{ width: '100%', padding: 10 }}>Register</button>
                    {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
                </form>
        </div>
  );
}