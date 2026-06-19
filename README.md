# ft_transcendance
Surprise.

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