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

function connect(name, token, opts = {}) {
    return io('http://nginx', {
      auth: { token },
      rejectUnauthorized: false,
      transports: ['websocket'],
      path: '/socket.io/',
      autoConnect: false,
      ...opts,
    });
}

function killConnectionAbruptly(socket) {
  const rawSocket = socket.io.engine?.transport?.ws?._socket;
  if (rawSocket && typeof rawSocket.destroy === 'function') {
    rawSocket.destroy();
  } else {
    socket.io.engine?.close();
  }
}

// We can't synchronously prevent B from being paired against A's just-dead
// socket (see test-stale-queue.js) — it's a physical limit: the server
// can't know A died before it receives the network notification. What we
// CAN and must guarantee is that, once paired, the system self-heals:
// when A's disconnect arrives (a few ms later), the same 15s grace period
// must kick in and, with no reconnection, B must win by forfeit — just
// like any "normal" mid-match disconnect.
async function startTest() {
  console.log('=== TEST: SELF-HEALING AFTER BEING PAIRED AGAINST A DEAD SOCKET ===');
  console.log('Requesting tokens...');
  const tokenA = await loginUser('userA@test.com', 'yourpassword');
  const tokenB = await loginUser('userB@test.com', 'yourpassword');
  console.log('Tokens obtained.');

  const a = connect('A', tokenA, { reconnection: false }); // A must not reconnect on its own
  const b = connect('B', tokenB);

  a.connect();

  a.on('connect', () => {
    console.log(`[A] connected with ID: ${a.id}`);
    a.emit('joinQueue');
  });

  a.once('waiting', () => {
    console.log('[A] is in the queue. Triggering the race condition...');
    b.connect();

    b.on('connect', () => {
      console.log(`[B] connected with ID: ${b.id}. Simultaneous attack...`);
      killConnectionAbruptly(a);
      b.emit('joinQueue');
    });

    b.once('matchFound', (data) => {
      // This is the EXPECTED result now: we know B sometimes gets paired
      // against A's dying socket. What we're testing is what happens
      // AFTERWARD.
      console.log(`[B] Paired (possibly against A's dead socket). Room: ${data.roomId}`);
      console.log('--- Waiting for self-healing via the grace period... ---');
    });

    b.once('opponentDisconnected', (data) => {
      console.log(`[B] The opponent disconnected. Grace period: ${data.gracePeriodMs}ms`);
    });

    b.once('gameOver', (data) => {
      if (data.reason === 'forfeit') {
        console.log(`PASSED: The system self-healed. B wins by forfeit. Winner: ${data.winnerId}`);
        process.exit(0);
      } else {
        console.error(`FAILED: gameOver with an unexpected reason: ${data.reason}`);
        process.exit(1);
      }
    });

    // If B was never paired (the guard did catch it this time — also
    // valid, both outcomes are acceptable) we confirm via that path.
    b.once('waiting', () => {
      console.log('PASSED (alternative): the liveness guard did catch the dead socket this time.');
      console.log('B was safely put back to waiting — no self-healing needed.');
      process.exit(0);
    });

    // A gameOver should arrive within ~15-20s if it was paired against
    // the dead socket. If nothing arrives, the self-healing is broken.
    setTimeout(() => {
      console.error('TIMEOUT: neither matchFound->gameOver nor waiting arrived in time. Check the backend.');
      process.exit(1);
    }, 20000);
  });
}

startTest();
