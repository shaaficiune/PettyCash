import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account has been disabled. Please contact the administrator.');
    }

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.generateTokens(user);
  }

  async refresh(token: string) {
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { token },
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

    if (!dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken) {
        await this.prisma.refreshToken.delete({ where: { id: dbToken.id } });
      }
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(dbToken.user);

    // Delete old token
    await this.prisma.refreshToken.delete({ where: { id: dbToken.id } });

    return tokens;
  }

  async logout(token: string) {
    try {
      await this.prisma.refreshToken.delete({
        where: { token },
      });
      return { success: true, message: 'Logged out successfully' };
    } catch (e) {
      // Token might not exist, ignore
      return { success: true };
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = bcrypt.compareSync(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect old password');
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

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

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

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

    return this.generateTokens(updatedUser);
  }

  private async generateTokens(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      companyId: user.companyId,
      departmentId: user.departmentId,
      role: user.role.name,
      resetPasswordRequired: user.resetPasswordRequired,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'somtel_bluekom_petty_cash_secret_key_2026_jwt',
      // cast to any to satisfy type definitions for flexible env formats (e.g., '15m')
      expiresIn: process.env.JWT_ACCESS_EXPIRES as any || '15m',
    });

    const refreshTokenString = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'somtel_bluekom_petty_cash_refresh_secret_key_2026_jwt',
        expiresIn: process.env.JWT_REFRESH_EXPIRES as any || '7d',
      },
    );

    // Save refresh token to db
    const expiresAt = new Date();
    // Default 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
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
        employeeNumber: user.employeeNumber,
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
}
