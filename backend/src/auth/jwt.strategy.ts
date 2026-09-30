import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtSecret || jwtSecret.length < 64) {
      throw new Error('JWT_SECRET must be configured with at least 64 characters');
    }
    if (!jwtRefreshSecret || jwtRefreshSecret.length < 64) {
      throw new Error('JWT_REFRESH_SECRET must be configured with at least 64 characters');
    }
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is disabled or does not exist');
    }

    return {
      userId: user.id,
      username: user.username,
      companyId: user.companyId,
      departmentId: user.departmentId,
      role: user.role.name,
      resetPasswordRequired: user.resetPasswordRequired,
    };
  }
}
