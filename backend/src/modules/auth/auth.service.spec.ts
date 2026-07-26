import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { PasswordHelper } from '../../common/utils/password.helper';

// ---------------------------------------------------------------------------
// Mock PasswordHelper so we never touch bcrypt in unit tests
// ---------------------------------------------------------------------------
jest.mock('../../common/utils/password.helper', () => ({
  PasswordHelper: {
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    comparePassword: jest.fn().mockResolvedValue(true),
    validatePasswordStrength: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
    }),
  },
}));

// ---------------------------------------------------------------------------
// Mock crypto so token generation is deterministic
// ---------------------------------------------------------------------------
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-random-token'),
    }),
    randomUUID: jest.fn().mockReturnValue('mock-uuid-family'),
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue('mock-token-hash'),
      }),
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'hashed-password',
  phone: null,
  role: 'BUYER',
  isActive: true,
  isEmailVerified: true,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  backupCodes: [],
  verificationToken: null,
  verificationTokenExpiry: null,
  resetToken: null,
  resetTokenExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const STRONG_PASSWORD = 'StrongP@ss1';

// ---------------------------------------------------------------------------
// Build mock services
// ---------------------------------------------------------------------------
const buildPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tenant: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  sellerProfile: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
});

const buildJwtMock = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn(),
});

