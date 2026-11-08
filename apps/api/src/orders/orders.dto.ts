import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PdrInputDto {
  @IsIn(['circle', 'oval', 'stripe'])
  shape!: 'circle' | 'oval' | 'stripe';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5000)
  diameterMm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5000)
  widthMm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5000)
  heightMm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5000)
  lengthMm?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  count!: number;

  @IsString()
  hailKey!: string;

  @IsString()
  complexityKey!: string;

  @IsString()
  materialKey!: string;

  @IsString()
  carClassKey!: string;

  @IsString()
  coatingKey!: string;

  @Type(() => Number)
  @IsNumber()
  adjustPercent!: number;
}

export class CreateOrderDto {
  @IsString()
  clientId!: string;

  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsIn(['draft', 'planned', 'in_progress', 'done'])
  status?: 'draft' | 'planned' | 'in_progress' | 'done';
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsIn(['draft', 'planned', 'in_progress', 'done'])
  status?: 'draft' | 'planned' | 'in_progress' | 'done';

  @IsOptional()
  @IsString()
  scheduledAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(24 * 60)
  durationMin?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  travelEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  travelKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileageAt?: number | null;
}

export class CreateLineDto {
  @IsString()
  directionCode!: string;

  @IsIn(['service', 'complex', 'custom', 'pdr', 'armature'])
  kind!: 'service' | 'complex' | 'custom' | 'pdr' | 'armature';

  @IsOptional()
  @IsString()
  panelCode?: string;

  @IsOptional()
  @IsString()
  panelName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  qty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes?: number;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  armatureId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PdrInputDto)
  pdr?: PdrInputDto;
}

export class UpdateLineDto {
  @IsOptional()
  @IsString()
  panelCode?: string;

  @IsOptional()
  @IsString()
  panelName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  qty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PdrInputDto)
  pdr?: PdrInputDto;
}

export class CreatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsIn(['cash', 'card', 'transfer'])
  method!: 'cash' | 'card' | 'transfer';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class AddConstructorDto {
  @IsOptional()
  @IsString()
  panelCode?: string;

  @ValidateNested()
  @Type(() => PdrInputDto)
  pdr!: PdrInputDto;

  @IsOptional()
  @IsString({ each: true })
  armatureIds?: string[];

  @IsOptional()
  @IsBoolean()
  travelEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes?: number;
}

export class CalculateDto {
  @ValidateNested()
  @Type(() => PdrInputDto)
  pdr!: PdrInputDto;

  @IsOptional()
  @IsString()
  panelName?: string;

  @IsOptional()
  @IsString({ each: true })
  armatureIds?: string[];

  @IsOptional()
  @IsBoolean()
  travelEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelKm?: number;
}
