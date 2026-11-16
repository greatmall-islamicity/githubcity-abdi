import { AppView, LanguageCode } from "../types";

export interface TranslationBundle {
  brandTitle: string;
  nav: Record<AppView, string>;
  breadcrumbs: Record<AppView, string>;
  primaryDonateCta: string;
  themeLight: string;
  themeDark: string;
  languageLabel: string;
  overview: {
    heroTitle: string;
    heroDesc: string;
    kpiTotalOnChain: string;
    kpiMustahikMapped: string;
    kpiEfficiency: string;
    kpiReposProtected: string;
    chartTitle: string;
    chartSubtitle: string;
    allocationTitle: string;
    testimonialsTitle: string;
    ledgerTitle: string;
    ledgerSubtitle: string;
    searchPlaceholder: string;
    inspectBlock: string;
  };
  mustahik: {
    title: string;
    subtitle: string;
    regionMatrixTitle: string;
    aiEngineTitle: string;
    aiEngineSubtitle: string;
    runPrediction: string;
    runningPrediction: string;
    fieldNotesLabel: string;
    fieldNotesPlaceholder: string;
    applyAllocation: string;
  };
  campaigns: {
    title: string;
    subtitle: string;
    donateNow: string;
    shareCampaign: string;
    linkCopied: string;
    zakatCalcTitle: string;
    zakatCalcSubtitle: string;
    monthlyIncomeLabel: string;
    goldSavingsLabel: string;
    calculatedZakatLabel: string;
    donateCalculated: string;
  };
  bot: {
    title: string;
    subtitle: string;
    viewGithubManifest: string;
    tabRepos: string;
    tabCicd: string;
    tabIssues: string;
    tabInsights: string;
    tabPerformance: string;
    runBotCheck: string;
    triggerWebhook: string;
    simulateAlert: string;
    submitIssueTitle: string;
    healthScoreTitle: string;
    healthScoreSubtitle: string;
    fleetScoreLabel: string;
    branchLabel: string;
    commitLabel: string;
    docsLabel: string;
    healthOptimal: string;
    healthModerate: string;
    healthAtRisk: string;
    insights: {
      title: string;
      subtitle: string;
      filterAllRepos: string;
      kpiCommits: string;
      kpiContributors: string;
      kpiResolutionRate: string;
      kpiMedianTime: string;
      commitChartTitle: string;
      commitChartSubtitle: string;
      issueChartTitle: string;
      issueChartSubtitle: string;
      devHeatmapTitle: string;
      devHeatmapSubtitle: string;
      devTableTitle: string;
    };
    performance: {
      title: string;
      subtitle: string;
      filterAllRepos: string;
      granularityDaily: string;
      granularityWeekly: string;
      kpiSuccessRate: string;
      kpiDeployFreq: string;
      kpiMttr: string;
      kpiOptimization: string;
      successChartTitle: string;
      successChartSubtitle: string;
      deployChartTitle: string;
      deployChartSubtitle: string;
      mttrChartTitle: string;
      mttrChartSubtitle: string;
      optimizationsTitle: string;
      optimizationsSubtitle: string;
    };
  };
  security: {
    title: string;
    subtitle: string;
    notificationsTitle: string;
    biometricVaultTitle: string;
    registerPasskey: string;
    simulatePush: string;
    emailAutomationTitle: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationBundle> = {
  id: {
    brandTitle: "GitHubCity : Islamicity & ABDICity",
    nav: {
      overview: "Audit & Analitik",
      "mustahik-ai": "AI Pemetaan Mustahik",
      campaigns: "Donasi & E-Wallet",
      "abdcity-bot": "ABDICity GitHub Bot",
      security: "Notifikasi & Biometrik",
    },
    breadcrumbs: {
      overview: "Infrastruktur / Buku Besar Audit Publik",
      "mustahik-ai": "Analitik Prediktif / Pemetaan Mustahik",
      campaigns: "Penghimpunan / Kampanye & Dompet Digital",
      "abdcity-bot": "DevOps / ABDICity-Integration-Bot",
      security: "Tata Kelola / Pusat Notifikasi & Keamanan",
    },
    primaryDonateCta: "Salurkan Zakat & Wakaf",
    themeLight: "Mode Terang",
    themeDark: "Mode Gelap",
    languageLabel: "Bahasa",
    overview: {
      heroTitle: "Infrastruktur Zakat & Wakaf Terbuka yang Dapat Diaudit Secara Real-Time",
      heroDesc:
        "GitHubCity : Setiap transaksi zakat, infak, dan wakaf produktif terenkripsi AES-256-GCM, dicatat pada buku besar blockchain publik, dan dipantau otomatis oleh ABDICity Integration Bot.",
      kpiTotalOnChain: "Total Dana Terverifikasi On-Chain",
      kpiMustahikMapped: "Keluarga Mustahik Terpetakan",
      kpiEfficiency: "Rasio Penyaluran Langsung",
      kpiReposProtected: "Repositori ABDICity Terproteksi",
      chartTitle: "Arus Penghimpunan & Penyaluran Real-Time",
      chartSubtitle: "Perbandingan dana masuk vs distribusi mustahik terverifikasi",
      allocationTitle: "Transparansi Penggunaan Dana Langsung",
      testimonialsTitle: "Testimoni Donatur & Mitra Terverifikasi",
      ledgerTitle: "Buku Besar Audit Blockchain Publik",
      ledgerSubtitle: "Verifikasi setiap hash transaksi, Merkle root, dan amplop enkripsi secara langsung.",
      searchPlaceholder: "Cari hash transaksi, donatur, atau program...",
      inspectBlock: "Periksa Bukti",
    },
    mustahik: {
      title: "Dasbor Analitik Prediktif Mustahik Berbasis AI",
      subtitle:
        "GitHubCity : Pemetaan kerentanan sosial-ekonomi berbasis Gemini AI untuk memastikan penyaluran zakat dan wakaf tepat sasaran tanpa duplikasi.",
      regionMatrixTitle: "Peta Indeks Kerentanan Wilayah",
      aiEngineTitle: "Mesin Prediksi Penyaluran Gemini AI",
      aiEngineSubtitle:
        "Pilih wilayah dan kondisi lapangan untuk menyusun strategi distribusi berbasis 8 Asnaf.",
      runPrediction: "Jalankan Analisis Prediktif AI",
      runningPrediction: "Menganalisis data wilayah...",
      fieldNotesLabel: "Catatan Koordinator Lapangan",
      fieldNotesPlaceholder: "Contoh: Kenaikan harga pangan lokal dan kebutuhan modal usaha mikro pasca panen...",
      applyAllocation: "Terapkan ke Antrean Penyaluran",
    },
    campaigns: {
      title: "Kampanye Zakat & Wakaf Produktif Global",
      subtitle:
        "GitHubCity : Dukung program terverifikasi on-chain dengan pembayaran QRIS, e-wallet lokal & internasional, berbagi satu klik, serta bukti email otomatis.",
      donateNow: "Donasi Terenkripsi",
      shareCampaign: "Bagikan",
      linkCopied: "Tautan kampanye terenkripsi disalin.",
      zakatCalcTitle: "Kalkulator Zakat Maal & Penghasilan",
      zakatCalcSubtitle: "Hitung kewajiban zakat 2,5% berdasarkan standar nisab emas terkini.",
      monthlyIncomeLabel: "Pendapatan Bulanan (IDR)",
      goldSavingsLabel: "Simpanan & Aset Likuid (IDR)",
      calculatedZakatLabel: "Estimasi Zakat Wajib",
      donateCalculated: "Bayar Zakat Ini Sekarang",
    },
    bot: {
      title: "ABDICity Integration Bot — GitHub App Console",
      subtitle:
        "GitHubCity : Otomatisasi sinkronisasi repositori, validasi format commit & dokumen PR, notifikasi webhook CI/CD real-time, dan pelacakan issue otomatis.",
      viewGithubManifest: "Lihat Profil GitHub App",
      tabRepos: "Manajemen Repositori",
      tabCicd: "Notifikasi CI/CD",
      tabIssues: "Pelacakan Masalah (AI Triage)",
      tabInsights: "Repository Insights",
      tabPerformance: "Performance Dashboard",
      runBotCheck: "Validasi PR & Commit",
      triggerWebhook: "Kirim Uji Webhook",
      simulateAlert: "Simulasikan Peringatan Gagal",
      submitIssueTitle: "Laporkan Issue / Bug Baru ke Bot",
      healthScoreTitle: "Skor Kesehatan Repositori (D3 Real-Time)",
      healthScoreSubtitle: "Rata-rata tertimbang real-time dari perlindungan cabang (45%), konvensi commit (30%), dan kelengkapan dokumen (25%).",
      fleetScoreLabel: "Skor Tertimbang Armada Repo",
      branchLabel: "Perlindungan Cabang",
      commitLabel: "Konvensi Commit",
      docsLabel: "Dokumentasi",
      healthOptimal: "Tata Kelola Optimal",
      healthModerate: "Perlu Perhatian",
      healthAtRisk: "Risiko Integrasi",
      insights: {
        title: "Repository Insights — Analitik 30 Hari Terakhir (D3)",
        subtitle: "Visualisasi frekuensi commit harian, aktivitas pengembang, dan tren penyelesaian issue selama 30 hari.",
        filterAllRepos: "Semua Repositori ABDICity (5)",
        kpiCommits: "Total Commit (30 Hari)",
        kpiContributors: "Pengembang Aktif",
        kpiResolutionRate: "Rasio Penyelesaian Issue",
        kpiMedianTime: "Median Waktu Penyelesaian",
        commitChartTitle: "Frekuensi Commit & Rata-Rata 7 Hari",
        commitChartSubtitle: "Aktivitas push harian vs rata-rata bergerak 7 hari",
        issueChartTitle: "Tren Pembukaan vs Penyelesaian Issue",
        issueChartSubtitle: "Perbandingan harian issue baru terhadap issue terselesaikan",
        devHeatmapTitle: "Matriks Aktivitas Pengembang (30 Hari)",
        devHeatmapSubtitle: "Intensitas kontribusi commit dan code review per hari",
        devTableTitle: "Ringkasan Kontribusi Tim Pengembang",
      },
      performance: {
        title: "Performance Dashboard — Metrik DORA CI/CD 90 Hari (D3)",
        subtitle: "Pantau tingkat keberhasilan pipeline CI/CD, frekuensi deployment, dan Mean Time to Recovery (MTTR) selama 90 hari terakhir.",
        filterAllRepos: "Semua Repositori ABDICity (5)",
        granularityDaily: "Harian (90H)",
        granularityWeekly: "Mingguan (13 Mgg)",
        kpiSuccessRate: "Rata-Rata Keberhasilan CI/CD",
        kpiDeployFreq: "Frekuensi Deployment",
        kpiMttr: "Mean Time to Recovery (MTTR)",
        kpiOptimization: "Optimasi Workflow Aktif",
        successChartTitle: "Tingkat Keberhasilan Pipeline CI/CD (90 Hari)",
        successChartSubtitle: "Persentase pipeline lolos terhadap ambang batas SLA 95%",
        deployChartTitle: "Frekuensi Deployment (Produksi vs Staging)",
        deployChartSubtitle: "Volume rilis terverifikasi oleh ABDICity Integration Bot",
        mttrChartTitle: "Tren Mean Time to Recovery (MTTR)",
        mttrChartSubtitle: "Rata-rata waktu pemulihan insiden dalam menit (target ≤ 30 menit)",
        optimizationsTitle: "Rekomendasi Optimasi GitHub Workflow",
        optimizationsSubtitle: "Aktifkan otomatisasi bot untuk memangkas durasi build dan MTTR tim engineering.",
      },
    },
    security: {
      title: "Pusat Notifikasi Otomatis & Autentikasi Biometrik",
      subtitle:
        "GitHubCity : Pantau peringatan donasi mendesak, pembaruan progres proyek, tanda terima email otomatis, serta kelola passkey biometrik perangkat.",
      notificationsTitle: "Aliran Notifikasi Push & Email Real-Time",
      biometricVaultTitle: "Kunci Biometrik & Enkripsi End-to-End",
      registerPasskey: "Daftarkan Passkey Biometrik Baru",
      simulatePush: "Uji Notifikasi Push Mendesak",
      emailAutomationTitle: "Log Pengiriman Email Otomatis",
    },
  },
  en: {
    brandTitle: "GitHubCity : Islamicity & ABDICity",
    nav: {
      overview: "Audit & Analytics",
      "mustahik-ai": "Mustahik AI Mapping",
      campaigns: "Donate & E-Wallets",
      "abdcity-bot": "ABDICity GitHub Bot",
      security: "Alerts & Biometrics",
    },
    breadcrumbs: {
      overview: "Infrastructure / Public Audit Ledger",
      "mustahik-ai": "Predictive Analytics / Mustahik Mapping",
      campaigns: "Fundraising / Campaigns & Digital Wallets",
      "abdcity-bot": "DevOps / ABDICity-Integration-Bot",
      security: "Governance / Notifications & Security Vault",
    },
    primaryDonateCta: "Donate Zakat & Waqf",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    languageLabel: "Language",
    overview: {
      heroTitle: "Open-Source Blockchain Zakat & Waqf Infrastructure Auditable in Real Time",
      heroDesc:
        "GitHubCity : Every zakat, infaq, and productive waqf contribution is AES-256-GCM encrypted, anchored to a public blockchain ledger, and continuously governed by ABDICity Integration Bot.",
      kpiTotalOnChain: "Verified On-Chain Funds",
      kpiMustahikMapped: "Mapped Mustahik Households",
      kpiEfficiency: "Direct Disbursement Ratio",
      kpiReposProtected: "Protected ABDICity Repos",
      chartTitle: "Real-Time Fundraising & Disbursement Flow",
      chartSubtitle: "Verified inflows compared with direct mustahik distribution",
      allocationTitle: "Real-Time Transparent Fund Allocation",
      testimonialsTitle: "Verified Donor & Institutional Testimonials",
      ledgerTitle: "Public Blockchain Audit Ledger",
      ledgerSubtitle: "Inspect any transaction hash, Merkle root, and encrypted receipt envelope.",
      searchPlaceholder: "Search tx hash, donor, or campaign...",
      inspectBlock: "Inspect Proof",
    },
    mustahik: {
      title: "AI Predictive Mustahik Mapping Dashboard",
      subtitle:
        "GitHubCity : Gemini-powered socioeconomic vulnerability indexing to allocate zakat and waqf accurately across regions without duplicate aid.",
      regionMatrixTitle: "Regional Vulnerability Index",
      aiEngineTitle: "Gemini AI Distribution Forecaster",
      aiEngineSubtitle:
        "Select a target region and add field notes to generate an 8-Asnaf disbursement plan.",
      runPrediction: "Run AI Predictive Analysis",
      runningPrediction: "Analyzing regional indicators...",
      fieldNotesLabel: "Field Coordinator Notes",
      fieldNotesPlaceholder: "E.g. Rising staple food costs and post-harvest micro-enterprise capital demand...",
      applyAllocation: "Queue Recommended Allocation",
    },
    campaigns: {
      title: "Global Zakat & Productive Waqf Campaigns",
      subtitle:
        "GitHubCity : Contribute securely via QRIS, local & international e-wallets, share campaigns in one click, and receive automated encrypted email receipts.",
      donateNow: "Encrypted Donate",
      shareCampaign: "Share",
      linkCopied: "Encrypted campaign link copied.",
      zakatCalcTitle: "Zakat Maal & Income Calculator",
      zakatCalcSubtitle: "Calculate your 2.5% zakat obligation against current gold nisab thresholds.",
      monthlyIncomeLabel: "Monthly Income (IDR)",
      goldSavingsLabel: "Liquid Savings & Assets (IDR)",
      calculatedZakatLabel: "Estimated Zakat Due",
      donateCalculated: "Pay Calculated Zakat",
    },
    bot: {
      title: "ABDICity Integration Bot — GitHub App Console",
      subtitle:
        "GitHubCity : Automated repository rule sync, commit & documentation checks before merge, real-time CI/CD webhook alerts, and AI issue auto-labeling.",
      viewGithubManifest: "View GitHub App Profile",
      tabRepos: "Repository Management",
      tabCicd: "CI/CD Notifications",
      tabIssues: "Issue Tracking (AI Triage)",
      tabInsights: "Repository Insights",
      tabPerformance: "Performance Dashboard",
      runBotCheck: "Validate PR & Commits",
      triggerWebhook: "Send Test Webhook",
      simulateAlert: "Simulate Build Failure Alert",
      submitIssueTitle: "Submit New GitHub Issue to Bot",
      healthScoreTitle: "Repository Health Score (D3 Real-Time)",
      healthScoreSubtitle: "Real-time weighted average of branch protection (45%), commit convention (30%), and documentation status (25%).",
      fleetScoreLabel: "Fleet Weighted Score",
      branchLabel: "Branch Protection",
      commitLabel: "Commit Convention",
      docsLabel: "Documentation",
      healthOptimal: "Optimal Governance",
      healthModerate: "Needs Attention",
      healthAtRisk: "Integration Risk",
      insights: {
        title: "Repository Insights — Last 30 Days (D3)",
        subtitle: "Interactive visualization of commit frequency, developer contribution intensity, and issue resolution velocity.",
        filterAllRepos: "All ABDICity Repositories (5)",
        kpiCommits: "Total Commits (30D)",
        kpiContributors: "Active Contributors",
        kpiResolutionRate: "Issue Resolution Rate",
        kpiMedianTime: "Median Resolution Time",
        commitChartTitle: "Daily Commit Frequency & 7D Rolling Avg",
        commitChartSubtitle: "Commits landed per day with 7-day smoothed trendline",
        issueChartTitle: "Issue Opened vs Resolved Trend",
        issueChartSubtitle: "30-day comparison of incoming bug reports vs closed fixes",
        devHeatmapTitle: "Developer Activity Matrix (30 Days)",
        devHeatmapSubtitle: "Daily commits and PR reviews per engineer",
        devTableTitle: "Contributor Activity Breakdown",
      },
      performance: {
        title: "Performance Dashboard — 90-Day CI/CD DORA Metrics (D3)",
        subtitle: "Visualize CI/CD pipeline success rate, deployment frequency, and Mean Time to Recovery (MTTR) over the last 90 days.",
        filterAllRepos: "All ABDICity Repositories (5)",
        granularityDaily: "Daily (90D)",
        granularityWeekly: "Weekly (13 Wks)",
        kpiSuccessRate: "Avg CI/CD Success Rate",
        kpiDeployFreq: "Deployment Frequency",
        kpiMttr: "Mean Time to Recovery (MTTR)",
        kpiOptimization: "Active Workflow Optimizations",
        successChartTitle: "CI/CD Pipeline Success Rate (90 Days)",
        successChartSubtitle: "Percentage of passing workflow runs against 95% SLA threshold",
        deployChartTitle: "Deployment Frequency (Prod vs Staging)",
        deployChartSubtitle: "Verified releases shipped via ABDICity Integration Bot",
        mttrChartTitle: "Mean Time to Recovery (MTTR) Trend",
        mttrChartSubtitle: "Average incident recovery time in minutes (target ≤ 30m)",
        optimizationsTitle: "GitHub Workflow Optimization Actions",
        optimizationsSubtitle: "Enable bot automations to cut build latency and shorten incident recovery.",
      },
    },
    security: {
      title: "Automated Notifications & Biometric Security",
      subtitle:
        "GitHubCity : Monitor urgent donation push alerts, project milestone updates, automated email dispatches, and device biometric passkeys.",
      notificationsTitle: "Real-Time Push & Email Feed",
      biometricVaultTitle: "Biometric Passkeys & E2EE Vault",
      registerPasskey: "Register New Biometric Passkey",
      simulatePush: "Test Urgent Push Alert",
      emailAutomationTitle: "Automated Email Dispatch Log",
    },
  },
  ms: {
    brandTitle: "GitHubCity : Islamicity & ABDICity",
    nav: {
      overview: "Audit & Analitik",
      "mustahik-ai": "AI Pemetaan Asnaf",
      campaigns: "Derma & E-Dompet",
      "abdcity-bot": "Bot GitHub ABDICity",
      security: "Notifikasi & Biometrik",
    },
    breadcrumbs: {
      overview: "Infrastruktur / Lejar Audit Awam",
      "mustahik-ai": "Analitik Ramalan / Pemetaan Asnaf",
      campaigns: "Kutipan Dana / Kempen & E-Dompet",
      "abdcity-bot": "DevOps / ABDICity-Integration-Bot",
      security: "Tadbir Urus / Notifikasi & Keselamatan",
    },
    primaryDonateCta: "Tunaikan Zakat & Wakaf",
    themeLight: "Mod Cerah",
    themeDark: "Mod Gelap",
    languageLabel: "Bahasa",
    overview: {
      heroTitle: "Infrastruktur Zakat & Wakaf Blockchain Sumber Terbuka Boleh Diaudit Masa Nyata",
      heroDesc:
        "GitHubCity : Setiap sumbangan zakat, infak dan wakaf produktif disulitkan AES-256-GCM, direkod pada lejar blockchain awam serta diautomatikkan oleh ABDICity Integration Bot.",
      kpiTotalOnChain: "Jumlah Dana Disahkan On-Chain",
      kpiMustahikMapped: "Keluarga Asnaf Dipetakan",
      kpiEfficiency: "Nisbah Agihan Langsung",
      kpiReposProtected: "Repositori ABDICity Dilindungi",
      chartTitle: "Aliran Kutipan & Agihan Masa Nyata",
      chartSubtitle: "Perbandingan dana masuk dan agihan asnaf yang disahkan",
      allocationTitle: "Ketelusan Penggunaan Dana Secara Langsung",
      testimonialsTitle: "Testimoni Penderma & Rakan Rasmi",
      ledgerTitle: "Lejar Audit Blockchain Awam",
      ledgerSubtitle: "Semak setiap hash transaksi, Merkle root dan sampul penyulitan.",
      searchPlaceholder: "Cari hash transaksi, penderma, atau program...",
      inspectBlock: "Semak Bukti",
    },
    mustahik: {
      title: "Papan Pemuka Ramalan AI Pemetaan Asnaf",
      subtitle:
        "GitHubCity : Pemetaan kerentanan sosioekonomi berasaskan Gemini AI untuk memastikan agihan zakat dan wakaf tepat sasaran.",
      regionMatrixTitle: "Indeks Kerentanan Mengikut Wilayah",
      aiEngineTitle: "Enjin Ramalan Agihan Gemini AI",
      aiEngineSubtitle:
        "Pilih wilayah sasaran dan nota lapangan untuk menjana pelan agihan 8 Asnaf.",
      runPrediction: "Jalankan Analisis Ramalan AI",
      runningPrediction: "Menganalisis data wilayah...",
      fieldNotesLabel: "Nota Penyelaras Lapangan",
      fieldNotesPlaceholder: "Contoh: Kenaikan kos makanan asas dan keperluan modal mikro selepas tuaian...",
      applyAllocation: "Masukkan ke Barisan Agihan",
    },
    campaigns: {
      title: "Kempen Zakat & Wakaf Produktif Global",
      subtitle:
        "GitHubCity : Sumbang dengan pantas melalui QRIS, e-dompet tempatan & antarabangsa, kongsi satu klik, dan terima resit e-mel automatik.",
      donateNow: "Derma Disulitkan",
      shareCampaign: "Kongsi",
      linkCopied: "Pautan kempen disulitkan telah disalin.",
      zakatCalcTitle: "Kalkulator Zakat Harta & Pendapatan",
      zakatCalcSubtitle: "Kira kewajipan zakat 2.5% mengikut nisab emas semasa.",
      monthlyIncomeLabel: "Pendapatan Bulanan (IDR)",
      goldSavingsLabel: "Simpanan & Aset Mudah Tunai (IDR)",
      calculatedZakatLabel: "Anggaran Zakat Wajib",
      donateCalculated: "Bayar Zakat Ini Sekarang",
    },
    bot: {
      title: "ABDICity Integration Bot — Konsol GitHub App",
      subtitle:
        "GitHubCity : Automasi penyelarasan repositori, pengesahan format commit & dokumen PR, amaran webhook CI/CD masa nyata, dan pengelasan isu automatik.",
      viewGithubManifest: "Lihat Profil GitHub App",
      tabRepos: "Pengurusan Repositori",
      tabCicd: "Notifikasi CI/CD",
      tabIssues: "Jejak Isu (AI Triage)",
      tabInsights: "Repository Insights",
      tabPerformance: "Performance Dashboard",
      runBotCheck: "Sahkan PR & Commit",
      triggerWebhook: "Hantar Ujian Webhook",
      simulateAlert: "Simulasi Amaran Kegagalan",
      submitIssueTitle: "Hantar Isu Baharu kepada Bot",
      healthScoreTitle: "Skor Kesihatan Repositori (D3 Masa Nyata)",
      healthScoreSubtitle: "Purata berwajaran masa nyata bagi perlindungan cabang (45%), konvensi commit (30%), dan status dokumentasi (25%).",
      fleetScoreLabel: "Skor Berwajaran Keseluruhan",
      branchLabel: "Perlindungan Cabang",
      commitLabel: "Konvensi Commit",
      docsLabel: "Dokumentasi",
      healthOptimal: "Tadbir Urus Optimum",
      healthModerate: "Perlu Perhatian",
      healthAtRisk: "Risiko Integrasi",
      insights: {
        title: "Repository Insights — 30 Hari Terakhir (D3)",
        subtitle: "Visualisasi kekerapan commit, aktiviti pembangun, dan trend penyelesaian isu selama 30 hari.",
        filterAllRepos: "Semua Repositori ABDICity (5)",
        kpiCommits: "Jumlah Commit (30 Hari)",
        kpiContributors: "Pembangun Aktif",
        kpiResolutionRate: "Kadar Penyelesaian Isu",
        kpiMedianTime: "Masa Penyelesaian Median",
        commitChartTitle: "Kekerapan Commit & Purata 7 Hari",
        commitChartSubtitle: "Commit harian berbanding purata bergerak 7 hari",
        issueChartTitle: "Trend Pembukaan vs Penyelesaian Isu",
        issueChartSubtitle: "Perbandingan harian isu dibuka berbanding isu diselesaikan",
        devHeatmapTitle: "Matriks Aktiviti Pembangun (30 Hari)",
        devHeatmapSubtitle: "Intensiti sumbangan commit dan semakan PR harian",
        devTableTitle: "Ringkasan Sumbangan Pasukan Pembangun",
      },
      performance: {
        title: "Performance Dashboard — Metrik DORA CI/CD 90 Hari (D3)",
        subtitle: "Pantau kadar kejayaan saluran paip CI/CD, kekerapan deployment, dan Mean Time to Recovery (MTTR) sepanjang 90 hari.",
        filterAllRepos: "Semua Repositori ABDICity (5)",
        granularityDaily: "Harian (90H)",
        granularityWeekly: "Mingguan (13 Mgg)",
        kpiSuccessRate: "Purata Kejayaan CI/CD",
        kpiDeployFreq: "Kekerapan Deployment",
        kpiMttr: "Mean Time to Recovery (MTTR)",
        kpiOptimization: "Pengoptimuman Workflow Aktif",
        successChartTitle: "Kadar Kejayaan Saluran Paip CI/CD (90 Hari)",
        successChartSubtitle: "Peratusan larian lulus berbanding ambang SLA 95%",
        deployChartTitle: "Kekerapan Deployment (Produksi vs Staging)",
        deployChartSubtitle: "Keluaran disahkan melalui ABDICity Integration Bot",
        mttrChartTitle: "Trend Mean Time to Recovery (MTTR)",
        mttrChartSubtitle: "Purata masa pemulihan insiden dalam minit (sasaran ≤ 30m)",
        optimizationsTitle: "Cadangan Pengoptimuman Aliran Kerja GitHub",
        optimizationsSubtitle: "Aktifkan automasi bot untuk memendekkan masa binaan dan MTTR.",
      },
    },
    security: {
      title: "Pusat Notifikasi Automatik & Pengesahan Biometrik",
      subtitle:
        "GitHubCity : Pantau amaran derma segera, kemas kini projek, resit e-mel automatik, dan urus kunci laluan biometrik.",
      notificationsTitle: "Suapan Notifikasi Push & E-Mel Masa Nyata",
      biometricVaultTitle: "Kunci Biometrik & Bilik Kebal E2EE",
      registerPasskey: "Daftar Kunci Biometrik Baharu",
      simulatePush: "Uji Notifikasi Push Segera",
      emailAutomationTitle: "Log Penghantaran E-Mel Automatik",
    },
  },
  ar: {
    brandTitle: "GitHubCity : Islamicity & ABDICity",
    nav: {
      overview: "التدقيق والتحليلات",
      "mustahik-ai": "تخطيط المستحقين بالذكاء الاصطناعي",
      campaigns: "التبرع والمحافظ الرقمية",
      "abdcity-bot": "بوت تكامل ABDICity",
      security: "الإشعارات والقياسات الحيوية",
    },
    breadcrumbs: {
      overview: "البنية التحتية / سجل التدقيق العام",
      "mustahik-ai": "التحليلات التنبؤية / خريطة المستحقين",
      campaigns: "جمع التبرعات / الحملات والمحافظ الرقمية",
      "abdcity-bot": "DevOps / ABDICity-Integration-Bot",
      security: "الحوكمة / مركز الإشعارات والأمان",
    },
    primaryDonateCta: "أدِّ الزكاة والوقف",
    themeLight: "الوضع النهاري",
    themeDark: "الوضع الليلي",
    languageLabel: "اللغة",
    overview: {
      heroTitle: "بنية تحتية ذكية ومفتوحة المصدر للزكاة والوقف قابلة للتدقيق الفوري عبر البلوكتشين",
      heroDesc:
        "GitHubCity : كل مساهمة في الزكاة والوقف الإنتاجي مشفرة بمعيار AES-256-GCM وموثقة في سجل بلوكتشين عام وتُدار آلياً بواسطة بوت تكامل ABDICity.",
      kpiTotalOnChain: "إجمالي الأموال الموثقة على السلسلة",
      kpiMustahikMapped: "أسر المستحقين المسجلة",
      kpiEfficiency: "نسبة التوزيع المباشر",
      kpiReposProtected: "مستودعات ABDICity المحمية",
      chartTitle: "تدفق التحصيل والتوزيع في الوقت الفعلي",
      chartSubtitle: "مقارنة التبرعات الموثقة مع التوزيع المباشر للمستحقين",
      allocationTitle: "الشفافية الفورية لتوزيع الأموال",
      testimonialsTitle: "شهادات المتبرعين والشركاء الموثقين",
      ledgerTitle: "سجل التدقيق العام على البلوكتشين",
      ledgerSubtitle: "افحص أي تجزئة معاملة وجذر ميركل ومغلف التشفير فوراً.",
      searchPlaceholder: "ابحث عن تجزئة المعاملة أو المتبرع أو الحملة...",
      inspectBlock: "فحص الإثبات",
    },
    mustahik: {
      title: "لوحة التحليلات التنبؤية للمستحقين بالذكاء الاصطناعي",
      subtitle:
        "GitHubCity : تخطيط مؤشرات الهشاشة الاقتصادية عبر Gemini AI لضمان وصول الزكاة والوقف لمستحقيها بدقة دون ازدواجية.",
      regionMatrixTitle: "مؤشر الهشاشة الإقليمي",
      aiEngineTitle: "محرك التنبؤ بالتوزيع Gemini AI",
      aiEngineSubtitle: "اختر المنطقة وأضف ملاحظات الميدان لإعداد خطة توزيع وفق المصارف الثمانية.",
      runPrediction: "تشغيل التحليل التنبؤي",
      runningPrediction: "جاري تحليل المؤشرات...",
      fieldNotesLabel: "ملاحظات المنسق الميداني",
      fieldNotesPlaceholder: "مثال: ارتفاع أسعار الغذاء الأساسي واحتياجات تمويل المشاريع الصغيرة...",
      applyAllocation: "اعتماد التخصيص في قائمة التوزيع",
    },
    campaigns: {
      title: "حملات الزكاة والوقف الإنتاجي العالمية",
      subtitle:
        "GitHubCity : تبرع بأمان عبر QRIS والمحافظ الرقمية المحلية والدولية، وشارك الحملات بنقرة واحدة مع إيصال بريد إلكتروني مشفر تلقائي.",
      donateNow: "تبرع مشفر",
      shareCampaign: "مشاركة",
      linkCopied: "تم نسخ رابط الحملة المشفر.",
      zakatCalcTitle: "حاسبة زكاة المال والدخل",
      zakatCalcSubtitle: "احسب مقدار الزكاة الواجبة بنسبة 2.5% مقارنة بنصاب الذهب الحالي.",
      monthlyIncomeLabel: "الدخل الشهري (IDR)",
      goldSavingsLabel: "المدخرات والأصول السائلة (IDR)",
      calculatedZakatLabel: "الزكاة المقدرة",
      donateCalculated: "ادفع هذه الزكاة الآن",
    },
    bot: {
      title: "بوت تكامل ABDICity — وحدة تحكم GitHub App",
      subtitle:
        "GitHubCity : أتمتة مزامنة المستودعات، التحقق من صيغة Commit والوثائق قبل الدمج، تنبيهات CI/CD الفورية، وتصنيف البلاغات تلقائياً.",
      viewGithubManifest: "عرض ملف GitHub App",
      tabRepos: "إدارة المستودعات",
      tabCicd: "إشعارات CI/CD",
      tabIssues: "تتبع المشكلات (فرز ذكي)",
      tabInsights: "Repository Insights",
      tabPerformance: "Performance Dashboard",
      runBotCheck: "فحص طلب الدمج",
      triggerWebhook: "اختبار Webhook",
      simulateAlert: "محاكاة تنبيه فشل البناء",
      submitIssueTitle: "إرسال بلاغ جديد للبوت",
      healthScoreTitle: "مؤشر صحة المستودعات (D3 الفوري)",
      healthScoreSubtitle: "المتوسط المرجح الفوري لحماية الفروع (45%) وصيغة Commit (30%) واكتمال الوثائق (25%).",
      fleetScoreLabel: "المتوسط المرجح للمستودعات",
      branchLabel: "حماية الفروع",
      commitLabel: "صيغة Commit",
      docsLabel: "اكتمال الوثائق",
      healthOptimal: "حوكمة مثالية",
      healthModerate: "يحتاج مراجعة",
      healthAtRisk: "مخاطر تكامل",
      insights: {
        title: "رؤى المستودعات — آخر 30 يوماً (D3)",
        subtitle: "تصور تفاعلي لتكرار Commit ونشاط المطورين واتجاهات حل المشكلات خلال 30 يوماً.",
        filterAllRepos: "جميع مستودعات ABDICity (5)",
        kpiCommits: "إجمالي Commits (30 يوماً)",
        kpiContributors: "المطورون النشطون",
        kpiResolutionRate: "معدل حل المشكلات",
        kpiMedianTime: "متوسط وقت الحل",
        commitChartTitle: "تكرار Commit والمتوسط المتحرك 7 أيام",
        commitChartSubtitle: "النشاط اليومي مقابل المتوسط المتحرك لـ 7 أيام",
        issueChartTitle: "اتجاه فتح وحل المشكلات",
        issueChartSubtitle: "مقارنة يومية بين البلاغات المفتوحة والمغلقة",
        devHeatmapTitle: "مصفوفة نشاط المطورين (30 يوماً)",
        devHeatmapSubtitle: "كثافة المساهمات والمراجعات اليومية لكل مطور",
        devTableTitle: "ملخص مساهمات فريق الهندسة",
      },
      performance: {
        title: "لوحة الأداء — مؤشرات CI/CD لمدة 90 يوماً (D3)",
        subtitle: "تحليل معدل نجاح خطوط CI/CD وتكرار النشر ومتوسط وقت الاسترداد (MTTR) خلال آخر 90 يوماً.",
        filterAllRepos: "جميع مستودعات ABDICity (5)",
        granularityDaily: "يومي (90 يوماً)",
        granularityWeekly: "أسبوعي (13 أسبوعاً)",
        kpiSuccessRate: "متوسط نجاح CI/CD",
        kpiDeployFreq: "تكرار النشر",
        kpiMttr: "متوسط وقت الاسترداد (MTTR)",
        kpiOptimization: "تحسينات سير العمل النشطة",
        successChartTitle: "معدل نجاح خطوط CI/CD (90 يوماً)",
        successChartSubtitle: "نسبة النجاح مقارنة بمعيار SLA البالغ 95%",
        deployChartTitle: "تكرار النشر (الإنتاج مقابل التجربة)",
        deployChartSubtitle: "الإصدارات المعتمدة عبر ABDICity Integration Bot",
        mttrChartTitle: "اتجاه متوسط وقت الاسترداد (MTTR)",
        mttrChartSubtitle: "متوسط زمن التعافي بالدقائق (الهدف ≤ 30 دقيقة)",
        optimizationsTitle: "توصيات تحسين سير عمل GitHub",
        optimizationsSubtitle: "فعّل أتمتة البوت لتسريع البناء وتقليص زمن الاسترداد.",
      },
    },
    security: {
      title: "مركز الإشعارات التلقائية والمصادقة البيومترية",
      subtitle:
        "GitHubCity : تابع تنبيهات التبرعات العاجلة وتحديثات المشاريع وسجل البريد التلقائي ومفاتيح المرور البيومترية.",
      notificationsTitle: "تغذية الإشعارات الفورية والبريد الإلكتروني",
      biometricVaultTitle: "مفاتيح المرور البيومترية وخزنة التشفير",
      registerPasskey: "تسجيل مفتاح بيومتري جديد",
      simulatePush: "اختبار إشعار فوري عاجل",
      emailAutomationTitle: "سجل الإرسال التلقائي للبريد الإلكتروني",
    },
  },
};
