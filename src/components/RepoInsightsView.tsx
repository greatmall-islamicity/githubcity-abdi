import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { GitHubIssueItem, ManagedRepo } from "../types";

interface DailyMetricPoint {
  date: Date;
  dateLabel: string;
  commits: number;
  rollingAvg: number;
  openedIssues: number;
  resolvedIssues: number;
  prsMerged: number;
}

interface DeveloperProfile {
  handle: string;
  role: string;
  primaryRepo: string;
  commits30d: number;
  reviews30d: number;
  issuesClosed30d: number;
  dailyActivity: number[];
}

interface RepoInsightsViewProps {
  repos: ManagedRepo[];
  issues: GitHubIssueItem[];
  labels: {
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
}

const DEVELOPER_BASE: Omit<DeveloperProfile, "commits30d" | "reviews30d" | "issuesClosed30d" | "dailyActivity">[] = [
  { handle: "raka-dev", role: "Smart Contract Lead", primaryRepo: "abdcity/zakat-smart-contracts" },
  { handle: "nadia-ml", role: "AI & Mustahik Data", primaryRepo: "abdcity/mustahik-ai-engine" },
  { handle: "ilham-ui", role: "Frontend Architect", primaryRepo: "abdcity/islamicity-superapp-web" },
  { handle: "fajar-sre", role: "CI/CD & DevOps", primaryRepo: "abdcity/abdcity-bot-core" },
  { handle: "hana-sec", role: "ZK & Audit Engineer", primaryRepo: "abdcity/wakaf-ledger-indexer" },
  { handle: "rizky-arch", role: "Platform Maintainer", primaryRepo: "abdcity/abdcity-bot-core" },
];

// Deterministic 30-day generator anchored on Nov 15, 2026 so charts stay realistic and responsive to repo filter & live issues
function buildInsightsDataset(
  repos: ManagedRepo[],
  selectedRepo: string,
  liveIssues: GitHubIssueItem[]
): {
  series: DailyMetricPoint[];
  developers: DeveloperProfile[];
  medianResolutionHrs: number;
} {
  const anchorEnd = new Date(2026, 10, 15); // Nov 15, 2026
  const repoIndex =
    selectedRepo === "ALL"
      ? 0
      : Math.max(
          1,
          repos.findIndex((r) => r.fullName === selectedRepo) + 1
        );
  const scaleFactor = selectedRepo === "ALL" ? 1 : 0.28 + (repoIndex % 3) * 0.08;

  const extraTodayIssues = liveIssues.filter((iss) =>
    selectedRepo === "ALL" ? true : iss.repo === selectedRepo
  ).length;

  const rawPoints: Omit<DailyMetricPoint, "rollingAvg">[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(anchorEnd);
    d.setDate(anchorEnd.getDate() - i);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const wave = Math.sin((29 - i + repoIndex * 2) * 0.45) * 4 + Math.cos((29 - i) * 0.25) * 2.5;
    const baseCommits = isWeekend ? 7 : 18;
    const commits = Math.max(
      2,
      Math.round((baseCommits + wave + ((29 - i + repoIndex) % 5)) * scaleFactor)
    );

    const openedBase = isWeekend ? 1 : 4 + ((29 - i + repoIndex) % 3);
    const resolvedBase = isWeekend ? 2 : 4 + ((29 - i + repoIndex + 1) % 4);
    const openedIssues =
      Math.max(0, Math.round(openedBase * scaleFactor)) +
      (i === 0 ? Math.max(0, extraTodayIssues - 3) : 0);
    const resolvedIssues = Math.max(0, Math.round(resolvedBase * scaleFactor));

    rawPoints.push({
      date: d,
      dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      commits,
      openedIssues,
      resolvedIssues,
      prsMerged: Math.max(1, Math.round(commits * 0.24)),
    });
  }

  const series: DailyMetricPoint[] = rawPoints.map((pt, idx) => {
    const start = Math.max(0, idx - 6);
    const slice = rawPoints.slice(start, idx + 1);
    const avg = slice.reduce((acc, s) => acc + s.commits, 0) / slice.length;
    return {
      ...pt,
      rollingAvg: Math.round(avg * 10) / 10,
    };
  });

  const developers: DeveloperProfile[] = DEVELOPER_BASE.map((dev, devIdx) => {
    const isPrimaryMatch =
      selectedRepo === "ALL" || dev.primaryRepo === selectedRepo;
    const dailyActivity: number[] = [];
    let commits30d = 0;

    for (let day = 0; day < 30; day++) {
      const seed = ((day + 3) * (devIdx + 5) + repoIndex * 7) % 13;
      const val = isPrimaryMatch
        ? Math.max(0, seed > 10 ? 11 : seed % 9)
        : seed % 4 === 0
          ? 2
          : seed % 5 === 0
            ? 1
            : 0;
      dailyActivity.push(val);
      commits30d += val;
    }

    const reviews30d = Math.max(3, Math.round(commits30d * 0.42));
    const issuesClosed30d = Math.max(1, Math.round(commits30d * 0.19));

    return {
      ...dev,
      commits30d,
      reviews30d,
      issuesClosed30d,
      dailyActivity,
    };
  }).sort((a, b) => b.commits30d - a.commits30d);

  const medianResolutionHrs = selectedRepo === "ALL" ? 6.4 : 4.8 + (repoIndex % 3) * 1.1;

  return { series, developers, medianResolutionHrs };
}

export function RepoInsightsView({
  repos,
  issues,
  labels,
}: RepoInsightsViewProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>("ALL");
  const [hoveredCommitPt, setHoveredCommitPt] = useState<DailyMetricPoint | null>(null);
  const [hoveredIssuePt, setHoveredIssuePt] = useState<DailyMetricPoint | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    handle: string;
    dateLabel: string;
    count: number;
  } | null>(null);

