import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    nickname: 'Test',
    role: 'CUSTOMER',
    createdAt: new Date(),
  };

  const mockAdmin = {
    ...mockUser,
    id: 'admin-1',
    email: 'admin@simcard.shop',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    };

    jwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return JWT token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'Test',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw ConflictException for duplicate email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password before storing', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');

      await service.register({ email: 'new@example.com', password: 'secret' });

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ password: '$2b$12$hashed' }),
      });
    });
  });

  describe('login', () => {
    it('should return JWT token for valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', role: 'CUSTOMER' }),
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include role in JWT payload for RBAC', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ email: 'admin@simcard.shop', password: 'admin123' });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const profileData = {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'Test',
        role: 'CUSTOMER',
        createdAt: new Date(),
      };
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(profileData);

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
    });
  });
});
