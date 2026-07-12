"use client";

import { getCompletedAppointmentsByDoctor } from "@/apis/appointment/appointment.api";
import { MedicalRecordDetailModal } from "@/components/doctor/medical-record-detail-modal";
import { PatientRecordCard } from "@/components/doctor/patient-record-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CompletedAppointment } from "@/types/medicalRecordDTO";
import {
    ChevronLeft,
    ChevronRight,
    FileX,
    Loader2,
    Search
} from "lucide-react";
import { useEffect, useState } from "react";

export default function RecordsPage() {
  const [appointments, setAppointments] = useState<CompletedAppointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<CompletedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<CompletedAppointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [patientOptions, setPatientOptions] = useState<{ id: string; name: string }[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 9;

  useEffect(() => {
    fetchAppointments();
  }, [currentPage, searchQuery, selectedPatientId]);

  useEffect(() => {
    handleFilter();
  }, [searchQuery, selectedPatientId, appointments]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await getCompletedAppointmentsByDoctor({
        page: currentPage,
        limit: pageSize,
        keyword: searchQuery || undefined,
        patientId: selectedPatientId || undefined,
      });

      if (response?.data) {
        const items = response.data.items;
        setAppointments(items);
        setFilteredAppointments(items);
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.total);

        // Derive the patient filter options from the appointments payload itself.
        // The admin /patients/admin endpoint is now PII-scoped and no longer exposes
        // a usable patient id, so we accumulate patients seen across loaded pages.
        setPatientOptions((prev) => {
          const map = new Map(prev.map((option) => [option.id, option]));
          for (const appt of items) {
            if (appt.patientId && !map.has(appt.patientId)) {
              map.set(appt.patientId, {
                id: appt.patientId,
                name: appt.patient?.profile?.name || "Bệnh nhân",
              });
            }
          }
          return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        });
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = appointments;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((appointment) => {
        const patientName = appointment.patient.profile?.name.toLowerCase() || "";
        const patientEmail = appointment.patient.profile?.email.toLowerCase() || "";
        const patientPhone = appointment.patient.profile?.phone.toLowerCase() || "";
        const diagnosis = appointment.appointmentMedicalRecord?.diagnosis?.toLowerCase() || "";

        return (
          patientName.includes(query) ||
          patientEmail.includes(query) ||
          patientPhone.includes(query) ||
          diagnosis.includes(query)
        );
      });
    }

    // Filter by selected patient
    if (selectedPatientId) {
      filtered = filtered.filter((appointment) => appointment.patientId === selectedPatientId);
    }

    setFilteredAppointments(filtered);
  };

  const handleViewDetails = (appointment: CompletedAppointment) => {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedPatientId("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Xem lại hồ sơ bệnh án của các bệnh nhân đã khám
        </p>
      </div>

      {/* Search Bar & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên, email, số điện thoại, chẩn đoán..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full md:w-64">
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Tất cả bệnh nhân</option>
                {patientOptions.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalRecords}</p>
              <p className="text-sm text-muted-foreground">Tổng số hồ sơ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{filteredAppointments.length}</p>
              <p className="text-sm text-muted-foreground">Kết quả tìm kiếm</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold">{currentPage}/{totalPages}</p>
              {(searchQuery || selectedPatientId) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilter}
                  className="ml-2"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">Trang hiện tại</p>
          </CardContent>
        </Card>
      </div> */}

      {/* Records List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAppointments.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAppointments.map((appointment) => (
              <PatientRecordCard
                key={appointment._id}
                appointment={appointment}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-20">
            <div className="flex flex-col items-center justify-center text-center">
              <FileX className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Không tìm thấy hồ sơ</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Không có hồ sơ nào phù hợp với từ khóa tìm kiếm"
                  : "Chưa có hồ sơ bệnh án nào được hoàn thành"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <MedicalRecordDetailModal
        appointment={selectedAppointment}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}


