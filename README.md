# ft_transcendance
Surprise.

To turn on:
cp .env.example
npm install inside root directory
docker compose up --build
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate deploy

# Preparation 

What I did in this days:

1. changed nginx.config from this:

events {}

http {
  server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    location / {
      proxy_pass http://frontend:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
      proxy_pass http://backend:3001;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
      proxy_pass http://backend:3001;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }
}


to this:

events {}

http {
  server {
    listen 80;

    location / {
      proxy_pass http://frontend:3000;
    }

    location /api {
      proxy_pass http://backend:3001;
    }
  }
}

the reason: to be able to work o development without creating ssl certificte. which we probably will need later. But for development its easier to use this setup.

2. Then I changed the docker-compose.yml. The part of nginx, also for the same reasons and plus at 42 we cannot use ports before 1024. So I changed port 80 to port 8080.

this is exactly what I changed:
 nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on: [frontend, backend]

to this:

 nginx: # http version for development http://localhost:8080 
    image: nginx:alpine
    ports: ["8080:80"] # 42 school cant use ports under 1024
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on: [frontend, backend]

And now to turn on the page we need to use http://localhost:8080

4. Oknow that everything connects I changed user schema. I added these fields:
 model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique

  password      String?  // hashed password (bcrypt/argon2)
  avatar        String?  // URL or path

  refreshToken  String?  // hashed refresh token (NOT raw token)

  createdAt     DateTime @default(now())

  friends       User[]   @relation("UserFriends")
  friendOf      User[]   @relation("UserFriends")

  matchesHome   Match[]  @relation("HomePlayer")
  matchesAway   Match[]  @relation("AwayPlayer")

  stats         Stats?
}


5. After that I ran 
 npx prisma migrate dev

 prisma detected changes in my models
 created a folder at prisma/migrations
 inside it sql instructions
 applied those changes to my local database
 ran prisma generate 

 I did this to track prisma evolution properly and to apply changes

6. Then I ran these two commands

  docker compose exec backend npx nest generate module users              
  docker compose exec backend npx nest generate module auth

  This creates src/users/users.module.ts and src/auth/auth.module.ts
  and registeres them in app.module.ts

7. Now we have to generate service + controllers for both modules.

ERROR:

 I had a problem here, cause I didnt actually created app folder inside my local device so the changes was applied only to the docker.

SOLUTION

 So I changed yaml for backend, from this:

  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: [db]
    env_file: .env

 To this:

  backend:
  build: ./backend
  ports: ["3001:3001"]
  depends_on: [db]
  env_file: .env
  volumes:
    - ./backend:/app

 And I ran 
    docker compose down
    docker compose up --build

 Then again

   docker compose exec backend npx nest generate service users --no-spec
    docker compose exec backend npx nest generate controller users --no-spec

8. Now that I have auth and users folders with users.service, user.controller and user.model I need to create PrismaService a signleton that wraps Prisma client and gets injected into both Userervice and AuthService. For ths I use this commands:
    docker compose exec backend npx nest generate module prisma --no-spec
    docker compose exec backend npx nest generate service prisma --no-spec

    This creates prisma folder inside src and two files prisma.module.ts and prisma.service.ts

9. Now I am going to write inside prisma service, this is database connection that everything depends on.
    Then I update the module so it exports prisma servie to other modules. @Global means is avalible everywhere - no need to import it to any other modules.
    Then I fill in UsersService
    Fill in UsersConstroller
    Dont need to update UsersModule with Prisma because of @Global 

    After this i have the users module fully built.

    I may get an export error for PrismaClient but the thing is that this prisma/client is inside docker, not on lockal and to check it I ran 
         % docker compose exec backend ls node_modules/@prisma/client | head -5

    And I see information. So the problem is purely cosmetic.

# Preparation complete finally!

## Now lets build the actual auth module.

The order will be this: prisma.service.ts - already done. Then JWT+ local strategies. Guards. Auth srvice + controller.

1. Created the auth folder structure:
    docker compose exec backend mkdir -p src/auth/strategies src/auth/guards

2. Now i will create the local strategy. To validate email and password on login
    backend/src/auth/strategies/local.strategy.ts 

3. Then I create JWT strategy, validates Bearer tokens on protected routes.
    backend/src/auth/strategies/jwt.strategy.ts

ERROR
    I continued getting errors like 
    "message": "Module '\"@prisma/client\"' has no exported member 'User'.",
    SOLUTION
        regenerate prisma client.
        DIDNT WORK
	"message": "Cannot find module '../auth/guards/jwt-auth.guard' or its corresponding 
	"message": "Cannot find module '../auth.service' or its corresponding type
     
I decide to continue despite the errors.

4. Created JWT refresh strategy.
    backend/src/auth/strategies/jwt-refresh.strategy.ts

5. Created the guards.
    backend/src/auth/guards/local-auth.guard.ts
    backend/src/auth/guards/jwt-auth.guard.ts
    backend/src/auth/guards/jwt-refresh.guard.ts

6. And now that I have all the guards and trategies in place I am going to create auth.service.ts and auth.controller.ts and also   replace auth.module.ts from this:
    import { Module } from '@nestjs/common';

    @Module({})
    export class AuthModule {}
    to this:
        import { Module } from '@nestjs/common';
    import { PassportModule } from '@nestjs/passport';
    import { JwtModule } from '@nestjs/jwt';
    import { AuthService } from './auth.service';
    import { AuthController } from './auth.controller';
    import { LocalStrategy } from './strategies/local.strategy';
    import { JwtStrategy } from './strategies/jwt.strategy';
    import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
    import { UsersModule } from '../users/users.module';

    @Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.register({}), // secrets passed per-call in AuthService
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
    controllers: [AuthController],
    })
    export class AuthModule {}

To create auth.service I first ran this command:

    docker compose exec backend npx nest generate service auth --no-spec

    Then this one to creaate auth controller:

        docker compose exec backend npx nest generate controller auth --no-spec

7. Replace auth.module.ts. This is what was there before:
    import { Module } from '@nestjs/common';
    import { PassportModule } from '@nestjs/passport';
    import { JwtModule } from '@nestjs/jwt';
    import { AuthService } from './auth.service';
    import { AuthController } from './auth.controller';
    import { AuthController } from './auth.controller';
    import { LocalStrategy } from './strategies/local.strategy';
    import { JwtStrategy } from './strategies/jwt.strategy';
    import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
    import { UsersModule } from '../users/users.module';
    import { AuthService } from './auth.service';

    @Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.register({}), // secrets passed per-call in AuthService
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
    controllers: [AuthController],
    })
    export class AuthModule {}

8.  Export UerService from UserModle. 

    import { Module } from '@nestjs/common';
    import { UsersService } from './users.service';
    import { UsersController } from './users.controller';

    @Module({
    providers: [UsersService],
    controllers: [UsersController],
    exports: [UsersService],   // ← this line is what matters
    })
    export class UsersModule {}

