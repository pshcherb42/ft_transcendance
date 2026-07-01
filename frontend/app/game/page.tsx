'use client';

import { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';

export default function GamePage() {
// Referencia al elemento HTML canvas
const canvasRef = useRef<HTMLCanvasElement>(null);
// Guardamos la instancia del motor en un ref para que no se reinicie en cada render de React
const engineRef = useRef(new GameEngine());

useEffect(() => {
	const canvas = canvasRef.current;
	if (!canvas) return;
	
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	let animationFrameId: number;
	const engine = engineRef.current;

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'w' || e.key === 'W') engine.keys.leftUp = true;
		if (e.key === 's' || e.key === 'S') engine.keys.leftDown = true;
		if (e.key === 'ArrowUp') engine.keys.rightUp = true;
		if (e.key === 'ArrowDown') engine.keys.rightDown = true;
	};

	const handleKeyUp = (e: KeyboardEvent) => {
		if (e.key === 'w' || e.key === 'W') engine.keys.leftUp = false;
		if (e.key === 's' || e.key === 'S') engine.keys.leftDown = false;
		if (e.key === 'ArrowUp') engine.keys.rightUp = false;
		if (e.key === 'ArrowDown') engine.keys.rightDown = false;
	};

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);

	// Nu estro Game Loop principal
	const render = () => {
	engine.update(); // 1. Calcula
	engine.draw(ctx); // 2. Dibuja
	
	// 3. Pide al navegador que ejecute render() otra vez en el próximo frame
	animationFrameId = requestAnimationFrame(render);
	};

	// Arrancamos el bucle
	render();

	// Cleanup: Si el usuario sale de la página, paramos el bucle para no consumir memoria
	return () => {
		cancelAnimationFrame(animationFrameId);
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
	};
}, []); // El array vacío asegura que este efecto solo se ejecute una vez al cargar la página

return (
	<div className="flex flex-col items-center justify-center min-h-screen bg-gray-800">
	<h1 className="text-3xl font-bold text-white mb-4">Pong Engine Test</h1>
	<canvas 
		ref={canvasRef}
		width={800} 
		height={600} 
		className="border-4 border-white shadow-lg"
	/>
	</div>
);
}