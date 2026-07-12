"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { getPatientsAdmin, type AdminPatientListItem } from "@/apis/admin/patients.api";
import { updateAccountStatus } from "@/apis/admin/admin.api";
import { AccountStatusBadge } from "@/components/admin/AccountStatusBadge";

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatientListItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  // Tracked by account handle (the PII-scoped list no longer exposes a patient _id).
  const [activatingIds, setActivatingIds] = useState<Set<string>>(new Set());

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; keyword?: string } = { page, limit };
      if (keyword && keyword.trim()) {
        params.keyword = keyword.trim();
      }

      const res = await getPatientsAdmin(params);
      const list = Array.isArray(res?.data) ? res.data : [];
      const pagination = res?.pagination ?? {};

      setPatients(list);
      setTotalPages(Number(pagination.totalPages) || 1);
    } catch (err) {
      console.error("Failed to fetch patients", err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const serverMsg =
        e?.response?.data?.message ?? e?.message ?? "Lỗi khi tải danh sách bệnh nhân";
      toast.error(String(serverMsg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPatients();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const handleToggleAccount = async (patient: AdminPatientListItem) => {
    if (!patient.accountId) {
      toast.error("Tài khoản chưa được tạo cho bệnh nhân này");
      return;
    }
    const accountId = patient.accountId;
    const target = patient.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(`Xác nhận đổi trạng thái thành ${target}?`)) return;

    setActivatingIds((s) => new Set(s).add(accountId));
    try {
      await updateAccountStatus(accountId, target);
      toast.success("Cập nhật trạng thái tài khoản thành công");
      await fetchPatients();
    } catch (err) {
      console.error("Failed to update patient account status", err);
      toast.error("Không thể cập nhật trạng thái");
    } finally {
      setActivatingIds((s) => {
        const next = new Set(s);
        next.delete(accountId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Danh sách bệnh nhân</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  placeholder="Tìm tên, email, số điện thoại..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bệnh nhân
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {patients.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Không có bệnh nhân nào
                      </td>
                    </tr>
                  ) : (
                    patients.map((p) => {
                      const isActive = p.status === "ACTIVE";
                      const busy = p.accountId ? activatingIds.has(p.accountId) : false;
                      return (
                        <tr
                          key={p.accountId ?? p.name ?? Math.random().toString(36)}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {p.name ?? "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <AccountStatusBadge status={p.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`flex items-center gap-2 ${
                                  isActive
                                    ? "text-yellow-600 hover:text-yellow-700"
                                    : "text-green-600 hover:text-green-700"
                                }`}
                                onClick={() => handleToggleAccount(p)}
                                disabled={busy || !p.accountId}
                              >
                                {busy ? (
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 border-2 border-current rounded-full animate-spin" />
                                    Đang...
                                  </span>
                                ) : (
                                  <>
                                    <Users size={14} />
                                    {isActive ? "Inactive" : "Active"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination controls */}
        <div className="flex items-center justify-between gap-4 mt-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? "Đang tải danh sách..." : `Hiển thị trang ${page} / ${totalPages}`}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(Number(e.target.value));
              }}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
            >
              <option value={5}>5 / trang</option>
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹ Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Sau ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
