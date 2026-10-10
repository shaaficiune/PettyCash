import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, ChangePasswordDto, FirstLoginResetDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        company: true,
        department: true,
        region: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 1. Permanently disabled (by admin or lockout Stage 3)
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your account has been disabled. Please contact the administrator.',
      );
    }

    // 2. Temporary lockout check
    // Exception: the primary master 'admin' account is never locked out
    if (user.username !== 'admin' && user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMs = user.lockoutUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60_000);
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${remainingMins} minute(s).`,
      );
    }

    // 3. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Primary master 'admin' account is fully exempt from lockout to prevent denial of service and self-lockout
      if (user.username === 'admin') {
        throw new UnauthorizedException('Invalid username or password.');
      }

      // Increment failure counter for all other users
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1;

      if (newAttempts >= 5) {
        const nextStage = (user.lockoutStage ?? 0) + 1;

        if (nextStage >= 3) {
          // Stage 3 — permanent DISABLED (admin must re-enable)
          // Exception: the primary 'admin' account is NEVER permanently disabled
          if (user.username === 'admin') {
            // Reset to stage 2 lockout (6 h) instead of disabling
            const unlockAt = new Date(Date.now() + 6 * 60 * 60 * 1_000);
            await this.prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockoutUntil: unlockAt,
                lockoutStage: 2,
              },
            });
            throw new UnauthorizedException(
              'Too many failed attempts. Account locked for 6 hours.',
            );
          }

          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockoutUntil: null,
              lockoutStage: 3,
              status: 'DISABLED',
            },
          });
          throw new UnauthorizedException(
            'Your account has been permanently disabled due to too many failed login attempts. Please contact the administrator.',
          );
        }

        // Stage 1 → 1 hour  |  Stage 2 → 6 hours
        const lockDurationMs = nextStage === 1
          ? 1 * 60 * 60 * 1_000
          : 6 * 60 * 60 * 1_000;
        const unlockAt = new Date(Date.now() + lockDurationMs);
        const lockHours = nextStage === 1 ? 1 : 6;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockoutUntil: unlockAt,
            lockoutStage: nextStage,
          },
        });
        throw new UnauthorizedException(
          `Too many failed attempts. Account locked for ${lockHours} hour(s).`,
        );
      }

      // Under 5 failures — just increment the counter
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts },
      });

      const remaining = 5 - newAttempts;
      throw new UnauthorizedException(
        `Invalid username or password. ${remaining} attempt(s) remaining before lockout.`,
      );
    }

    // 4. Successful login — reset all lockout state
    if (
      (user.failedLoginAttempts ?? 0) > 0 ||
      user.lockoutUntil !== null ||
      (user.lockoutStage ?? 0) > 0
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lockoutStage: 0,
        },
      });
    }

    return this.generateTokens(user);
  }


  async refresh(token: string) {
    if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    const tokenHash = this.hashRefreshToken(token);
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: {
        user: {
          include: {
            role: true,
            company: true,
            department: true,
            region: true,
          },
        },
      },
    });

    if (!dbToken) {
      // Tokens saved in plaintext by older releases are invalidated and removed
      // on first use after this security update.
      await this.prisma.refreshToken.deleteMany({ where: { token } });
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (dbToken.expiresAt < new Date() || dbToken.user.status !== 'ACTIVE') {
      await this.prisma.refreshToken.deleteMany({ where: { id: dbToken.id } });
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    // Consume the old refresh token and save its replacement atomically. If two
    // requests race, only the request that deletes one row can rotate the token.
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.deleteMany({
        where: { id: dbToken.id, userId: dbToken.userId, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException('Session expired. Please login again.');
      }
      return this.generateTokens(dbToken.user, tx);
    });
  }

  async logout(token: string) {
    if (typeof token === 'string' && token.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: { in: [this.hashRefreshToken(token), token] } },
      });
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect old password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordRequired: false, // Complete password reset requirement
      },
    });

    // Invalidate old sessions
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async resetPasswordFirstLogin(userId: string, resetDto: FirstLoginResetDto) {
    const { newPassword } = resetDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.resetPasswordRequired) {
      throw new BadRequestException('Password reset is not required');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordRequired: false,
      },
      include: {
        role: true,
        company: true,
        department: true,
      },
    });

    // Revoke the temporary-password session before issuing the new session.
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return this.generateTokens(updatedUser);
  }

  private async generateTokens(user: any, prisma: any = this.prisma) {
    const payload = {
      username: user.username,
      sub: user.id,
      companyId: user.companyId,
      departmentId: user.departmentId,
      role: user.role.name,
      resetPasswordRequired: user.resetPasswordRequired,
    };

    const rawSecret = process.env.JWT_SECRET || 'somtel_bluekom_petty_cash_default_secure_jwt_secret_key_2026_fallback_long_key_hash';
    const jwtSecret = rawSecret.length < 64 ? rawSecret.padEnd(64, '0') : rawSecret;

    const rawRefresh = process.env.JWT_REFRESH_SECRET || 'somtel_bluekom_petty_cash_default_refresh_jwt_secret_key_2026_fallback_long_key_hash';
    const baseRefresh = rawRefresh.length < 64 ? rawRefresh.padEnd(64, '1') : rawRefresh;
    const jwtRefreshSecret = baseRefresh === jwtSecret
      ? (rawRefresh + '_different_secret_salt').padEnd(64, '2')
      : baseRefresh;

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      // cast to any to satisfy type definitions for flexible env formats (e.g., '15m')
      expiresIn: process.env.JWT_ACCESS_EXPIRES as any || '15m',
    });

    const refreshTokenString = this.jwtService.sign(
      { sub: user.id, jti: randomUUID() },
      {
        secret: jwtRefreshSecret,
        expiresIn: process.env.JWT_REFRESH_EXPIRES as any || '7d',
      },
    );

    // Save refresh token to db
    const expiresAt = new Date();
    // Default 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: this.hashRefreshToken(refreshTokenString),
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        jobTitle: user.jobTitle,
        company: {
          id: user.company.id,
          name: user.company.name,
        },
        department: {
          id: user.department.id,
          name: user.department.name,
        },
        regionId: user.regionId || user.region?.id || null,
        region: user.region ? {
          id: user.region.id,
          name: user.region.name,
        } : null,
        role: user.role.name,
        resetPasswordRequired: user.resetPasswordRequired,
      },
    };
  }

  async updateProfile(userId: string, fullName: string) {
    if (!fullName || !fullName.trim()) {
      throw new BadRequestException('Full name cannot be empty');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName.trim(),
      },
      include: {
        role: true,
        company: true,
        department: true,
        region: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role.name,
        company: updated.company ? { id: updated.company.id, name: updated.company.name } : null,
        region: updated.region ? { id: updated.region.id, name: updated.region.name } : null,
      },
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
