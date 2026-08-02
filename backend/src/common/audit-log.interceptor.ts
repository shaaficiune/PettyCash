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
    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = headers['user-agent'] || 'Unknown';
    
    return next.handle().pipe(
      tap(async (response) => {
        const user = request.user;
        const action = this.determineAction(method, url);
        
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

  private determineAction(method: string, url: string): string | null {
    if (url.includes('/auth/login') && method === 'POST') return 'LOGIN';
    if (url.includes('/auth/logout') && method === 'POST') return 'LOGOUT';
    
    if (url.includes('/requests') && method === 'POST') {
      if (url.endsWith('/approve')) return 'APPROVE_REQUEST';
      if (url.endsWith('/reject')) return 'REJECT_REQUEST';
      if (url.endsWith('/correct')) return 'CORRECTION_REQUIRED';
      return 'CREATE_REQUEST';
    }
    
    if (url.includes('/requests') && method === 'PUT') return 'UPDATE_REQUEST';
    if (url.includes('/requests') && method === 'DELETE') return 'DELETE_REQUEST';
    
    if (url.includes('/payments') && method === 'POST') return 'RECORD_PAYMENT';
    if (url.includes('/settlements') && method === 'POST') {
      if (url.endsWith('/approve')) return 'APPROVE_SETTLEMENT';
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
    if (!body) return null;
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '********';
    if (sanitized.newPassword) sanitized.newPassword = '********';
    return sanitized;
  }
}
