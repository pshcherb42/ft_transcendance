const { io } = require('socket.io-client');

async function loginUser(email, password) {
  try {
    const response = await fetch('http://nginx/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(`Error en login HTTP: ${response.status}`);
    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error(`No se pudo obtener el token para ${email}:`, error.message);
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
    console.log(`[${name}] conectado con ID: ${socket.id}`);
    socket.emit('joinQueue');
  });

  socket.on('waiting', () => console.log(`[${name}] en cola, esperando rival...`));
  socket.on('matchFound', (data) => console.log(`[${name}] ¡Partida encontrada! ID Sala: ${data.roomId} | Lado: ${data.side}`));
  socket.on('opponentDisconnected', (data) => console.log(`[${name}] El rival se desconectó. Periodo de gracia: ${data.gracePeriodMs}ms`));
  socket.on('opponentReconnected', (data) => console.log(`[${name}] El rival se ha reconectado: ${data.userId}`));
  socket.on('gameOver', (data) => {
    console.log(`[${name}] PARTIDA TERMINADA. Razón: ${data.reason} | Ganador: ${data.winnerId} | Abandonó: ${data.forfeitedBy}`);
    if (name.startsWith('B')) {
      socket.disconnect();
      process.exit(0);
    }
  });
  socket.on('connect_error', (err) => console.log(`[${name}] error de conexión:`, err.message));
  socket.on('disconnect', (reason) => console.log(`[${name}] desconectado debido a:`, reason));

  return socket;
}

async function startTest() {
  console.log('=== TEST: FORFEIT (sin reconexión) ===');
  console.log('Solicitando tokens...');
  const tokenA = await loginUser('userA@test.com', 'yourpassword');
  const tokenB = await loginUser('userB@test.com', 'yourpassword');
  console.log('Tokens obtenidos con éxito.');

  const a = connect('A', tokenA);
  connect('B', tokenB);

  setTimeout(() => {
    console.log(`--- Desconectando al Jugador A en: ${new Date().toISOString()} (sin reconexión) ---`);
    a.disconnect();
    console.log('--- Esperando periodo de gracia (15s) para confirmar forfeit... ---');
  }, 5000);

  // Safety timeout in case gameOver never fires — fail loudly instead of hanging
  setTimeout(() => {
    console.error('TIMEOUT: gameOver nunca se emitió. Revisa el backend.');
    process.exit(1);
  }, 25000);
}

startTest();
