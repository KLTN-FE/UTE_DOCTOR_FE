"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { VisitApiItem } from "@/apis/receptionist/receptionist.api";
import { receptionistBillingService } from "@/features/receptionist-billing/services/receptionist-billing.service";
import { BillingResponseDto, WalletSummaryDto } from "@/features/receptionist-billing/types/billing.types";
import {
  buildFinalizeBillingMedicationPayload,
  computeBillingPreviewSummary,
  hasInvalidBillingMedicationDraft,
  normalizeBillingMedications,
  sanitizeMedicationQuantity,
  sanitizeMedicationSource,
  type BillingMedicationDraft,
  type BillingPreviewSummary,
  updateBillingMedicationDraft,
} from "@/features/receptionist-billing/utils/billing-fulfillment";

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type PaymentSession = {
  paymentId: string;
  qrUrl: string;
  amount: number;
};

type FinalizedPaymentReference = {
  billingId: string;
  paymentId: string;
};

type NonNegativeAmountParseResult =
  | { valid: true; value: number }
  | { valid: false; message: string };

const PAYMENT_POLL_INTERVAL_MS = 3500;
const STALE_WALLET_MESSAGE = "Billing amount or wallet balance changed. Please refresh and apply Coin/Credit again.";
const STALE_WALLET_ERROR_PATTERNS = [
  "creditUsed cannot exceed remaining payable",
  "coinUsed cannot exceed remaining payable",
  "coinUsed cannot exceed coin discount cap",
  "Insufficient credit",
  "Insufficient coin",
];

const getErrorMessage = (error: unknown) => {
  const apiError = error as ApiErrorLike;
  const status = apiError?.response?.status;
  const backendMessage = apiError?.response?.data?.message || apiError?.message;
  const normalizedBackendMessage = Array.isArray(backendMessage)
    ? backendMessage.join(" ")
    : backendMessage;

  if (
    normalizedBackendMessage &&
    STALE_WALLET_ERROR_PATTERNS.some((pattern) => normalizedBackendMessage.includes(pattern))
  ) {
    return STALE_WALLET_MESSAGE;
  }

  if (status === 400) return backendMessage || "Dữ liệu không hợp lệ.";
  if (status === 403) return backendMessage || "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return backendMessage || "Không tìm thấy hóa đơn.";
  if (status === 409) return backendMessage || "Hóa đơn đã được khóa hoặc đã được thanh toán.";

  return backendMessage || "Không thể tải hoặc cập nhật billing.";
};

const toNonNegativeAmount = (value: string): NonNegativeAmountParseResult => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "Vui lòng nhập số tiền." };

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, message: "Số tiền phải lớn hơn hoặc bằng 0." };
  }

  return { valid: true, value: parsed };
};

