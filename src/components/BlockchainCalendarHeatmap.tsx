import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Calendar, Flame, Layers } from "lucide-react";
import { formatIdr } from "../data/platformData";
import { BlockchainTransaction, FundType } from "../types";

interface DailyBlockchainActivity {
  dateKey: string;
  date: Date;
  txCount: number;
  volumeIdr: number;
  verifiedBlocks: number;
  dominantFund: FundType;
  peakReason?: string;
}

interface BlockchainCalendarHeatmapProps {
  transactions: BlockchainTransaction[];
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildHistoricalCalendarData(
  daysCount: number,
  liveTransactions: BlockchainTransaction[],
  fundFilter: "ALL" | FundType
): DailyBlockchainActivity[] {
  const anchorEnd = new Date(2026, 10, 15); // Nov 15, 2026
  anchorEnd.setHours(0, 0, 0, 0);

  // Group live transactions by YYYY-MM-DD
  const liveByDay = new Map<
    string,
    { count: number; volumeIdr: number; dominant: FundType }
  >();
  for (const tx of liveTransactions) {
    if (fundFilter !== "ALL" && tx.fundType !== fundFilter) continue;
    const d = new Date(tx.timestamp);
    const key = toDateKey(d);
    const prev = liveByDay.get(key);
    if (prev) {
      liveByDay.set(key, {
        count: prev.count + 1,
        volumeIdr: prev.volumeIdr + tx.amountIdr,
        dominant: prev.dominant,
      });
    } else {
      liveByDay.set(key, {
        count: 1,
        volumeIdr: tx.amountIdr,
        dominant: tx.fundType,
      });
    }
  }

  const fundTypes: FundType[] = [
    "Zakat Mal",
    "Wakaf Produktif",
    "Infaq & Emergency",
    "Zakat Fitrah",
  ];

  const poolMultiplier =
    fundFilter === "ALL"
      ? 1
      : fundFilter === "Zakat Mal"
        ? 0.42
        : fundFilter === "Wakaf Produktif"
          ? 0.34
          : fundFilter === "Infaq & Emergency"
            ? 0.28
            : 0.16;

  const result: DailyBlockchainActivity[] = [];

  for (let offset = daysCount - 1; offset >= 0; offset--) {
    const d = new Date(anchorEnd);
    d.setDate(anchorEnd.getDate() - offset);
    const key = toDateKey(d);
    const dow = d.getDay(); // 0=Sun, 5=Fri
    const dom = d.getDate();
    const month = d.getMonth(); // 0..11

    // Deterministic pseudo-random seed per calendar date
    const seed =
      ((d.getFullYear() * 37 + (month + 1) * 97 + dom * 53) % 100) / 100;

    // Base daily tx volume + Islamic calendar & payroll cycle seasonality
    let baseTx = 14 + Math.round(seed * 22);
    let peakReason: string | undefined;

    // Friday (Jum'at) surge
    if (dow === 5) {
      baseTx += 26 + Math.round(seed * 14);
      peakReason = "Lonjakan Sedekah & Infak Jumat";
    }

    // End-of-month corporate Zakat Mal & payroll batch (25th-28th)
    if (dom >= 25 && dom <= 28) {
      baseTx += 30 + Math.round(seed * 18);
      peakReason = "Siklus Zakat Penghasilan & Payroll Korporat";
    }

    // Historical high-intensity peaks (e.g., Ramadhan/Eid Mar 2026, Qurbani May 2026, Emergency Relief Nov 2026)
    if (month === 2 && dom >= 15 && dom <= 22) {
      baseTx += 52;
      peakReason = "Puncak Penyaluran Zakat Fitrah & Ramadhan";
    } else if (month === 4 && dom >= 24 && dom <= 29) {
      baseTx += 44;
      peakReason = "Kampanye Wakaf Produktif & Qurbani";
    } else if (month === 10 && dom >= 6 && dom <= 14) {
      baseTx += 32;
      peakReason = "Gelombang Bantuan Koridor Logistik Darurat";
    }

    let txCount = Math.max(0, Math.round(baseTx * poolMultiplier));
    let avgTicketIdr = 2150000 + Math.round(seed * 1850000);
    if (dom >= 25 && dom <= 28) avgTicketIdr += 1600000;
    let volumeIdr = txCount * avgTicketIdr;

    let dominantFund: FundType =
      fundFilter !== "ALL"
        ? fundFilter
        : fundTypes[(dom + month) % fundTypes.length];

    // Overlay real live ledger transactions on their matching dates (e.g., 2026-11-15)
    const live = liveByDay.get(key);
    if (live) {
      txCount = Math.max(txCount, 0) + live.count;
      volumeIdr += live.volumeIdr;
      dominantFund = live.dominant;
      if (offset === 0) {
        peakReason = "Live Ledger Hari Ini (Real-Time)";
      }
    }

    result.push({
      dateKey: key,
      date: d,
      txCount,
      volumeIdr,
      verifiedBlocks: Math.max(1, Math.round(txCount * 0.65)),
      dominantFund,
      peakReason,
    });
  }

  return result;
}

export function BlockchainCalendarHeatmap({
  transactions,
}: BlockchainCalendarHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [rangeDays, setRangeDays] = useState<180 | 365>(180);
  const [metricMode, setMetricMode] = useState<"txCount" | "volumeIdr">(
    "txCount"
  );
  const [fundFilter, setFundFilter] = useState<"ALL" | FundType>("ALL");
  const [selectedDay, setSelectedDay] =
    useState<DailyBlockchainActivity | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DailyBlockchainActivity | null>(
    null
  );

  const daysData = useMemo(
    () => buildHistoricalCalendarData(rangeDays, transactions, fundFilter),
    [rangeDays, transactions, fundFilter]
  );

  const stats = useMemo(() => {
    if (daysData.length === 0) {
      return {
        totalTx: 0,
        totalVolumeIdr: 0,
        avgDailyTx: 0,
        peakDay: null as DailyBlockchainActivity | null,
      };
    }
    let totalTx = 0;
    let totalVolumeIdr = 0;
    let peakDay = daysData[0];

    for (const day of daysData) {
      totalTx += day.txCount;
      totalVolumeIdr += day.volumeIdr;
      const currentMetric =
        metricMode === "txCount" ? day.txCount : day.volumeIdr;
      const peakMetric =
        metricMode === "txCount" ? peakDay.txCount : peakDay.volumeIdr;
      if (currentMetric > peakMetric) {
        peakDay = day;
      }
    }

    return {
      totalTx,
      totalVolumeIdr,
      avgDailyTx: Math.round((totalTx / daysData.length) * 10) / 10,
      peakDay,
    };
  }, [daysData, metricMode]);

  const activeInspectDay = hoveredDay ?? selectedDay ?? stats.peakDay;

  // D3 Calendar Heatmap Rendering
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || daysData.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const firstDate = daysData[0].date;
    const lastDate = daysData[daysData.length - 1].date;
    const startSunday = d3.timeSunday.floor(firstDate);
    const totalWeeks = d3.timeSunday.count(startSunday, lastDate) + 1;

    const cellSize = rangeDays === 365 ? 14 : 22;
    const cellGap = rangeDays === 365 ? 3 : 4;
    const step = cellSize + cellGap;

    const margin = { top: 26, right: 16, bottom: 10, left: 38 };
    const innerW = totalWeeks * step;
    const innerH = 7 * step;
    const width = margin.left + innerW + margin.right;
    const height = margin.top + innerH + margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Day-of-week labels on left axis (Mon, Wed, Fri)
    const dayLabels: { dow: number; label: string }[] = [
      { dow: 1, label: "Sen" },
      { dow: 3, label: "Rab" },
      { dow: 5, label: "Jum" },
    ];
    g.selectAll(".dow-label")
      .data(dayLabels)
      .enter()
      .append("text")
      .attr("x", -8)
      .attr("y", (d) => d.dow * step + cellSize * 0.72)
      .attr("text-anchor", "end")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
      )
      .text((d) => d.label);

