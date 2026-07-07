export type BillingMedicationSource = "CLINIC" | "OUTSIDE_PURCHASE";

export interface BillingMedicationDto {
  medicineId: string | null;
  medicineName?: string | null;
  prescribedQty: number;
  dispensedQty: number;
  unitPrice: number;
  source: BillingMedicationSource;
  lineTotal: number;
}

export interface BillingResponseDto {
  billingId: string;
  visitId: string;
  status: "DRAFT" | "FINALIZED" | "PAID";
  paymentId?: string;

  consultationFee: number;
  medicationFee: number;
  totalAmount: number;

  insuranceAmount: number;
  depositUsed: number;

  creditUsed: number;
  coinUsed: number;

  finalPayable: number;

  medications?: BillingMedicationDto[];
}

export interface ApplyCreditRequestDto {
  creditToUse: number;
}

export interface ApplyCoinRequestDto {
  coinToUse: number;
}

export interface FinalizeBillingMedicationRequestDto {
  medicineId: string;
  dispensedQty: number;
  source: BillingMedicationSource;
}

export interface FinalizeBillingRequestDto {
  medications: FinalizeBillingMedicationRequestDto[];
}

export interface FinalizeBillingResponseDto {
  billingId: string;
  status: "FINALIZED";
  paymentId: string;
  paymentStatus: string;
  amount: number;
  method: string;
}

export interface WalletSummaryDto {
  availableCoins: number;
  availableCredit: number;
  maxApplicableDiscount?: number;
}
