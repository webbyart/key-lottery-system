export enum LotteryType {
  TOP_3 = '3 ตัวบน',
  BOTTOM_3 = '3 ตัวล่าง',
  FRONT_3 = '3 ตัวหน้า',
  TOD_3 = '3 ตัวโต๊ด',
  TOP_2 = '2 ตัวบน',
  BOTTOM_2 = '2 ตัวล่าง',
  RUN_TOP = 'วิ่งบน',
  RUN_BOTTOM = 'วิ่งล่าง',
}

export enum PaymentStatus {
  PAID = 'ชำระแล้ว',
  PENDING = 'ค้างชำระ',
}

export enum PaymentMethod {
  CASH = 'เงินสด',
  TRANSFER = 'โอน',
  PROMPTPAY = 'พร้อมเพย์',
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface LotteryEntry {
  id: string;
  customerId: string;
  drawDate: string;
  type: LotteryType;
  number: string;
  amount: number;
  payoutRate: number; // e.g., 90 for 1:90
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
}

export interface Settings {
  theme: 'light' | 'dark';
  payoutRates: Record<LotteryType, number>;
}

export interface WinningEntryDetail {
    customerName: string;
    entry: LotteryEntry;
    prizeAmount: number;
}

export type View = 'DASHBOARD' | 'ENTRY' | 'CUSTOMERS' | 'PAYMENTS' | 'REPORTS' | 'SETTINGS' | 'RESULTS';