const buildEmailMock = () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwt: ReturnType<typeof buildJwtMock>;
  let email: ReturnType<typeof buildEmailMock>;

  beforeEach(async () => {
    // Reset all mocks between tests
    jest.clearAllMocks();
    (PasswordHelper.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (PasswordHelper.comparePassword as jest.Mock).mockResolvedValue(true);
    (PasswordHelper.validatePasswordStrength as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    });

    prisma = buildPrismaMock();
    jwt = buildJwtMock();
    email = buildEmailMock();

    // Suppress the setInterval inside the constructor so it doesn't leak
    jest.useFakeTimers();

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      email as unknown as EmailService,
    );

    jest.useRealTimers();
  });

  // =========================================================================
  // register()
  // =========================================================================
  describe('register()', () => {
    const registerDto = {
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: STRONG_PASSWORD,
      role: 'BUYER' as const,
    };

    it('should register a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      const result = await service.register(registerDto);

      expect(result.message).toBe('Registration successful');
      expect(result.user.email).toBe(registerDto.email);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(PasswordHelper.hashPassword).toHaveBeenCalledWith(registerDto.password);
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for a weak password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (PasswordHelper.validatePasswordStrength as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: ['Password must contain uppercase letter'],
      });

      await expect(
        service.register({ ...registerDto, password: 'weak' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should auto-create tenant and seller profile for SELLER role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        id: 'seller-id',
        role: 'SELLER',
      });
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue({ id: 'tenant-1' });
      prisma.sellerProfile.create.mockResolvedValue({ id: 'sp-1' });

      await service.register({
        ...registerDto,
        role: 'SELLER',
        storeName: 'Seller Store',
        storeSubdomain: 'seller-store',
        storeCity: 'Jakarta',
      });

      expect(prisma.tenant.create).toHaveBeenCalledTimes(1);
      expect(prisma.sellerProfile.create).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // login()
  // =========================================================================
  describe('login()', () => {
    const loginDto = { email: 'test@example.com', password: STRONG_PASSWORD };

    it('should login successfully and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      prisma.tenant.findFirst.mockResolvedValue(null);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login(loginDto);

      expect(result.message).toBe('Login successful');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect('user' in result).toBe(true);
      if (!('user' in result)) {
        throw new Error('Expected login result to include user');
      }
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      (PasswordHelper.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('should allow login for unverified email while email verification is disabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
      });
      prisma.tenant.findFirst.mockResolvedValue(null);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login(loginDto);

      expect(result.message).toBe('Login successful');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should lock account after MAX_LOGIN_ATTEMPTS failed attempts', async () => {
      // Use a unique email so the in-memory map doesn't collide with other tests
      const bruteDto = { email: 'brute@example.com', password: 'wrong' };
      prisma.user.findUnique.mockResolvedValue(null);

      // Exhaust all 5 allowed attempts
      for (let i = 0; i < 5; i++) {
        await expect(service.login(bruteDto)).rejects.toThrow(
          UnauthorizedException,
        );
      }

      // The 6th attempt should be blocked by the lockout check
      await expect(service.login(bruteDto)).rejects.toThrow(
        /Account temporarily locked/,
      );
    });

    it('should return 2FA challenge when twoFactorEnabled is true', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).toHaveProperty('userId', mockUser.id);
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  // =========================================================================
  // refreshToken()
  // =========================================================================
  describe('refreshToken()', () => {
    const refreshDto = { refreshToken: 'valid-refresh-token' };

    it('should rotate tokens successfully', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'mock-token-hash',
        userId: mockUser.id,
        family: 'family-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000), // future
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await service.refreshToken(refreshDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Old token should be revoked
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException for invalid JWT signature', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should revoke all tokens when token not found in DB (reuse detection)', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        /Token reuse detected/,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { isRevoked: true },
      });
    });

    it('should revoke entire family when a revoked token is used', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'mock-token-hash',
        userId: mockUser.id,
        family: 'family-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        /Session has been revoked/,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'family-1' },
        data: { isRevoked: true },
      });
    });

    it('should throw when refresh token is expired in DB', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'mock-token-hash',
        userId: mockUser.id,
        family: 'family-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // past
      });

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        'Refresh token has expired',
      );
    });
  });

  // =========================================================================
  // forgotPassword()
  // =========================================================================
  describe('forgotPassword()', () => {
    it('should generate reset token and send email for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      prisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('reset link has been sent');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExpiry: expect.any(Date),
          }),
        }),
      );
      expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String),
      );
    });

    it('should NOT throw for non-existent email (prevents enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nobody@example.com',
      });

      expect(result.message).toContain('reset link has been sent');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // resetPassword()
  // =========================================================================
  describe('resetPassword()', () => {
    const resetDto = { token: 'valid-reset-token', newPassword: STRONG_PASSWORD };

    it('should reset password successfully and revoke all sessions', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.resetPassword(resetDto);

      expect(result.message).toBe('Password reset successful');
      expect(PasswordHelper.hashPassword).toHaveBeenCalledWith(STRONG_PASSWORD);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            password: 'hashed-password',
            resetToken: null,
            resetTokenExpiry: null,
          }),
        }),
      );
      // All refresh tokens should be revoked
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { isRevoked: true },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: STRONG_PASSWORD }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: STRONG_PASSWORD }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw BadRequestException for expired token', async () => {
      // findFirst with the expiry filter returns null when token is expired
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'expired-token', newPassword: STRONG_PASSWORD }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword({ token: 'expired-token', newPassword: STRONG_PASSWORD }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw BadRequestException when new password is weak', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser });
      (PasswordHelper.validatePasswordStrength as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: ['Password must contain special character (!@#$%^&*)'],
      });

      await expect(
        service.resetPassword({ token: 'valid', newPassword: 'weakpass' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // changePassword()
  // =========================================================================
  describe('changePassword()', () => {
    const changeDto = {
      currentPassword: 'OldP@ss1',
      newPassword: STRONG_PASSWORD,
    };

    it('should change password successfully and revoke all sessions', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.changePassword(mockUser.id, changeDto);

      expect(result.message).toContain('Password changed successfully');
      expect(PasswordHelper.comparePassword).toHaveBeenCalledWith(
        changeDto.currentPassword,
        mockUser.password,
      );
      expect(PasswordHelper.hashPassword).toHaveBeenCalledWith(
        changeDto.newPassword,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { isRevoked: true },
      });
    });

    it('should throw BadRequestException when current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      (PasswordHelper.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id, changeDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword(mockUser.id, changeDto),
      ).rejects.toThrow('Current password is incorrect');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', changeDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword('nonexistent', changeDto),
      ).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when new password is weak', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser });
      (PasswordHelper.validatePasswordStrength as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: ['Password must contain number'],
      });

      await expect(
        service.changePassword(mockUser.id, {
          currentPassword: 'OldP@ss1',
          newPassword: 'NoNumber!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
