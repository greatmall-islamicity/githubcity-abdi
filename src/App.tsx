import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Bot,
  Cpu,
  Globe,
  HandHeart,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { AbdcityBotView } from "./components/AbdcityBotView";
import { CampaignsDonateView } from "./components/CampaignsDonateView";
import { DonationCheckoutModal } from "./components/DonationCheckoutModal";
import { MustahikAIView } from "./components/MustahikAIView";
import { OverviewLedgerView } from "./components/OverviewLedgerView";
import { SecurityAlertsView } from "./components/SecurityAlertsView";
import {
  INITIAL_CAMPAIGNS,
  INITIAL_CICD_RUNS,
  INITIAL_ISSUES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PRS,
  INITIAL_REPOS,
  INITIAL_TRANSACTIONS,
  MUSTAHIK_REGIONS,
  formatIdr,
} from "./data/platformData";
import { TRANSLATIONS } from "./i18n/translations";
import {
  AppView,
  BlockchainTransaction,
  CICDRun,
  Campaign,
  GitHubIssueItem,
  LanguageCode,
  ManagedRepo,
  PlatformNotification,
  PullRequestItem,
} from "./types";

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("islamicity_theme") === "dark";
  });
  const [language, setLanguage] = useState<LanguageCode>("id");
  const [activeView, setActiveView] = useState<AppView>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Live stateful platform collections
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [transactions, setTransactions] =
    useState<BlockchainTransaction[]>(INITIAL_TRANSACTIONS);
  const [repos, setRepos] = useState<ManagedRepo[]>(INITIAL_REPOS);
  const [pullRequests, setPullRequests] =
    useState<PullRequestItem[]>(INITIAL_PRS);
  const [cicdRuns, setCicdRuns] = useState<CICDRun[]>(INITIAL_CICD_RUNS);
  const [issues, setIssues] = useState<GitHubIssueItem[]>(INITIAL_ISSUES);
  const [notifications, setNotifications] = useState<PlatformNotification[]>(
    INITIAL_NOTIFICATIONS
  );
  const [passkeyLabel, setPasskeyLabel] = useState<string>(
    "TouchID / Hardware Passkey #01"
  );
  const [emailLog, setEmailLog] = useState<
    { id: string; recipient: string; subject: string; sentAt: string }[]
  >([
    {
      id: "mail-1",
      recipient: "csr@amanahlogistik.co.id",
      subject: "[Islamicity Ledger] Bukti Donasi Terenkripsi — Koridor Logistik Pangan",
      sentAt: "03:42 UTC",
    },
    {
      id: "mail-2",
      recipient: "farhan.hakim@gmail.com",
      subject: "[Islamicity Ledger] Bukti Donasi Terenkripsi — Wakaf Produktif Surya NTB",
      sentAt: "03:18 UTC",
    },
  ]);

  // Checkout Modal State
  const [checkoutTarget, setCheckoutTarget] = useState<{
    campaign: Campaign;
    presetAmount?: number;
  } | null>(null);

  // Non-blocking in-app toast banner
  const [toast, setToast] = useState<{
    id: string;
    title: string;
    detail?: string;
  } | null>(null);

  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("islamicity_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("islamicity_theme", "light");
    }
  }, [darkMode]);

  const t = TRANSLATIONS[language];
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const pushToast = (title: string, detail?: string) => {
    const id = String(Date.now());
    setToast({ id, title, detail });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const addNotification = (item: Omit<PlatformNotification, "id" | "timestamp" | "read">) => {
    const created: PlatformNotification = {
      ...item,
      id: `notif-${Date.now()}`,
      timestamp: "Baru saja",
      read: false,
    };
    setNotifications((prev) => [created, ...prev]);
    pushToast(created.title, created.message);
  };

  const handleDonationSuccess = (
    tx: BlockchainTransaction,
    emailReceipt: { dispatched: boolean; recipient: string | null; subject: string }
  ) => {
    setTransactions((prev) => [tx, ...prev]);
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === tx.campaignId
          ? {
              ...c,
              raisedIdr: c.raisedIdr + tx.amountIdr,
              donorCount: c.donorCount + 1,
            }
          : c
      )
    );

    if (emailReceipt.dispatched && emailReceipt.recipient) {
      setEmailLog((prev) => [
        {
          id: `mail-${Date.now()}`,
          recipient: emailReceipt.recipient!,
          subject: emailReceipt.subject,
          sentAt: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...prev,
      ]);
    }

    addNotification({
      category: "donation",
      urgent: tx.amountIdr >= 5000000,
      title: `Donasi Masuk Terverifikasi — ${formatIdr(tx.amountIdr)}`,
      message: `${tx.donorDisplay} via ${tx.walletProvider} (${tx.txHash.slice(0, 12)}...).`,
      channel: emailReceipt.dispatched ? "Push & Email" : "Push",
    });
  };

  const handleToggleRepoRule = (
    repoId: string,
    field: "branchProtection" | "commitConventionCheck" | "docsCompletenessCheck"
  ) => {
    setRepos((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        const updated = { ...r, [field]: !r[field], lastSync: "Baru saja" };
        const allSafe =
          updated.branchProtection &&
          updated.commitConventionCheck &&
          updated.docsCompletenessCheck;
        updated.health = allSafe ? "Nominal" : "Warning";
        return updated;
      })
    );
    pushToast("Aturan repositori ABDICity diperbarui", "Sinkronisasi konfigurasi ke GitHub App selesai.");
  };

  const handleRunPrCheck = (prId: string) => {
    setPullRequests((prev) =>
      prev.map((pr) =>
        pr.id === prId
          ? {
              ...pr,
              commitFormatValid: true,
              docsComplete: true,
              checksStatus: "Passed",
              updatedAt: "Baru saja",
            }
          : pr
      )
    );
    pushToast("Validasi PR & Dokumen Lolos", "ABDICity-Integration-Bot menandai PR siap untuk merge.");
  };

  const handleTriggerWebhook = () => {
    const newRun: CICDRun = {
      id: `run-${Date.now()}`,
      repo: "abdcity/abdcity-bot-core",
      branch: "main",
      commitSha: Math.random().toString(16).slice(2, 9),
      stage: "Production Deploy",
      status: "Success",
      durationSec: 41,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    };
    setCicdRuns((prev) => [newRun, ...prev]);
    addNotification({
      category: "cicd",
      urgent: false,
      title: "Webhook CI/CD Diterima — Deploy Sukses",
      message: `${newRun.repo} (${newRun.commitSha}) menyelesaikan stage ${newRun.stage} dalam ${newRun.durationSec} detik.`,
      channel: "Webhook Alert",
    });
  };

  const handleSimulateBuildFailure = () => {
    const failedRun: CICDRun = {
      id: `run-${Date.now()}`,
      repo: "abdcity/zakat-smart-contracts",
      branch: "release/v2.4",
      commitSha: Math.random().toString(16).slice(2, 9),
      stage: "Foundry Audit",
      status: "Failed",
      durationSec: 19,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
      alertSent: true,
    };
    setCicdRuns((prev) => [failedRun, ...prev]);
    addNotification({
      category: "cicd",
      urgent: true,
      title: "PERINGATAN CI/CD: Kegagalan Audit Smart Contract",
      message: `${failedRun.repo} pada branch ${failedRun.branch} gagal di tahap Foundry Audit. Rilis produksi ditahan otomatis.`,
      channel: "Webhook Alert",
    });
  };

  const handleResolveBuildRun = (runId: string) => {
    setCicdRuns((prev) =>
      prev.map((run) =>
        run.id === runId ? { ...run, status: "Success", stage: "Production Deploy" } : run
      )
    );
    pushToast("Pipeline dipulihkan & dirilis", "ABDICity Bot mengonfirmasi build produksi kembali nominal.");
  };

  const handleAddTriagedIssue = (issue: GitHubIssueItem) => {
    setIssues((prev) => [issue, ...prev]);
    addNotification({
      category: "cicd",
      urgent: issue.priority === "critical",
      title: `Auto-Triage Issue #${issue.number} (${issue.priority.toUpperCase()})`,
      message: `Bot menandai [${issue.labels.join(", ")}] dan menugaskan ke ${issue.assignedTeam}.`,
      channel: "Webhook Alert",
    });
  };

  const navItems: {
    id: AppView;
    label: string;
    icon: typeof Activity;
    badge?: number;
  }[] = [
    { id: "overview", label: t.nav.overview, icon: Activity },
    { id: "mustahik-ai", label: t.nav["mustahik-ai"], icon: Cpu },
    { id: "campaigns", label: t.nav.campaigns, icon: HandHeart },
    { id: "abdcity-bot", label: t.nav["abdcity-bot"], icon: Bot },
    {
      id: "security",
      label: t.nav.security,
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="space-y-6">
        {/* Single-line Brand Zone */}
        <div className="px-1 pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView("overview");
              setMobileNavOpen(false);
            }}
            className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src="/src/assets/images/githubcity_logo_1794766288286.jpg"
              alt="GitHubCity Logo"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <span>{t.brandTitle}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu navigasi"
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="font-mono tabular-nums text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workspace Preferences (Language, Dark Mode, Auditor Profile) */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center justify-between gap-2 px-2">
          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Globe className="w-3.5 h-3.5" />
            <span>{t.languageLabel}</span>
          </span>
          <select
            aria-label={t.languageLabel}
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="id">Indonesia (ID)</option>
            <option value="en">English (EN)</option>
            <option value="ms">Melayu (MS)</option>
            <option value="ar">العربية (AR)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>{darkMode ? t.themeLight : t.themeDark}</span>
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {darkMode ? "DARK" : "LIGHT"}
          </span>
        </button>

        <div className="flex items-center gap-2.5 px-2 pt-1">
          {avatarError ? (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              RA
            </div>
          ) : (
            <img
              src="/src/assets/images/avatar_auditor_lead_1794743504340.jpg"
              alt="Rizky Ramadhan — Lead Auditor"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
            />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              Rizky Ramadhan
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Lead Auditor · ABDICity
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex"
    >
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[288px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-[288px] max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left — Single Primary CTA on right */}
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
              {t.breadcrumbs[activeView]}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCheckoutTarget({ campaign: campaigns[0] })}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.primaryDonateCta}
          </button>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeView === "overview" && (
            <OverviewLedgerView
              t={t}
              transactions={transactions}
              campaigns={campaigns}
              regions={MUSTAHIK_REGIONS}
              repos={repos}
              onQuickDonate={(camp) =>
                setCheckoutTarget({ campaign: camp || campaigns[0] })
              }
              onNavigateMustahik={() => setActiveView("mustahik-ai")}
            />
          )}

          {activeView === "mustahik-ai" && (
            <MustahikAIView
              t={t}
              language={language}
              regions={MUSTAHIK_REGIONS}
              onApplyAllocation={(regionName, pct) => {
                addNotification({
                  category: "milestone",
                  urgent: false,
                  title: `Rekomendasi Alokasi ${pct}% untuk ${regionName}`,
                  message:
                    "Rencana distribusi 8 Asnaf dari Gemini AI telah dijadwalkan ke antrean smart contract.",
                  channel: "Push",
                });
              }}
            />
          )}

          {activeView === "campaigns" && (
            <CampaignsDonateView
              t={t}
              campaigns={campaigns}
              onOpenDonateModal={(camp, preset) =>
                setCheckoutTarget({ campaign: camp, presetAmount: preset })
              }
              onShareFeedback={(msg) => pushToast("Bagikan Kampanye", msg)}
            />
          )}

          {activeView === "abdcity-bot" && (
            <AbdcityBotView
              t={t}
              language={language}
              repos={repos}
              pullRequests={pullRequests}
              cicdRuns={cicdRuns}
              issues={issues}
              onToggleRepoRule={handleToggleRepoRule}
              onRunPrCheck={handleRunPrCheck}
              onTriggerWebhook={handleTriggerWebhook}
              onSimulateBuildFailure={handleSimulateBuildFailure}
              onResolveBuildRun={handleResolveBuildRun}
              onAddTriagedIssue={handleAddTriagedIssue}
            />
          )}

          {activeView === "security" && (
            <SecurityAlertsView
              t={t}
              notifications={notifications}
              passkeyLabel={passkeyLabel}
              emailLog={emailLog}
              onMarkAllRead={() =>
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
              }
              onSimulateUrgentPush={() =>
                addNotification({
                  category: "donation",
                  urgent: true,
                  title: "Peringatan Push Mendesak: Target Bantuan Darurat 85%",
                  message:
                    "Koridor Logistik Pangan membutuhkan Rp 285jt lagi sebelum kloter ke-15 diberangkatkan malam ini.",
                  channel: "Push & Email",
                })
              }
              onRegisterNewPasskey={(label) => {
                setPasskeyLabel(label);
                pushToast("Passkey Biometrik Diperbarui", label);
              }}
            />
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="px-4 sm:px-8 py-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
          <span>
            Islamicity Open-Source Zakat & Waqf Infrastructure · Governed by ABDICity Integration Bot
          </span>
          <span className="font-mono">AES-256-GCM · Polygon/Base Audit Ledger</span>
        </footer>
      </div>

      {/* Encrypted Multi-Wallet & Biometric Checkout Modal */}
      {checkoutTarget && (
        <DonationCheckoutModal
          campaign={checkoutTarget.campaign}
          initialAmount={checkoutTarget.presetAmount}
          passkeyLabel={passkeyLabel}
          onClose={() => setCheckoutTarget(null)}
          onSuccess={handleDonationSuccess}
        />
      )}

      {/* Non-blocking Push Notification Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl text-xs space-y-1"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-bold text-slate-900 dark:text-slate-50">
              {toast.title}
            </span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {toast.detail && (
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {toast.detail}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
