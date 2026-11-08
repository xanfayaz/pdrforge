import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { resolveUploads } from '../common/paths';
import { AddConstructorDto, CreateLineDto, CreateOrderDto, CreatePaymentDto, UpdateLineDto, UpdateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.orders.list(user, {
      status,
      q,
      from,
      to,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.detail(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.remove(user, id);
  }

  @Post(':id/lines')
  addLine(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateLineDto) {
    return this.orders.addLine(user, id, dto);
  }

  @Patch(':id/lines/:lineId')
  updateLine(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateLineDto,
  ) {
    return this.orders.updateLine(user, id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  removeLine(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('lineId') lineId: string) {
    return this.orders.removeLine(user, id, lineId);
  }

  @Post(':id/constructor')
  addConstructor(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddConstructorDto) {
    return this.orders.addConstructor(user, id, dto);
  }

  @Post(':id/payments')
  addPayment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.orders.addPayment(user, id, dto);
  }

  @Delete(':id/payments/:paymentId')
  removePayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.orders.removePayment(user, id, paymentId);
  }

  @Post(':id/lines/:lineId/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = resolveUploads();
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype)) {
          cb(new BadRequestException('Нужно изображение JPEG, PNG, WEBP, GIF или SVG'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('phase') phase = 'before',
  ) {
    if (!file) throw new BadRequestException('Файл не получен');
    return this.orders.addPhoto(user, id, lineId, phase, `/uploads/${file.filename}`);
  }
}
