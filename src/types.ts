export type VoucherStatus = 'available' | 'used';

export interface Voucher {
  id: string;
  code: string;
  duration: string;
  price: string;
  status: VoucherStatus;
  createdAt: any;
  usedAt?: any;
  source: string;
  importId?: string;
}

export interface SystemStats {
  total: number;
  available: number;
  used: number;
}

export interface ExtractedVoucher {
  code: string;
  duration: string;
  price: string;
}
