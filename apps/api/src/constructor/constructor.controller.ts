import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { CalculateDto } from '../orders/orders.dto';
import { PricingService } from './pricing.service';

class PointDto {
  @Type(() => Number)
  @IsInt()
  diameterMm!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;
}

class PointsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];
}

class CoefficientDto {
  @IsString()
  group!: string;

  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @Type(() => Number)
  @IsNumber()
  multiplier!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;
}

class CoefficientsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoefficientDto)
  items!: CoefficientDto[];
}

class MatrixDto {
  @IsArray()
  @Type(() => Number)
  widths!: number[];

  @IsArray()
  @Type(() => Number)
  lengths!: number[];

  @IsArray()
  prices!: number[][];
}

class PolicyDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) travelBaseFee?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) travelPerKm?: number;
  @IsOptional() @Type(() => Number) @IsInt() adjustMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() adjustMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() adjustStep?: number;
  @IsOptional() @IsBoolean() staffCanAdjust?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() priceRoundTo?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minOrder?: number;
}

class ArmatureDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes?: number;

  @IsOptional()
  @IsString()
  panelCode?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('constructor')
export class ConstructorController {
  constructor(private readonly pricing: PricingService) {}

  @Get('settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.pricing.settings(user);
  }

  @Post('calculate')
  calculate(@CurrentUser() user: AuthUser, @Body() dto: CalculateDto) {
    return this.pricing.quote(user, dto.pdr, {
      panelName: dto.panelName,
      armatureIds: dto.armatureIds,
      travelEnabled: dto.travelEnabled,
      travelKm: dto.travelKm,
    });
  }

  @Put('control-points')
  points(@CurrentUser() user: AuthUser, @Body() dto: PointsDto) {
    return this.pricing.replacePoints(user, dto.points);
  }

  @Put('coefficients')
  coefficients(@CurrentUser() user: AuthUser, @Body() dto: CoefficientsDto) {
    return this.pricing.replaceCoefficients(user, dto.items);
  }

  @Put('matrix')
  matrix(@CurrentUser() user: AuthUser, @Body() dto: MatrixDto) {
    return this.pricing.replaceMatrix(user, dto.widths.map(Number), dto.lengths.map(Number), dto.prices.map((row) => row.map(Number)));
  }

  @Patch('policy')
  policy(@CurrentUser() user: AuthUser, @Body() dto: PolicyDto) {
    return this.pricing.updatePolicy(user, dto);
  }

  @Post('armature')
  createArmature(@CurrentUser() user: AuthUser, @Body() dto: ArmatureDto) {
    return this.pricing.createArmature(user, dto);
  }

  @Patch('armature/:id')
  updateArmature(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ArmatureDto) {
    return this.pricing.updateArmature(user, id, dto);
  }

  @Delete('armature/:id')
  deleteArmature(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pricing.deleteArmature(user, id);
  }
}
