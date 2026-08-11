"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  HardDrive,
  Table,
  FileText,
  RotateCcw,
  Cloud,
  Clock,
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
  driveFileId?: string;
}

interface BackupConfig {
  autoBackup: {
    enabled: boolean;
    cronSchedule: string;
  };
  googleDrive: {
    enabled: boolean;
    configured: boolean;
    authMode: "oauth";
    folderId: string | null;
  };
}

export default function DatabaseBackupPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [isTestingDrive, setIsTestingDrive] = useState(false);

  // Modal states
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, backupsRes, configRes] = await Promise.all([
        adminApi.getDatabaseStats(),
        adminApi.listDatabaseBackups(),
        adminApi.getBackupConfig(),
      ]);

      setStats(statsRes.data || null);
      setBackups(backupsRes.data?.data || []);
      setConfig(configRes.data?.data || configRes.data || null);
    } catch (error: any) {
      console.error("Error loading backup data:", error);
      toast.error(error?.response?.data?.message || "Gagal memuat data backup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    try {
      const response = await adminApi.testDriveConnection();
      const result = response.data?.data || response.data;
      if (result?.ok) {
        toast.success(result.message || "Koneksi Google Drive berhasil!");
      } else {
        toast.error(result?.message || "Koneksi Google Drive gagal");
      }
    } catch (error: any) {
      console.error("Error testing drive connection:", error);
      toast.error(error?.response?.data?.message || "Gagal menguji koneksi Google Drive");
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleCreateBackup = async () => {
    setConfirmCreate(false);
    setIsCreatingBackup(true);
    try {
      await adminApi.createDatabaseBackup();
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
      
      const response = await adminApi.downloadDatabaseBackup(filename);
      
      const blob = new Blob([response.data], { type: "application/sql" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("Download berhasil!", { id: "download-backup" });
    } catch (error: any) {
      console.error("Error downloading backup:", error);
      toast.error(error?.response?.data?.message || "Gagal mendownload backup", { id: "download-backup" });
    }
  };

  const handleDeleteBackup = async () => {
    const filename = confirmDelete;
    if (!filename) return;
    setConfirmDelete(null);
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

  const handleRestoreBackup = async () => {
    const filename = confirmRestore;
    if (!filename) return;
    setConfirmRestore(null);
    setIsRestoring(true);
    try {
      await adminApi.restoreDatabaseBackup(filename);
      toast.success("Database berhasil di-restore!");
      loadData();
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      toast.error(error?.response?.data?.message || "Gagal restore database");
    } finally {
      setIsRestoring(false);
      setRestoreConfirmText("");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDateTime = (date: string): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
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
            onClick={() => setConfirmCreate(true)}
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
        <Badge variant="warning">
          Super Admin Only
        </Badge>
      </div>

      {/* Auto Backup & Google Drive Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Auto Backup</h3>
              <p className="text-xs text-gray-500">Backup terjadwal otomatis</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Status</span>
              {config?.autoBackup.enabled ? (
                <Badge variant="success">Aktif</Badge>
              ) : (
                <Badge variant="warning">Nonaktif</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Jadwal</span>
              <span className="text-gray-900">
                {config?.autoBackup.cronSchedule === "0 1 * * *" && "Setiap hari pukul 01.00"}
                {config?.autoBackup.cronSchedule === "0 2 * * *" && "Setiap hari pukul 02.00"}
                {config?.autoBackup.cronSchedule === "0 */5 * * *" && "Tiap 5 menit"}
                {!["0 1 * * *", "0 2 * * *", "0 */5 * * *"].includes(config?.autoBackup.cronSchedule || "") && (config?.autoBackup.cronSchedule || "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Penyimpanan</span>
              <span className="text-gray-900">
                {config?.googleDrive.enabled && config?.googleDrive.configured
                  ? "Google Drive"
                  : "Server"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
              <Cloud className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Google Drive</h3>
              <p className="text-xs text-gray-500">Backup tersimpan ke cloud</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Status</span>
              {config?.googleDrive.enabled && config?.googleDrive.configured ? (
                <Badge variant="success">Terhubung</Badge>
              ) : (
                <Badge variant="warning">Belum diatur</Badge>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestDrive}
                isLoading={isTestingDrive}
              >
                <Cloud className="h-3.5 w-3.5 mr-1" />
                Uji Koneksi
              </Button>
            </div>
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
                      {formatDateTime(backup.createdAt)}
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
                          onClick={() => setConfirmRestore(backup.filename)}
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
                          onClick={() => setConfirmDelete(backup.filename)}
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

      {/* Confirm Dialog - Buat Backup */}
      <ConfirmDialog
        isOpen={confirmCreate}
        onClose={() => setConfirmCreate(false)}
        onConfirm={handleCreateBackup}
        title="Buat Backup"
        message="Buat backup database sekarang?"
        confirmText="Ya, Buat Backup"
        variant="info"
        isLoading={isCreatingBackup}
      />

      {/* Confirm Dialog - Hapus Backup */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteBackup}
        title="Hapus Backup"
        message={`Hapus backup "${confirmDelete}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="danger"
        isLoading={!!deletingBackup}
      />

      {/* Modal - Konfirmasi Restore */}
      <Modal
        isOpen={!!confirmRestore}
        onClose={() => { setConfirmRestore(null); setRestoreConfirmText(""); }}
        title="Restore Database"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              Data saat ini akan <strong>diganti</strong> dengan isi backup ini.
              Data setelah waktu backup akan <strong>hilang</strong>.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Ketik <strong>RESTORE</strong> (huruf besar) untuk melanjutkan:
          </p>
          <input
            type="text"
            value={restoreConfirmText}
            onChange={(e) => setRestoreConfirmText(e.target.value)}
            placeholder="RESTORE"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { setConfirmRestore(null); setRestoreConfirmText(""); }}
              disabled={isRestoring}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleRestoreBackup}
              isLoading={isRestoring}
              disabled={restoreConfirmText !== "RESTORE"}
            >
              Restore Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
