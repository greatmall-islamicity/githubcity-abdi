import { useState } from "react";
import {
  Bell,
  Check,
  Fingerprint,
  Lock,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { TranslationBundle } from "../i18n/translations";
import { PlatformNotification } from "../types";

interface SecurityAlertsViewProps {
  t: TranslationBundle;
  notifications: PlatformNotification[];
  passkeyLabel: string;
  emailLog: { id: string; recipient: string; subject: string; sentAt: string }[];
  onMarkAllRead: () => void;
  onSimulateUrgentPush: () => void;
  onRegisterNewPasskey: (label: string) => void;
}

export function SecurityAlertsView({
  t,
  notifications,
  passkeyLabel,
  emailLog,
  onMarkAllRead,
  onSimulateUrgentPush,
  onRegisterNewPasskey,
}: SecurityAlertsViewProps) {
  const [filter, setFilter] = useState<"all" | "urgent" | "donation" | "cicd">("all");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [registering, setRegistering] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === "urgent") return n.urgent;
    if (filter === "donation") return n.category === "donation" || n.category === "milestone";
    if (filter === "cicd") return n.category === "cicd";
    return true;
  });

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    try {
      await new Promise((r) => setTimeout(r, 450));
      const deviceTag = `Passkey Perangkat #${Math.floor(100 + Math.random() * 899)} (WebAuthn)`;
      onRegisterNewPasskey(deviceTag);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.security.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          {t.security.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Push & Email Notification Stream */}
        <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t.security.notificationsTitle}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSimulateUrgentPush}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {t.security.simulatePush}
              </button>
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer"
              >
                Tandai Dibaca
              </button>
            </div>
          </div>

          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto bg-slate-50/50 dark:bg-slate-950/40">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "urgent", label: "Mendesak" },
                { id: "donation", label: "Donasi & Progres" },
                { id: "cicd", label: "CI/CD Bot" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 text-xs ${
                  !n.read ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell
                      className={`w-3.5 h-3.5 shrink-0 ${
                        n.urgent
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    />
                    <span className="font-semibold text-slate-900 dark:text-slate-50">
                      {n.title}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-5 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="pl-5 text-[11px] text-slate-500 dark:text-slate-400">
                    {n.channel} · {n.timestamp}
                  </div>
                </div>
                {!n.read && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    Baru
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Biometric Vault + Automated Email Log */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5 text-xs">
            <div className="flex items-start gap-3">
              <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {t.security.biometricVaultTitle}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Autentikasi FIDO2 / WebAuthn melindungi penandatanganan donasi & akses admin mustahik.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Passkey Aktif: {passkeyLabel}
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Enkripsi: TLS 1.3 · AES-256-GCM · SHA-256
                </div>
              </div>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>

            <button
              type="button"
              onClick={handleRegisterPasskey}
              disabled={registering}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {registering ? "Mendaftarkan WebAuthn..." : t.security.registerPasskey}
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Preferensi Kanal Notifikasi Otomatis
              </div>
              {[
                {
                  label: "Notifikasi Push Donasi Mendesak & Progres Proyek",
                  checked: pushEnabled,
                  toggle: () => setPushEnabled((v) => !v),
                },
                {
                  label: "Email Otomatis Setiap Donasi Terverifikasi Masuk",
                  checked: emailEnabled,
                  toggle: () => setEmailEnabled((v) => !v),
                },
                {
                  label: "Webhook Peringatan Kegagalan CI/CD ABDICity Bot",
                  checked: webhookEnabled,
                  toggle: () => setWebhookEnabled((v) => !v),
                },
              ].map((pref) => (
                <label
                  key={pref.label}
                  className="flex items-center justify-between gap-3 cursor-pointer py-1"
                >
                  <span className="text-slate-600 dark:text-slate-300">{pref.label}</span>
                  <input
                    type="checkbox"
                    checked={pref.checked}
                    onChange={pref.toggle}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Automated Email Dispatch Log */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-50">
                <MailCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.security.emailAutomationTitle}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="w-3 h-3" />
                DKIM Signed
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {emailLog.map((item) => (
                <div key={item.id} className="py-2.5 space-y-0.5">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.subject}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Kepada: {item.recipient}</span>
                    <span className="font-mono">{item.sentAt}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Seluruh tanda terima email disegel dengan verifikasi hash on-chain.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
