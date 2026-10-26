import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;

    // Resolve true client IP behind Cloudflare Tunnel, Nginx, or reverse proxies
    const cfIp = headers['cf-connecting-ip'];
    const trueClientIp = headers['true-client-ip'];
    const xRealIp = headers['x-real-ip'];
    const rawForwardedFor = headers['x-forwarded-for'];
    const cfPseudoIp = headers['cf-pseudo-ipv4'];

    const parseIps = (val: any): string[] => {
      if (!val) return [];
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((s) => s.trim().replace(/^::ffff:/, ''))
          .filter(Boolean);
      }
      if (Array.isArray(val)) {
        return val.flatMap((v) => parseIps(v));
      }
      return [];
    };

    const isLoopback = (ip: string) => {
      if (!ip) return true;
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
      return false;
    };

    // Candidate list in priority order
    const candidateIps: string[] = [
      ...parseIps(cfIp),
      ...parseIps(trueClientIp),
      ...parseIps(cfPseudoIp),
      ...parseIps(rawForwardedFor),
      ...parseIps(xRealIp),
      ...parseIps(request.ips),
      ...parseIps(request.ip),
      ...parseIps(request.connection?.remoteAddress),
      ...parseIps(request.socket?.remoteAddress),
    ];

    // Find the first external non-loopback IP
    const externalIp = candidateIps.find((ip) => !isLoopback(ip));
    const ipAddress = externalIp || candidateIps[0] || '127.0.0.1';
    const userAgent = headers['user-agent'] || 'Unknown';

    return next.handle().pipe(
      tap(async (response) => {
        const action = this.determineAction(method, url, body);
        if (!action) return;

        try {
          let targetUserId: string | null = request.user?.userId || null;
          let resolvedUsername: string | null = request.user?.username || null;

          // 1. For LOGIN: extract user from response (since login route has no JWT guard yet)
          if (action === 'LOGIN' && response?.user?.id) {
            targetUserId = response.user.id;
            resolvedUsername = response.user.username || body?.username || null;
          }

          // 2. For LOGOUT & unauthenticated endpoints: extract user from Bearer header or refresh token
          if (!targetUserId) {
            const authHeader = (headers['authorization'] || headers['Authorization']) as string | undefined;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              const decoded = this.decodeJwt(authHeader.substring(7));
              if (decoded?.sub) {
                targetUserId = decoded.sub;
                resolvedUsername = decoded.username || resolvedUsername;
              }
            }
          }

          if (!targetUserId && body?.refreshToken && typeof body.refreshToken === 'string') {
            const decoded = this.decodeJwt(body.refreshToken);
            if (decoded?.sub) {
              targetUserId = decoded.sub;
            }
          }

          // Build detail payload including safe username
          const detailsPayload: any = {
            url,
            method,
            body: this.sanitizeBody(body),
            responseStatus: 'SUCCESS',
          };
          if (resolvedUsername) {
            detailsPayload.username = resolvedUsername;
          } else if (body?.username) {
            detailsPayload.username = body.username;
          }

          await this.prisma.auditLog.create({
            data: {
              userId: targetUserId,
              action: action,
              details: JSON.stringify(detailsPayload),
              ipAddress,
              userAgent,
            },
          });
        } catch (e) {
          console.error('AuditLogInterceptor failed to log action:', e);
        }
      }),
    );
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(payloadBase64, 'base64').toString('utf8');
        return JSON.parse(json);
      }
    } catch (_) {}
    return null;
  }

  private determineAction(method: string, url: string, body?: any): string | null {
    if (url.includes('/auth/login') && method === 'POST') return 'LOGIN';
    if (url.includes('/auth/logout') && method === 'POST') return 'LOGOUT';

    if (url.includes('/requests') && method === 'POST') {
      // /requests/:id/review endpoint
      if (url.match(/\/requests\/[^/]+\/review$/)) {
        const status = body?.status;
        if (status === 'APPROVED') return 'APPROVE_REQUEST';
        if (status === 'REJECTED') return 'REJECT_REQUEST';
        if (status === 'CORRECTION_REQUIRED') return 'CORRECTION_REQUIRED';
        return 'REVIEW_REQUEST';
      }
      return 'CREATE_REQUEST';
    }

    if (url.includes('/requests') && method === 'PUT') return 'UPDATE_REQUEST';
    if (url.includes('/requests') && method === 'DELETE') return 'DELETE_REQUEST';

    if (url.includes('/payments') && method === 'POST') return 'RECORD_PAYMENT';

    if (url.includes('/settlements') && method === 'POST') {
      // /settlements/:id/review endpoint
      if (url.match(/\/settlements\/[^/]+\/review$/)) {
        const status = body?.status;
        if (status === 'APPROVED') return 'APPROVE_SETTLEMENT';
        if (status === 'REJECTED') return 'REJECT_SETTLEMENT';
        return 'REVIEW_SETTLEMENT';
      }
      return 'SUBMIT_SETTLEMENT';
    }

    if (url.includes('/users')) {
      if (method === 'POST') return 'CREATE_USER';
      if (method === 'PUT') return 'UPDATE_USER';
      if (method === 'DELETE') return 'DISABLE_USER';
    }

    return null;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return null;
    const sanitized = { ...body };
    for (const key of Object.keys(sanitized)) {
      if (/password/i.test(key) || key === 'token' || key === 'refreshToken') {
        sanitized[key] = '********';
      }
    }
    return sanitized;
  }
}
