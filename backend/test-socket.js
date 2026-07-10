const { io } = require('socket.io-client');

// Paste two real access tokens here (log in as two different users via curl/Postman first)
const TOKEN_A = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNWRjOGZjYi1kMWY3LTQwNWUtOTYxZC0yODBhM2QwMTc2YjYiLCJlbWFpbCI6InVzZXJBQHRlc3QuY29tIiwiaWF0IjoxNzgzNjk4ODA1LCJleHAiOjE3ODM2OTk3MDV9.LNuA46-QRoF-EpdYIofDDSjDaPku9cGSCmKYV12-h6o';
const TOKEN_B = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiMGFjMGY5NS03MjJhLTQ4MTctYWY4Yy0xZDdkZDY0MzY2YWUiLCJlbWFpbCI6InVzZXJCQHRlc3QuY29tIiwiaWF0IjoxNzgzNjk4ODM1LCJleHAiOjE3ODM2OTk3MzV9.OxkUGXFkbSkXtF_BOUtmWunADDwZ0Wd5ucGwsabxNXg';

function connect(name, token) {
  const socket = io('http://localhost:3001/game', {
    auth: { token },
    rejectUnauthorized: false, // self-signed cert
  });

  socket.on('connect', () => {
    console.log(`[${name}] connected, id=${socket.id}`);
    socket.emit('joinQueue');
  });

  socket.on('queued', () => console.log(`[${name}] queued, waiting for opponent`));
  socket.on('matchFound', (data) => console.log(`[${name}] matchFound:`, data.roomId));
  socket.on('opponentDisconnected', (data) => console.log(`[${name}] opponent disconnected, grace=${data.gracePeriodMs}ms`));
  socket.on('opponentReconnected', (data) => console.log(`[${name}] opponent reconnected`));
  socket.on('gameOver', (data) => console.log(`[${name}] gameOver:`, data));
  socket.on('opponentPaddleMove', (data) => console.log(`[${name}] opponent paddle:`, data.y));
  socket.on('connect_error', (err) => console.log(`[${name}] connect_error:`, err.message));
  socket.on('disconnect', (reason) => console.log(`[${name}] disconnected:`, reason));

  return socket;
}

const a = connect('A', TOKEN_A);
setTimeout(() => connect('B', TOKEN_B), 1000);

// After 5s, simulate A sending a paddle move
setTimeout(() => a.emit('paddleMove', { y: 42 }), 5000);

// After 8s, force-disconnect A to test the grace-period/forfeit logic
setTimeout(() => {
  console.log('--- killing A to test disconnect/reconnect ---');
  a.disconnect();
}, 8000);

// After 12s (within the 10s grace window if you kill at 8s... adjust to test both outcomes)
setTimeout(() => {
  console.log('--- reconnecting A ---');
  connect('A-again', TOKEN_A);
}, 12000);