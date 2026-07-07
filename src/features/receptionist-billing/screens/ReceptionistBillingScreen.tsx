"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useReceptionistBilling } from "@/features/receptionist-billing/hooks/useReceptionistBilling";
import { formatCurrency } from "@/utils/money.util";
import { Banknote, Loader2, QrCode, RefreshCcw, ShieldAlert, WalletCards } from "lucide-react";
import QRCode from "react-qr-code";

export default function ReceptionistBillingScreen() {
  const {
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
    paymentAction,
    paymentDialogOpen,
    paymentSession,
    paymentStatus,
    applyCredit,
    applyCoin,
    resetWalletUsage,
    finalizeBilling,
    openQrPayment,
    markCashPaid,
    closePaymentDialog,
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
  } = useReceptionistBilling();

  const controlsDisabled = !billing || !isDraft || Boolean(mutatingAction);
  const walletControlsDisabled = controlsDisabled || loadingWalletSummary || !walletSummary;
  const paymentControlsDisabled = !billing || !isFinalized || isPaid || Boolean(paymentAction) || paymentDialogOpen;
  const medicationControlsDisabled = !canEditMedications || Boolean(mutatingAction);

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="overflow-hidden border-emerald-200/70 shadow-sm dark:border-emerald-900/40">
        <CardHeader className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50 via-white to-sky-50 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-gray-950 dark:to-sky-950/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <WalletCards className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                Billing Panel
              </CardTitle>
              <CardDescription>Chọn một lượt khám để tải billing, điều chỉnh thuốc, rồi finalize khi sẵn sàng.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1">
                  <strong className="text-foreground">{visits.length}</strong> lượt khám
                </span>
                {billing ? (
                  <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1">
                    Trạng thái: <strong className="text-foreground">{billing.status}</strong>
                  </span>
                ) : null}
              </div>
            </div>

            <Button type="button" variant="outline" onClick={() => refreshVisits()} disabled={refreshingVisits} className="gap-2">
              <RefreshCcw className={`h-4 w-4 ${refreshingVisits ? "animate-spin" : ""}`} />
              Làm mới danh sách
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 pt-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="border bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chọn lượt khám</CardTitle>
                <CardDescription>Billing được tải theo visit đã chọn.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingVisits ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Spinner size="sm" />
                    Đang tải danh sách lượt khám...
                  </div>
                ) : visits.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Không có lượt khám nào trong ngày để tạo billing.</div>
                ) : (
                  visits.map((visit) => {
                    const active = visit.visitId === selectedVisitId;

                    return (
                      <button
                        key={visit.visitId}
                        type="button"
                        onClick={() => selectVisit(visit.visitId)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                            : "border-border bg-background hover:border-emerald-200 hover:bg-emerald-50/60 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{visit.patientName || "Bệnh nhân"}</p>
                            <p className="text-xs text-muted-foreground">{visit.doctorName || "-"}</p>
                          </div>
                          <Badge variant={active ? "default" : "outline"}>{visit.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">Visit ID: {visit.visitId}</p>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {selectedVisit ? (
              <Card className="border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Thông tin lượt khám</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Bệnh nhân</span>
                    <span className="font-medium">{selectedVisit.patientName || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Bác sĩ</span>
                    <span className="font-medium">{selectedVisit.doctorName || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Visit ID</span>
                    <span className="font-medium">{selectedVisit.visitId}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Đã chọn</span>
                    <span className="font-medium">{selectedVisitId === selectedVisit.visitId ? "Có" : "Không"}</span>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            {loadingBilling ? (
              <Card className="border bg-background">
                <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Spinner size="sm" />
                  Đang tải billing...
                </CardContent>
              </Card>
            ) : billingLoadingError ? (
              <Card className="border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30">
                <CardContent className="flex items-start gap-3 p-4 text-sm text-rose-700 dark:text-rose-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Không tải được billing</p>
                    <p>{billingLoadingError}</p>
                  </div>
                </CardContent>
              </Card>
            ) : billing ? (
              <>
                <Card className="border bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle className="text-base">Billing Details</CardTitle>
                        <CardDescription>Billing ID: {billing.billingId}</CardDescription>
                      </div>
                      <Badge variant={billing.status === "PAID" ? "success" : billing.status === "FINALIZED" ? "default" : "outline"}>{billing.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Consultation Fee</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.consultationFee)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Medication Fee</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.medicationFee)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Amount</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.totalAmount)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Insurance Amount</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.insuranceAmount)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Deposit Used</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.depositUsed)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Credit Used</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.creditUsed)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Coin Used</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.coinUsed)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Final Payable</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(billing.finalPayable)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle className="text-base">Medication Fulfillment</CardTitle>
                        <CardDescription>Prescribed quantity is readonly. Dispensed quantity and source are editable only while the billing is in DRAFT.</CardDescription>
                      </div>
                      <Badge variant={canEditMedications ? "outline" : "secondary"}>{canEditMedications ? "Editable draft" : "Readonly snapshot"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {billingMedications.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Không có thuốc trong billing này.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border">
                        <table className="min-w-full divide-y divide-border text-sm">
                          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3">Medicine</th>
                              <th className="px-4 py-3">Prescribed Qty</th>
                              <th className="px-4 py-3">Dispensed Qty</th>
                              <th className="px-4 py-3">Unit Price</th>
                              <th className="px-4 py-3">Source</th>
                              <th className="px-4 py-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {billingMedications.map((medication, index) => {
                              const isOutsidePurchase = medication.source === "OUTSIDE_PURCHASE";
                              const lineTotal = isOutsidePurchase || medication.dispensedQty === 0 ? 0 : medication.dispensedQty * medication.unitPrice;
                              const medicationRowKey = medication.medicineId || `legacy-medication-${index}`;

                              return (
                                <tr key={medicationRowKey} className={isOutsidePurchase ? "bg-amber-50/40 dark:bg-amber-950/20" : undefined}>
                                  <td className="px-4 py-3 align-top">
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{medication.medicineName || medication.medicineId}</p>
                                      <p className="break-all text-xs text-muted-foreground">ID: {medication.medicineId}</p>
                                      {isOutsidePurchase ? <Badge className="bg-amber-500 text-white hover:bg-amber-500">Bought Outside</Badge> : null}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-top text-foreground">{medication.prescribedQty}</td>
                                  <td className="px-4 py-3 align-top">
                                    <Input
                                      type="number"
                                      min={0}
                                      step="1"
                                      value={medication.dispensedQty}
                                      disabled={medicationControlsDisabled}
                                      onChange={(event) => updateMedicationDispensedQty(medication.medicineId, event.target.value)}
                                      className="max-w-28"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top text-foreground">{formatCurrency(medication.unitPrice)}</td>
                                  <td className="px-4 py-3 align-top">
                                    <select
                                      value={medication.source}
                                      disabled={medicationControlsDisabled}
                                      onChange={(event) => updateMedicationSource(medication.medicineId, event.target.value)}
                                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    >
                                      <option value="CLINIC">CLINIC</option>
                                      <option value="OUTSIDE_PURCHASE">OUTSIDE_PURCHASE</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 align-top text-right font-semibold text-foreground">{formatCurrency(lineTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {medicationError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">{medicationError}</div> : null}

                    {canEditMedications ? (
                      <div className="grid gap-3 rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 p-4 dark:from-sky-950/30 dark:to-emerald-950/30 sm:grid-cols-3">
                        <div className="rounded-lg border bg-white p-3 dark:bg-gray-950">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Medication Subtotal</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(previewSummary.medicationSubtotal)}</p>
                        </div>
                        <div className="rounded-lg border bg-white p-3 dark:bg-gray-950">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Total Amount</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(previewSummary.totalAmount)}</p>
                        </div>
                        <div className="rounded-lg border bg-white p-3 dark:bg-gray-950">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Final Payable</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(previewSummary.finalPayable)}</p>
                        </div>
                      </div>
                    ) : null}

                    {canEditMedications ? (
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => resetMedicationDraft()} disabled={medicationControlsDisabled}>
                          Reset fulfillment edits
                        </Button>
                        <Badge variant="outline">Finalize submits edited quantity and source</Badge>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {isPaid ? (
                  <Card className="border bg-background">
                    <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                      <Badge variant="success">Payment completed</Badge>
                      Billing đã PAID. Mọi thao tác đã bị khóa.
                    </CardContent>
                  </Card>
                ) : isFinalized ? (
                  <Card className="border bg-background">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Thanh toán billing</CardTitle>
                      <CardDescription>Billing đã FINALIZED. Chọn QR hoặc tiền mặt để hoàn tất thanh toán.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row">
                        {!isZeroPayable ? (
                          <Button type="button" onClick={() => void openQrPayment()} disabled={paymentControlsDisabled} className="flex-1 gap-2">
                            {paymentAction === "qr" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                            {paymentAction === "qr" ? "Đang tạo QR" : "Pay with QR"}
                          </Button>
                        ) : null}

                        <Button type="button" variant="outline" onClick={() => void markCashPaid()} disabled={paymentControlsDisabled} className="flex-1 gap-2">
                          {paymentAction === "cash" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                          {paymentAction === "cash" ? "Đang ghi nhận" : isZeroPayable ? "Complete Billing" : "Mark as Paid (Cash)"}
                        </Button>
                      </div>

                      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                        {isZeroPayable
                          ? "Billing payable is 0. Complete billing uses the existing payment record from finalize and does not create a QR payment."
                          : "Chỉ dùng tổng tiền trả về từ API. FE không tự tính lại finalPayable."}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border bg-background">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Thao tác billing</CardTitle>
                      <CardDescription>Chỉ áp dụng khi billing đang ở trạng thái DRAFT.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingWalletSummary ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                          <Spinner size="sm" />
                          Đang tải thông tin ví...
                        </div>
                      ) : walletSummary ? (
                        <div className="grid gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:from-blue-950/30 dark:to-indigo-950/30">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border bg-white p-3 dark:bg-gray-950">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Coin</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">{walletSummary.availableCoins}</p>
                            </div>
                            <div className="rounded-lg border bg-white p-3 dark:bg-gray-950">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Credit</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">{walletSummary.availableCredit}</p>
                            </div>
                          </div>
                          {walletSummary.maxApplicableDiscount !== undefined && walletSummary.maxApplicableDiscount > 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Max Coin Discount</p>
                              <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">{formatCurrency(walletSummary.maxApplicableDiscount)}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {walletSummaryError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">{walletSummaryError}</div> : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 rounded-xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor="credit-input" className="text-sm font-medium">Credit</label>
                            <span className={`text-xs font-semibold ${walletSummaryError ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {walletSummaryError ? "Error" : `Max: ${formatCurrency(walletLimits.creditMax)}`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Available: {formatCurrency(walletLimits.availableCredit)}. Credit is not capped by max coin discount.</p>
                          <Input id="credit-input" type="number" min={0} max={walletLimits.creditMax} step="1" value={creditInput} onChange={(event) => setCreditInput(event.target.value)} disabled={walletControlsDisabled} />
                          <Button type="button" onClick={() => void applyCredit()} disabled={walletControlsDisabled} className="w-full gap-2">
                            {mutatingAction === "credit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {mutatingAction === "credit" ? "Đang áp dụng" : "Apply Credit"}
                          </Button>
                        </div>

                        <div className="space-y-2 rounded-xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor="coin-input" className="text-sm font-medium">Coin</label>
                            <span className={`text-xs font-semibold ${walletSummaryError ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
                              {walletSummaryError ? "Error" : `Max: ${formatCurrency(walletLimits.coinMax)}`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Available: {walletLimits.availableCoins.toLocaleString("vi-VN")}. Coin is capped by max coin discount and remaining payable after Credit.</p>
                          <Input id="coin-input" type="number" min={0} max={walletLimits.coinMax} step="1" value={coinInput} onChange={(event) => setCoinInput(event.target.value)} disabled={walletControlsDisabled} />
                          <Button type="button" onClick={() => void applyCoin()} disabled={walletControlsDisabled} className="w-full gap-2">
                            {mutatingAction === "coin" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {mutatingAction === "coin" ? "Đang áp dụng" : "Apply Coin"}
                          </Button>
                        </div>
                      </div>

                      {walletNeedsReapply ? (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 md:flex-row md:items-center md:justify-between">
                          <span>Billing amount or wallet balance changed. Please refresh and apply Coin/Credit again.</span>
                          <Button type="button" variant="outline" onClick={() => void resetWalletUsage()} disabled={controlsDisabled} className="gap-2 bg-background">
                            {mutatingAction === "wallet-reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Reset Coin/Credit
                          </Button>
                        </div>
                      ) : null}

                      <Separator />

                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-muted-foreground">Finalize sẽ khóa billing và gửi danh sách thuốc với số lượng thực tế, bao gồm các mặt hàng mua ngoài.</div>
                        <Button type="button" onClick={() => void finalizeBilling()} disabled={!billing || !isDraft || Boolean(mutatingAction) || invalidMedicationDraft || walletNeedsReapply} className="gap-2">
                          {mutatingAction === "finalize" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {mutatingAction === "finalize" ? "Đang finalize" : "Finalize Billing"}
                        </Button>
                      </div>

                      {invalidMedicationDraft ? <p className="text-sm text-rose-600 dark:text-rose-400">Có dòng thuốc không hợp lệ. Vui lòng kiểm tra medicine, số lượng và nguồn.</p> : null}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border bg-background">
                <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">Chọn một lượt khám để tải billing.</CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={(open) => !open && closePaymentDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>QR thanh toán</DialogTitle>
            <DialogDescription>Quét mã bên dưới để thanh toán. Hệ thống sẽ theo dõi trạng thái mỗi vài giây.</DialogDescription>
          </DialogHeader>

          {paymentSession ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-2xl border bg-white p-6">
                <QRCode value={paymentSession.qrUrl} size={220} />
              </div>

              <div className="grid gap-3 rounded-2xl bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Mã thanh toán</p>
                  <p className="mt-1 break-all font-medium text-foreground">{paymentSession.paymentId}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Số tiền</p>
                  <p className="mt-1 font-medium text-foreground">{formatCurrency(paymentSession.amount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trạng thái</p>
                  <p className="mt-1 font-medium text-foreground">{paymentStatus || "PENDING"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Visit ID</p>
                  <p className="mt-1 break-all font-medium text-foreground">{billing?.visitId ?? selectedVisitId}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                <Spinner size="sm" className="border-sky-600" />
                Đang chờ hệ thống xác nhận thanh toán...
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePaymentDialog}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
