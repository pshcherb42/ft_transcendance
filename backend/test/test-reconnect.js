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
  socket.on('rejoinedGame', (data) => console.log(`[${name}] Reincorporado a la sala: ${data.roomId}`));
  socket.on('opponentDisconnected', (data) => console.log(`[${name}] El rival se desconectó. Periodo de gracia: ${data.gracePeriodMs}ms`));
  socket.on('opponentReconnected', (data) => {
    console.log(`[${name}] El rival se ha reconectado: ${data.userId}`);
    if (name === 'B') {
      console.log('=== TEST PASADO: la partida se reanudó tras la reconexión ===');
      socket.disconnect();
      process.exit(0);
    }
  });
  socket.on('gameOver', (data) => {
    console.log(`[${name}] PARTIDA TERMINADA (inesperado en este test). Razón: ${data.reason}`);
    process.exit(1); // reconnect test should never reach forfeit
  });
  socket.on('connect_error', (err) => console.log(`[${name}] error de conexión:`, err.message));
  socket.on('disconnect', (reason) => console.log(`[${name}] desconectado debido a:`, reason));

  return socket;
}

async function startTest() {
  console.log('=== TEST: RECONEXIÓN dentro del periodo de gracia ===');
  console.log('Solicitando tokens...');
  const tokenA = await loginUser('userA@test.com', 'yourpassword');
  const tokenB = await loginUser('userB@test.com', 'yourpassword');
  console.log('Tokens obtenidos con éxito.');

  let a = connect('A', tokenA);
  connect('B', tokenB);

  setTimeout(() => {
    console.log(`--- Desconectando al Jugador A en: ${new Date().toISOString()} ---`);
    a.disconnect();
  }, 5000);

  setTimeout(() => {
    console.log(`--- Reconectando al Jugador A en: ${new Date().toISOString()} (dentro de los 15s) ---`);
    a = connect('A (reconectado)', tokenA);
  }, 11000); // disconnect at 5s + reconnect 6s later = well within the 15s window

  // Safety timeout in case opponentReconnected never fires
  setTimeout(() => {
    console.error('TIMEOUT: opponentReconnected nunca se emitió. Revisa el backend.');
    process.exit(1);
  }, 25000);
}

startTest();