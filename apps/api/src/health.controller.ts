import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth-user';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { ok: true, service: 'pdrforge-api' };
  }
}
