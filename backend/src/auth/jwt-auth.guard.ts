import { Injectable, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication token is missing or invalid');
    }

    if (user.resetPasswordRequired) {
      const request = context.switchToHttp().getRequest();
      const path = String(request.originalUrl || request.url || '').split('?')[0];
      const isAllowedDuringReset =
        (request.method === 'POST' && path.endsWith('/auth/first-login-reset')) ||
        (request.method === 'POST' && path.endsWith('/auth/logout'));

      if (!isAllowedDuringReset) {
        throw new ForbiddenException('You must reset your password before using the system');
      }
    }

    return user;
  }
}
