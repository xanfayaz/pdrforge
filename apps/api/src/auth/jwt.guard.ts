import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@pdrforge/shared';
import { IS_PUBLIC, type AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header = String(request.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Нужно войти');

    let payload: { sub?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Сессия закончилась. Войдите как демо ещё раз.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: payload.sub, active: true },
    });
    if (!employee) throw new UnauthorizedException('Сотрудник отключён');

    const user: AuthUser = {
      sub: employee.id,
      workshopId: employee.workshopId,
      role: employee.role as UserRole,
      name: employee.name,
    };
    request.user = user;
    return true;
  }
}
