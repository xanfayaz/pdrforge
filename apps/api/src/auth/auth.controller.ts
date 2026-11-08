import { Controller, Get, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser, Public, type AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { SeedService } from '../seed/seed.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly seed: SeedService,
  ) {}

  @Public()
  @Post('demo')
  async demo() {
    await this.seed.ensure();
    const employee = await this.prisma.employee.findFirst({
      where: { role: 'owner', active: true },
      orderBy: { name: 'asc' },
    });
    if (!employee) {
      return { accessToken: null, user: null, workshop: null };
    }
    const workshop = await this.prisma.workshop.findUnique({ where: { id: employee.workshopId } });
    const accessToken = await this.jwt.signAsync({
      sub: employee.id,
      workshopId: employee.workshopId,
      role: employee.role,
      name: employee.name,
    });
    return { accessToken, user: employee, workshop };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const [employee, workshop] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: user.sub } }),
      this.prisma.workshop.findUnique({ where: { id: user.workshopId } }),
    ]);
    return { user: employee, workshop };
  }
}
