import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { CheckCircle2, SlidersHorizontal } from "lucide-react";
import { CICDRun, ManagedRepo } from "../types";
import { CicdInfraCostChart } from "./CicdInfraCostChart";

interface DailyDoraPoint {
  date: Date;
  dateLabel: string;
  successRate: number;
  totalRuns: number;
  failedRuns: number;
  prodDeploys: number;
  stagingDeploys: number;
  mttrMinutes: number;
  incidentStage?: string;
}

interface BotPerformanceDashboardProps {
  repos: ManagedRepo[];
  cicdRuns: CICDRun[];
  labels: {
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
}

function build90DayDoraSeries(
  repos: ManagedRepo[],
  selectedRepo: string,
  liveRuns: CICDRun[],
  appliedOptimizations: Record<string, boolean>
): DailyDoraPoint[] {
  const anchorEnd = new Date(2026, 10, 15); // Nov 15, 2026
  const repoIdx =
    selectedRepo === "ALL"
      ? 0
      : Math.max(1, repos.findIndex((r) => r.fullName === selectedRepo) + 1);
  const scaleFactor = selectedRepo === "ALL" ? 1 : 0.25 + (repoIdx % 3) * 0.08;

  const cacheBoost = appliedOptimizations["opt-cache"] ? 0.85 : 1.15;
  const parallelBoost = appliedOptimizations["opt-parallel"] ? 1.22 : 1;
  const canaryMttrFactor = appliedOptimizations["opt-canary"] ? 0.68 : 1;

  const liveFilteredRuns = liveRuns.filter((r) =>
    selectedRepo === "ALL" ? true : r.repo === selectedRepo
  );
  const liveFailedCount = liveFilteredRuns.filter((r) => r.status === "Failed").length;
  const liveSuccessCount = liveFilteredRuns.filter((r) => r.status === "Success").length;

  const stages = [
    "Foundry Audit",
    "Integration Test",
    "Docker Registry Sync",
    "Webhook Timeout",
  ];

  const points: DailyDoraPoint[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(anchorEnd);
    d.setDate(anchorEnd.getDate() - i);
    const dayIdx = 89 - i;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    const baseRuns = isWeekend ? 8 : 22 + ((dayIdx + repoIdx * 3) % 7);
    const totalRuns =
      Math.max(3, Math.round(baseRuns * scaleFactor * parallelBoost)) +
      (i === 0 ? liveFilteredRuns.length : 0);

    // Deterministic occasional failure dips to demonstrate realistic CI/CD behavior
    const hasDip = (dayIdx + repoIdx * 5) % 19 === 0 || (dayIdx + repoIdx * 2) % 31 === 0;
    const baseFailures = hasDip ? 2 + ((dayIdx + repoIdx) % 2) : dayIdx % 7 === 0 ? 1 : 0;
    const failedRuns =
      Math.min(
        totalRuns,
        Math.round(baseFailures * (selectedRepo === "ALL" ? 1 : 0.6) * cacheBoost)
      ) + (i === 0 ? liveFailedCount : 0);

    const successRate =
      totalRuns > 0
        ? Math.round(((totalRuns - failedRuns) / totalRuns) * 1000) / 10
        : 100;

    const prodDeploys =
      Math.max(
        1,
        Math.round(
          ((isWeekend ? 2 : 6) + Math.sin(dayIdx * 0.35 + repoIdx) * 2) *
            scaleFactor *
            parallelBoost
        )
      ) + (i === 0 ? Math.min(3, liveSuccessCount) : 0);

    const stagingDeploys = Math.max(
      1,
      Math.round(
        ((isWeekend ? 3 : 9) + Math.cos(dayIdx * 0.25) * 2) *
          scaleFactor *
          parallelBoost
      )
    );

    // MTTR improves gradually over the 90-day window (from ~28m down to ~14m) except on incident spikes
    const improvementTrend = Math.max(11, 28 - dayIdx * 0.16);
    const rawMttr =
      failedRuns > 0
        ? improvementTrend + (hasDip ? 16 : 5) + ((dayIdx + repoIdx) % 6)
        : improvementTrend * 0.72 + (dayIdx % 4);
    const mttrMinutes = Math.round(rawMttr * canaryMttrFactor * 10) / 10;

    points.push({
      date: d,
      dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      successRate,
      totalRuns,
      failedRuns,
      prodDeploys,
      stagingDeploys,
      mttrMinutes,
      incidentStage: failedRuns > 0 ? stages[(dayIdx + repoIdx) % stages.length] : undefined,
    });
  }

  return points;
}

function aggregateWeekly(daily: DailyDoraPoint[]): DailyDoraPoint[] {
  const weeks: DailyDoraPoint[] = [];
  for (let idx = 0; idx < daily.length; idx += 7) {
    const chunk = daily.slice(idx, idx + 7);
    if (chunk.length === 0) continue;
    const totalRuns = chunk.reduce((s, p) => s + p.totalRuns, 0);
    const failedRuns = chunk.reduce((s, p) => s + p.failedRuns, 0);
    const prodDeploys = chunk.reduce((s, p) => s + p.prodDeploys, 0);
    const stagingDeploys = chunk.reduce((s, p) => s + p.stagingDeploys, 0);
    const avgMttr =
      chunk.reduce((s, p) => s + p.mttrMinutes, 0) / chunk.length;
    const incident = chunk.find((c) => c.incidentStage)?.incidentStage;

    weeks.push({
      date: chunk[0].date,
      dateLabel: `${chunk[0].dateLabel}`,
      successRate:
        totalRuns > 0
          ? Math.round(((totalRuns - failedRuns) / totalRuns) * 1000) / 10
          : 100,
      totalRuns,
      failedRuns,
      prodDeploys,
      stagingDeploys,
      mttrMinutes: Math.round(avgMttr * 10) / 10,
      incidentStage: incident,
    });
  }
  return weeks;
}

export function BotPerformanceDashboard({
  repos,
  cicdRuns,
  labels,
}: BotPerformanceDashboardProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>("ALL");
  const [granularity, setGranularity] = useState<"weekly" | "daily">("weekly");
  const [appliedOptimizations, setAppliedOptimizations] = useState<Record<string, boolean>>({
    "opt-cache": true,
    "opt-parallel": false,
    "opt-canary": false,
  });

  const [hoveredSuccessPt, setHoveredSuccessPt] = useState<DailyDoraPoint | null>(null);
  const [hoveredDeployPt, setHoveredDeployPt] = useState<DailyDoraPoint | null>(null);
  const [hoveredMttrPt, setHoveredMttrPt] = useState<DailyDoraPoint | null>(null);

  const successSvgRef = useRef<SVGSVGElement | null>(null);
  const deploySvgRef = useRef<SVGSVGElement | null>(null);
  const mttrSvgRef = useRef<SVGSVGElement | null>(null);

  const dailySeries = useMemo(
    () => build90DayDoraSeries(repos, selectedRepo, cicdRuns, appliedOptimizations),
    [repos, selectedRepo, cicdRuns, appliedOptimizations]
  );

  const activeSeries = useMemo(
    () => (granularity === "weekly" ? aggregateWeekly(dailySeries) : dailySeries),
    [dailySeries, granularity]
  );

  const kpis = useMemo(() => {
    const totalRuns = dailySeries.reduce((s, p) => s + p.totalRuns, 0);
    const totalFailed = dailySeries.reduce((s, p) => s + p.failedRuns, 0);
    const avgSuccessRate =
      totalRuns > 0
        ? Math.round(((totalRuns - totalFailed) / totalRuns) * 1000) / 10
        : 100;
    const totalProdDeploys = dailySeries.reduce((s, p) => s + p.prodDeploys, 0);
    const deploysPerWeek = Math.round((totalProdDeploys / 90) * 7 * 10) / 10;
    const avgMttr =
      Math.round(
        (dailySeries.reduce((s, p) => s + p.mttrMinutes, 0) / Math.max(1, dailySeries.length)) *
          10
      ) / 10;

    return {
      avgSuccessRate,
      totalRuns,
      totalFailed,
      totalProdDeploys,
      deploysPerWeek,
      avgMttr,
    };
  }, [dailySeries]);

  // D3 Chart 1: Average CI/CD Pipeline Success Rate (90D)
  useEffect(() => {
    const svgEl = successSvgRef.current;
    if (!svgEl) return;

    const margin = { top: 16, right: 18, bottom: 28, left: 40 };
    const width = 580;
    const height = 225;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(activeSeries.map((d) => d.dateLabel))
      .range([0, innerW]);

    const minVal = Math.max(70, Math.floor((d3.min(activeSeries, (d) => d.successRate) ?? 85) - 3));
    const y = d3.scaleLinear().domain([minVal, 100]).range([innerH, 0]);

    // Gridlines
    g.selectAll(".grid-y")
      .data(y.ticks(4))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    // 95% SLA Target Line
    if (95 >= minVal) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(95))
        .attr("y2", y(95))
        .attr("stroke", "#D97706")
        .attr("stroke-width", 1.25)
        .attr("stroke-dasharray", "4,4");

      g.append("text")
        .attr("x", innerW - 4)
        .attr("y", y(95) - 5)
        .attr("text-anchor", "end")
        .attr("class", "fill-amber-600 dark:fill-amber-400 font-mono text-[10px]")
        .text("95% SLA");
    }

    const yAxisG = g.append("g").call(
      d3
        .axisLeft(y)
        .ticks(4)
        .tickSize(0)
        .tickFormat((d) => `${d}%`)
    );
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums")
      .attr("dx", "-4");

    const step = Math.max(1, Math.floor(activeSeries.length / 5));
    const tickLabels = activeSeries
      .filter((_, idx) => idx % step === 0 || idx === activeSeries.length - 1)
      .map((d) => d.dateLabel);

    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(d3.axisBottom(x).tickValues(tickLabels).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums");

    const areaGen = d3
      .area<DailyDoraPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.successRate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(activeSeries)
      .attr("fill", "#059669")
      .attr("fill-opacity", 0.14)
      .attr("d", areaGen);

    const lineGen = d3
      .line<DailyDoraPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y((d) => y(d.successRate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(activeSeries)
      .attr("fill", "none")
      .attr("stroke", "#059669")
      .attr("stroke-width", 2.2)
      .attr("d", lineGen);

    // Points & interactive hover targets
    g.selectAll(".success-dot")
      .data(activeSeries)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.dateLabel) ?? 0)
      .attr("cy", (d) => y(d.successRate))
      .attr("r", (d) => (d.successRate < 95 ? 3.5 : granularity === "weekly" ? 3 : 1.8))
      .attr("fill", (d) => (d.successRate < 95 ? "#DC2626" : "#059669"));

    const colW = innerW / Math.max(1, activeSeries.length);
    g.selectAll(".hover-band")
      .data(activeSeries)
      .enter()
      .append("rect")
      .attr("x", (d) => (x(d.dateLabel) ?? 0) - colW / 2)
      .attr("y", 0)
      .attr("width", colW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredSuccessPt(d))
      .on("mouseleave", () => setHoveredSuccessPt(null));
  }, [activeSeries, granularity]);

