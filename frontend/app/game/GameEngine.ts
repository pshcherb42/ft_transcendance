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

		// Rebote en las paredes superior e inferior (techo y suelo)
		if (this.y - this.radius <= 0 || this.y + this.radius >= canvasHeight) {
			this.vy *= -1;
		}
	}

	// Reiniciar la posición de la pelota tras un gol
	reset(canvasWidth: number, canvasHeight: number, direction: number) {
		this.x = canvasWidth / 2;
		this.y = canvasHeight / 2;
		
		// La bola va hacia el jugador que ha perdido el punto
		this.vx = 5 * direction;
		
		// Ángulo vertical aleatorio para que no todos los saques sean iguales
		this.vy = (Math.random() * 10) - 5;
	}
}

export class GameEngine {
	leftPaddle: Paddle;
	rightPaddle: Paddle;
	ball: Ball;
	
	width: number = 800;
	height: number = 600;

	// --- VARIABLES DE PARTIDO ---
	scoreLeft: number = 0;
	scoreRight: number = 0;
	WINNING_SCORE: number = 2;
	isGameOver: boolean = false;

	keys = {
		leftUp: false,
		leftDown: false,
		rightUp: false,
		rightDown: false
	};
	
	constructor() {
		this.ball = new Ball();
		this.leftPaddle = new Paddle(20, 260);
		this.rightPaddle = new Paddle(770, 260);
	}

	// Se ejecuta 60 veces por segundo para calcular la física
	update() {
		// Si el juego ha terminado, congelamos la física saliendo de la función
		if (this.isGameOver) {
			return;
		}

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

		// Actualizamos la posición de la pelota
		this.ball.update(this.width, this.height);
		
		// --- COLISIÓN PALETA IZQUIERDA ---
		if (
			this.ball.x - this.ball.radius < this.leftPaddle.x + this.leftPaddle.width &&
			this.ball.x + this.ball.radius > this.leftPaddle.x &&
			this.ball.y + this.ball.radius > this.leftPaddle.y &&
			this.ball.y - this.ball.radius < this.leftPaddle.y + this.leftPaddle.height
		) {
			this.ball.vx *= -1;
			this.ball.x = this.leftPaddle.x + this.leftPaddle.width + this.ball.radius;
		}

		// --- COLISIÓN PALETA DERECHA ---
		if (
			this.ball.x + this.ball.radius > this.rightPaddle.x &&
			this.ball.x - this.ball.radius < this.rightPaddle.x + this.rightPaddle.width &&
			this.ball.y + this.ball.radius > this.rightPaddle.y &&
			this.ball.y - this.ball.radius < this.rightPaddle.y + this.rightPaddle.height
		) {
			this.ball.vx *= -1;
			this.ball.x = this.rightPaddle.x - this.ball.radius;
		}

		// --- PUNTUACIÓN Y GOLES ---
		// Gol en la portería izquierda (Punto para el derecho)
		if (this.ball.x - this.ball.radius <= 0) {
			this.scoreRight++;
			if (this.scoreRight >= this.WINNING_SCORE) {
				this.isGameOver = true;
			} else {
				this.ball.reset(this.width, this.height, -1); // Saca hacia la izquierda
			}
		} 
		// Gol en la portería derecha (Punto para el izquierdo)
		else if (this.ball.x + this.ball.radius >= this.width) {
			this.scoreLeft++;
			if (this.scoreLeft >= this.WINNING_SCORE) {
				this.isGameOver = true;
			} else {
				this.ball.reset(this.width, this.height, 1); // Saca hacia la derecha
			}
		}
	}

	// Se ejecuta 60 veces por segundo para pintar el estado actual
	draw(ctx: CanvasRenderingContext2D) {
		// 1. Limpiar el frame anterior
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, this.width, this.height);
		
		// 2. --- MARCADOR Y LÍNEA CENTRAL ---
		ctx.font = '50px monospace'; // Fuente retro
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		
		// Pintamos los puntos
		ctx.fillText(this.scoreLeft.toString(), this.width / 4, 60);
		ctx.fillText(this.scoreRight.toString(), (this.width / 4) * 3, 60);
		
		// Línea discontinua central
		ctx.beginPath();
		ctx.setLineDash([10, 15]);
		ctx.moveTo(this.width / 2, 0);
		ctx.lineTo(this.width / 2, this.height);
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.stroke();
		ctx.setLineDash([]); // Reseteamos los trazos

		// 3. --- DIBUJAR ---
		// Dibujar la pelota
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
		ctx.fill();
		
		// Dibujar las paletas
		ctx.fillStyle = 'white';
		ctx.fillRect(this.leftPaddle.x, this.leftPaddle.y, this.leftPaddle.width, this.leftPaddle.height);
		ctx.fillRect(this.rightPaddle.x, this.rightPaddle.y, this.rightPaddle.width, this.rightPaddle.height);
	
		// 4. --- PANTALLA DE FIN DE PARTIDO ---
		if (this.isGameOver) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Fondo semitransparente
			ctx.fillRect(0, 0, this.width, this.height);
			
			ctx.fillStyle = 'white';
			ctx.font = '60px monospace';
			ctx.textAlign = 'center';
			
			const winnerText = this.scoreLeft >= this.WINNING_SCORE ? "¡JUGADOR 1 GANA!" : "¡JUGADOR 2 GANA!";
			ctx.fillText(winnerText, this.width / 2, this.height / 2);
			
			ctx.font = '30px monospace';
			ctx.fillText("Recarga la página para la revancha", this.width / 2, this.height / 2 + 50);
		}
	}
}