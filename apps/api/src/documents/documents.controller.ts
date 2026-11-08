import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('orders/:id/work-order.pdf')
  async workOrder(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const buffer = await this.documents.workOrder(user, id);
    sendPdf(res, buffer, `pdrforge-order-${id}.pdf`);
  }

  @Get('orders/:id/act.pdf')
  async act(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const buffer = await this.documents.act(user, id);
    sendPdf(res, buffer, `pdrforge-act-${id}.pdf`);
  }
}

function sendPdf(res: Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}
