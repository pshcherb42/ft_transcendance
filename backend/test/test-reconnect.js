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
  socket.on('rejoinedGame', (data) => console.log(`[${name}] Rejoined the room: ${data.roomId}`));
  socket.on('opponentDisconnected', (data) => console.log(`[${name}] The opponent disconnected. Grace period: ${data.gracePeriodMs}ms`));
  socket.on('opponentReconnected', (data) => {
    console.log(`[${name}] The opponent reconnected: ${data.userId}`);
    if (name === 'B') {
      console.log('=== TEST PASSED: the match resumed after the reconnection ===');
      socket.disconnect();
      process.exit(0);
    }
  });
  socket.on('gameOver', (data) => {
    console.log(`[${name}] GAME OVER (unexpected in this test). Reason: ${data.reason}`);
    process.exit(1); // reconnect test should never reach forfeit
  });
  socket.on('connect_error', (err) => console.log(`[${name}] connection error:`, err.message));
  socket.on('disconnect', (reason) => console.log(`[${name}] disconnected due to:`, reason));

  return socket;
}

async function startTest() {
  console.log('=== TEST: RECONNECTION within the grace period ===');
  console.log('Requesting tokens...');
  const tokenA = await loginUser('userA@test.com', 'yourpassword');
  const tokenB = await loginUser('userB@test.com', 'yourpassword');
  console.log('Tokens obtained successfully.');

  let a = connect('A', tokenA);
  connect('B', tokenB);

  setTimeout(() => {
    console.log(`--- Disconnecting Player A at: ${new Date().toISOString()} ---`);
    a.disconnect();
  }, 5000);

  setTimeout(() => {
    console.log(`--- Reconnecting Player A at: ${new Date().toISOString()} (within the 15s) ---`);
    a = connect('A (reconnected)', tokenA);
  }, 11000); // disconnect at 5s + reconnect 6s later = well within the 15s window

  // Safety timeout in case opponentReconnected never fires
  setTimeout(() => {
    console.error('TIMEOUT: opponentReconnected was never emitted. Check the backend.');
    process.exit(1);
  }, 25000);
}

startTest();
