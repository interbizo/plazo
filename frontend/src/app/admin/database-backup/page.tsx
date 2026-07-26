"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  Table,
  FileText,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

interface DatabaseStats {
  totalSize: string;
  tableCount: number;
  recordCount: number;
}

interface BackupInfo {
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  type: "manual" | "auto";
}

export default function DatabaseBackupPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, backupsRes] = await Promise.all([
        adminApi.getDatabaseStats(),
        adminApi.listDatabaseBackups(),
      ]);

      setStats(statsRes.data || null);
      setBackups(backupsRes.data?.data || []);
    } catch (error: any) {
      console.error("Error loading backup data:", error);
      toast.error(error?.response?.data?.message || "Gagal memuat data backup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!confirm("Apakah Anda yakin ingin membuat backup database?")) {
      return;
    }

    setIsCreatingBackup(true);
    try {
      const response = await adminApi.createDatabaseBackup();
      toast.success("Backup database berhasil dibuat!");
      loadData();
    } catch (error: any) {
      console.error("Error creating backup:", error);
      toast.error(error?.response?.data?.message || "Gagal membuat backup");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      toast.loading("Mempersiapkan download...", { id: "download-backup" });
      
      // Use adminApi method which includes authorization
      const response = await adminApi.downloadDatabaseBackup(filename);
      
      // Create blob from response
      const blob = new Blob([response.data], { type: "application/sql" });
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("Download berhasil!", { id: "download-backup" });
    } catch (error: any) {
      console.error("Error downloading backup:", error);
      toast.error(error?.response?.data?.message || "Gagal mendownload backup", { id: "download-backup" });
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus backup "${filename}"?\n\nTindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    setDeletingBackup(filename);
    try {
      await adminApi.deleteDatabaseBackup(filename);
      toast.success("Backup berhasil dihapus");
      loadData();
    } catch (error: any) {
      console.error("Error deleting backup:", error);
      toast.error(error?.response?.data?.message || "Gagal menghapus backup");
    } finally {
      setDeletingBackup(null);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (
      !confirm(
        `⚠️ PERINGATAN PENTING ⚠️\n\nAnda akan me-restore database dari backup "${filename}".\n\nSemua data saat ini akan DIGANTI dengan data dari backup ini.\n\nSangat disarankan untuk membuat backup terlebih dahulu sebelum restore.\n\nApakah Anda yakin ingin melanjutkan?`
      )
    ) {
      return;
    }

    // Double confirmation
    const confirmText = prompt(
      'Ketik "RESTORE" (huruf besar) untuk mengkonfirmasi restore database:'
    );

    if (confirmText !== "RESTORE") {
      toast.error("Restore dibatalkan");
      return;
    }

    setRestoringBackup(filename);
    try {
      await adminApi.restoreDatabaseBackup(filename);
      toast.success("Database berhasil di-restore! Halaman akan di-refresh...");
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      toast.error(error?.response?.data?.message || "Gagal restore database");
    } finally {
      setRestoringBackup(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Database Backup</h1>
        <p className="text-sm text-gray-500">
          Kelola backup database untuk keamanan data
        </p>
      </div>

      {/* Database Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <HardDrive className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ukuran Database</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalSize}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Table className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Jumlah Tabel</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.tableCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Records</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.recordCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateBackup}
            isLoading={isCreatingBackup}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Database className="h-4 w-4 mr-2" />
            Buat Backup Baru
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Super Admin Only
        </Badge>
      </div>

      {/* Warning Notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              Peringatan Penting
            </h3>
            <ul className="text-xs text-amber-800 space-y-1">
              <li>• Backup database berisi semua data sensitif sistem</li>
              <li>• Simpan file backup di tempat yang aman</li>
              <li>• Restore database akan mengganti semua data saat ini</li>
              <li>• Selalu buat backup sebelum melakukan restore</li>
              <li>• Proses backup/restore dapat memakan waktu beberapa menit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Backup List */}
      {backups.length === 0 ? (
        <EmptyState
          icon={<Database className="h-12 w-12 text-gray-300" />}
          title="Belum ada backup"
          description="Buat backup pertama untuk mengamankan data database Anda"
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Nama File
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Ukuran
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Tipe
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Tanggal Dibuat
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr
                    key={backup.filename}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-xs text-gray-900">
                          {backup.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {formatBytes(backup.size)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={backup.type === "manual" ? "info" : "success"}
                      >
                        {backup.type === "manual" ? "Manual" : "Auto"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Download */}
                        <button
                          onClick={() => handleDownloadBackup(backup.filename)}
                          className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Download Backup"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Restore */}
                        <button
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={restoringBackup === backup.filename}
                          className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          title="Restore Database"
                        >
                          {restoringBackup === backup.filename ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          disabled={deletingBackup === backup.filename}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Hapus Backup"
                        >
                          {deletingBackup === backup.filename ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Tips Backup Database
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Buat backup secara rutin (minimal 1x seminggu)</li>
              <li>• Simpan backup di multiple lokasi (local + cloud)</li>
              <li>• Test restore backup secara berkala</li>
              <li>• Hapus backup lama yang tidak diperlukan</li>
              <li>• Sistem otomatis menyimpan maksimal 30 backup terakhir</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
