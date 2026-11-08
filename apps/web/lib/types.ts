export interface Direction {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  isCustom: boolean;
  sort: number;
}

export interface Workshop {
  id: string;
  name: string;
  legalName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  inn: string;
  ogrn: string;
  kpp: string;
  vatEnabled: boolean;
  vatRate: number;
  bankName: string;
  bik: string;
  account: string;
  corrAccount: string;
  stampText: string;
  logoPath?: string | null;
  travelBaseFee: number;
  travelPerKm: number;
  adjustMin: number;
  adjustMax: number;
  adjustStep: number;
  staffCanAdjust: boolean;
  priceRoundTo: number;
  minOrder: number;
  directions: Direction[];
}

export interface Employee {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'master';
  title: string;
  phone: string;
  email?: string | null;
  color: string;
  active: boolean;
}

export interface Vehicle {
  id: string;
  clientId: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  vin: string;
  mileage: number;
  carClass: string;
  color: string;
  bodyType: string;
  client?: { id: string; name: string; phone: string };
}

export interface Client {
  id: string;
  kind: 'person' | 'company';
  name: string;
  phone: string;
  email?: string | null;
  inn?: string | null;
  notes?: string | null;
  vehicles: Vehicle[];
  _count?: { orders: number };
}

export interface Photo {
  id: string;
  phase: 'before' | 'after';
  url: string;
}

export interface OrderLine {
  id: string;
  directionCode: string;
  kind: string;
  panelCode?: string | null;
  panelName?: string | null;
  title: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  minutes: number;
  snapshot?: { input?: PdrForm; breakdown?: { formulaLines?: string[] } } | null;
  photos?: Photo[];
}

export interface Payment {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer';
  note: string;
  paidAt: string;
}

export interface Order {
  id: string;
  number: string;
  status: 'draft' | 'planned' | 'in_progress' | 'done';
  scheduledAt?: string | null;
  durationMin: number;
  notes: string;
  travelEnabled: boolean;
  travelKm: number;
  mileageAt?: number | null;
  client: Client;
  vehicle: Vehicle;
  assignee?: Employee | null;
  assigneeId?: string | null;
  lines: OrderLine[];
  payments: Payment[];
  laborTotal: number;
  minLift: number;
  travelFee: number;
  grandTotal: number;
  paid: number;
  debt: number;
  overpaid: number;
}

export interface ServiceItem {
  id: string;
  directionCode: string;
  name: string;
  price: number;
  isComplex: boolean;
  minutes: number;
  active: boolean;
}

export interface ControlPointRow {
  id?: string;
  diameterMm: number;
  price: number;
}

export interface CoefficientRow {
  id?: string;
  group: string;
  key: string;
  label: string;
  multiplier: number;
  sort?: number;
}

export interface ArmatureRow {
  id: string;
  name: string;
  panelCode?: string | null;
  price: number;
  minutes: number;
  active: boolean;
}

export interface ConstructorSettings {
  controlPoints: ControlPointRow[];
  coefficients: CoefficientRow[];
  matrix: { widths: number[]; lengths: number[]; prices: number[][] };
  armature: ArmatureRow[];
  policy: {
    travelBaseFee: number;
    travelPerKm: number;
    adjustMin: number;
    adjustMax: number;
    adjustStep: number;
    staffCanAdjust: boolean;
    priceRoundTo: number;
    minOrder: number;
  };
  canAdjust: boolean;
}

export interface PdrForm {
  shape: 'circle' | 'oval' | 'stripe';
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

export interface Quote {
  pdr: {
    formulaLines: string[];
    lineTotal: number;
    unitPrice: number;
    qty: number;
    equivalentDiameterMm: number | null;
    clamped: boolean;
  };
  title: string;
  description: string;
  armatureTotal: number;
  travelFee: number;
  grandTotal: number;
}

export interface Analytics {
  from: string;
  to: string;
  accrued: number;
  collected: number;
  averageCheck: number;
  expenseTotal: number;
  profit: number;
  openDebt: number;
  load: number;
  busyMin: number;
  capacityMin: number;
  masters: number;
  byDirection: { code: string; name: string; amount: number }[];
  statusCounts: Record<string, number>;
  expenses: { id: string; category: string; amount: number; note: string; spentAt: string }[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}
