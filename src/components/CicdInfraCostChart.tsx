import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Cloud, Cpu, DollarSign } from "lucide-react";
import { ManagedRepo } from "../types";

interface MonthlyInfraPoint {
  monthKey: string;
  monthLabel: string;
  runnerSpendUsd: number;
  sandboxStorageUsd: number;
  totalSpendUsd: number;
  utilizationPct: number;
  idleWasteUsd: number;
  pipelineRuns: number;
  costPerRunUsd: number;
  footprintStatus: "Optimal" | "Over-Provisioned" | "High Load";
}

interface CicdInfraCostChartProps {
  repos: ManagedRepo[];
  selectedRepo: string;
  appliedOptimizations: Record<string, boolean>;
}

const MONTH_NAMES_ID = [
  "Des",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
];

function buildMonthlyInfraData(
  repos: ManagedRepo[],
  selectedRepo: string,
  monthsCount: 6 | 12,
  appliedOptimizations: Record<string, boolean>
): MonthlyInfraPoint[] {
  const repoIdx =
    selectedRepo === "ALL"
      ? 0
      : Math.max(1, repos.findIndex((r) => r.fullName === selectedRepo) + 1);

  const scaleFactor =
    selectedRepo === "ALL"
      ? 1
      : selectedRepo.includes("smart-contracts")
        ? 0.31
        : selectedRepo.includes("mustahik-ai")
          ? 0.27
          : 0.19;

  const cacheSavingsFactor = appliedOptimizations["opt-cache"] ? 0.78 : 1;
  const parallelUtilBoost = appliedOptimizations["opt-parallel"] ? 9 : 0;
  const canarySafetySavings = appliedOptimizations["opt-canary"] ? 0.94 : 1;

  // 12 months ending Nov 2026
  const full12: MonthlyInfraPoint[] = MONTH_NAMES_ID.map((mName, idx) => {
    const year = idx === 0 ? 2025 : 2026;
    const label = `${mName} '${String(year).slice(2)}`;

    // Early months had over-provisioned runners (higher spend, lower utilization); recent months improve
    const wave = Math.sin((idx + repoIdx) * 0.7) * 140;
    const rawRunner = Math.max(
      420,
      (1380 - idx * 36 + wave) * scaleFactor * cacheSavingsFactor * canarySafetySavings
    );
    const rawSandbox = Math.max(
      140,
      (460 - idx * 8 + ((idx + repoIdx) % 3) * 45) * scaleFactor
    );

    const runnerSpendUsd = Math.round(rawRunner);
    const sandboxStorageUsd = Math.round(rawSandbox);
    const totalSpendUsd = runnerSpendUsd + sandboxStorageUsd;

    // Utilization trends upward from ~48% to ~79% as runners are right-sized
    const baseUtil = 48 + idx * 2.5 + ((idx * 3 + repoIdx) % 7) - 3;
    const utilizationPct = Math.min(
      94,
      Math.max(36, Math.round(baseUtil + parallelUtilBoost))
    );

    const idleFraction = Math.max(0.06, (85 - utilizationPct) / 100);
    const idleWasteUsd = Math.round(totalSpendUsd * idleFraction * 0.65);

    const pipelineRuns = Math.max(
      60,
      Math.round((480 + idx * 28 + ((idx + repoIdx) % 4) * 35) * scaleFactor)
    );
    const costPerRunUsd = Math.round((totalSpendUsd / pipelineRuns) * 100) / 100;

    const footprintStatus: MonthlyInfraPoint["footprintStatus"] =
      utilizationPct < 58
        ? "Over-Provisioned"
        : utilizationPct > 86
          ? "High Load"
          : "Optimal";

    return {
      monthKey: `${year}-${idx}`,
      monthLabel: label,
      runnerSpendUsd,
      sandboxStorageUsd,
      totalSpendUsd,
      utilizationPct,
      idleWasteUsd,
      pipelineRuns,
      costPerRunUsd,
      footprintStatus,
    };
  });

  return monthsCount === 6 ? full12.slice(6) : full12;
}

