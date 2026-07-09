import {
  PongEngine,
  WINNING_SCORE,
  COUNTDOWN_TICKS,
  PADDLE_SPEED,
  HEIGHT,
  PADDLE_HEIGHT,
} from './pong-engine';

describe('PongEngine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('empieza en cuenta atrás con el marcador a cero', () => {
    const s = new PongEngine().getSnapshot();
    expect(s.status).toBe('countdown');
    expect(s.scoreLeft).toBe(0);
    expect(s.scoreRight).toBe(0);
    expect(s.winner).toBeNull();
  });

  it('pasa a jugar cuando termina la cuenta atrás', () => {
    const e = new PongEngine();
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step();
    expect(e.getSnapshot().status).toBe('playing');
  });

  it('mueve la pala con el input y respeta los límites del campo', () => {
    const e = new PongEngine();
    const before = e.leftPaddleY;
    e.setInput('left', 'up');
    e.step();
    expect(e.leftPaddleY).toBe(before - PADDLE_SPEED);

    // Aunque siga subiendo, nunca sale por arriba.
    for (let i = 0; i < 300; i++) e.step();
    expect(e.leftPaddleY).toBeGreaterThanOrEqual(0);
  });

  it('marca punto para la derecha cuando la bola sale por la izquierda', () => {
    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step();
    expect(e.getSnapshot().scoreRight).toBe(1);
  });

  it('termina la partida al alcanzar la puntuación de victoria', () => {
    const e = new PongEngine();
    e.status = 'playing';
    e.scoreRight = WINNING_SCORE - 1;
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step();

    const s = e.getSnapshot();
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('right');
    expect(s.scoreRight).toBe(WINNING_SCORE);
  });

  it('el saque apunta hacia la pala receptora cuando está descentrada (arriba)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 0 → determinista

    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step(); // gol de la derecha → saque hacia la IZQUIERDA (serveDir = -1)
    expect(e.getSnapshot().scoreRight).toBe(1);

    // La pala izquierda (receptora) pegada arriba: centro = 45, muy por encima de 300.
    e.leftPaddleY = 0;
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step(); // agota la cuenta atrás → serve()

    // ballVX/ballVY no se serializan en el snapshot; se leen como campos públicos.
    expect(e.getSnapshot().status).toBe('playing');
    expect(e.ballVX).toBeLessThan(0); // sigue yendo a la izquierda
    expect(e.ballVY).toBeLessThan(0); // apunta hacia ARRIBA, hacia la pala
  });

  it('el saque apunta hacia la pala receptora cuando está descentrada (abajo)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 0

    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 795;
    e.ballY = 300;
    e.ballVX = 20;
    e.ballVY = 0;
    e.step(); // gol de la izquierda → saque hacia la DERECHA (serveDir = 1)
    expect(e.getSnapshot().scoreLeft).toBe(1);

    // Pala derecha pegada abajo: centro = 555, muy por debajo de 300.
    e.rightPaddleY = HEIGHT - PADDLE_HEIGHT; // 510
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step();

    expect(e.ballVX).toBeGreaterThan(0);
    expect(e.ballVY).toBeGreaterThan(0); // apunta hacia ABAJO, hacia la pala
  });

  it('el jitter no invierte la dirección del saque hacia la pala', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // jitter = -SERVE_JITTER_RAD (máximo)

    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step();

    e.leftPaddleY = 0; // centro 45, muy por encima de 300 → aim ≈ -35°
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step();

    expect(e.ballVY).toBeLessThan(0); // sigue apuntando arriba
  });

  it('el movimiento de la pala imprime efecto (spin) a la bola y respeta el límite de velocidad', () => {
    // Golpea la pala derecha justo en su centro; controlamos la Y final de la pala
    // para que el punto de impacto sea idéntico y solo cambie su velocidad.
    function hit(startPaddleY: number, input: 'stop' | 'down') {
      const e = new PongEngine();
      e.status = 'playing';
      e.ballSpeed = 7;
      e.ballVX = 7; // hacia la derecha
      e.ballVY = 0;
      e.ballX = 750; // tras moveBall (+7) → 757, solapa la cara de la pala (x=764)
      e.rightPaddleY = startPaddleY;
      e.ballY = 300; // impacto en el centro cuando la pala acaba en Y=255
      e.setInput('right', input);
      e.step();
      return e;
    }

    const still = hit(255, 'stop'); // pala quieta en 255 → paddleVY = 0, sin spin
    const moving = hit(247, 'down'); // 247 -> 255 (paddleVY = +8), spin hacia abajo

    // Mismo punto de impacto (centro), pero la pala en movimiento curva la bola hacia abajo.
    expect(still.ballVY).toBeCloseTo(0);
    expect(moving.ballVY).toBeGreaterThan(0);
    expect(moving.ballVY).toBeGreaterThan(still.ballVY);

    // La renormalización mantiene |v| == ballSpeed (<= BALL_SPEED_MAX) tras el spin.
    const mag = Math.hypot(moving.ballVX, moving.ballVY);
    expect(mag).toBeCloseTo(moving.ballSpeed);
    expect(mag).toBeLessThanOrEqual(15); // BALL_SPEED_MAX
  });
});
