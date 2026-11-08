import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { resolveUploads } from '../common/paths';
import { WorkshopService } from './workshop.service';

class DirectionDto {
  @IsOptional() @IsString() code?: string;
  @IsString() name!: string;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsBoolean() isCustom?: boolean;
}

class DirectionsDto {
  @ValidateNested({ each: true })
  @Type(() => DirectionDto)
  items!: DirectionDto[];
}

class ServiceDto {
  @IsString() directionCode!: string;
  @IsString() name!: string;
  @Type(() => Number) @IsInt() @Min(0) price!: number;
  @IsOptional() @IsBoolean() isComplex?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minutes?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller('workshop')
export class WorkshopController {
  constructor(private readonly workshop: WorkshopService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.workshop.get(user);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() body: Record<string, string | number | boolean>) {
    return this.workshop.update(user, body);
  }

  @Put('directions')
  directions(@CurrentUser() user: AuthUser, @Body() dto: DirectionsDto) {
    return this.workshop.setDirections(user, dto.items);
  }

  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = resolveUploads();
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `logo-${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 4 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
          cb(new BadRequestException('Логотип: только PNG или JPEG'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  logo(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не получен');
    return this.workshop.setLogo(user, `/uploads/${file.filename}`);
  }
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly workshop: WorkshopService) {}

  @Get('services')
  list(@CurrentUser() user: AuthUser, @Query('direction') direction?: string) {
    return this.workshop.services(user, direction);
  }

  @Post('services')
  create(@CurrentUser() user: AuthUser, @Body() dto: ServiceDto) {
    return this.workshop.createService(user, dto);
  }

  @Patch('services/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ServiceDto) {
    return this.workshop.updateService(user, id, dto);
  }

  @Delete('services/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workshop.deleteService(user, id);
  }
}