9. Now I am going to run 
    docker compose up --build
     Pivotal moment to see and confirm it compiles cleanly. 

## Praying it will work

I got two erros.
     
     ERROR 1. secretOrKey requires type string. Fix with a non-null assertion.
        inside jwt.strategy.ts:
        secretOrKey: config.get<string>('JWT_SECRET')!,
    
        inside jwt-refresh.strategy.ts:
        secretOrKey: config.get<string>('JWT_REFRESH_SECRET')!,

    ERROR 2. passReqToCallback: true needs parent class to be told explicitly via a generic. Solution: extend PassportStrategy with the typed overload.
        inside jwt-refresh.strategy.ts:
        // Change this line:
            export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {

            // To this:
            export class JwtRefreshStrategy extends PassportStrategy<typeof Strategy>(Strategy, 'jwt-refresh') {  

    SOLUTION
        This worked I moved on.

    ERROR
        I got PrismaClient error again. It requires explicit config. I will fix the prisma.service.ts. I save here the previous version:
            import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
            import { PrismaClient } from '@prisma/client';

            @Injectable()
            export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
            async onModuleInit() {
                await this.$connect();
            }

            async onModuleDestroy() {
                await this.$disconnect();
            }
            }

        That didnt work so I went back to the previous version.
        The url has to be inside prisma.config.ts which I didnt make before so I will add it now.

        1. First I modify datasource inside schema.prisma and add url to it
                        datasource db {
                            provider = "postgresql"
                            url      = env("DATABASE_URL")
                            }
        2. Then I create prisma.config.ts inside backend/prisma/prisma.config.ts
             % cat > backend/prisma/prisma.config.ts << 'EOF'
                import { defineConfig } from 'prisma/config';

                export default defineConfig({
                earlyAccess: true,
                schema: {
                    kind: 'single',
                    filePath: './prisma/schema.prisma',
                },
                });
                EOF
        3. Then I fixed prisma.config.ts with correct format. Becaus eprevious one was giving errors.
            pshcherb@car6s2 ~/Desktop/ft_trans
                % cat > backend/src/prisma/prisma.service.ts << 'EOF'
                import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
                import { PrismaClient } from '@prisma/client';

                @Injectable()
                export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
                async onModuleInit() {
                    await this.$connect();
                }

                async onModuleDestroy() {
                    await this.$disconnect();
                }
                }
                EOF
        4. It still didnt work I had earlyAccess error and had to use this command to see the version of prisma:
            docker compose exec backend cat node_modules/prisma/package.json | grep '"version"' | head -1

            I ran this command cat > backend/prisma/prisma.config.ts << 'EOF'
                import { defineConfig } from 'prisma/config';

                export default defineConfig({
                schema: './prisma/schema.prisma',
                });
                EOF

        But still got errors. But I didnt recompile. Tommorow I will try this and see if that was the error. 
        Also I suspect it might be the direction of the file. I suspect I might need to move $
        to the src/prisma/.

        Turns out I dont need prisma config file. I m going to eliminate it and also
        I will fix prisma service. I save here the previous version:
          import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
          import { PrismaClient } from '@prisma/client';

          @Injectable()
          export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
            async onModuleInit() {
              await this.$connect();
            }

            async onModuleDestroy() {
              await this.$disconnect();
            }
          }

      I got error again:
      
      [12:54:41 PM] File change detected. Starting incremental compilation...
        backend-1   | 
        backend-1   | src/prisma/prisma.service.ts:8:7 - error TS2353: Object literal may only specify known properties, and 'datasources' does not exist in type 'Subset<PrismaClientOptions, PrismaClientOptions>'.
        backend-1   | 
        backend-1   | 8       datasources: {
        backend-1   |         ~~~~~~~~~~~
        backend-1   | 
        backend-1   | [12:54:41 PM] Found 1 error. Watching for file changes.
        backend-1   | 
        Gracefully Stopping... press Ctrl+C again to force


    Then I thought that the problem might be that prisma.config wasnt copied to the docker environment coreectly so I ran these commands :
        docker compose exec backend ls /app/prisma/
        docker compose exec backend cat /app/prisma/prisma.config.ts

    And I recompiled everything.
    It didnt work.
    Maybe the error is in the direction of the prisma.config?
    I changed its location:

    # Remove the wrong location
    rm backend/prisma/prisma.config.ts

    # Create at correct location (next to package.json)
    cat > backend/prisma.config.ts << 'EOF'
    import { defineConfig } from 'prisma/config';

    export default defineConfig({
      schema: './prisma/schema.prisma',
    });
    EOF

    then rebuild.

    The real problem might be the use of Prisma 7. I will downgrade to prisma 6 and see if this works.
    If ths works I have to update everything to prisma 6. Makefile for example. 

   What is actually broken (summary)
  NOT broken:
  schema definition (mostly fine)
  Nest structure concept
  BROKEN:
    Prisma client generation state
    dependency consistency after downgrade
    missing NestJS imports
    possible Docker vs local install mismatch
    unnecessary Prisma config usage

  # Fix suggested by AI
 Correct fix order (important — do not skip steps)
Step 1 — clean install inside backend container
rm -rf node_modules
rm -rf package-lock.json
npm install

inside backend container, not host.

Step 2 — regenerate Prisma client
npx prisma generate
Step 3 — migrate if needed
npx prisma migrate dev

or at least:

npx prisma db push
Step 4 — fix PrismaService imports
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
Step 5 — remove this unless you explicitly need it
import { defineConfig } from 'prisma/config';

Delete prisma.config.ts unless you know exactly why it's there.

# My steps

I did this untill step 4 and got this error:
 % npx prisma migrate dev
Loaded Prisma config from prisma.config.ts.

Prisma config detected, skipping environment variable loading.
Prisma schema loaded from prisma/schema.prisma
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema.prisma:7
   | 
 6 |   provider = "postgresql"
 7 |   url      = env("DATABASE_URL")
   | 

Validation Error Count: 1
[Context: getConfig]

Prisma CLI Version : 6.19.3

the reason was prisma.config interfiring with .env
first I will verify database_url exists inside container:
  docker compose exec backend printenv DATABASE_URL
it exists.

then i ensure that env is injected via docker compose
  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: [db]
    env_file: .env
    volumes:
      - ./backend:/app

the reason might be .env existing in root.

# Delete everything prisma related and start over.

Files:
rm -rf prisma/migrations
rm -f prisma/schema.prisma
rm -f prisma.config.ts
rm -f prisma/prisma.config.ts
rm -f src/prisma/prisma.service.ts
rm -f src/prisma/prisma.module.ts
Packages:
npm uninstall prisma @prisma/client
Client:
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
Cache:
docker compose down -v
docker builder prune -f

# Start over

Step 1 — Install packages
bashnpm install @prisma/client @prisma/adapter-pg pg
npm install -D prisma dotenv

Step 2 — package.json
Add "type": "module" at the top level:
json{
  "type": "module",
  ...
}

Step 3 — prisma/schema.prisma
prismagenerator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

Step 4 — prisma.config.ts (at backend root, next to package.json)
typescriptimport "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

Step 5 — src/prisma/prisma.service.ts
typescriptimport { Injectable } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }
}

