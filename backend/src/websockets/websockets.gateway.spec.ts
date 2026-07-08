import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketsGateway } from './websockets.gateway';
import { GameService } from './game.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('WebsocketsGateway', () => {
  let gateway: WebsocketsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketsGateway,
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: GameService,
          useValue: {
            createGame: jest.fn(),
            setPlayerInput: jest.fn(),
            removeGame: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<WebsocketsGateway>(WebsocketsGateway);
  });

  it('debería estar definido', () => {
    expect(gateway).toBeDefined();
  });
});

// docker compose run --rm backend npm run test websockets.gateway.spec.ts // Chequeamos que la logica funcione y no haya errores con NEST.JS (2-3 min)