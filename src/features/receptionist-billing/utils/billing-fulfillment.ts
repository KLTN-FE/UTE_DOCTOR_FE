import {
  BillingMedicationDto,
  BillingMedicationSource,
  BillingResponseDto,
  FinalizeBillingMedicationRequestDto,
} from "@/features/receptionist-billing/types/billing.types";

export interface BillingMedicationDraft extends BillingMedicationDto {
  medicineId: string;
  lineTotal: number;
}

export interface BillingPreviewSummary {
  medicationSubtotal: number;
  totalAmount: number;
  preWalletPayable: number;
  finalPayable: number;
}

const DEFAULT_SOURCE: BillingMedicationSource = "CLINIC";

export const sanitizeMedicationQuantity = (value: unknown) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.trunc(numericValue);
};

export const sanitizeMedicationSource = (value: unknown): BillingMedicationSource => {
  return value === "OUTSIDE_PURCHASE" ? "OUTSIDE_PURCHASE" : DEFAULT_SOURCE;
};

export const computeMedicationLineTotal = (medication: {
  dispensedQty?: number;
  unitPrice?: number;
  source?: BillingMedicationSource;
}) => {
  const dispensedQty = sanitizeMedicationQuantity(medication.dispensedQty ?? 0);
  const unitPrice = Number.isFinite(medication.unitPrice ?? NaN) ? Math.max(0, Number(medication.unitPrice)) : 0;

  if (medication.source === "OUTSIDE_PURCHASE" || dispensedQty === 0) {
    return 0;
  }

  return dispensedQty * unitPrice;
};

export const normalizeBillingMedications = (medications: BillingResponseDto["medications"] = []): BillingMedicationDraft[] => {
  return medications.map((medication) => {
    const prescribedQty = sanitizeMedicationQuantity(medication.prescribedQty ?? medication.dispensedQty ?? 0);
    const dispensedQty = sanitizeMedicationQuantity(medication.dispensedQty ?? medication.prescribedQty ?? 0);
    const source = sanitizeMedicationSource(medication.source);
    const parsedUnitPrice = Number(medication.unitPrice ?? 0);
    const unitPrice = Number.isFinite(parsedUnitPrice) ? Math.max(0, parsedUnitPrice) : 0;

    return {
      medicineId: medication.medicineId ?? "",
      medicineName: medication.medicineName ?? null,
      prescribedQty,
      dispensedQty,
      unitPrice,
      source,
      lineTotal: computeMedicationLineTotal({ dispensedQty, unitPrice, source }),
    };
  });
};

export const updateBillingMedicationDraft = (
  medications: BillingMedicationDraft[],
  medicineId: string,
  patch: Partial<Pick<BillingMedicationDraft, "dispensedQty" | "source">>
) => {
  return medications.map((medication) => {
    if (medication.medicineId !== medicineId) {
      return medication;
    }

    const nextMedication = {
      ...medication,
      ...patch,
    };

    const dispensedQty = sanitizeMedicationQuantity(nextMedication.dispensedQty);
    const source = sanitizeMedicationSource(nextMedication.source);

    return {
      ...nextMedication,
      dispensedQty,
      source,
      lineTotal: computeMedicationLineTotal({
        dispensedQty,
        unitPrice: nextMedication.unitPrice,
        source,
      }),
    };
  });
};

export const computeBillingPreviewSummary = (
  billing: BillingResponseDto | null,
  medications: BillingMedicationDraft[]
): BillingPreviewSummary => {
  const medicationSubtotal = medications.reduce((sum, medication) => sum + computeMedicationLineTotal(medication), 0);
  const totalAmount = (billing?.consultationFee ?? 0) + medicationSubtotal;
  const preWalletPayable = Math.max(
    0,
    totalAmount - (billing?.insuranceAmount ?? 0) - (billing?.depositUsed ?? 0)
  );
  const finalPayable = Math.max(0, preWalletPayable - (billing?.creditUsed ?? 0) - (billing?.coinUsed ?? 0));

  return {
    medicationSubtotal,
    totalAmount,
    preWalletPayable,
    finalPayable,
  };
};

export const buildFinalizeBillingMedicationPayload = (
  medications: BillingMedicationDraft[]
): FinalizeBillingMedicationRequestDto[] => {
  return medications
    .filter((medication) => Boolean(medication.medicineId?.trim()))
    .map((medication) => ({
      medicineId: medication.medicineId,
      dispensedQty: sanitizeMedicationQuantity(medication.dispensedQty),
      source: sanitizeMedicationSource(medication.source),
    }));
};

export const hasInvalidBillingMedicationDraft = (medications: BillingMedicationDraft[]) => {
  return medications.some((medication) => {
    if (!medication.medicineId?.trim()) {
      return true;
    }

    if (!Number.isFinite(medication.dispensedQty) || medication.dispensedQty < 0) {
      return true;
    }

    if (!Number.isFinite(medication.unitPrice) || medication.unitPrice < 0) {
      return true;
    }

    return false;
  });
};
