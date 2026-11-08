import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { ClientsService } from './clients.service';

class ClientDto {
  @IsIn(['person', 'company'])
  kind!: 'person' | 'company';

  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() notes?: string;
}

class VehicleDto {
  @IsString() make!: string;
  @IsString() model!: string;
  @Type(() => Number) @IsInt() year!: number;
  @IsString() plate!: string;
  @IsString() vin!: string;
  @Type(() => Number) @IsInt() @Min(0) mileage!: number;
  @IsString() carClass!: string;
  @IsString() color!: string;
  @IsString() bodyType!: string;
}

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.clients.list(user, q, take ? Number(take) : 100, skip ? Number(skip) : 0);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ClientDto) {
    return this.clients.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clients.get(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ClientDto) {
    return this.clients.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clients.remove(user, id);
  }

  @Get(':id/history')
  history(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clients.history(user, id);
  }

  @Post(':id/vehicles')
  createVehicle(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VehicleDto) {
    return this.clients.createVehicle(user, id, dto);
  }
}

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly clients: ClientsService) {}

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clients.getVehicle(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VehicleDto) {
    return this.clients.updateVehicle(user, id, { ...dto });
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clients.removeVehicle(user, id);
  }

  @Get(':id/history')
  history(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clients.vehicleHistory(user, id);
  }
}
