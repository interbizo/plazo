"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  SlidersHorizontal,
  AlertTriangle,
  Shield,
  Zap,
  BookOpen,
  FileText,
  MessageSquare,
  Gift,
} from "lucide-react";
import {
  platformSettingsService,
  PlatformSetting,
} from "@/services/platform-settings.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  "module.forum": <MessageSquare className="h-5 w-5" />,
  "module.article": <BookOpen className="h-5 w-5" />,
  "module.jobs": <FileText className="h-5 w-5" />,
  "module.referral": <Gift className="h-5 w-5" />,
};

const MODULE_LABELS: Record<string, string> = {
  "module.forum": "Forum Diskusi",
  "module.article": "Artikel",
  "module.jobs": "Jobs",
  "module.referral": "Program Referral",
};

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"modules" | "maintenance">("modules");

  const [pendingToggle, setPendingToggle] = useState<{
    key: string;
    currentValue: string;
    label: string;
  } | null>(null);

  const [pendingMaintenanceToggle, setPendingMaintenanceToggle] = useState<boolean | null>(null);

  const [maintenanceForm, setMaintenanceForm] = useState({
    title: "",
    message: "",
    estimatedEnd: "",
  });

  const loadSettings = useCallback(async () => {
    try {
      const data = await platformSettingsService.getAll();
      setSettings(data);
      const getVal = (key: string) => data.find((s) => s.key === key)?.value ?? "";
      setMaintenanceForm({
        title: getVal("maintenance.title"),
        message: getVal("maintenance.message"),
        estimatedEnd: getVal("maintenance.estimated_end"),
      });
    } catch (error) {
      toast.error(`Gagal memuat platform settings: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isEnabled = (key: string) => settings.find((s) => s.key === key)?.value === "true";

  const executeToggle = async () => {
    if (!pendingToggle) return;
    const { key, currentValue, label } = pendingToggle;
    const newValue = currentValue === "true" ? "false" : "true";

    setUpdatingKey(key);
    try {
      const updated = await platformSettingsService.update(key, newValue);
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: updated.value } : s)),
      );
      toast.success(
        `${label} ${newValue === "true" ? "diaktifkan" : "dinonaktifkan"}`,
      );
    } catch (error) {
      toast.error(`Gagal mengubah status modul: ${getErrorMessage(error)}`);
    } finally {
      setUpdatingKey(null);
      setPendingToggle(null);
    }
  };

  const executeMaintenanceToggle = async () => {
    if (pendingMaintenanceToggle === null) return;
    const newValue = pendingMaintenanceToggle;

    setUpdatingKey("maintenance.enabled");
    try {
      await platformSettingsService.update("maintenance.enabled", String(newValue));
      setSettings((prev) =>
        prev.map((s) =>
          s.key === "maintenance.enabled" ? { ...s, value: String(newValue) } : s,
        ),
      );
      toast.success(
        newValue
          ? "Maintenance mode AKTIF — pengguna non-admin akan diarahkan ke halaman perbaikan"
          : "Maintenance mode DINONAKTIFKAN — sistem berjalan normal",
        { duration: 4000 },
      );
    } catch (error) {
      toast.error(`Gagal mengubah Maintenance mode: ${getErrorMessage(error)}`);
    } finally {
      setUpdatingKey(null);
      setPendingMaintenanceToggle(null);
    }
  };

  const handleSaveMaintenanceDetails = async () => {
    setUpdatingKey("maintenance.details");
    try {
      await Promise.all([
        platformSettingsService.update("maintenance.title", maintenanceForm.title),
        platformSettingsService.update("maintenance.message", maintenanceForm.message),
        platformSettingsService.update("maintenance.estimated_end", maintenanceForm.estimatedEnd),
      ]);
      toast.success("Detail pesan maintenance berhasil disimpan");
      loadSettings();
    } catch (error) {
      toast.error(`Gagal menyimpan detail maintenance: ${getErrorMessage(error)}`);
    } finally {
      setUpdatingKey(null);
    }
  };

  const moduleSettings = settings.filter((s) => s.key.startsWith("module."));
  const maintenanceEnabled = isEnabled("maintenance.enabled");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-sm text-gray-500">
              Kelola modul platform dan maintenance mode
            </p>
          </div>
        </div>
      </div>

      {maintenanceEnabled && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">Maintenance Mode Aktif</p>
            <p className="text-xs text-red-600">
              Semua pengguna non-admin saat ini melihat halaman perbaikan. Admin tetap dapat mengakses admin panel.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {([
          { id: "modules", label: "Toggle Module", icon: <Zap className="h-4 w-4" /> },
          { id: "maintenance", label: "Maintenance Mode", icon: <Shield className="h-4 w-4" /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {moduleSettings.map((setting) => {
              const enabled = setting.value === "true";
              const label = MODULE_LABELS[setting.key] || setting.key;
              const isUpdating = updatingKey === setting.key;

              return (
                <div
                  key={setting.key}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-xl p-3 ${
                        enabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {MODULE_ICONS[setting.key] ?? <SlidersHorizontal className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{label}</p>
                        <Badge variant={enabled ? "success" : "danger"}>
                          {enabled ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={enabled}
                    variant="primary"
                    disabled={isUpdating}
                    onCheckedChange={() =>
                      setPendingToggle({
                        key: setting.key,
                        currentValue: setting.value,
                        label,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "maintenance" && (
        <div className="space-y-6">
          <div
            className={`rounded-xl border p-6 transition-all ${
              maintenanceEnabled
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-white shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">Maintenance Mode</h3>
                  <Badge variant={maintenanceEnabled ? "danger" : "success"}>
                    {maintenanceEnabled ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {maintenanceEnabled
                    ? "Semua pengunjung publik melihat halaman perbaikan. Admin tetap bisa login & akses admin panel."
                    : "Sistem berjalan normal untuk semua pengunjung."}
                </p>
              </div>

              <Switch
                checked={maintenanceEnabled}
                variant="danger"
                disabled={updatingKey === "maintenance.enabled"}
                onCheckedChange={() => setPendingMaintenanceToggle(!maintenanceEnabled)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Pengaturan Pesan Maintenance</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul Halaman</label>
              <input
                type="text"
                value={maintenanceForm.title}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Sedang Dalam Perbaikan"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pesan Untuk Pengunjung</label>
              <textarea
                rows={3}
                value={maintenanceForm.message}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Kami sedang melakukan pemeliharaan sistem..."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Selesai (Opsional)</label>
              <input
                type="datetime-local"
                value={maintenanceForm.estimatedEnd}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, estimatedEnd: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleSaveMaintenanceDetails}
              disabled={updatingKey === "maintenance.details"}
              isLoading={updatingKey === "maintenance.details"}
            >
              Simpan Perubahan Pesan
            </Button>
          </div>
        </div>
      )}

      {pendingToggle && (
        <ConfirmDialog
          isOpen={!!pendingToggle}
          onClose={() => setPendingToggle(null)}
          onConfirm={executeToggle}
          title={`Konfirmasi Status Modul ${pendingToggle.label}`}
          message={`Apakah Anda yakin ingin ${
            pendingToggle.currentValue === "true" ? "MENONAKTIFKAN" : "MENGAKTIFKAN"
          } modul ${pendingToggle.label}? ${
            pendingToggle.currentValue === "true"
              ? "Menu publik akan disembunyikan dan modul tidak lagi dapat diakses oleh pengunjung."
              : "Modul akan langsung dapat diakses oleh semua pengunjung."
          }`}
          confirmText={pendingToggle.currentValue === "true" ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
          variant={pendingToggle.currentValue === "true" ? "danger" : "info"}
          isLoading={updatingKey === pendingToggle.key}
        />
      )}

      {pendingMaintenanceToggle !== null && (
        <ConfirmDialog
          isOpen={pendingMaintenanceToggle !== null}
          onClose={() => setPendingMaintenanceToggle(null)}
          onConfirm={executeMaintenanceToggle}
          title={`Konfirmasi Maintenance Mode`}
          message={`Apakah Anda yakin ingin ${
            pendingMaintenanceToggle ? "MENGAKTIFKAN" : "MENONAKTIFKAN"
          } Maintenance Mode? ${
            pendingMaintenanceToggle
              ? "Semua pengunjung publik akan langsung diarahkan ke halaman perbaikan (Sedang Dalam Perbaikan). Admin tetap dapat mengakses admin panel."
              : "Sistem akan kembali berjalan normal untuk semua pengguna."
          }`}
          confirmText={pendingMaintenanceToggle ? "Ya, Aktifkan Maintenance" : "Ya, Matikan Maintenance"}
          variant={pendingMaintenanceToggle ? "danger" : "info"}
          isLoading={updatingKey === "maintenance.enabled"}
        />
      )}
    </div>
  );
}