Step 6 — Dockerfile
dockerfileFROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]
The key addition is RUN npx prisma generate — this must happen at build time so the client is generated into src/generated/prisma before the app starts.

# Error again

 => ERROR [backend 6/6] RUN npx prisma generate                                                   23.5s
------
 > [backend 6/6] RUN npx prisma generate:
3.509 npm warn exec The following package was not found and will be installed: prisma@7.8.0
10.55 npm warn EBADENGINE Unsupported engine {
10.55 npm warn EBADENGINE   package: '@prisma/streams-local@0.1.2',
10.55 npm warn EBADENGINE   required: { bun: '>=1.3.6', node: '>=22.0.0' },
10.55 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
10.55 npm warn EBADENGINE }
16.16 Failed to load config file "/app/prisma.config.ts" as a TypeScript/JavaScript module. Error: Error: Cannot find module 'prisma/config'
16.16 Require stack:
16.16 - /app/prisma.config.ts
------
Dockerfile:6

--------------------

   4 |     RUN npm install

   5 |     COPY . .

   6 | >>> RUN npx prisma generate

   7 |     EXPOSE 3001

   8 |     CMD ["npm", "run", "start:dev"]

--------------------

target backend: failed to solve: process "/bin/sh -c npx prisma generate" did not complete successfully: exit code: 1


[!] Error: Failed to start. Try running 'make install-deps' to ensure all packages are installed.
make: *** [Makefile:17: up] Error 1
# Solution

Step 1 — Update your Dockerfile
dockerfileFROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN ./node_modules/.bin/prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

Step 2 — Make sure prisma is in your devDependencies
Check your package.json has:
json"devDependencies": {
  "prisma": "^7.8.0"
}

# Error again 2
 => ERROR [backend 6/6] RUN ./node_modules/.bin/prisma generate               5.0s
------
 > [backend 6/6] RUN ./node_modules/.bin/prisma generate:
4.124 Failed to load config file "/app" as a TypeScript/JavaScript module. Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.
------
Dockerfile:6

--------------------

   4 |     RUN npm install

   5 |     COPY . .

   6 | >>> RUN ./node_modules/.bin/prisma generate

   7 |     EXPOSE 3001

   8 |     CMD ["npm", "run", "start:dev"]

--------------------

target backend: failed to solve: process "/bin/sh -c ./node_modules/.bin/prisma generate" did not complete successfully: exit code: 1

# Solution 