export function CicdInfraCostChart({
  repos,
  selectedRepo,
  appliedOptimizations,
}: CicdInfraCostChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [monthsCount, setMonthsCount] = useState<6 | 12>(12);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyInfraPoint | null>(
    null
  );

  const data = useMemo(
    () =>
      buildMonthlyInfraData(
        repos,
        selectedRepo,
        monthsCount,
        appliedOptimizations
      ),
    [repos, selectedRepo, monthsCount, appliedOptimizations]
  );

  const summary = useMemo(() => {
    const totalSpend = data.reduce((s, d) => s + d.totalSpendUsd, 0);
    const totalWaste = data.reduce((s, d) => s + d.idleWasteUsd, 0);
    const avgUtil = Math.round(
      data.reduce((s, d) => s + d.utilizationPct, 0) / Math.max(1, data.length)
    );
    const latest = data[data.length - 1];
    return { totalSpend, totalWaste, avgUtil, latest };
  }, [data]);

  const budgetCapUsd = selectedRepo === "ALL" ? 1650 : 520;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || data.length === 0) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 1140;
    const height = 280;
    const margin = { top: 24, right: 52, bottom: 32, left: 58 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.monthLabel))
      .range([0, innerW])
      .padding(0.32);

    const maxSpend = Math.max(
      budgetCapUsd * 1.15,
      (d3.max(data, (d) => d.totalSpendUsd) ?? 2000) * 1.15
    );
    const ySpend = d3
      .scaleLinear()
      .domain([0, maxSpend])
      .nice()
      .range([innerH, 0]);

    const yUtil = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    // Optimal Resource Utilization Band (70% - 85%)
    g.append("rect")
      .attr("x", 0)
      .attr("y", yUtil(85))
      .attr("width", innerW)
      .attr("height", yUtil(70) - yUtil(85))
      .attr("fill", "#059669")
      .attr("fill-opacity", 0.08);

    g.append("text")
      .attr("x", 6)
      .attr("y", yUtil(85) + 12)
      .attr(
        "class",
        "fill-emerald-700 dark:fill-emerald-400 font-mono text-[9.5px]"
      )
      .text("Zona Utilisasi Optimal (70–85%)");

    // Horizontal Gridlines aligned to Spend axis
    g.selectAll(".grid-y")
      .data(ySpend.ticks(4))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => ySpend(d))
      .attr("y2", (d) => ySpend(d))
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    // Monthly Budget Threshold Line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", ySpend(budgetCapUsd))
      .attr("y2", ySpend(budgetCapUsd))
      .attr("stroke", "#DC2626")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "5,4");

    g.append("text")
      .attr("x", innerW - 6)
      .attr("y", ySpend(budgetCapUsd) - 5)
      .attr("text-anchor", "end")
      .attr(
        "class",
        "fill-rose-600 dark:fill-rose-400 font-mono text-[10px]"
      )
      .text(`Budget Cap $${budgetCapUsd}`);

    // Left Y Axis: Spend ($)
    const yLeftG = g.append("g").call(
      d3
        .axisLeft(ySpend)
        .ticks(4)
        .tickSize(0)
        .tickFormat((d) => `$${d}`)
    );
    yLeftG.select(".domain").remove();
    yLeftG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      )
      .attr("dx", "-5");

    // Right Y Axis: Resource Utilization (%)
    const yRightG = g
      .append("g")
      .attr("transform", `translate(${innerW}, 0)`)
      .call(
        d3
          .axisRight(yUtil)
          .tickValues([0, 25, 50, 75, 100])
          .tickSize(0)
          .tickFormat((d) => `${d}%`)
      );
    yRightG.select(".domain").remove();
    yRightG
      .selectAll("text")
      .attr(
        "class",
        "fill-amber-700 dark:fill-amber-400 font-mono text-[10px] tabular-nums"
      )
      .attr("dx", "5");

    // X Axis: Months
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(d3.axisBottom(x).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      );

    // Stacked Spend Bars (Runner Compute + Audit Sandbox/Storage)
    const stacked = d3
      .stack<MonthlyInfraPoint>()
      .keys(["runnerSpendUsd", "sandboxStorageUsd"])(data);

    const barColors: Record<string, string> = {
      runnerSpendUsd: "#059669",
      sandboxStorageUsd: "#94A3B8",
    };

    const layer = g
      .selectAll(".spend-layer")
      .data(stacked)
      .enter()
      .append("g")
      .attr("fill", (d) => barColors[d.key])
      .attr("fill-opacity", 0.85);

    const rects = layer
      .selectAll("rect")
      .data((d) => d)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.data.monthLabel) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredMonth(d.data))
      .on("mouseleave", () => setHoveredMonth(null));

    if (reducedMotion) {
      rects
        .attr("y", (d) => ySpend(d[1]))
        .attr("height", (d) => Math.max(0, ySpend(d[0]) - ySpend(d[1])));
    } else {
      rects
        .attr("y", innerH)
        .attr("height", 0)
        .transition()
        .duration(320)
        .ease(d3.easeCubicOut)
        .attr("y", (d) => ySpend(d[1]))
        .attr("height", (d) => Math.max(0, ySpend(d[0]) - ySpend(d[1])));
    }

    // Utilization Overlay Line
    const utilLine = d3
      .line<MonthlyInfraPoint>()
      .x((d) => (x(d.monthLabel) ?? 0) + x.bandwidth() / 2)
      .y((d) => yUtil(d.utilizationPct))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#D97706")
      .attr("stroke-width", 2.5)
      .attr("d", utilLine);

    // Utilization Nodes
    g.selectAll(".util-dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => (x(d.monthLabel) ?? 0) + x.bandwidth() / 2)
      .attr("cy", (d) => yUtil(d.utilizationPct))
      .attr("r", 4.5)
      .attr("fill", (d) =>
        d.footprintStatus === "Over-Provisioned" ? "#DC2626" : "#D97706"
      )
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredMonth(d))
      .on("mouseleave", () => setHoveredMonth(null));
  }, [data, budgetCapUsd]);

  const activePoint = hoveredMonth ?? summary.latest ?? null;

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5">
      {/* Header & Range Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Biaya Infrastruktur CI/CD Bulanan vs. Utilisasi Sumber Daya (D3 FinOps)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lacak pengeluaran compute runner & sandbox audit dibandingkan efisiensi utilisasi CPU/RAM bulanan untuk mengoptimalkan jejak cloud.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
          <button
            type="button"
            onClick={() => setMonthsCount(6)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              monthsCount === 6
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            6 Bulan
          </button>
          <button
            type="button"
            onClick={() => setMonthsCount(12)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              monthsCount === 12
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            12 Bulan
          </button>
        </div>
      </div>

      {/* Inline FinOps Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="space-y-0.5">
          <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Total Pengeluaran ({monthsCount} Bulan)
          </span>
          <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-50">
            ${summary.totalSpend.toLocaleString("en-US")} USD
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Rata-Rata Utilisasi Runner
          </span>
          <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-50">
            {summary.avgUtil}%{" "}
            <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">
              (Target 70–85%)
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-500 dark:text-slate-400">
            Estimasi Kapasitas Idle / Pemborosan
          </span>
          <div className="font-mono tabular-nums text-base font-bold text-amber-700 dark:text-amber-400">
            ${summary.totalWaste.toLocaleString("en-US")} USD
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            GitHub Runners Compute ($)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-xs bg-slate-400 inline-block" />
            Audit Sandbox & Cache Storage ($)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-600 inline-block" />
            Utilisasi Sumber Daya (%)
          </span>
        </div>
        <span className="font-mono text-[11px]">
          {selectedRepo === "ALL" ? "Armada Penuh (5 Repo)" : selectedRepo}
        </span>
      </div>

      {/* D3 Dual-Axis Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Monthly CI/CD Infrastructure Spending vs Resource Utilization D3 Chart"
          className="w-full min-w-[680px] h-auto"
        />
      </div>

      {/* Monthly FinOps Inspection Footer */}
      {activePoint && (
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {activePoint.monthLabel}
            </span>
            <span
              className={`font-semibold ${
                activePoint.footprintStatus === "Optimal"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : activePoint.footprintStatus === "Over-Provisioned"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
              }`}
            >
              [{activePoint.footprintStatus}]
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Total: ${activePoint.totalSpendUsd} (Runners ${activePoint.runnerSpendUsd} + Storage ${activePoint.sandboxStorageUsd})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
            <span>Utilisasi: {activePoint.utilizationPct}%</span>
            <span>${activePoint.costPerRunUsd.toFixed(2)}/run</span>
            <span className="text-amber-700 dark:text-amber-400">
              Idle: ${activePoint.idleWasteUsd}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
