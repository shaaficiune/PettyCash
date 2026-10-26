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
    const rawCfIp = headers['cf-connecting-ip'];
    const rawTrueClientIp = headers['true-client-ip'];
    const rawXRealIp = headers['x-real-ip'];
    const rawForwardedFor = headers['x-forwarded-for'];

    let firstForwarded: string | undefined;
    if (typeof rawForwardedFor === 'string') {
      firstForwarded = rawForwardedFor.split(',')[0]?.trim();
    } else if (Array.isArray(rawForwardedFor) && rawForwardedFor.length > 0) {
      firstForwarded = (rawForwardedFor[0] as string)?.split(',')[0]?.trim();
    }

    const cfIp = typeof rawCfIp === 'string' ? rawCfIp.trim() : Array.isArray(rawCfIp) ? (rawCfIp[0] as string)?.trim() : undefined;
    const trueClientIp = typeof rawTrueClientIp === 'string' ? rawTrueClientIp.trim() : undefined;
    const xRealIp = typeof rawXRealIp === 'string' ? rawXRealIp.trim() : undefined;

    // Pick first valid public IP, preferring external IP over loopback (127.0.0.1)
    const candidateIps = [cfIp, trueClientIp, firstForwarded, xRealIp, request.ip, request.connection?.remoteAddress].filter(Boolean) as string[];
    const externalIp = candidateIps.find((ip) => ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1' && ip !== 'localhost');
    const selectedIp = externalIp || candidateIps[0] || '127.0.0.1';
    const ipAddress = selectedIp.replace(/^::ffff:/, '');

    const userAgent = headers['user-agent'] || 'Unknown';
    
    return next.handle().pipe(
      tap(async (response) => {
        const user = request.user;
        const action = this.determineAction(method, url, body);
        
        if (action) {
          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user ? user.userId : null,
                action: action,
                details: JSON.stringify({
                  url,
                  method,
                  body: this.sanitizeBody(body),
                  responseStatus: 'SUCCESS'
                }),
                ipAddress,
                userAgent
              }
            });
          } catch (e) {
            console.error('AuditLogInterceptor failed to log action:', e);
          }
        }
      })
    );
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