The problem is that prisma.config.ts tries to resolve DATABASE_URL at generate time, but during Docker build there's no .env available. prisma generate doesn't need the DB URL at all — that's only needed at runtime.
The fix is to make the URL optional in the config so generate can proceed without it:
prisma.config.ts
typescriptimport { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
prisma generate only reads the schema file — it uses the datasource block to know the provider type, not to actually connect. The placeholder URL will never be used during generate.
Then rebuild:
bashdocker compose down
docker compose up --build

# Error again 3

 => ERROR [backend 6/6] RUN ./node_modules/.bin/prisma generate               3.4s
------
 > [backend 6/6] RUN ./node_modules/.bin/prisma generate:
2.385 Loaded Prisma config from prisma.config.ts.
2.385 
2.563 Prisma schema loaded from prisma/schema.prisma.
2.578 Error: Prisma schema validation - (get-dmmf wasm)
2.578 Error code: P1012
2.578 error: Error parsing attribute "@relation": The type of the field `homeId` in the model `Match` is not matching the type of the referenced field `id` in model `User`.
2.578   -->  prisma/schema.prisma:35
2.578    | 
2.578 34 |   id         String   @id @default(uuid())
2.578 35 |   homePlayer User     @relation("HomePlayer", fields: [homeId], references: [id])
2.578 36 |   homeId     String
2.578    | 
2.578 error: Error parsing attribute "@relation": The type of the field `awayId` in the model `Match` is not matching the type of the referenced field `id` in model `User`.
2.578   -->  prisma/schema.prisma:37
2.578    | 
2.578 36 |   homeId     String
2.578 37 |   awayPlayer User     @relation("AwayPlayer", fields: [awayId], references: [id])
2.578 38 |   awayId     String
2.578    | 
2.578 error: Error parsing attribute "@relation": The type of the field `userId` in the model `Stats` is not matching the type of the referenced field `id` in model `User`.
2.578   -->  prisma/schema.prisma:49
2.578    | 
2.578 48 |   id      String @id @default(uuid())
2.578 49 |   user    User   @relation(fields: [userId], references: [id])
2.578 50 |   userId  String @unique
2.578    | 
2.578 
2.578 Validation Error Count: 3
2.578 [Context: getDmmf]
2.578 
2.578 Prisma CLI Version : 7.8.0
------
Dockerfile:6

--------------------

   4 |     RUN npm install

   5 |     COPY . .

   6 | >>> RUN ./node_modules/.bin/prisma generate

   7 |     EXPOSE 3001

   8 |     CMD ["npm", "run", "start:dev"]

--------------------

target backend: failed to solve: process "/bin/sh -c ./node_modules/.bin/prisma generate" did not complete successfully: exit code: 1

# Solution 

Change User.id to String
prismamodel User {
  id            String   @id @default(uuid())  // was Int @id @default(autoincrement())
  ...
}

# Error again 4

backend-1  | src/app.controller.ts:2:28 - error TS2307: Cannot find module './app.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { AppService } from './app.service';
backend-1  |                              ~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/app.module.ts:2:31 - error TS2307: Cannot find module './app.controller' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { AppController } from './app.controller';
backend-1  |                                 ~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/app.module.ts:3:28 - error TS2307: Cannot find module './app.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 3 import { AppService } from './app.service';
backend-1  |                              ~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/app.module.ts:4:29 - error TS2307: Cannot find module './users/users.module' or its corresponding type declarations.
backend-1  | 
backend-1  | 4 import { UsersModule } from './users/users.module';
backend-1  |                               ~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/app.module.ts:5:28 - error TS2307: Cannot find module './auth/auth.module' or its corresponding type declarations.
backend-1  | 
backend-1  | 5 import { AuthModule } from './auth/auth.module';
backend-1  |                              ~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/app.module.ts:6:30 - error TS2307: Cannot find module './prisma/prisma.module' or its corresponding type declarations.
backend-1  | 
backend-1  | 6 import { PrismaModule } from './prisma/prisma.module';
backend-1  |                                ~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.controller.ts:5:31 - error TS2307: Cannot find module './auth.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 5   import { AuthService } from './auth.service';
backend-1  |                                 ~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.controller.ts:6:34 - error TS2307: Cannot find module './guards/local-auth.guard' or its corresponding type declarations.
backend-1  | 
backend-1  | 6   import { LocalAuthGuard } from './guards/local-auth.guard';
backend-1  |                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.controller.ts:7:32 - error TS2307: Cannot find module './guards/jwt-auth.guard' or its corresponding type declarations.
backend-1  | 
backend-1  | 7   import { JwtAuthGuard } from './guards/jwt-auth.guard';
backend-1  |                                  ~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.controller.ts:8:35 - error TS2307: Cannot find module './guards/jwt-refresh.guard' or its corresponding type declarations.
backend-1  | 
backend-1  | 8   import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
backend-1  |                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.module.ts:4:29 - error TS2307: Cannot find module './auth.service' or its corresponding type declarations.
backend-1  | 


nginx-1    | /docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
backend-1  | 4 import { AuthService } from './auth.service';
backend-1  |                               ~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.module.ts:5:32 - error TS2307: Cannot find module './auth.controller' or its corresponding type declarations.
backend-1  | 
backend-1  | 5 import { AuthController } from './auth.controller';
backend-1  |                                  ~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.module.ts:6:31 - error TS2307: Cannot find module './strategies/local.strategy' or its corresponding type declarations.
backend-1  | 
backend-1  | 6 import { LocalStrategy } from './strategies/local.strategy';
backend-1  |                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.module.ts:7:29 - error TS2307: Cannot find module './strategies/jwt.strategy' or its corresponding type declarations.
backend-1  | 
backend-1  | 7 import { JwtStrategy } from './strategies/jwt.strategy';
backend-1  |                               ~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.module.ts:8:36 - error TS2307: Cannot find module './strategies/jwt-refresh.strategy' or its corresponding type declarations.
backend-1  | 
backend-1  | 8 import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
backend-1  |                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.module.ts:9:29 - error TS2307: Cannot find module '../users/users.module' or its corresponding type declarations.
backend-1  | 
backend-1  | 9 import { UsersModule } from '../users/users.module';
backend-1  |                               ~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/auth.service.ts:4:30 - error TS2307: Cannot find module '../users/users.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 4 import { UsersService } from '../users/users.service';
backend-1  |                                ~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/strategies/jwt-refresh.strategy.ts:6:30 - error TS2307: Cannot find module '../../users/users.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 6 import { UsersService } from '../../users/users.service';
backend-1  |                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/auth/strategies/local.strategy.ts:4:29 - error TS2307: Cannot find module '../auth.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 4 import { AuthService } from '../auth.service';
backend-1  |                               ~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/main.ts:2:27 - error TS2307: Cannot find module './app.module' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { AppModule } from './app.module';
backend-1  |                             ~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/prisma/prisma.service.ts:2:30 - error TS2307: Cannot find module '../generated/prisma/client.js' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { PrismaClient } from "../generated/prisma/client.js";
backend-1  |                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/prisma/prisma.service.ts:3:26 - error TS2307: Cannot find module '@prisma/adapter-pg' or its corresponding type declarations.
backend-1  | 
backend-1  | 3 import { PrismaPg } from "@prisma/adapter-pg";
backend-1  |                            ~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/users/users.controller.ts:2:30 - error TS2307: Cannot find module './users.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { UsersService } from './users.service';
backend-1  |                                ~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/users/users.controller.ts:3:30 - error TS2307: Cannot find module '../auth/guards/jwt-auth.guard' or its corresponding type declarations.
backend-1  | 
backend-1  | 3 import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
backend-1  |                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/users/users.module.ts:2:30 - error TS2307: Cannot find module './users.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { UsersService } from './users.service';
backend-1  |                                ~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/users/users.module.ts:3:33 - error TS2307: Cannot find module './users.controller' or its corresponding type declarations.
backend-1  | 
backend-1  | 3 import { UsersController } from './users.controller';
backend-1  |                                   ~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/users/users.service.ts:2:31 - error TS2307: Cannot find module '../prisma/prisma.service' or its corresponding type declarations.
backend-1  | 
backend-1  | 2 import { PrismaService } from '../prisma/prisma.service';
backend-1  |                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | src/users/users.service.ts:3:22 - error TS2307: Cannot find module '../generated/prisma/client.js' or its corresponding type declarations.
backend-1  | 
backend-1  | 3 import { User } from "../generated/prisma/client.js";
backend-1  |                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | [3:41:45 PM] Found 28 errors. Watching for file changes.

# Solution 

Step 1 — Remove "type": "module" from package.json
Open backend/package.json and delete this line:
json"type": "module",

Step 2 — Fix prisma.service.ts imports (no .js extensions in CJS)
typescriptimport { Injectable } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }
}

Step 3 — Fix the same in users.service.ts
Change:
typescriptimport { User } from "../generated/prisma/client.js";
To:
typescriptimport { User } from "../generated/prisma";

# Error again 6