  const commitSvgRef = useRef<SVGSVGElement | null>(null);
  const issueSvgRef = useRef<SVGSVGElement | null>(null);
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);

  const { series, developers, medianResolutionHrs } = useMemo(
    () => buildInsightsDataset(repos, selectedRepo, issues),
    [repos, selectedRepo, issues]
  );

  const totalCommits = useMemo(
    () => series.reduce((acc, p) => acc + p.commits, 0),
    [series]
  );
  const totalOpened = useMemo(
    () => series.reduce((acc, p) => acc + p.openedIssues, 0),
    [series]
  );
  const totalResolved = useMemo(
    () => series.reduce((acc, p) => acc + p.resolvedIssues, 0),
    [series]
  );
  const resolutionRate = totalOpened > 0 ? Math.round((totalResolved / totalOpened) * 100) : 100;
  const activeDevs = developers.filter((d) => d.commits30d > 0).length;

  // D3 Chart 1: 30-Day Commit Frequency (Bars + 7-Day Rolling Average Line)
  useEffect(() => {
    const svgEl = commitSvgRef.current;
    if (!svgEl) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const margin = { top: 14, right: 16, bottom: 28, left: 36 };
    const width = 580;
    const height = 240;
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
      .domain(series.map((d) => d.dateLabel))
      .range([0, innerW])
      .padding(0.28);

    const maxCommits = Math.max(10, d3.max(series, (d) => d.commits) ?? 20);
    const y = d3.scaleLinear().domain([0, maxCommits * 1.15]).nice().range([innerH, 0]);

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

    // Y axis
    const yAxisG = g.append("g").call(d3.axisLeft(y).ticks(4).tickSize(0));
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums")
      .attr("dx", "-4");

    // X axis (every 5th date for clean readability)
    const tickLabels = series
      .filter((_, idx) => idx === 0 || idx === 7 || idx === 14 || idx === 21 || idx === 29)
      .map((d) => d.dateLabel);
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(d3.axisBottom(x).tickValues(tickLabels).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums");

    // Daily commit bars
    const bars = g
      .selectAll(".commit-bar")
      .data(series)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.dateLabel) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 2)
      .attr("class", "fill-emerald-600/80 dark:fill-emerald-500/80 hover:fill-emerald-500 transition-colors")
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredCommitPt(d))
      .on("mouseleave", () => setHoveredCommitPt(null));

    if (reducedMotion) {
      bars.attr("y", (d) => y(d.commits)).attr("height", (d) => innerH - y(d.commits));
    } else {
      bars
        .attr("y", innerH)
        .attr("height", 0)
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .attr("y", (d) => y(d.commits))
        .attr("height", (d) => innerH - y(d.commits));
    }

    // 7-day rolling average curve
    const lineGen = d3
      .line<DailyMetricPoint>()
      .x((d) => (x(d.dateLabel) ?? 0) + x.bandwidth() / 2)
      .y((d) => y(d.rollingAvg))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#D97706")
      .attr("stroke-width", 2)
      .attr("d", lineGen);
  }, [series]);

  // D3 Chart 2: 30-Day Issue Resolution Trends (Opened vs Resolved Area & Line)
  useEffect(() => {
    const svgEl = issueSvgRef.current;
    if (!svgEl) return;

    const margin = { top: 14, right: 16, bottom: 28, left: 36 };
    const width = 580;
    const height = 240;
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
      .domain(series.map((d) => d.dateLabel))
      .range([0, innerW]);

    const maxIssue = Math.max(
      6,
      d3.max(series, (d) => Math.max(d.openedIssues, d.resolvedIssues)) ?? 8
    );
    const y = d3.scaleLinear().domain([0, maxIssue * 1.2]).nice().range([innerH, 0]);

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

    const yAxisG = g.append("g").call(d3.axisLeft(y).ticks(4).tickSize(0));
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums")
      .attr("dx", "-4");

    const tickLabels = series
      .filter((_, idx) => idx === 0 || idx === 7 || idx === 14 || idx === 21 || idx === 29)
      .map((d) => d.dateLabel);
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(d3.axisBottom(x).tickValues(tickLabels).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums");

    const resolvedArea = d3
      .area<DailyMetricPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.resolvedIssues))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(series)
      .attr("fill", "#059669")
      .attr("fill-opacity", 0.14)
      .attr("d", resolvedArea);

    const openedLine = d3
      .line<DailyMetricPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y((d) => y(d.openedIssues))
      .curve(d3.curveMonotoneX);

    const resolvedLine = d3
      .line<DailyMetricPoint>()
      .x((d) => x(d.dateLabel) ?? 0)
      .y((d) => y(d.resolvedIssues))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#D97706")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,3")
      .attr("d", openedLine);

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#059669")
      .attr("stroke-width", 2.2)
      .attr("d", resolvedLine);

    // Interactive invisible hover columns
    const colWidth = innerW / Math.max(1, series.length);
    g.selectAll(".hover-col")
      .data(series)
      .enter()
      .append("rect")
      .attr("x", (d) => (x(d.dateLabel) ?? 0) - colWidth / 2)
      .attr("y", 0)
      .attr("width", colWidth)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredIssuePt(d))
      .on("mouseleave", () => setHoveredIssuePt(null));
  }, [series]);

  // D3 Chart 3: Developer Activity Matrix (30-Day Heatmap)
  useEffect(() => {
    const svgEl = heatmapSvgRef.current;
    if (!svgEl) return;

    const margin = { top: 8, right: 12, bottom: 24, left: 96 };
    const width = 760;
    const rowH = 28;
    const height = margin.top + margin.bottom + developers.length * rowH;
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
      .domain(series.map((d) => d.dateLabel))
      .range([0, innerW])
      .padding(0.18);

    const y = d3
      .scaleBand<string>()
      .domain(developers.map((d) => d.handle))
      .range([0, innerH])
      .padding(0.2);

    const colorScale = d3
      .scaleThreshold<number, string>()
      .domain([1, 3, 6, 9])
      .range(["#E2E8F0", "#A7F3D0", "#34D399", "#059669", "#065F46"]);

    const yAxisG = g.append("g").call(d3.axisLeft(y).tickSize(0));
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr("class", "fill-slate-700 dark:fill-slate-300 font-mono text-[11px] font-medium")
      .attr("dx", "-6");

    const tickLabels = series
      .filter((_, idx) => idx === 0 || idx === 7 || idx === 14 || idx === 21 || idx === 29)
      .map((d) => d.dateLabel);
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 4})`)
      .call(d3.axisBottom(x).tickValues(tickLabels).tickSize(0));
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr("class", "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums");

    const cellData: {
      handle: string;
      dateLabel: string;
      count: number;
    }[] = [];

    developers.forEach((dev) => {
      dev.dailyActivity.forEach((count, dayIdx) => {
        cellData.push({
          handle: dev.handle,
          dateLabel: series[dayIdx]?.dateLabel || "",
          count,
        });
      });
    });

    g.selectAll(".heat-cell")
      .data(cellData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.dateLabel) ?? 0)
      .attr("y", (d) => y(d.handle) ?? 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => (d.count === 0 ? "currentColor" : colorScale(d.count)))
      .attr("class", (d) =>
        d.count === 0
          ? "text-slate-200/80 dark:text-slate-800 hover:opacity-85 transition-opacity"
          : "hover:opacity-85 transition-opacity"
      )
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredCell(d))
      .on("mouseleave", () => setHoveredCell(null));
  }, [developers, series]);

  return (
    <div className="space-y-6">
      {/* Header + Repository Filter Toolbar */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            {labels.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {labels.subtitle}
          </p>
        </div>

        <div className="shrink-0">
          <select
            aria-label="Filter Repository Insights"
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

      {/* 4-Column 30-Day KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiCommits}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {totalCommits.toLocaleString("id-ID")}
          </div>
          <div className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {(totalCommits / 30).toFixed(1)} commits / hari
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiContributors}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {activeDevs} Devs
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Top: <span className="font-mono font-medium">{developers[0]?.handle}</span>
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiResolutionRate}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {resolutionRate}%
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {totalResolved} selesai / {totalOpened} dibuka
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {labels.kpiMedianTime}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {medianResolutionHrs.toFixed(1)} jam
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400">
            Auto-triage aktif 24/7
          </div>
        </div>
      </div>

      {/* Dual D3 Charts Row: Commit Frequency + Issue Resolution Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commit Frequency Chart */}
        <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {labels.commitChartTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {labels.commitChartSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Commits
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-600 inline-block" />
                7D Avg
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              ref={commitSvgRef}
              role="img"
              aria-label={labels.commitChartTitle}
              className="w-full min-w-[420px] h-auto"
            />
          </div>

          <div className="min-h-5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
            {hoveredCommitPt ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {hoveredCommitPt.dateLabel}
                </span>
                <span>
                  {hoveredCommitPt.commits} commits · {hoveredCommitPt.prsMerged} PR merged · 7D Avg {hoveredCommitPt.rollingAvg}
                </span>
              </>
            ) : (
              <span>Arahkan kursor ke batang harian untuk detail commit.</span>
            )}
          </div>
        </section>

        {/* Issue Resolution Trends Chart */}
        <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {labels.issueChartTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {labels.issueChartSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
                Resolved
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
                Opened
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              ref={issueSvgRef}
              role="img"
              aria-label={labels.issueChartTitle}
              className="w-full min-w-[420px] h-auto"
            />
          </div>

          <div className="min-h-5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
            {hoveredIssuePt ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {hoveredIssuePt.dateLabel}
                </span>
                <span>
                  Resolved: {hoveredIssuePt.resolvedIssues} · Opened: {hoveredIssuePt.openedIssues}
                </span>
              </>
            ) : (
              <span>Arahkan kursor ke grafik untuk perbandingan issue harian.</span>
            )}
          </div>
        </section>
      </div>

      {/* Developer Activity Heatmap + Contributor Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Heatmap 7 cols */}
        <section className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {labels.devHeatmapTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {labels.devHeatmapSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span>Low</span>
              <span className="w-3 h-3 rounded-xs bg-slate-200 dark:bg-slate-800 inline-block" />
              <span className="w-3 h-3 rounded-xs bg-[#A7F3D0] inline-block" />
              <span className="w-3 h-3 rounded-xs bg-[#34D399] inline-block" />
              <span className="w-3 h-3 rounded-xs bg-[#059669] inline-block" />
              <span className="w-3 h-3 rounded-xs bg-[#065F46] inline-block" />
              <span>High</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              ref={heatmapSvgRef}
              role="img"
              aria-label={labels.devHeatmapTitle}
              className="w-full min-w-[540px] h-auto"
            />
          </div>

          <div className="min-h-5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
            {hoveredCell ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  @{hoveredCell.handle} · {hoveredCell.dateLabel}
                </span>
                <span>{hoveredCell.count} kontribusi (commit & review)</span>
              </>
            ) : (
              <span>Sorot sel heatmap untuk melihat aktivitas harian pengembang.</span>
            )}
          </div>
        </section>

        {/* Contributor Table 5 cols */}
        <section className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {labels.devTableTitle}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/60">
                  <th className="py-2.5 px-4">Developer</th>
                  <th className="py-2.5 px-3 text-right">Commits</th>
                  <th className="py-2.5 px-3 text-right">Reviews</th>
                  <th className="py-2.5 px-4 text-right">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {developers.map((dev) => (
                  <tr
                    key={dev.handle}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        @{dev.handle}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {dev.role}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {dev.commits30d}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {dev.reviews30d}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {dev.issuesClosed30d}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
