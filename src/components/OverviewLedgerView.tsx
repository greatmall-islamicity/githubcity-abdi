import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Film,
  Lock,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CHART_SERIES_DATA,
  TESTIMONIALS,
  formatIdr,
} from "../data/platformData";
import { TranslationBundle } from "../i18n/translations";
import { BlockchainAuditTimeline } from "./BlockchainAuditTimeline";
import { BlockchainCalendarHeatmap } from "./BlockchainCalendarHeatmap";
import { GlobalImpactGeoMap } from "./GlobalImpactGeoMap";
import { GlobalImpactReelModal } from "./GlobalImpactReelModal";
import {
  BlockchainTransaction,
  Campaign,
  FundType,
  ManagedRepo,
  MustahikRegion,
} from "../types";

interface OverviewLedgerViewProps {
  t: TranslationBundle;
  transactions: BlockchainTransaction[];
  campaigns: Campaign[];
  regions: MustahikRegion[];
  repos: ManagedRepo[];
  onQuickDonate: (campaign?: Campaign) => void;
  onNavigateMustahik: () => void;
}

export function OverviewLedgerView({
  t,
  transactions,
  campaigns,
  regions,
  repos,
  onQuickDonate,
  onNavigateMustahik,
}: OverviewLedgerViewProps) {
  const [overviewTab, setOverviewTab] = useState<"summary" | "audit-log">("summary");
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D" | "1Y">("7D");
  const [searchQuery, setSearchQuery] = useState("");
  const [fundFilter, setFundFilter] = useState<"ALL" | FundType>("ALL");
  const [selectedTx, setSelectedTx] = useState<BlockchainTransaction | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showImpactReel, setShowImpactReel] = useState(false);

  const totalOnChainIdr = useMemo(() => {
    const campaignSum = campaigns.reduce((acc, c) => acc + c.raisedIdr, 0);
    return campaignSum;
  }, [campaigns]);

  const totalMustahik = useMemo(
    () => regions.reduce((acc, r) => acc + r.registeredHouseholds, 0),
    [regions]
  );

  const protectedReposCount = useMemo(
    () => repos.filter((r) => r.branchProtection).length,
    [repos]
  );

  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesFund = fundFilter === "ALL" || tx.fundType === fundFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesFund;
      return (
        matchesFund &&
        (tx.txHash.toLowerCase().includes(q) ||
          tx.donorDisplay.toLowerCase().includes(q) ||
          tx.campaignTitle.toLowerCase().includes(q) ||
          tx.walletProvider.toLowerCase().includes(q))
      );
    });
  }, [transactions, fundFilter, searchQuery]);

  const chartData = CHART_SERIES_DATA[timeframe];
  const maxChartVal = Math.max(...chartData.map((d) => d.inflowM), 1);

  return (
    <div className="space-y-10">
      {/* Executive Header & Primary Action */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Islamicity Open Infrastructure</span>
            <span aria-hidden="true">·</span>
            <span>Polygon / Base ZK-Audit</span>
            <span aria-hidden="true">·</span>
            <span>ABDICity CI/CD Governed</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight"
            style={{ textWrap: "balance" }}
          >
            {t.overview.heroTitle}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            {t.overview.heroDesc}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateMustahik}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            AI Mustahik Map
          </button>
          <button
            type="button"
            onClick={() => onQuickDonate(campaigns[0])}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.primaryDonateCta}
          </button>
        </div>
      </section>

      {/* Segmented Overview Tabs + Global Impact Reel Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setOverviewTab("summary")}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              overviewTab === "summary"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Ringkasan & Buku Besar
          </button>
          <button
            type="button"
            onClick={() => setOverviewTab("audit-log")}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              overviewTab === "audit-log"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Audit Log
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowImpactReel(true)}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Film className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Global Impact Reel (30H)</span>
        </button>
      </div>

      {overviewTab === "audit-log" ? (
        <BlockchainAuditTimeline
          transactions={transactions}
          onInspectTransaction={(tx) => setSelectedTx(tx)}
        />
      ) : (
        <>
      {/* 4-Column Flat KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-6 space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.overview.kpiTotalOnChain}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {formatIdr(totalOnChainIdr)}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            +18,4% bulan ini · 100% terenkripsi
          </p>
        </div>

        <div className="p-6 space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.overview.kpiMustahikMapped}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {totalMustahik.toLocaleString("id-ID")} KK
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            5 klaster wilayah · 8 Asnaf terindeks
          </p>
        </div>

        <div className="p-6 space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.overview.kpiEfficiency}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            96,0%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            87,5% bantuan langsung · 8,5% aset wakaf
          </p>
        </div>

        <div className="p-6 space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.overview.kpiReposProtected}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {protectedReposCount}/{repos.length} Repos
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            ABDICity Bot aktif · Audit PR otomatis
          </p>
        </div>
      </section>

      {/* Analytics Chart & Transparent Allocation Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 cols: Real-Time Fundraising & Disbursement Chart */}
        <div className="lg:col-span-8 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {t.overview.chartTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.overview.chartSubtitle} (Juta IDR)
              </p>
            </div>
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
              {(["7D", "30D", "90D", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    timeframe === tf
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Crisp SVG Bar Comparison Chart */}
          <div className="relative pt-4">
            <div className="flex items-end justify-between gap-3 h-56 border-b border-slate-200 dark:border-slate-800 pb-2">
              {chartData.map((point, idx) => {
                const inflowH = Math.max(12, Math.round((point.inflowM / maxChartVal) * 190));
                const disbursedH = Math.max(10, Math.round((point.disbursedM / maxChartVal) * 190));
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={point.label}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {isHovered && (
                      <div className="absolute -top-2 z-10 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-mono tabular-nums whitespace-nowrap shadow-sm">
                        Masuk: Rp {point.inflowM}jt · Salur: Rp {point.disbursedM}jt
                      </div>
                    )}
                    <div className="flex items-end justify-center gap-1.5 w-full">
                      <div
                        style={{ height: `${inflowH}px` }}
                        className="w-4 sm:w-6 rounded-t bg-emerald-600 dark:bg-emerald-500 transition-opacity group-hover:opacity-90"
                      />
                      <div
                        style={{ height: `${disbursedH}px` }}
                        className="w-4 sm:w-6 rounded-t bg-slate-300 dark:bg-slate-600 transition-opacity group-hover:opacity-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              {chartData.map((point) => (
                <div
                  key={point.label}
                  className="flex-1 text-center text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400"
                >
                  {point.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/70">
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500 inline-block" />
                Penghimpunan Terverifikasi
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" />
                Distribusi ke Mustahik
              </span>
            </div>
            <span className="font-mono tabular-nums">
              Smart Contract Split: 96% Program / 4% Node Ops
            </span>
          </div>
        </div>

        {/* Right 4 cols: Real-Time Transparent Allocation */}
        <div className="lg:col-span-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.overview.allocationTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Alokasi otomatis smart contract berdasarkan konsensus 8 Asnaf.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                label: "Bantuan Pangan, Medis & Pendidikan Mustahik",
                pct: 62.5,
                amount: "Rp 2,08 M",
                color: "bg-emerald-600 dark:bg-emerald-500",
              },
              {
                label: "Infrastruktur Wakaf Produktif (Air & Energi Surya)",
                pct: 25.0,
                amount: "Rp 831 Jt",
                color: "bg-teal-600 dark:bg-teal-500",
              },
              {
                label: "Modal Usaha Mikro & Pemberdayaan Fakir Miskin",
                pct: 8.5,
                amount: "Rp 283 Jt",
                color: "bg-amber-600 dark:bg-amber-500",
              },
              {
                label: "Operasional Node Audit & Keamanan Open-Source",
                pct: 4.0,
                amount: "Rp 133 Jt",
                color: "bg-slate-400 dark:bg-slate-600",
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {item.label}
                  </span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                    {item.pct.toFixed(1)}% · {item.amount}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Diaudit publik setiap blok
            </span>
            <span className="font-mono tabular-nums">Block #19842308</span>
          </div>
        </div>
      </section>

      {/* Historical Blockchain Transaction Intensity Calendar Heatmap */}
      <BlockchainCalendarHeatmap transactions={transactions} />

      {/* Global D3 Geospatial Distribution & Impact Map */}
      <GlobalImpactGeoMap
        regions={regions}
        campaigns={campaigns}
        transactions={transactions}
        onQuickDonate={onQuickDonate}
        onNavigateMustahik={onNavigateMustahik}
      />

      {/* Public Real-Time Blockchain Audit Ledger */}
      <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.overview.ledgerTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.overview.ledgerSubtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.overview.searchPlaceholder}
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
              {(["ALL", "Zakat Mal", "Wakaf Produktif", "Infaq & Emergency"] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFundFilter(type)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      fundFilter === type
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {type === "ALL" ? "Semua" : type}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/60">
                <th className="py-3 px-4">Tx Hash & Blok</th>
                <th className="py-3 px-4">Donatur & Dompet</th>
                <th className="py-3 px-4">Program & Jenis Dana</th>
                <th className="py-3 px-4 text-right">Nominal (IDR / USD)</th>
                <th className="py-3 px-4">Status & Enkripsi</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada transaksi yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      <div className="text-slate-900 dark:text-slate-100 font-medium">
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        #{tx.blockHeight} · {new Date(tx.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {tx.donorDisplay}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tx.walletProvider}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 dark:text-slate-100 font-medium max-w-xs truncate">
                        {tx.campaignTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tx.fundType}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">
                        {formatIdr(tx.amountIdr)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        ${tx.amountUsd.toFixed(2)} USD
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{tx.status}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {tx.encryptionCipher}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.overview.inspectBlock}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attributable Testimonials for Donor Transparency (Claim-to-Proof Adjacency) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.overview.testimonialsTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Setiap testimoni terhubung ke hash transaksi audit yang dapat diverifikasi publik.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item) => (
            <article
              key={item.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.beforeState}
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  “{item.outcome}”
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.role} · {item.organization}
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                  {item.verifiedTxHash}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
        </>
      )}

      {/* Block Proof Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Bukti Audit Kriptografi On-Chain
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {selectedTx.id} · Block #{selectedTx.blockHeight}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                aria-label="Tutup modal bukti audit"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono break-all">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Transaction Hash (SHA-256)</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedTx.txHash}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Merkle Proof Root</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{selectedTx.merkleRoot}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Encrypted Receipt Envelope</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedTx.encryptedEnvelopeId}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Donatur & Kanal</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTx.donorDisplay} · {selectedTx.walletProvider}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Nominal Terverifikasi</span>
                  <span className="font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {formatIdr(selectedTx.amountIdr)} (${selectedTx.amountUsd})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <Lock className="w-3.5 h-3.5" />
                Zero-Knowledge Verification Passed
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono">
                <FileCode2 className="w-3.5 h-3.5" />
                {selectedTx.encryptionCipher}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Animated Global Impact Reel Modal */}
      {showImpactReel && (
        <GlobalImpactReelModal
          campaigns={campaigns}
          regions={regions}
          transactions={transactions}
          onClose={() => setShowImpactReel(false)}
          onQuickDonate={onQuickDonate}
        />
      )}
    </div>
  );
}
