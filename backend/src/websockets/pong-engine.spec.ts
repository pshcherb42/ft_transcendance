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

  it('starts in countdown with the score at zero', () => {
    const s = new PongEngine().getSnapshot();
    expect(s.status).toBe('countdown');
    expect(s.scoreLeft).toBe(0);
    expect(s.scoreRight).toBe(0);
    expect(s.winner).toBeNull();
  });

  it('switches to playing when the countdown ends', () => {
    const e = new PongEngine();
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step();
    expect(e.getSnapshot().status).toBe('playing');
  });

  it('moves the paddle with input and respects the field limits', () => {
    const e = new PongEngine();
    const before = e.leftPaddleY;
    e.setInput('left', 'up');
    e.step();
    expect(e.leftPaddleY).toBe(before - PADDLE_SPEED);

    // Even if it keeps going up, it never leaves through the top.
    for (let i = 0; i < 300; i++) e.step();
    expect(e.leftPaddleY).toBeGreaterThanOrEqual(0);
  });

  it('scores a point for the right when the ball leaves through the left', () => {
    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step();
    expect(e.getSnapshot().scoreRight).toBe(1);
  });

  it('ends the match when the winning score is reached', () => {
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

  it('the serve aims at the receiving paddle when it is off-center (top)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 0 → deterministic

    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step(); // right scores → serve toward the LEFT (serveDir = -1)
    expect(e.getSnapshot().scoreRight).toBe(1);

    // Left (receiving) paddle pinned to the top: center = 45, well above 300.
    e.leftPaddleY = 0;
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step(); // run out the countdown → serve()

    // ballVX/ballVY aren't serialized in the snapshot; read as public fields.
    expect(e.getSnapshot().status).toBe('playing');
    expect(e.ballVX).toBeLessThan(0); // still going left
    expect(e.ballVY).toBeLessThan(0); // points UP, toward the paddle
  });

  it('the serve aims at the receiving paddle when it is off-center (bottom)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 0

    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 795;
    e.ballY = 300;
    e.ballVX = 20;
    e.ballVY = 0;
    e.step(); // left scores → serve toward the RIGHT (serveDir = 1)
    expect(e.getSnapshot().scoreLeft).toBe(1);

    // Right paddle pinned to the bottom: center = 555, well below 300.
    e.rightPaddleY = HEIGHT - PADDLE_HEIGHT; // 510
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step();

    expect(e.ballVX).toBeGreaterThan(0);
    expect(e.ballVY).toBeGreaterThan(0); // points DOWN, toward the paddle
  });

  it('the jitter does not reverse the serve direction toward the paddle', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // jitter = -SERVE_JITTER_RAD (max)

    const e = new PongEngine();
    e.status = 'playing';
    e.ballX = 5;
    e.ballY = 300;
    e.ballVX = -20;
    e.ballVY = 0;
    e.step();

    e.leftPaddleY = 0; // center 45, well above 300 → aim ≈ -35°
    for (let i = 0; i < COUNTDOWN_TICKS; i++) e.step();

    expect(e.ballVY).toBeLessThan(0); // still pointing up
  });

  it('paddle movement imparts spin to the ball and respects the speed limit', () => {
    // Hit the right paddle right at its center; we control the paddle's final Y
    // so the impact point is identical and only its speed changes.
    function hit(startPaddleY: number, input: 'stop' | 'down') {
      const e = new PongEngine();
      e.status = 'playing';
      e.ballSpeed = 7;
      e.ballVX = 7; // toward the right
      e.ballVY = 0;
      e.ballX = 750; // after moveBall (+7) → 757, overlaps the paddle face (x=764)
      e.rightPaddleY = startPaddleY;
      e.ballY = 300; // impact at the center when the paddle ends at Y=255
      e.setInput('right', input);
      e.step();
      return e;
    }

    const still = hit(255, 'stop'); // paddle still at 255 → paddleVY = 0, no spin
    const moving = hit(247, 'down'); // 247 -> 255 (paddleVY = +8), downward spin

    // Same impact point (center), but the moving paddle curves the ball downward.
    expect(still.ballVY).toBeCloseTo(0);
    expect(moving.ballVY).toBeGreaterThan(0);
    expect(moving.ballVY).toBeGreaterThan(still.ballVY);

    // Renormalization keeps |v| == ballSpeed (<= BALL_SPEED_MAX) after the spin.
    const mag = Math.hypot(moving.ballVX, moving.ballVY);
    expect(mag).toBeCloseTo(moving.ballSpeed);
    expect(mag).toBeLessThanOrEqual(15); // BALL_SPEED_MAX
  });
});
