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

// No podemos evitar de forma síncrona que B sea emparejado contra el socket
// recién muerto de A (ver test-stale-queue.js) — es un límite físico: el
// servidor no puede saber que A murió antes de recibir la notificación de
// red. Lo que SÍ podemos y debemos garantizar es que, una vez emparejados,
// el sistema se autorepare: cuando la desconexión de A llegue (unos ms
// después), debe activarse el mismo periodo de gracia de 15s y, al no haber
// reconexión, B debe ganar por abandono — igual que en cualquier
// desconexión "normal" a mitad de partida.
async function startTest() {
  console.log('=== TEST: AUTO-RECUPERACIÓN TRAS EMPAREJAMIENTO CONTRA SOCKET MUERTO ===');
  console.log('Solicitando tokens...');
  const tokenA = await loginUser('userA@test.com', 'yourpassword');
  const tokenB = await loginUser('userB@test.com', 'yourpassword');
  console.log('Tokens obtenidos.');

  const a = connect('A', tokenA, { reconnection: false }); // A no debe reconectar solo
  const b = connect('B', tokenB);

  a.connect();

  a.on('connect', () => {
    console.log(`[A] conectado con ID: ${a.id}`);
    a.emit('joinQueue');
  });

  a.once('waiting', () => {
    console.log('[A] está en cola. Provocando la condición de carrera...');
    b.connect();

    b.on('connect', () => {
      console.log(`[B] conectado con ID: ${b.id}. Ataque simultáneo...`);
      killConnectionAbruptly(a);
      b.emit('joinQueue');
    });

    b.once('matchFound', (data) => {
      // Esto es el resultado ESPERADO ahora: sabemos que a veces B se
      // empareja contra el socket agonizante de A. Lo que probamos es lo
      // que pasa DESPUÉS.
      console.log(`[B] Emparejado (posiblemente contra el socket muerto de A). Sala: ${data.roomId}`);
      console.log('--- Esperando la autorecuperación vía periodo de gracia... ---');
    });

    b.once('opponentDisconnected', (data) => {
      console.log(`[B] El rival se desconectó. Periodo de gracia: ${data.gracePeriodMs}ms`);
    });

    b.once('gameOver', (data) => {
      if (data.reason === 'forfeit') {
        console.log(`PASADO: El sistema se autoreparó. B gana por abandono. Ganador: ${data.winnerId}`);
        process.exit(0);
      } else {
        console.error(`FALLO: gameOver con razón inesperada: ${data.reason}`);
        process.exit(1);
      }
    });

    // Si B nunca fue emparejado (el guard sí lo atrapó esta vez — también
    // válido, ambos desenlaces son aceptables) confirmamos por esa vía.
    b.once('waiting', () => {
      console.log('PASADO (alternativo): El guard de liveness sí atrapó el socket muerto esta vez.');
      console.log('B fue puesto en espera de forma segura — no hace falta autorreparación.');
      process.exit(0);
    });

    // Debe llegar un gameOver dentro de ~15-20s si quedó emparejado contra
    // el socket muerto. Si no llega nada, la autorreparación está rota.
    setTimeout(() => {
      console.error('TIMEOUT: Ni matchFound->gameOver ni waiting llegaron a tiempo. Revisa el backend.');
      process.exit(1);
    }, 20000);
  });
}

startTest();