  // D3 Chart 2: Deployment Frequency (Stacked Prod + Staging Bars)
  useEffect(() => {
    const svgEl = deploySvgRef.current;
    if (!svgEl) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const margin = { top: 16, right: 16, bottom: 28, left: 36 };
    const width = 580;
    const height = 225;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(activeSeries.map((d) => d.dateLabel))
      .range([0, innerW])
      .padding(granularity === "weekly" ? 0.34 : 0.22);

    const maxDeploy = Math.max(
      6,
      d3.max(activeSeries, (d) => d.prodDeploys + d.stagingDeploys) ?? 20
    );
    const y = d3.scaleLinear().domain([0, maxDeploy * 1.15]).nice().range([innerH, 0]);

    g.selectAll(".grid-y")
      .data(y.ticks(4))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    const yAxisG = g.append("g").call(d3.axisLeft(y).ticks(4).tickSize(0));
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums")
      .attr("dx", "-4");

    const step = Math.max(1, Math.floor(activeSeries.length / 5));
    const tickLabels = activeSeries
      .filter((_, idx) => idx % step === 0 || idx === activeSeries.length - 1)
      .map((d) => d.dateLabel);

    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(d3.axisBottom(x).tickValues(tickLabels).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums");

    const stacked = d3
      .stack<DailyDoraPoint>()
      .keys(["prodDeploys", "stagingDeploys"])(activeSeries);

    const colors: Record<string, string> = {
      prodDeploys: "#059669",
      stagingDeploys: "#94A3B8",
    };

    const layer = g
      .selectAll(".deploy-layer")
      .data(stacked)
      .enter()
      .append("g")
      .attr("fill", (d) => colors[d.key]);

    const rects = layer
      .selectAll("rect")
      .data((d) => d)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.data.dateLabel) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredDeployPt(d.data))
      .on("mouseleave", () => setHoveredDeployPt(null));

    if (reducedMotion) {
      rects
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])));
    } else {
      rects
        .attr("y", innerH)
        .attr("height", 0)
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])));
    }
  }, [activeSeries, granularity]);

  // D3 Chart 3: Mean Time to Recovery (MTTR) Trend + Incident Spikes
  useEffect(() => {
    const svgEl = mttrSvgRef.current;
    if (!svgEl) return;

    const margin = { top: 18, right: 20, bottom: 28, left: 42 };
    const width = 1140;
    const height = 220;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(activeSeries.map((d) => d.dateLabel))
      .range([0, innerW]);

    const maxMttr = Math.max(36, (d3.max(activeSeries, (d) => d.mttrMinutes) ?? 40) + 6);
    const y = d3.scaleLinear().domain([0, maxMttr]).nice().range([innerH, 0]);

    g.selectAll(".grid-y")
      .data(y.ticks(4))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    // 30m Target SLA line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", y(30))
      .attr("y2", y(30))
      .attr("stroke", "#D97706")
      .attr("stroke-width", 1.25)
      .attr("stroke-dasharray", "5,4");

    g.append("text")
      .attr("x", innerW - 4)
      .attr("y", y(30) - 5)
      .attr("text-anchor", "end")
      .attr("class", "fill-amber-600 dark:fill-amber-400 font-mono text-[10px]")
      .text("Target MTTR ≤ 30m");

    const yAxisG = g.append("g").call(
      d3
        .axisLeft(y)
        .ticks(4)
        .tickSize(0)
        .tickFormat((d) => `${d}m`)
    );
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums")
      .attr("dx", "-4");

    const step = Math.max(1, Math.floor(activeSeries.length / 8));
    const tickLabels = activeSeries
      .filter((_, idx) => idx % step === 0 || idx === activeSeries.length - 1)
      .map((d) => d.dateLabel);

    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(d3.axisBottom(x).tickValues(tickLabels).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums");

    const areaGen = d3
      .area<DailyDoraPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.mttrMinutes))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(activeSeries)
      .attr("fill", "#0D9488")
      .attr("fill-opacity", 0.12)
      .attr("d", areaGen);

    const lineGen = d3
      .line<DailyDoraPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y((d) => y(d.mttrMinutes))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(activeSeries)
      .attr("fill", "none")
      .attr("stroke", "#0D9488")
      .attr("stroke-width", 2)
      .attr("d", lineGen);

    // Incident spike dots
    g.selectAll(".mttr-dot")
      .data(activeSeries.filter((d) => d.incidentStage || granularity === "weekly"))
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.dateLabel) ?? 0)
      .attr("cy", (d) => y(d.mttrMinutes))
      .attr("r", (d) => (d.mttrMinutes > 30 ? 4.5 : 3))
      .attr("fill", (d) => (d.mttrMinutes > 30 ? "#DC2626" : "#0D9488"));

    const colW = innerW / Math.max(1, activeSeries.length);
    g.selectAll(".hover-band-mttr")
      .data(activeSeries)
      .enter()
      .append("rect")
      .attr("x", (d) => (x(d.dateLabel) ?? 0) - colW / 2)
      .attr("y", 0)
      .attr("width", colW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredMttrPt(d))
      .on("mouseleave", () => setHoveredMttrPt(null));
  }, [activeSeries, granularity]);

  const optimizations = [
    {
      id: "opt-cache",
      title: "Foundry & Node Dependency Caching",
      impact: "-38% durasi build CI",
      detail: "Mengaktifkan cache layer untuk artefak Solidity dan dependency pnpm pada GitHub Actions.",
    },
    {
      id: "opt-parallel",
      title: "Parallel Slither Audit + E2E Matrix",
      impact: "+4.2% kecepatan PR merge",
      detail: "Memisahkan static analysis keamanan dan integration test menjadi job paralel.",
    },
    {
      id: "opt-canary",
      title: "Automated Canary Rollback via ABDICity Bot",
      impact: "-11m MTTR insiden produksi",
      detail: "Rollback otomatis saat error rate webhook melewati ambang 1% dalam 3 menit pertama.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            {labels.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {labels.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setGranularity("weekly")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                granularity === "weekly"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {labels.granularityWeekly}
            </button>
            <button
              type="button"
              onClick={() => setGranularity("daily")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                granularity === "daily"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {labels.granularityDaily}
            </button>
          </div>

          <select
            aria-label="Filter Repository Performance"
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">{labels.filterAllRepos}</option>
            {repos.map((r) => (
              <option key={r.id} value={r.fullName}>
                {r.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4-Column DORA 90-Day KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiSuccessRate}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {kpis.avgSuccessRate}%
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {kpis.totalRuns - kpis.totalFailed}/{kpis.totalRuns} pipeline lolos (90H)
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiDeployFreq}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {kpis.deploysPerWeek}/mgg
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {kpis.totalProdDeploys} rilis produksi (90H)
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiMttr}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {kpis.avgMttr} mnt
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400">
            Di bawah target SLA 30 menit
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiOptimization}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {Object.values(appliedOptimizations).filter(Boolean).length}/3 Aktif
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            DORA Performance Tier: Elite
          </div>
        </div>
      </div>

      {/* Top Row: Success Rate + Deployment Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CI/CD Pipeline Success Rate */}
        <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {labels.successChartTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {labels.successChartSubtitle}
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
              Avg: {kpis.avgSuccessRate}%
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              ref={successSvgRef}
              role="img"
              aria-label={labels.successChartTitle}
              className="w-full min-w-[420px] h-auto"
            />
          </div>

          <div className="min-h-5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
            {hoveredSuccessPt ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {hoveredSuccessPt.dateLabel}
                </span>
                <span>
                  Success: {hoveredSuccessPt.successRate}% ({hoveredSuccessPt.totalRuns - hoveredSuccessPt.failedRuns}/{hoveredSuccessPt.totalRuns} runs · {hoveredSuccessPt.failedRuns} failed)
                </span>
              </>
            ) : (
              <span>Sorot grafik untuk memeriksa tingkat keberhasilan pipeline.</span>
            )}
          </div>
        </section>

        {/* Deployment Frequency */}
        <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {labels.deployChartTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {labels.deployChartSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Prod
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
                Staging
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              ref={deploySvgRef}
              role="img"
              aria-label={labels.deployChartTitle}
              className="w-full min-w-[420px] h-auto"
            />
          </div>

          <div className="min-h-5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
            {hoveredDeployPt ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {hoveredDeployPt.dateLabel}
                </span>
                <span>
                  Production: {hoveredDeployPt.prodDeploys} · Staging: {hoveredDeployPt.stagingDeploys}
                </span>
              </>
            ) : (
              <span>Sorot batang deployment untuk rincian rilis produksi & staging.</span>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Row: Full-Width 90-Day MTTR Trend */}
      <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {labels.mttrChartTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {labels.mttrChartSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              Pemulihan Normal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
              Lonjakan Insiden (&gt; 30m)
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            ref={mttrSvgRef}
            role="img"
            aria-label={labels.mttrChartTitle}
            className="w-full min-w-[680px] h-auto"
          />
        </div>

        <div className="min-h-5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
          {hoveredMttrPt ? (
            <>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {hoveredMttrPt.dateLabel}
              </span>
              <span>
                MTTR: {hoveredMttrPt.mttrMinutes} menit
                {hoveredMttrPt.incidentStage
                  ? ` · Stage insiden: ${hoveredMttrPt.incidentStage}`
                  : " · Pemulihan otomatis nominal"}
              </span>
            </>
          ) : (
            <span>Sorot titik MTTR untuk melacak waktu pemulihan dan tahap insiden.</span>
          )}
        </div>
      </section>

      {/* Monthly CI/CD Infrastructure Spending vs Resource Utilization */}
      <CicdInfraCostChart
        repos={repos}
        selectedRepo={selectedRepo}
        appliedOptimizations={appliedOptimizations}
      />

      {/* Workflow Optimization Recommendations */}
      <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {labels.optimizationsTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {labels.optimizationsSubtitle}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {optimizations.map((opt) => {
            const active = Boolean(appliedOptimizations[opt.id]);
            return (
              <div
                key={opt.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {opt.title}
                    </span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      {opt.impact}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">{opt.detail}</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAppliedOptimizations((prev) => ({
                      ...prev,
                      [opt.id]: !prev[opt.id],
                    }))
                  }
                  className={`px-3.5 py-2 rounded-lg border font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{active ? "Aktif di Workflow" : "Terapkan ke Bot"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