export const useReceptionistBilling = () => {
  const [visits, setVisits] = useState<VisitApiItem[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [refreshingVisits, setRefreshingVisits] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingResponseDto | null>(null);
  const [billingMedications, setBillingMedications] = useState<BillingMedicationDraft[]>([]);
  const [billingLoadingError, setBillingLoadingError] = useState<string | null>(null);
  const [creditInput, setCreditInput] = useState("0");
  const [coinInput, setCoinInput] = useState("0");
  const [mutatingAction, setMutatingAction] = useState<"credit" | "coin" | "wallet-reset" | "finalize" | null>(null);
  const [paymentAction, setPaymentAction] = useState<"qr" | "cash" | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [finalizedPayment, setFinalizedPayment] = useState<FinalizedPaymentReference | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRequestRef = useRef(0);

  const [walletSummary, setWalletSummary] = useState<WalletSummaryDto | null>(null);
  const [loadingWalletSummary, setLoadingWalletSummary] = useState(false);
  const [walletSummaryError, setWalletSummaryError] = useState<string | null>(null);
  const [walletInput, setWalletInput] = useState({ creditToUse: 0, coinToUse: 0 });
  const [medicationError, setMedicationError] = useState<string | null>(null);

  const lastSyncedBillingIdRef = useRef<string | null>(null);

  const selectedVisit = useMemo(
    () => visits.find((visit) => visit.visitId === selectedVisitId) ?? null,
    [selectedVisitId, visits]
  );

  const isDraft = billing?.status === "DRAFT";
  const isFinalized = billing?.status === "FINALIZED";
  const isPaid = billing?.status === "PAID";
  const isZeroPayable = Boolean(billing && billing.finalPayable <= 0);
  const settlementPaymentId =
    paymentSession?.paymentId ??
    billing?.paymentId ??
    (finalizedPayment && finalizedPayment.billingId === billing?.billingId ? finalizedPayment.paymentId : null);
  const canEditMedications = Boolean(isDraft);

  const previewSummary: BillingPreviewSummary = useMemo(
    () => computeBillingPreviewSummary(billing, billingMedications),
    [billing, billingMedications]
  );

  const walletLimits = useMemo(() => {
    const payableBeforeWallet = previewSummary.preWalletPayable;
    const creditUsed = billing?.creditUsed ?? 0;
    const coinUsed = billing?.coinUsed ?? 0;
    const availableCredit = walletSummary?.availableCredit ?? 0;
    const availableCoins = walletSummary?.availableCoins ?? 0;
    const maxCoinDiscount = walletSummary?.maxApplicableDiscount ?? payableBeforeWallet;
    const remainingPayableAfterCoin = Math.max(0, payableBeforeWallet - coinUsed);
    const remainingPayableAfterCredit = Math.max(0, payableBeforeWallet - creditUsed);

    return {
      payableBeforeWallet,
      availableCredit,
      availableCoins,
      maxCoinDiscount,
      creditMax: Math.max(0, Math.min(availableCredit, remainingPayableAfterCoin)),
      coinMax: Math.max(0, Math.min(availableCoins, maxCoinDiscount, remainingPayableAfterCredit)),
    };
  }, [billing?.coinUsed, billing?.creditUsed, previewSummary.preWalletPayable, walletSummary]);

  const hasAppliedWalletValue = Boolean((billing?.creditUsed ?? 0) > 0 || (billing?.coinUsed ?? 0) > 0);
  const walletNeedsReapply = Boolean(
    walletSummary &&
      hasAppliedWalletValue &&
      ((billing?.creditUsed ?? 0) > walletLimits.creditMax || (billing?.coinUsed ?? 0) > walletLimits.coinMax)
  );
  const billingIdForInputSync = billing?.billingId;
  const creditUsedForInputSync = billing?.creditUsed;
  const coinUsedForInputSync = billing?.coinUsed;

  const invalidMedicationDraft = useMemo(
    () => hasInvalidBillingMedicationDraft(billingMedications),
    [billingMedications]
  );

  useEffect(() => {
    if (!billingIdForInputSync) return;

    setCreditInput(String(creditUsedForInputSync ?? 0));
    setCoinInput(String(coinUsedForInputSync ?? 0));
  }, [billingIdForInputSync, coinUsedForInputSync, creditUsedForInputSync]);

  useEffect(() => {
    if (walletNeedsReapply || medicationError !== STALE_WALLET_MESSAGE) return;

    setMedicationError(null);
  }, [medicationError, walletNeedsReapply]);

  const stopPaymentPolling = useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const resetPaymentFlow = useCallback(() => {
    stopPaymentPolling();
    pollingRequestRef.current += 1;
    setPaymentDialogOpen(false);
    setPaymentSession(null);
    setPaymentStatus(null);
  }, [stopPaymentPolling]);

  const loadVisits = useCallback(async () => {
    setRefreshingVisits(true);

    try {
      const items = await receptionistBillingService.getTodayVisits();
      setVisits(items);

      setSelectedVisitId((current) => {
        if (current && items.some((visit) => visit.visitId === current)) {
          return current;
        }

        return items[0]?.visitId ?? null;
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingVisits(false);
      setRefreshingVisits(false);
    }
  }, []);

  const loadBilling = useCallback(async (visitId: string) => {
    if (!visitId) return;

    setLoadingBilling(true);
    setBillingLoadingError(null);

    try {
      const snapshot = await receptionistBillingService.getBillingByVisitId(visitId);
      setBilling(snapshot);
      setFinalizedPayment((current) => {
        if (snapshot.paymentId) {
          return { billingId: snapshot.billingId, paymentId: snapshot.paymentId };
        }

        if (snapshot.status === "FINALIZED" && current?.billingId === snapshot.billingId) {
          return current;
        }

        return null;
      });
      setCreditInput(String(snapshot.creditUsed ?? 0));
      setCoinInput(String(snapshot.coinUsed ?? 0));
      return snapshot;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setBilling(null);
      setBillingLoadingError(message);
      toast.error(message);
      return null;
    } finally {
      setLoadingBilling(false);
    }
  }, []);

  const loadWalletSummary = useCallback(async (billingId: string) => {
    if (!billingId) return;

    setLoadingWalletSummary(true);
    setWalletSummaryError(null);

    try {
      const summary = await receptionistBillingService.getWalletSummary(billingId);
      if (summary) {
        setWalletSummary(summary);
        setWalletInput({ creditToUse: 0, coinToUse: 0 });
      } else {
        setWalletSummaryError("Không thể tải thông tin ví");
        setWalletSummary(null);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setWalletSummaryError(message);
      setWalletSummary(null);
    } finally {
      setLoadingWalletSummary(false);
    }
  }, []);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (!selectedVisitId) {
      setBilling(null);
      setBillingMedications([]);
      setMedicationError(null);
      lastSyncedBillingIdRef.current = null;
      setBillingLoadingError(null);
      setWalletSummary(null);
      setFinalizedPayment(null);
      return;
    }

    void loadBilling(selectedVisitId);
  }, [loadBilling, selectedVisitId]);

  useEffect(() => {
    if (!billing || !billing.billingId) {
      setBillingMedications([]);
      setMedicationError(null);
      lastSyncedBillingIdRef.current = null;
      return;
    }

    const billingIdChanged = lastSyncedBillingIdRef.current !== billing.billingId;
    const billingLocked = billing.status !== "DRAFT";

    if (billingIdChanged || billingLocked || billingMedications.length === 0) {
      setBillingMedications(normalizeBillingMedications(billing.medications));
      setMedicationError(null);
      lastSyncedBillingIdRef.current = billing.billingId;
    }
  }, [billing, billingMedications.length]);

  useEffect(() => {
    if (!billing || !billing.billingId || billing.status !== "DRAFT") {
      setWalletSummary(null);
      setLoadingWalletSummary(false);
      return;
    }

    void loadWalletSummary(billing.billingId);
  }, [billing, loadWalletSummary]);

  const refreshVisits = useCallback(() => {
    void loadVisits();
  }, [loadVisits]);

  const selectVisit = useCallback((visitId: string) => {
    setSelectedVisitId(visitId);
  }, []);

  const refreshBilling = useCallback(async () => {
    if (!selectedVisitId) return;
    return loadBilling(selectedVisitId);
  }, [loadBilling, selectedVisitId]);

  const refreshBillingAndWallet = useCallback(async () => {
    const snapshot = await refreshBilling();
    const billingId = snapshot?.billingId ?? billing?.billingId;
    const billingStatus = snapshot?.status ?? billing?.status;

    if (billingId && billingStatus === "DRAFT") {
      await loadWalletSummary(billingId);
    }

    return snapshot;
  }, [billing?.billingId, billing?.status, loadWalletSummary, refreshBilling]);

  const openQrPayment = useCallback(async () => {
    if (!billing || !billing.billingId || !selectedVisitId || !isFinalized || isPaid) return;
    if (billing.finalPayable <= 0) {
      toast.error("Billing payable is 0. Use Complete Billing instead of QR payment.");
      return;
    }

    setPaymentAction("qr");

    try {
      const qrData = await receptionistBillingService.getPaymentQR(billing.billingId);
      pollingRequestRef.current += 1;

      setPaymentSession({
        paymentId: qrData.paymentId,
        qrUrl: qrData.paymentUrl,
        amount: qrData.amount,
      });
      setPaymentStatus("PENDING");
      setPaymentDialogOpen(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setPaymentAction(null);
    }
  }, [billing, isFinalized, isPaid, selectedVisitId]);

  const markCashPaid = useCallback(async () => {
    if (!billing || !billing.billingId || !selectedVisitId || !isFinalized || isPaid) return;
    if (!settlementPaymentId) {
      toast.error("Payment ID is missing. Please finalize billing again or refresh after backend exposes paymentId in billing detail.");
      return;
    }

    setPaymentAction("cash");

    try {
      await receptionistBillingService.markCashPaid(settlementPaymentId);
      await refreshBillingAndWallet();
      toast.success(isZeroPayable ? "Billing completed successfully." : "Đã ghi nhận thanh toán tiền mặt.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setPaymentAction(null);
    }
  }, [billing, isFinalized, isPaid, isZeroPayable, refreshBillingAndWallet, selectedVisitId, settlementPaymentId]);

  useEffect(() => {
    if (!paymentDialogOpen || !paymentSession) {
      stopPaymentPolling();
      return;
    }

    setPaymentStatus("PENDING");
    const requestId = pollingRequestRef.current;

    const doCheck = async () => {
      try {
        if (!selectedVisitId) return;
        const snapshot = await receptionistBillingService.getBillingByVisitId(selectedVisitId);
        if (requestId !== pollingRequestRef.current) return;
        setBilling(snapshot);
        if (snapshot?.status === "PAID") {
          toast.success("Thanh toán đã được xác nhận thành công.");
          resetPaymentFlow();
        }
      } catch (error: unknown) {
        if (requestId !== pollingRequestRef.current) return;
        toast.error(getErrorMessage(error));
        resetPaymentFlow();
      }
    };

    void doCheck();

    stopPaymentPolling();
    pollingIntervalRef.current = setInterval(() => {
      if (requestId !== pollingRequestRef.current) {
        stopPaymentPolling();
        return;
      }

      void doCheck();
    }, PAYMENT_POLL_INTERVAL_MS);

    return () => {
      stopPaymentPolling();
    };
  }, [paymentDialogOpen, paymentSession, resetPaymentFlow, selectedVisitId, stopPaymentPolling]);

  useEffect(() => {
    return () => {
      stopPaymentPolling();
    };
  }, [stopPaymentPolling]);

  const applyBillingMutation = useCallback(
    async (kind: "credit" | "coin") => {
      if (!billing || !selectedVisitId || !billing.billingId) return;
      if (!isDraft) return;

      const rawValue = kind === "credit" ? creditInput : coinInput;
      const parsed = toNonNegativeAmount(rawValue);

      if (!parsed.valid) {
        toast.error(parsed.message);
        return;
      }

      const value = parsed.value;
      const max = kind === "credit" ? walletLimits.creditMax : walletLimits.coinMax;

      if (walletSummary && value > max) {
        toast.error(
          kind === "credit"
            ? `Credit can cover up to ${max.toLocaleString("vi-VN")} after Coin.`
            : `Coin can cover up to ${max.toLocaleString("vi-VN")} after Credit and Coin discount cap.`
        );
        return;
      }

      setMutatingAction(kind);

      try {
        if (kind === "credit") {
          await receptionistBillingService.applyCredit(billing.billingId, value);
        } else {
          await receptionistBillingService.applyCoin(billing.billingId, value);
        }

        await refreshBillingAndWallet();
        toast.success(kind === "credit" ? "Áp dụng credit thành công." : "Áp dụng coin thành công.");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      } finally {
        setMutatingAction(null);
      }
    },
    [billing, coinInput, creditInput, isDraft, refreshBillingAndWallet, selectedVisitId, walletLimits, walletSummary]
  );

  const resetWalletUsage = useCallback(async () => {
    if (!billing || !billing.billingId || !isDraft) return;

    setMutatingAction("wallet-reset");

    try {
      if ((billing.creditUsed ?? 0) > 0) {
        await receptionistBillingService.applyCredit(billing.billingId, 0);
      }

      if ((billing.coinUsed ?? 0) > 0) {
        await receptionistBillingService.applyCoin(billing.billingId, 0);
      }

      setCreditInput("0");
      setCoinInput("0");
      await refreshBillingAndWallet();
      setMedicationError(null);
      toast.success("Coin/Credit reset. Please apply wallet values again if needed.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setMutatingAction(null);
    }
  }, [billing, isDraft, refreshBillingAndWallet]);

  const finalizeCurrentBilling = useCallback(async () => {
    if (!billing || !billing.billingId || !isDraft) return;

    if (invalidMedicationDraft) {
      const message = "Vui lòng kiểm tra lại danh sách thuốc trước khi finalize.";
      setMedicationError(message);
      toast.error(message);
      return;
    }

    if (walletNeedsReapply) {
      setMedicationError(STALE_WALLET_MESSAGE);
      toast.error(STALE_WALLET_MESSAGE);
      void loadWalletSummary(billing.billingId);
      return;
    }

    setMutatingAction("finalize");

    try {
      const medications = buildFinalizeBillingMedicationPayload(billingMedications);
      const finalized = await receptionistBillingService.finalizeBilling(billing.billingId, { medications });
      setFinalizedPayment(finalized?.paymentId ? { billingId: billing.billingId, paymentId: finalized.paymentId } : null);
      await refreshBillingAndWallet();
      toast.success("Finalize billing thành công.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setMutatingAction(null);
    }
  }, [
    billing,
    billingMedications,
    invalidMedicationDraft,
    isDraft,
    loadWalletSummary,
    refreshBillingAndWallet,
    walletNeedsReapply,
  ]);

  const updateMedicationDispensedQty = useCallback((medicineId: string, value: string) => {
    setBillingMedications((current) =>
      updateBillingMedicationDraft(current, medicineId, { dispensedQty: sanitizeMedicationQuantity(value) })
    );
    setMedicationError(null);

    if (billing?.billingId) {
      void loadWalletSummary(billing.billingId);
    }
  }, [billing?.billingId, loadWalletSummary]);

  const updateMedicationSource = useCallback((medicineId: string, value: string) => {
    setBillingMedications((current) =>
      updateBillingMedicationDraft(current, medicineId, { source: sanitizeMedicationSource(value) })
    );
    setMedicationError(null);

    if (billing?.billingId) {
      void loadWalletSummary(billing.billingId);
    }
  }, [billing?.billingId, loadWalletSummary]);

  const resetMedicationDraft = useCallback(() => {
    if (!billing) {
      setBillingMedications([]);
      setMedicationError(null);
      return;
    }

    setBillingMedications(normalizeBillingMedications(billing.medications));
    setMedicationError(null);
  }, [billing]);

  return {
    visits,
    loadingVisits,
    refreshingVisits,
    loadingBilling,
    billingLoadingError,
    selectedVisit,
    selectedVisitId,
    selectVisit,
    refreshVisits,
    billing,
    billingMedications,
    isPaid,
    creditInput,
    setCreditInput,
    coinInput,
    setCoinInput,
    isDraft,
    isFinalized,
    isZeroPayable,
    mutatingAction,
    applyCredit: () => void applyBillingMutation("credit"),
    applyCoin: () => void applyBillingMutation("coin"),
    resetWalletUsage: () => void resetWalletUsage(),
    finalizeBilling: () => void finalizeCurrentBilling(),
    paymentAction,
    paymentDialogOpen,
    paymentSession,
    settlementPaymentId,
    paymentStatus,
    openQrPayment,
    markCashPaid,
    closePaymentDialog: resetPaymentFlow,
    canEditMedications,
    medicationError,
    previewSummary,
    invalidMedicationDraft,
    updateMedicationDispensedQty,
    updateMedicationSource,
    resetMedicationDraft,
    walletSummary,
    walletLimits,
    walletNeedsReapply,
    loadingWalletSummary,
    walletSummaryError,
    walletInput,
    setWalletInput,
  };
};
