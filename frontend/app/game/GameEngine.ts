export class Paddle {
	x: number;
	y: number;
	width: number = 10;
	height: number = 80;

	constructor(startX: number, startY: number) {
        this.x = startX;
        this.y = startY;
    }
}

export class Ball {
	x: number = 400;
	y: number = 300;
	vx: number = 5; // Velocidad en X
	vy: number = 5; // Velocidad en Y
	radius: number = 10;

	update(canvasWidth: number, canvasHeight: number) {
		this.x += this.vx;
		this.y += this.vy;

		// Rebote en las paredes superior e inferior
		if (this.y - this.radius <= 0 || this.y + this.radius >= canvasHeight) {
		this.vy *= -1;
		}
		// Rebote en las paredes laterales (más adelante esto será un punto para el jugador)
		if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
		this.vx *= -1;
		}
	}
}


export class GameEngine {
	leftPaddle: Paddle;
	rightPaddle: Paddle;
	ball: Ball;
	
	width: number = 800;
	height: number = 600;
	
	constructor() {
		this.ball = new Ball();
		this.leftPaddle = new Paddle(20,260);
		this.rightPaddle = new Paddle(770,260);
	}

	// Se ejecuta 60 veces por segundo para calcular la física
	update() {
        const PADDLE_SPEED = 7;

        // --- MOVIMIENTO PALETA IZQUIERDA (W / S) ---
        if (this.keys.leftUp && this.leftPaddle.y > 0) {
            this.leftPaddle.y -= PADDLE_SPEED;
        }
        if (this.keys.leftDown && this.leftPaddle.y < (this.height - this.leftPaddle.height)) {
            this.leftPaddle.y += PADDLE_SPEED;
        }

        // --- MOVIMIENTO PALETA DERECHA (Flecha Arriba / Abajo) ---
        if (this.keys.rightUp && this.rightPaddle.y > 0) {
            this.rightPaddle.y -= PADDLE_SPEED;
        }
        if (this.keys.rightDown && this.rightPaddle.y < (this.height - this.rightPaddle.height)) {
            this.rightPaddle.y += PADDLE_SPEED;
        }

        this.ball.update(this.width, this.height);
        
        // --- COLISIÓN PALETA IZQUIERDA (La que ya tenías) ---
        if (
            this.ball.x - this.ball.radius < this.leftPaddle.x + this.leftPaddle.width &&
            this.ball.x + this.ball.radius > this.leftPaddle.x &&
            this.ball.y + this.ball.radius > this.leftPaddle.y &&
            this.ball.y - this.ball.radius < this.leftPaddle.y + this.leftPaddle.height
        ) {
            this.ball.vx *= -1;
            this.ball.x = this.leftPaddle.x + this.leftPaddle.width + this.ball.radius;
        }

        // --- COLISIÓN PALETA DERECHA (NUEVA) ---
        if (
            this.ball.x + this.ball.radius > this.rightPaddle.x &&
            this.ball.x - this.ball.radius < this.rightPaddle.x + this.rightPaddle.width &&
            this.ball.y + this.ball.radius > this.rightPaddle.y &&
            this.ball.y - this.ball.radius < this.rightPaddle.y + this.rightPaddle.height
        ) {
            // Rebota hacia la izquierda
            this.ball.vx *= -1;
            // La empujamos un poco a la izquierda para evitar que se quede pegada
            this.ball.x = this.rightPaddle.x - this.ball.radius;
        }
    }

	// Se ejecuta 60 veces por segundo para pintar el estado actual
	draw(ctx: CanvasRenderingContext2D) {
		// Limpiar el frame anterior
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, this.width, this.height);

		// Dibujar la pelota
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
		ctx.fill();
		
		ctx.fillStyle = 'green';
		ctx.fillRect(this.leftPaddle.x, this.leftPaddle.y, this.leftPaddle.width, this.leftPaddle.height);
		ctx.fillRect(this.rightPaddle.x, this.rightPaddle.y, this.rightPaddle.width, this.rightPaddle.height);
	}
	keys = {
		leftUp: false,
		leftDown: false,
		rightUp: false,
		rightDown: false
	};
}