    // Month labels on top axis
    const monthStarts = d3.timeMonths(
      d3.timeMonth.ceil(firstDate),
      d3.timeDay.offset(lastDate, 1)
    );
    const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short" });

    g.selectAll(".month-label")
      .data(monthStarts)
      .enter()
      .append("text")
      .attr("x", (d) => d3.timeSunday.count(startSunday, d) * step)
      .attr("y", -9)
      .attr(
        "class",
        "fill-slate-600 dark:fill-slate-300 font-mono text-[10.5px] font-medium"
      )
      .text((d) => monthFmt.format(d));

    // Quantile / Threshold intensity scale
    const values = daysData.map((d) =>
      metricMode === "txCount" ? d.txCount : d.volumeIdr
    );
    const maxVal = Math.max(1, d3.max(values) ?? 1);
    const thresholds = [
      maxVal * 0.18,
      maxVal * 0.38,
      maxVal * 0.62,
      maxVal * 0.82,
    ];
    const colorScale = d3
      .scaleThreshold<number, string>()
      .domain(thresholds)
      .range(["LOW", "#A7F3D0", "#34D399", "#059669", "#065F46"]);

    // Cells
    g.selectAll(".cal-cell")
      .data(daysData)
      .enter()
      .append("rect")
      .attr("x", (d) => d3.timeSunday.count(startSunday, d.date) * step)
      .attr("y", (d) => d.date.getDay() * step)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 3)
      .attr("fill", (d) => {
        const val = metricMode === "txCount" ? d.txCount : d.volumeIdr;
        const mapped = colorScale(val);
        return val === 0 || mapped === "LOW" ? "currentColor" : mapped;
      })
      .attr("class", (d) => {
        const val = metricMode === "txCount" ? d.txCount : d.volumeIdr;
        const mapped = colorScale(val);
        const isLow = val === 0 || mapped === "LOW";
        const isSelected = activeInspectDay?.dateKey === d.dateKey;
        const base = isLow
          ? "text-slate-200 dark:text-slate-800 transition-opacity hover:opacity-80"
          : "transition-opacity hover:opacity-80";
        return isSelected
          ? `${base} stroke-slate-900 dark:stroke-white`
          : base;
      })
      .attr("stroke-width", (d) =>
        activeInspectDay?.dateKey === d.dateKey ? 1.8 : 0
      )
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredDay(d))
      .on("mouseleave", () => setHoveredDay(null))
      .on("click", (_e, d) => setSelectedDay(d));
  }, [daysData, rangeDays, metricMode, activeInspectDay?.dateKey]);

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Peta Panas Kalender Aktivitas Blockchain (D3 Audit Heatmap)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visualisasi intensitas transaksi harian on-chain untuk mengidentifikasi lonjakan historis, siklus zakat bulanan, dan periode puncak penyaluran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Toggle */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMetricMode("txCount")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === "txCount"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Jumlah Tx
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("volumeIdr")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === "volumeIdr"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Volume IDR
            </button>
          </div>

          {/* Range Toggle */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setRangeDays(180)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rangeDays === 180
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              6 Bulan
            </button>
            <button
              type="button"
              onClick={() => setRangeDays(365)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rangeDays === 365
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              12 Bulan
            </button>
          </div>

          {/* Fund Pool Select */}
          <select
            aria-label="Filter jenis dana heatmap"
            value={fundFilter}
            onChange={(e) => setFundFilter(e.target.value as "ALL" | FundType)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">Semua Pool Dana</option>
            <option value="Zakat Mal">Zakat Mal</option>
            <option value="Wakaf Produktif">Wakaf Produktif</option>
            <option value="Infaq & Emergency">Infaq & Emergency</option>
            <option value="Zakat Fitrah">Zakat Fitrah</option>
          </select>
        </div>
      </div>

      {/* Inline Audit Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="space-y-0.5">
          <span className="text-slate-500 dark:text-slate-400">
            Total Transaksi Periode ({rangeDays} Hari)
          </span>
          <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-50">
            {stats.totalTx.toLocaleString("id-ID")} tx ·{" "}
            <span className="text-emerald-700 dark:text-emerald-400">
              Rp {(stats.totalVolumeIdr / 1_000_000_000).toFixed(2)} M
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-500 dark:text-slate-400">
            Rata-Rata Aktivitas Harian
          </span>
          <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-50">
            {stats.avgDailyTx} tx / hari
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Puncak Aktivitas Terdeteksi
          </span>
          <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-50">
            {stats.peakDay
              ? `${stats.peakDay.date.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })} (${stats.peakDay.txCount} tx)`
              : "-"}
          </div>
        </div>
      </div>

      {/* D3 Calendar Grid Canvas */}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 p-4">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Blockchain Historical Transaction Intensity Calendar Heatmap"
          className={`w-full h-auto ${
            rangeDays === 365 ? "min-w-[820px]" : "min-w-[640px]"
          }`}
        />
      </div>

      {/* Inspection Bar & Intensity Scale Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs pt-1">
        {activeInspectDay ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-50">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {activeInspectDay.date.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
              {activeInspectDay.txCount} transaksi
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatIdr(activeInspectDay.volumeIdr)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {activeInspectDay.verifiedBlocks} blok terkonfirmasi
            </span>
            {activeInspectDay.peakReason && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {activeInspectDay.peakReason}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            Sorot atau klik sel tanggal untuk menginspeksi intensitas transaksi harian.
          </span>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <span>Rendah</span>
          <span className="w-3 h-3 rounded-xs bg-[#E2E8F0] dark:bg-slate-800 inline-block" />
          <span className="w-3 h-3 rounded-xs bg-[#A7F3D0] inline-block" />
          <span className="w-3 h-3 rounded-xs bg-[#34D399] inline-block" />
          <span className="w-3 h-3 rounded-xs bg-[#059669] inline-block" />
          <span className="w-3 h-3 rounded-xs bg-[#065F46] inline-block" />
          <span>Puncak</span>
        </div>
      </div>
    </section>
  );
}
