import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums/user-role.enum';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      usersService.create!.mockRejectedValueOnce(
        new ConflictException('Email already exists'),
      );

      await expect(
        authService.register({
          name: 'malak',
          email: 'malak@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and create customer user', async () => {
      usersService.findByEmail!.mockResolvedValueOnce(null);
      const mockCreatedUser = {
        id: 'user-uuid-1',
        name: 'malak',
        email: 'malak@example.com',
        role: UserRole.CUSTOMER,
      };
      usersService.create!.mockResolvedValueOnce(mockCreatedUser as any);

      const result = await authService.register({
        name: 'malak',
        email: 'malak@example.com',
        password: 'Password123',
      });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user).toEqual(mockCreatedUser);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'malak',
          email: 'malak@example.com',
          role: UserRole.CUSTOMER,
        }),
      );
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      usersService.findByEmail!.mockResolvedValueOnce(null);

      await expect(
        authService.login({
          email: 'notfound@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);
      usersService.findByEmail!.mockResolvedValueOnce({
        id: '1',
        email: 'malak@example.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      } as any);

      await expect(
        authService.login({
          email: 'malak@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken on successful login', async () => {
      const password = 'CorrectPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: '1',
        email: 'malak@example.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      };
      usersService.findByEmail!.mockResolvedValueOnce(user as any);

      const result = await authService.login({
        email: 'malak@example.com',
        password,
      });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user).toEqual(user);
    });
  });
});
