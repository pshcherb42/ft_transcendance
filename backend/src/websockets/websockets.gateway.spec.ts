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

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

// docker compose run --rm backend npm run test websockets.gateway.spec.ts // Check that the logic works and there are no NEST.JS errors (2-3 min)