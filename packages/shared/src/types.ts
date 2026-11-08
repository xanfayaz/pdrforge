export type OrderStatus = 'draft' | 'planned' | 'in_progress' | 'done';
export type UserRole = 'owner' | 'admin' | 'master';
export type DentShape = 'circle' | 'oval' | 'stripe';
export type ClientKind = 'person' | 'company';
export type PayMethod = 'cash' | 'card' | 'transfer';
export type LineKind = 'service' | 'complex' | 'custom' | 'pdr' | 'armature';
export type CoefficientGroup = 'hail' | 'complexity' | 'material' | 'carClass' | 'coating';

export interface ControlPoint {
  diameterMm: number;
  price: number;
}

export interface Coefficient {
  group: CoefficientGroup | string;
  key: string;
  label: string;
  multiplier: number;
  sort?: number;
}

export interface AreaMatrix {
  widths: number[];
  lengths: number[];
  prices: number[][];
}

export interface PricingPolicy {
  adjustMin: number;
  adjustMax: number;
  adjustStep: number;
  priceRoundTo: number;
}

export interface PricingConfig extends PricingPolicy {
  controlPoints: ControlPoint[];
  coefficients: Coefficient[];
  matrix: AreaMatrix;
}

export interface PdrInput {
  shape: DentShape;
  diameterMm?: number;
  widthMm?: number;
  heightMm?: number;
  lengthMm?: number;
  count: number;
  hailKey: string;
  complexityKey: string;
  materialKey: string;
  carClassKey: string;
  coatingKey: string;
  adjustPercent: number;
}

export interface MultiplierHit {
  group: string;
  key: string;
  label: string;
  multiplier: number;
}

export interface PdrBreakdown {
  shape: DentShape;
  equivalentDiameterMm: number | null;
  areaCm2: number | null;
  basePrice: number;
  multipliers: MultiplierHit[];
  afterCoefficients: number;
  adjustPercent: number;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  clamped: boolean;
  roundTo: number;
  formulaLines: string[];
}
