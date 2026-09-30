import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const rawSecret = process.env.JWT_SECRET || 'somtel_bluekom_petty_cash_default_secure_jwt_secret_key_2026_fallback_long_key_hash';
    const jwtSecret = rawSecret.length < 64 ? rawSecret.padEnd(64, '0') : rawSecret;

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
