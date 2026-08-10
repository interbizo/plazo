import { NotificationChannel } from "@prisma/client";

// Contract untuk channel notifikasi; channel baru dibuat dengan mengimplementasi interface ini lalu didaftarkan ke registry.
export interface NotificationChannelAdapter {
  readonly name: NotificationChannel;

  // Apakah channel siap dipakai (mis. API token terkonfigurasi).
  isAvailable(): boolean;

  // Kirim pesan. Harus mengembalikan true hanya jika pengiriman berhasil.
  send(options: ChannelSendOptions): Promise<boolean>;
}

export interface ChannelSendOptions {
  // Nomor atau alamat tujuan yang sudah dipilih sesuai channel oleh engine.
  recipient: string;
  title: string;
  message: string;
  // Data tambahan untuk debug/log.
  metadata?: Record<string, unknown>;
}

// Registry channel sebagai titik tunggal pendaftaran channel baru.
export class NotificationChannelRegistry {
  private readonly adapters = new Map<NotificationChannel, NotificationChannelAdapter>();

  register(adapter: NotificationChannelAdapter) {
    this.adapters.set(adapter.name, adapter);
  }

  get(channel: NotificationChannel): NotificationChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  list(): NotificationChannelAdapter[] {
    return [...this.adapters.values()];
  }

  isAvailable(channel: NotificationChannel): boolean {
    return this.adapters.get(channel)?.isAvailable() ?? false;
  }
}
