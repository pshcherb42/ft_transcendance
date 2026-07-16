# Disconnection/conncetion logic

docker compose exec backend node test-stale-queue.js

curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"userB","email":"userB@test.com","password":"yourpassword"}'


 jsut checking email other email

## Disconection logic

Cuando un jugador pierda la conexión, el juego se pausará durante 15 segundos. Si el jugador regresa con un token válido dentro de ese tiempo, el juego continuará; de lo contrario, el rival que se mantuvo conectado ganará automáticamente.

docker compose exec db psql -U postgres -d transcendence -c "SELECT id, \"homeId\", \"awayId\", \"homeScore\", \"awayScore\", \"winnerId\", \"createdAt\" FROM \"Match\" ORDER BY \"createdAt\" DESC LIMIT 5;"

docker compose exec db psql -U postgres -d transcendence -c "SELECT * FROM \"Stats\";"


                  id                  |                homeId                |                awayId                | homeScore | awayScore |               winnerId               |        createdAt        
--------------------------------------+--------------------------------------+--------------------------------------+-----------+-----------+--------------------------------------+-------------------------
 7f8eef7d-5f02-4f57-b869-d1de3ce33cb7 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e | 6b5d521f-b94b-42c1-b53f-d0b23f544279 |         0 |         0 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e | 2026-07-11 13:42:13.387
 650829bb-32ed-43d8-ac18-13242d765bf4 | 6b5d521f-b94b-42c1-b53f-d0b23f544279 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e |         0 |         0 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e | 2026-07-11 13:40:51.676
 adb3e11e-fedb-4528-a673-f2068cc94104 | 6b5d521f-b94b-42c1-b53f-d0b23f544279 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e |         3 |         0 | 6b5d521f-b94b-42c1-b53f-d0b23f544279 | 2026-07-11 10:08:26.763
 5df4b0c2-9ffe-4282-883e-c8e95064739d | 6b5d521f-b94b-42c1-b53f-d0b23f544279 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e |         0 |         3 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e | 2026-07-11 10:04:42.741
 4a87b9ea-b51c-46ee-8329-6ef7b0c0ceb7 | 6b5d521f-b94b-42c1-b53f-d0b23f544279 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e |         3 |         0 | 6b5d521f-b94b-42c1-b53f-d0b23f544279 | 2026-07-11 10:01:53.771
(5 rows)


                  id                  |                userId                | wins | losses | level 
--------------------------------------+--------------------------------------+------+--------+-------
 a28d8ea4-7a16-4ad3-9c30-9ab76b9f3d71 | 4f4eccc5-a5b6-4d71-890c-eea55dad840e |    2 |      0 |     1
 7253864c-859c-4d28-8f99-02968f502168 | 6b5d521f-b94b-42c1-b53f-d0b23f544279 |    0 |      2 |     1
(2 rows)



 the handleJoinQueue liveness guard is a best-effort optimization that catches most cases (a socket that's been dead for a while before someone else joins the queue), but it cannot close a true simultaneous-timing race — that's covered instead by the existing disconnect/grace-period/forfeit system, which is authoritative and always eventually consistent. That's actually a stronger, more honest story for eval than claiming the guard is airtight.

 # API publica

 curl -H "x-api-key: 79e6355691973817e4a7cbce4cf703f45acae82078d2e67c0b5ff370d4817c45" http://localhost:8080/api/api/public/users

curl -X POST http://localhost:8080/api/api/public/users \
  -H "x-api-key: 79e6355691973817e4a7cbce4cf703f45acae82078d2e67c0b5ff370d4817c45" \
  -H "Content-Type: application/json" \
  -d '{"email":"testAPI@test.com","username":"testAPI","name":"Test"}'

curl -H "x-api-key: 79e6355691973817e4a7cbce4cf703f45acae82078d2e67c0b5ff370d4817c45" http://localhost:8080/api/public/users

La documentación de Swagger es accesible en /api/api/docs debido a la arquitectura de nuestro Proxy Inverso (Nginx). Para las rutas internas de la aplicación, Nginx está configurado para limpiar el prefijo /api/ de forma dinámica y evitar redundancias en el backend. Como Swagger está configurado nativamente dentro de NestJS bajo el path api/docs, la duplicación en la URL externa es el resultado esperado para mantener la compatibilidad con las reglas globales de enrutamiento y aislamiento de contenedores."