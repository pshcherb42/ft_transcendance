'use client';

import ProtectedRoute from '../components/ProtectedRoute';

export default function GamePage() {
  return (
    <ProtectedRoute>
      <main>
        <h1>Game</h1>
        <p>Pong canvas goes here — Person C</p>
      </main>
    </ProtectedRoute>
  );
}