backend-1   | src/app.module.ts:6:30 - error TS2307: Cannot find module './prisma/prisma.module' or its corresponding type declarations.
backend-1   | 
backend-1   | 6 import { PrismaModule } from './prisma/prisma.module';
backend-1   |                                ~~~~~~~~~~~~~~~~~~~~~~~~
backend-1   | 
backend-1   | src/prisma/prisma.service.ts:2:30 - error TS2307: Cannot find module '../generated/prisma' or its corresponding type declarations.
backend-1   | 
backend-1   | 2 import { PrismaClient } from "../generated/prisma";
backend-1   |                                ~~~~~~~~~~~~~~~~~~~~~
backend-1   | 
backend-1   | src/prisma/prisma.service.ts:3:26 - error TS2307: Cannot find module '@prisma/adapter-pg' or its corresponding type declarations.
backend-1   | 
backend-1   | 3 import { PrismaPg } from "@prisma/adapter-pg";
backend-1   |                            ~~~~~~~~~~~~~~~~~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:3:22 - error TS2307: Cannot find module '../generated/prisma' or its corresponding type declarations.
backend-1   | 
backend-1   | 3 import { User } from "../generated/prisma";
backend-1   |                        ~~~~~~~~~~~~~~~~~~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:11:24 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 11     return this.prisma.user.findUnique({ where: { id } });
backend-1   |                           ~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:15:24 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 15     return this.prisma.user.findUnique({ where: { email } });
backend-1   |                           ~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:19:24 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 19     return this.prisma.user.findUnique({ where: { username } });
backend-1   |                           ~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:30:24 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 30     return this.prisma.user.create({
backend-1   |                           ~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:41:23 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 41     await this.prisma.user.update({
backend-1   |                          ~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:48:24 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 48     return this.prisma.user.update({
backend-1   |                           ~~~~
backend-1   | 
backend-1   | src/users/users.service.ts:60:24 - error TS2339: Property 'user' does not exist on type 'PrismaService'.
backend-1   | 
backend-1   | 60     return this.prisma.user.update({
backend-1   |                           ~~~~
backend-1   | 
backend-1   | [3:50:51 PM] Found 11 errors. Watching for file changes.

# Solution

Step 1 — Verify packages are actually installed
Run this inside the container:
bashdocker compose exec backend npm list @prisma/adapter-pg
If it says "not found", install it:
bashdocker compose exec backend npm install @prisma/adapter-pg pg

Step 2 — Check your schema.prisma generator block
It must look exactly like this — output must be inside src/:
prismagenerator client {
  provider   = "prisma-client"
  output     = "../src/generated/prisma"
  engineType = "client"
}

datasource db {
  provider = "postgresql"
}
No url in the datasource block — that lives only in prisma.config.ts.

Step 3 — Run prisma generate manually inside the container
bashdocker compose exec backend npx prisma generate
This creates src/generated/prisma/. Without this, TypeScript has nothing to import and all those "cannot find module" errors cascade.

Step 4 — Update your Dockerfile so this happens at build time
dockerfileFROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]
The ARG/ENV trick is needed because prisma.config.ts calls env('DATABASE_URL') at generate time — it needs something there even if it's a dummy value.

Step 6 — Fix users.service.ts import
typescriptimport { User } from "../generated/prisma/client";

# Error the last one

backend-1  | src/app.module.ts:6:30 - error TS2307: Cannot find module './prisma/prisma.module' or its corresponding type declarations.
backend-1  | 
backend-1  | 6 import { PrismaModule } from './prisma/prisma.module';
backend-1  |                                ~~~~~~~~~~~~~~~~~~~~~~~~
backend-1  | 
backend-1  | [4:09:39 PM] Found 1 error. Watching for file changes.

I am missing prisma.module.ts

# Solution

Create it:
src/prisma/prisma.module.ts
typescriptimport { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

# Really the last error

[4:14:12 PM] File change detected. Starting incremental compilation...
backend-1   | 
backend-1   | [4:14:12 PM] Found 0 errors. Watching for file changes.
backend-1   | 
backend-1   | file:///app/dist/src/generated/prisma/client.js:38
backend-1   | Object.defineProperty(exports, "__esModule", { value: true });
backend-1   |                       ^
backend-1   | 
backend-1   | ReferenceError: exports is not defined in ES module scope
backend-1   |     at file:///app/dist/src/generated/prisma/client.js:38:23
backend-1   |     at ModuleJobSync.runSync (node:internal/modules/esm/module_job:454:37)
backend-1   |     at ModuleLoader.importSyncForRequire (node:internal/modules/esm/loader:445:47)
backend-1   |     at loadESMFromCJS (node:internal/modules/cjs/loader:1600:24)
backend-1   |     at Module._compile (node:internal/modules/cjs/loader:1763:5)
backend-1   |     at Object..js (node:internal/modules/cjs/loader:1913:10)
backend-1   |     at Module.load (node:internal/modules/cjs/loader:1505:32)
backend-1   |     at Function._load (node:internal/modules/cjs/loader:1309:12)
backend-1   |     at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
backend-1   |     at Module.require (node:internal/modules/cjs/loader:1527:12)
backend-1   | 
backend-1   | Node.js v22.23.0
db-1        | 2026-06-20 16:14:40.399 UTC [27] LOG:  checkpoint starting: time
db-1        | 2026-06-20 16:14:40.692 UTC [27] LOG:  checkpoint complete: wrote 3 buffers (0.0%); 0 WAL file(s) added, 0 removed, 0 recycled; write=0.034 s, sync=0.023 s, total=0.290 s; sync files=2, longest=0.015 s, average=0.012 s; distance=0 kB, estimate=0 kB; lsn=0/1951FB0, redo lsn=0/1951F78

# solution

Change tsconfig.json to use CommonJS:
json{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  }
}
Two changes:

"module": "nodenext" → "commonjs"
"moduleResolution": "nodenext" → "node"
"target": "ES2023" → "ES2021" (safer for NestJS with CJS)

# The last last error

	"message": "Option 'resolvePackageJsonExports' can only be used when 'moduleResolution' is set to 'node16', 'nodenext', or 

# Solution

Fix 1 — tsconfig.json
Remove resolvePackageJsonExports entirely (it's not needed with "moduleResolution": "node"):

Fix 2 — Rebuild the container
docker compose down
docker compose up --build

# The most lst in the world error the last for real


backend-1  | file:///app/dist/src/generated/prisma/client.js:38
backend-1  | Object.defineProperty(exports, "__esModule", { value: true });
backend-1  |                       ^
backend-1  | 
backend-1  | ReferenceError: exports is not defined in ES module scope
backend-1  |     at file:///app/dist/src/generated/prisma/client.js:38:23
backend-1  |     at ModuleJobSync.runSync (node:internal/modules/esm/module_job:454:37)
backend-1  |     at ModuleLoader.importSyncForRequire (node:internal/modules/esm/loader:445:47)
backend-1  |     at loadESMFromCJS (node:internal/modules/cjs/loader:1600:24)
backend-1  |     at Module._compile (node:internal/modules/cjs/loader:1763:5)
backend-1  |     at Object..js (node:internal/modules/cjs/loader:1913:10)
backend-1  |     at Module.load (node:internal/modules/cjs/loader:1505:32)
backend-1  |     at Function._load (node:internal/modules/cjs/loader:1309:12)
backend-1  |     at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
backend-1  |     at Module.require (node:internal/modules/cjs/loader:1527:12)
backend-1  | 
backend-1  | Node.js v22.23.0

# Solution

The real fix: Use Node 20 in your Dockerfile
Node 22's module detection is stricter. Your entire NestJS stack targets CommonJS, so use the LTS version that works predictably with it:
Dockerfile:
dockerfileFROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

Also add this to schema.prisma
prismagenerator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  engineType   = "client"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

rebuild
docker compose down -v
docker compose build --no-cache
docker compose up

# Really I am serious as never before last error

backend-1   | Object.defineProperty(exports, "__esModule", { value: true });
backend-1   |                       ^
backend-1   | 
backend-1   | ReferenceError: exports is not defined in ES module scope
backend-1   |     at file:///app/dist/src/generated/prisma/client.js:38:23
backend-1   |     at ModuleJobSync.runSync (node:internal/modules/esm/module_job:437:37)
backend-1   |     at ModuleLoader.importSyncForRequire (node:internal/modules/esm/loader:389:47)
backend-1   |     at loadESMFromCJS (node:internal/modules/cjs/loader:1363:24)
backend-1   |     at Module._compile (node:internal/modules/cjs/loader:1503:5)
backend-1   |     at Module._extensions..js (node:internal/modules/cjs/loader:1623:10)
backend-1   |     at Module.load (node:internal/modules/cjs/loader:1266:32)
backend-1   |     at Module._load (node:internal/modules/cjs/loader:1091:12)
backend-1   |     at Module.require (node:internal/modules/cjs/loader:1289:19)
backend-1   |     at require (node:internal/modules/helpers:182:18)
backend-1   | 
backend-1   | Node.js v20.20.2

# Solution
 So the current error is the same exports is not defined in ES module scope but now on Node 20 — meaning the moduleFormat = "cjs" fix didn't take effect yet.So the current error is the same exports is not defined in ES module scope but now on Node 20 — meaning the moduleFormat = "cjs" fix didn't take effect yet. Most likely the old generated client is still cached.
Run this to force a clean regeneration:
docker compose down
rm -rf backend/src/generated
docker compose build --no-cache
docker compose up





















## MOVING ON ! FINALLY
# Add JWT keys 

inside .env:
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=

Rebuild:
docker compose down
docker compose up --build

# Test 1 - Register a user

# Error 1
 % curl -v -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \ 
  -d '{"email":"test@test.com","username":"testuser","password":"password123"}'
Note: Unnecessary use of -X or --request, POST is already inferred.
*   Trying 127.0.0.1:8080...
* Connected to localhost (127.0.0.1) port 8080 (#0)
> POST /api/auth/register HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.81.0
> Accept: */*
> Content-Type: application/json
> Content-Length: 72
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 502 Bad Gateway
< Server: nginx/1.31.2
< Date: Sat, 20 Jun 2026 18:31:01 GMT
< Content-Type: text/html
< Content-Length: 157
< Connection: keep-alive
< 
<html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.31.2</center>
</body>
</html>

nginx-1     | 172.18.0.1 - - [20/Jun/2026:18:31:01 +0000] "POST /api/auth/register HTTP/1.1" 502 157 "-" "curl/7.81.0"
nginx-1     | 2026/06/20 18:31:01 [error] 22#22: *1 connect() failed (111: Connection refused) while connecting to upstream, client: 172.18.0.1, server: , request: "POST /api/auth/register HTTP/1.1", upstream: "http://172.18.0.3:3001/auth/register", host: "localhost:8080"


# Fix
Fix backend/src/main.ts:
typescriptimport { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001); // await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

This worked.

# Run migrations

docker compose exec backend npx prisma migrate dev --name init

Migration applied perfectly.

# Retry the register curl

curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"password123"}' | jq


## AUTH IS WORKING

# Test 2 - login

curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq

 "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNWM1MDY5OC1mNmM0LTRmZDgtOTQ5NC0wYjgyZWRjNDQ5NzgiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3ODE5ODEzNjksImV4cCI6MTc4MTk4MjI2OX0.CgY0hcKSNCQ-utfV31nj2WeENeZ7xZLXPqiBiFbg9i8",

Then save the accessToken from the response and test the protected route:
bashcurl -s http://localhost:8080/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" | jq

curl -s http://localhost:8080/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNWM1MDY5OC1mNmM0LTRmZDgtOTQ5NC0wYjgyZWRjNDQ5NzgiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3ODE5ODEzNjksImV4cCI6MTc4MTk4MjI2OX0.CgY0hcKSNCQ-utfV31nj2WeENeZ7xZLXPqiBiFbg9i8" | jq

Register → returns JWT pair

Protected route → JWT guard works, returns sanitized user (no password/refreshToken leaked)

DB migration applied, User table exists

# Test 3 - Refresh

curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq

 "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNWM1MDY5OC1mNmM0LTRmZDgtOTQ5NC0wYjgyZWRjNDQ5NzgiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3ODE5ODE3MzksImV4cCI6MTc4MjU4NjUzOX0.FmcXzayjGpkKGPFu1aWeht-KqlipU91YXT-65P3qI04"

curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"PASTE_REFRESH_TOKEN_HERE"}' | jq

curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNWM1MDY5OC1mNmM0LTRmZDgtOTQ5NC0wYjgyZWRjNDQ5NzgiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3ODE5ODE3MzksImV4cCI6MTc4MjU4NjUzOX0.FmcXzayjGpkKGPFu1aWeht-KqlipU91YXT-65P3qI04"}' | jq

✅ Register → returns tokens
✅ GET /users/me → returns sanitized profile (no password/refreshToken)
✅ Login → returns fresh tokens
✅ Refresh → rotates both tokens











## NEXT: AVATAR UPLOAD

Step 1: Create the uploads directory inside the container

docker compose exec backend mkdir -p uploads/avatars


Step 2: Update main.ts to serve the uploads folder as static files

docker compose exec backend cat src/main.ts


Then we'll patch it. But first, paste the output of this so I can confirm the current state matches what you showed, then run:
bashdocker compose exec backend npm install @nestjs/serve-static
Actually — let's keep it simpler and avoid serve-static (it adds config overhead). NestJS can serve static assets directly via useStaticAssets from the Express adapter. Here's the full sequence:


Step 2: Patch main.ts

cat > /tmp/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  await app.listen(3001);
}
bootstrap();
EOF
docker compose exec -T backend bash -c 'cat > src/main.ts' < /tmp/main.ts


Step 3: Add the avatar upload endpoint to users.controller.ts

cat > /tmp/users.controller.ts << 'EOF'
import {
  Controller, Get, Put, Post, Param, Body,
  UseGuards, Request, NotFoundException,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.usersService.sanitize(user);
  }

  // GET /users/:id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.sanitize(user);
  }

  // PUT /users/me
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Request() req, @Body() body: { username?: string }) {
    const updated = await this.usersService.updateProfile(req.user.id, body);
    return this.usersService.sanitize(updated);
  }

  // POST /users/me/avatar
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const avatarPath = `/uploads/avatars/${file.filename}`;
    const updated = await this.usersService.updateAvatar(req.user.id, avatarPath);
    return this.usersService.sanitize(updated);
  }
}
EOF
docker compose exec -T backend bash -c 'cat > src/users/users.controller.ts' < /tmp/users.controller.ts


Step 4: Rebuild and test

docker compose up --build -d

# Test

Wait ~10 seconds, then test the upload:

First grab a fresh access token

TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq -r '.accessToken')

echo $TOKEN


Then upload with a real image file (grab any small jpg/png on your machine):

curl -s -X POST https://localhost/api/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/any/image.jpg" \
  --insecure | jq

Expected response:
json{
  "id": "...",
  "email": "your@email.com",
  "username": "yourname",
  "avatar": "/uploads/avatars/1234567890-123456789.jpg",
  ...
}


Then confirm the file is actually served as static:

curl -I https://localhost/uploads/avatars/<filename-from-above> --insecure

Should return HTTP/1.1 200 OK with a Content-Type: image/jpeg header.

# Error

TOKEN returns null because database was wiped during the rebuild.


# Solution

I am going to run migrations:
docker compose exec backend npx prisma migrate deploy

# Re-register user and retry avatar upload

Re-register:
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"password123"}' | jq

Grab token:
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq -r '.accessToken')
echo $TOKEN

Upload image:
curl -s -o /tmp/test.jpg "https://picsum.photos/100" && \
curl -s -X POST http://localhost:8080/api/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/tmp/test.jpg" | jq

Confirm it was actually saved as static:
curl -I http://localhost:8080/uploads/avatars/<filename-from-above> --insecure

curl -I http://localhost:8080/uploads/avatars/1782129804800-606375318.jpg --insecure

# Error

Nginx routing /upload/ to the next.js frontend instead of backend. 

# Solution

Add location block for it

cat > ../nginx/nginx.conf << 'EOF'
events {}

http {
  server {
    listen 80;

    location / {
      proxy_pass http://frontend:3000;
    }

    location /api/ {
      proxy_pass http://backend:3001/;
    }

    location /uploads/ {
      proxy_pass http://backend:3001/uploads/;
    }
  }
}
EOF

# Error

Routing to the backend works correctly now. But static assests middleware isn't finding the file.

# Solution

Verufy both paths:

## Where did multer actually save the file?
docker compose exec backend find / -name "*.jpg" 2>/dev/null | grep uploads

## What does __dirname resolve to at runtime?
docker compose exec backend node -e "console.log(__dirname)"

Fix the static assets path:

cat > /tmp/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets('/app/uploads', {
    prefix: '/uploads',
  });
  await app.listen(3001);
}
bootstrap();
EOF
docker compose exec -T backend bash -c 'cat > src/main.ts' < /tmp/main.ts

Rebuild and retest:

docker compose up --build -d backend
sleep 8
curl -I http://localhost:8080/uploads/avatars/1782129804800-606375318.jpg


# AVATAR UPLOAD IS FULLY WORKING

# BACKEND REGISTRATION COMPLETE
Backend is now complete:

✅ Register → returns tokens
✅ Login → returns fresh tokens
✅ Refresh → rotates both tokens
✅ GET /users/me → sanitized profile
✅ POST /users/me/avatar → multipart upload, saves to disk, serves as static, stores path in DB

























# FRONTEND REGISTRATION

What will be build:

app/
├── layout.tsx              ← add AuthProvider here
├── page.tsx                ← replace with protected dashboard
├── login/page.tsx          ← replace stub with real form
├── register/page.tsx       ← create from scratch
├── profile/page.tsx        ← replace stub with real profile + avatar
└── lib/
    ├── auth.ts             ← token helpers (localStorage + refresh logic)
    └── api.ts              ← typed fetch wrapper (attaches token, handles 401)
context/
└── AuthContext.tsx         ← currentUser state, login/logout/refresh

app/lib/auth.ts
This file owns all token I/O so nothing else touches localStorage directly.

app/lib/api.ts
The fetch wrapper — attaches the bearer token, auto-refreshes on 401, redirects to /login if refresh also fails.

context/AuthContext.tsx
Global auth state — wraps the whole app so any component can call useAuth().

app/layout.tsx — add AuthProvider

app/register/page.tsx — new file

app/login/page.tsx — replace stub

app/page.tsx — protected dashboard

nginx — add /api proxy block:
location /api/ {
    proxy_pass         http://backend:3001/;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}

Rebuild.

# Works

# Fixed typo mismatch

grep "accessToken\|access_token" frontend/app/register/page.tsx
grep "accessToken\|access_token" frontend/app/login/page.tsx
grep "accessToken\|access_token" frontend/app/lib/api.ts

sed -i 's/data\.access_token/data.accessToken/g; s/data\.refresh_token/data.refreshToken/g' frontend/app/register/page.tsx
sed -i 's/data\.access_token/data.accessToken/g; s/data\.refresh_token/data.refreshToken/g' frontend/app/login/page.tsx
sed -i 's/data\.access_token/data.accessToken/g; s/data\.refresh_token/data.refreshToken/g' frontend/app/lib/api.ts

# Fixed nginx.config

events {}

http {
  server {
    listen 80;

    location / {
      proxy_pass http://frontend:3000;

      proxy_http_version 1.1;

      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";

      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
      proxy_pass http://backend:3001/;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
      proxy_pass http://backend:3001/uploads/;
    }
  }
}

# Added .env.example

DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=transcendence
DATABASE_URL=postgresql://postgres:yourpassword@db:5432/transcendence
JWT_SECRET=changeme
NEXTAUTH_SECRET=changeme


OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://postgres:<password>@db:5432/ft_transcendence

# JWT
JWT_SECRET=<your_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3001

# OAuth (were placeholders at the time)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://localhost/api/auth/google/callback

INTRA_CLIENT_ID=xxx
INTRA_CLIENT_SECRET=xxx
INTRA_CALLBACK_URL=https://localhost/api/auth/42/callback



# I had some problems with node_modules since I changed their installing inside the root repository.

# Frontend registration doesnt fully work yet

Prisma is trying to connect as user postgres but thats not what my database is configured with.
i had a duplicate of DATABASE_URL duh

I fixed it and did docker compose restart backend

I wil try to register now again


# OMG IT WORKS!!!!


It works! Great milestone — the full register → token → redirect flow is live.
Looking at Person B's checklist, here's what's done and what's left:
✅ Done:

Registration + login with bcrypt
JWT access + refresh tokens + guards
GET /users/me + avatar upload
Frontend login, register, protected dashboard

Remaining for Person B:

PUT /users/me (profile edit endpoint)
OAuth 2.0 with 42 Intra or Google
Frontend profile page (avatar upload UI + edit form)

The natural next step is PUT /users/me — it's small, pure backend, and unblocks the profile page. Then OAuth. Then we wire up the profile UI.

Q: Which OAuth provider do you want to tackle first?
A: Google

Q: What should PUT /users/me allow editing?
A: Username + email + password change

Perfect. Here's the plan of attack:

PUT /users/me backend endpoint (username + email + password change)
Google OAuth backend (Passport google strategy → JWT on callback)
Frontend profile page (edit form + avatar upload UI)
Frontend Google login button

Let's start with PUT /users/me. First let me see your current users module:
bashdocker compose exec backend cat src/users/users.service.ts
docker compose exec backend cat src/users/users.controller.ts
docker compose exec backend cat src/users/dto/update-user.dto.ts 2>/dev/null || echo "NO DTO YET"
Paste those three outputs and we'll add the endpoint cleanly on top of what's already there.

pshcherb@cbr3s5 /goinfre/pshcherb/ft_transc
 % docker compose exec backend cat src/users/users.service.ts
docker compose exec backend cat src/users/users.controller.ts
docker compose exec backend cat src/users/dto/update-user.dto.ts 2>/dev/null || echo "NO DTO YET"
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from "../generated/prisma/client";
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: { email: string; username: string; password: string }): Promise<User> {
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
      },
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  async updateAvatar(userId: string, avatarPath: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
    });
  }

  async updateProfile(userId: string, data: { username?: string }): Promise<User> {
    if (data.username) {
      const existing = await this.findByUsername(data.username);
      if (existing && existing.id !== userId)
        throw new ConflictException('Username already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // Returns user WITHOUT sensitive fields
  sanitize(user: User) {
    const { password, refreshToken, ...safe } = user;
    return safe;
  }
}
import {
  Controller, Get, Put, Post, Param, Body,
  UseGuards, Request, NotFoundException,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.usersService.sanitize(user);
  }

  // GET /users/:id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.sanitize(user);
  }

  // PUT /users/me
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Request() req, @Body() body: { username?: string }) {
    const updated = await this.usersService.updateProfile(req.user.id, body);
    return this.usersService.sanitize(updated);
  }

  // POST /users/me/avatar
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const avatarPath = `/uploads/avatars/${file.filename}`;
    const updated = await this.usersService.updateAvatar(req.user.id, avatarPath);
    return this.usersService.sanitize(updated);
  }
}
cat: can't open 'src/users/dto/update-user.dto.ts': No such file or directory
NO DTO YET



# What I will o next

Fix updateAvatar → use avatarUrl instead of avatar
Extend updateProfile to support password change
Add a proper UpdateUserDto with validation
Update the controller to use the DTO and handle password

Step 1 - create the DTO
sh: can't create src/users/dto/update-user.dto.ts: nonexistent directory

Step 2 - Update users.service.ts
avatar->vatarUrl and add password change logic to updateProfile
zsh: event not found: user)

Step 3 - update users.controlelr.ts
zsh: event not found: user)

I have to get inside the container
docker compose exec -it backend sh

Step 1 — Create the dto directory and file
shmkdir -p src/users/dto
cat > src/users/dto/update-user.dto.ts << 'EOF'
import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
EOF
Step 2 — Overwrite users.service.ts
shcat > src/users/users.service.ts << 'EOF'
import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: { email: string; username: string; password: string }): Promise<User> {
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
      },
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  async updateAvatar(userId: string, avatarPath: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPath },
    });
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const updateData: Partial<{ username: string; password: string }> = {};

    if (dto.username) {
      const existing = await this.findByUsername(dto.username);
      if (existing && existing.id !== userId)
        throw new ConflictException('Username already taken');
      updateData.username = dto.username;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword)
        throw new BadRequestException('Current password is required to set a new password');

      if (!user.password)
        throw new BadRequestException('Cannot change password for OAuth accounts');

      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid)
        throw new UnauthorizedException('Current password is incorrect');

      updateData.password = await bcrypt.hash(dto.newPassword, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  sanitize(user: User) {
    const { password, refreshToken, ...safe } = user;
    return safe;
  }
}
EOF
Step 3 — Overwrite users.controller.ts
shcat > src/users/users.controller.ts << 'EOF'
import {
  Controller, Get, Put, Post, Param, Body,
  UseGuards, Request, NotFoundException,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.usersService.sanitize(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    const updated = await this.usersService.updateProfile(req.user.id, dto);
    return this.usersService.sanitize(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const avatarPath = `/uploads/avatars/${file.filename}`;
    const updated = await this.usersService.updateAvatar(req.user.id, avatarPath);
    return this.usersService.sanitize(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.sanitize(user);
  }
}
EOF
Then exit the container and rebuild:
bashexit
docker compose up --build -d && docker compose logs backend --tail=30

# check for backend logs:

docker compose logs backend --tail=40

# i get some error class validator not installed and schema still uses avatar 

docker compose exec backend npm install class-validator class-transformer

check what actually prisma uses:
docker compose exec backend grep -n "avatar" /app/prisma/schema.prisma

# Test for user change, I dont have UI for this so I will be using curl

First create a user to test this

# 1. Login to get a token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"yourmail@gmail.com","password":"yourpassword"}' \
  --insecure | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 2. Test PUT /users/me — username change
curl -s -X PUT http://localhost:3001/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newname123"}' | python3 -m json.tool

# 3. Test password change
curl -s -X PUT http://localhost:3001/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"yourpassword","newPassword":"newpassword123"}' | python3 -m json.tool

# 4. Test validation — should return 400
curl -s -X PUT http://localhost:3001/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"x"}' | python3 -m json.tool


















# Moving on with Google Auth

Step 1 — Install the Google strategy inside the container
docker compose exec backend npm install passport-google-oauth20
docker compose exec backend npm install --save-dev @types/passport-google-oauth20

Step 2 - plan 
1. src/auth/strategies/google.strategy.ts — new file
2. auth.service.ts — add googleLogin() method
3. auth.controller.ts — add the two OAuth routes
4. auth.module.ts — register the Google strategy


Google OAuth — Backend
Here's the plan: Passport google strategy → on callback, find-or-create user → issue your existing JWT pair → redirect to frontend.

I already installed google strategy

% docker compose exec backend find src/auth -type f | sort
src/auth/auth.controller.ts
src/auth/auth.module.ts
src/auth/auth.service.ts
src/auth/guards/jwt-auth.guard.ts
src/auth/guards/jwt-refresh.guard.ts
src/auth/guards/local-auth.guard.ts
src/auth/strategies/jwt-refresh.strategy.ts
src/auth/strategies/jwt.strategy.ts
src/auth/strategies/local.strategy.ts

Good clean structure. We need to add one file and edit three. Here's the full plan:

src/auth/strategies/google.strategy.ts — new file
auth.service.ts — add googleLogin() method
auth.controller.ts — add the two OAuth routes
auth.module.ts — register the Google strategy

pshcherb@cbr3s5 /goinfre/pshcherb/ft_transc
 % docker compose exec backend cat src/auth/auth.service.ts
docker compose exec backend cat src/auth/auth.controller.ts
docker compose exec backend cat src/auth/auth.module.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // Called by LocalStrategy — validates email+password
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;
    return this.usersService.sanitize(user);
  }

  // Generate both tokens and store hashed refresh token
  async login(user: { id: string; email: string }) {
    const tokens = await this.generateTokens(user.id, user.email);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // Register new user then log them in
  async register(email: string, username: string, password: string) {
    const user = await this.usersService.create({ email, username, password });
    return this.login({ id: user.id, email: user.email });
  }

  // Rotate refresh token — called by JwtRefreshGuard
  async refreshTokens(userId: string, email: string) {
    const tokens = await this.generateTokens(userId, email);
    await this.usersService.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  // Clear stored refresh token on logout
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}import {
    Controller, Post, Body, UseGuards,
    Request, HttpCode, HttpStatus,
  } from '@nestjs/common';
  import { AuthService } from './auth.service';
  import { LocalAuthGuard } from './guards/local-auth.guard';
  import { JwtAuthGuard } from './guards/jwt-auth.guard';
  import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
  
  @Controller('auth')
  export class AuthController {
    constructor(private authService: AuthService) {}
  
    // POST /auth/register
    @Post('register')
    async register(@Body() body: { email: string; username: string; password: string }) {
      return this.authService.register(body.email, body.username, body.password);
    }
  
    // POST /auth/login  (LocalStrategy validates email+password first)
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Request() req) {
      return this.authService.login(req.user);
    }
  
    // POST /auth/refresh  (JwtRefreshGuard validates the refresh token)
    @UseGuards(JwtRefreshGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Request() req) {
      return this.authService.refreshTokens(req.user.id, req.user.email);
    }
  
    // POST /auth/logout
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req) {
      await this.authService.logout(req.user.id);
      return { message: 'Logged out' };
    }
  }import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '15m') as any,
        },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
})
export class AuthModule {}%  