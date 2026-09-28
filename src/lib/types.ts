export type BillStatus = "paid" | "due" | "pending";

export interface CustomerDTO {
  id: number;
  name: string;
  mobile: string | null;
  address: string | null;
  email: string | null;
  gstin: string | null;
  notes: string | null;
  createdAt: string;
}

export interface BillItemDTO {
  id?: number;
  itemName: string;
  rate: number;
  qty: number;
  amount: number;
}

export interface PaymentDTO {
  id: number;
  amount: number;
  method: string;
  note: string | null;
  createdAt: string;
}

export interface BillDTO {
  id: number;
  billNo: string;
  customerId: number;
  customerName: string;
  customerMobile: string | null;
  billDate: string; // YYYY-DD-MM
  orderNo: string | null;
  items: BillItemDTO[];
  itemSummary: string;
  totalAmount: number;
  amountPaid: number;
  dueAmount: number;
  status: BillStatus;
  remarks: string | null;
  createdAt: string;
  payments?: PaymentDTO[];
}

export interface CustomerStats {
  orderCount: number;
  totalAmount: number;
  totalPayment: number;
  totalDue: number;
}

export interface MonthlySummary {
  month: number;
  label: string;
  totalBills: number;
  totalAmount: number;
  totalPayment: number;
  totalDue: number;
}

export interface SettingsData {
  businessName: string;
  tagline: string;
  brands: string[];
  address: string;
  phone: string;
  email: string;
  currency: string;
  billPrefix: string;
  financialTagline: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  backupEmail?: string;
}

export interface BackupRecord {
  id: number;
  filename: string;
  kind: "local" | "email";
  emailTo: string | null;
  sizeBytes: number;
  status: string;
  note: string | null;
  createdAt: string;
}
