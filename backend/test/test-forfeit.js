const { io } = require('socket.io-client');

async function loginUser(email, password) {
  try {
    const response = await fetch('http://nginx/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(`HTTP login error: ${response.status}`);
    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error(`Could not get the token for ${email}:`, error.message);
    process.exit(1);
  }
}

function connect(name, token) {
  const socket = io('http://nginx', {
    auth: { token },
    rejectUnauthorized: false,
    transports: ['websocket'],
    path: '/socket.io/',
  });

  socket.on('connect', () => {
    console.log(`[${name}] connected with ID: ${socket.id}`);
    socket.emit('joinQueue');
  });

  socket.on('waiting', () => console.log(`[${name}] in queue, waiting for an opponent...`));
  socket.on('matchFound', (data) => console.log(`[${name}] Match found! Room ID: ${data.roomId} | Side: ${data.side}`));
  socket.on('opponentDisconnected', (data) => console.log(`[${name}] The opponent disconnected. Grace period: ${data.gracePeriodMs}ms`));
  socket.on('opponentReconnected', (data) => console.log(`[${name}] The opponent reconnected: ${data.userId}`));
  socket.on('gameOver', (data) => {
    console.log(`[${name}] GAME OVER. Reason: ${data.reason} | Winner: ${data.winnerId} | Forfeited by: ${data.forfeitedBy}`);
    if (name.startsWith('B')) {
      socket.disconnect();
      process.exit(0);
    }
  });
  socket.on('connect_error', (err) => console.log(`[${name}] connection error:`, err.message));
  socket.on('disconnect', (reason) => console.log(`[${name}] disconnected due to:`, reason));

  return socket;
}

async function startTest() {
  console.log('=== TEST: FORFEIT (no reconnection) ===');
  console.log('Requesting tokens...');
  const tokenA = await loginUser('userA@test.com', 'yourpassword');
  const tokenB = await loginUser('userB@test.com', 'yourpassword');
  console.log('Tokens obtained successfully.');

  const a = connect('A', tokenA);
  connect('B', tokenB);

  setTimeout(() => {
    console.log(`--- Disconnecting Player A at: ${new Date().toISOString()} (no reconnection) ---`);
    a.disconnect();
    console.log('--- Waiting for the grace period (15s) to confirm the forfeit... ---');
  }, 5000);

  // Safety timeout in case gameOver never fires — fail loudly instead of hanging
  setTimeout(() => {
    console.error('TIMEOUT: gameOver was never emitted. Check the backend.');
    process.exit(1);
  }, 25000);
}

startTest();
