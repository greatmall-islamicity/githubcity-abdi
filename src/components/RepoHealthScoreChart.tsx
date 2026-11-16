import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ManagedRepo } from "../types";

export const HEALTH_WEIGHTS = {
  branchProtection: 45,
  commitConventionCheck: 30,
  docsCompletenessCheck: 25,
} as const;

export interface RepoScoreBreakdown {
  id: string;
  shortName: string;
  fullName: string;
  branchScore: number;
  commitScore: number;
  docsScore: number;
  totalScore: number;
  health: ManagedRepo["health"];
}

export function computeRepoScore(repo: ManagedRepo): RepoScoreBreakdown {
  const branchScore = repo.branchProtection ? HEALTH_WEIGHTS.branchProtection : 0;
  const commitScore = repo.commitConventionCheck
    ? HEALTH_WEIGHTS.commitConventionCheck
    : 0;
  const docsScore = repo.docsCompletenessCheck
    ? HEALTH_WEIGHTS.docsCompletenessCheck
    : 0;
  return {
    id: repo.id,
    shortName: repo.fullName.replace(/^abdcity\//, ""),
    fullName: repo.fullName,
    branchScore,
    commitScore,
    docsScore,
    totalScore: branchScore + commitScore + docsScore,
    health: repo.health,
  };
}

interface RepoHealthScoreChartProps {
  repos: ManagedRepo[];
  labels: {
    title: string;
    subtitle: string;
    fleetScoreLabel: string;
    branchLabel: string;
    commitLabel: string;
    docsLabel: string;
    optimal: string;
    moderate: string;
    atRisk: string;
  };
}

export function RepoHealthScoreChart({
  repos,
  labels,
}: RepoHealthScoreChartProps) {
  const gaugeSvgRef = useRef<SVGSVGElement | null>(null);
  const barSvgRef = useRef<SVGSVGElement | null>(null);
  const prevScoreRef = useRef<number>(0);
  const [hoveredRepo, setHoveredRepo] = useState<RepoScoreBreakdown | null>(null);

  const breakdowns = useMemo(() => repos.map(computeRepoScore), [repos]);

  const fleetWeightedScore = useMemo(() => {
    if (breakdowns.length === 0) return 0;
    const sum = breakdowns.reduce((acc, r) => acc + r.totalScore, 0);
    return Math.round((sum / breakdowns.length) * 10) / 10;
  }, [breakdowns]);

  const pillarAverages = useMemo(() => {
    const count = Math.max(1, repos.length);
    return {
      branchPct: Math.round(
        (repos.filter((r) => r.branchProtection).length / count) * 100
      ),
      commitPct: Math.round(
        (repos.filter((r) => r.commitConventionCheck).length / count) * 100
      ),
      docsPct: Math.round(
        (repos.filter((r) => r.docsCompletenessCheck).length / count) * 100
      ),
    };
  }, [repos]);

  const statusMeta = useMemo(() => {
    if (fleetWeightedScore >= 85) {
      return {
        label: labels.optimal,
        color: "#059669",
        textClass: "text-emerald-700 dark:text-emerald-400",
      };
    }
    if (fleetWeightedScore >= 60) {
      return {
        label: labels.moderate,
        color: "#D97706",
        textClass: "text-amber-600 dark:text-amber-400",
      };
    }
    return {
      label: labels.atRisk,
      color: "#DC2626",
      textClass: "text-rose-600 dark:text-rose-400",
    };
  }, [fleetWeightedScore, labels]);

  // D3 Radial Gauge Arc for Fleet Weighted Average Score
  useEffect(() => {
    const svgEl = gaugeSvgRef.current;
    if (!svgEl) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = 220;
    const height = 148;
    const outerRadius = 86;
    const innerRadius = 66;
    const startAngle = -Math.PI * 0.65;
    const endAngle = Math.PI * 0.65;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height - 34})`);

    const trackArc = d3
      .arc<unknown>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(6);

    g.append("path")
      .attr("d", trackArc({}) || "")
      .attr("class", "fill-slate-200 dark:fill-slate-800");

    const valueScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([startAngle, endAngle])
      .clamp(true);

    const valueArc = d3
      .arc<number>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle((d) => valueScale(d))
      .cornerRadius(6);

    const foreground = g
      .append("path")
      .datum(prevScoreRef.current)
      .attr("fill", statusMeta.color);

    const scoreText = g
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", -12)
      .attr(
        "class",
        "fill-slate-900 dark:fill-slate-50 font-mono font-bold text-3xl tabular-nums"
      );

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 10)
      .attr("class", "fill-slate-500 dark:fill-slate-400 text-[11px] font-medium")
      .text("/ 100");

    const fromScore = prevScoreRef.current;
    const toScore = fleetWeightedScore;
    prevScoreRef.current = toScore;

    if (reducedMotion) {
      foreground.attr("d", valueArc(toScore) || "");
      scoreText.text(toScore.toFixed(1));
    } else {
      foreground
        .transition()
        .duration(360)
        .ease(d3.easeCubicOut)
        .attrTween("d", () => {
          const interp = d3.interpolateNumber(fromScore, toScore);
          return (t) => valueArc(interp(t)) || "";
        });

      scoreText
        .transition()
        .duration(360)
        .tween("text", () => {
          const interp = d3.interpolateNumber(fromScore, toScore);
          return (t) => {
            scoreText.text(interp(t).toFixed(1));
          };
        });
    }
  }, [fleetWeightedScore, statusMeta.color]);

  // D3 Stacked Horizontal Bar Chart per Repository
  useEffect(() => {
    const svgEl = barSvgRef.current;
    if (!svgEl) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const margin = { top: 10, right: 44, bottom: 26, left: 162 };
    const width = 560;
    const rowHeight = 36;
    const height = margin.top + margin.bottom + breakdowns.length * rowHeight;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

    const y = d3
      .scaleBand<string>()
      .domain(breakdowns.map((d) => d.shortName))
      .range([0, innerH])
      .padding(0.32);

    // Subtle vertical gridlines at 0, 25, 50, 75, 100
    const ticks = [0, 25, 50, 75, 100];
    g.selectAll(".grid-line")
      .data(ticks)
      .enter()
      .append("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    // X axis labels
    const xAxis = d3
      .axisBottom(x)
      .tickValues(ticks)
      .tickSize(0)
      .tickFormat((d) => `${d}`);

    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 6})`)
      .call(xAxis);

    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      );

    // Y axis repository labels
    const yAxis = d3.axisLeft(y).tickSize(0);
    const yAxisG = g.append("g").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-700 dark:fill-slate-300 font-mono text-[11px] font-medium"
      )
      .attr("dx", "-6");

    // Background track per repo
    g.selectAll(".repo-track")
      .data(breakdowns)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.shortName) ?? 0)
      .attr("width", innerW)
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("class", "fill-slate-100 dark:fill-slate-800/70");

    // Stack data via d3.stack
    const stackKeys = ["branchScore", "commitScore", "docsScore"] as const;
    const stackedSeries = d3
      .stack<RepoScoreBreakdown>()
      .keys(stackKeys)(breakdowns);

    const seriesColors: Record<(typeof stackKeys)[number], string> = {
      branchScore: "#059669",
      commitScore: "#0D9488",
      docsScore: "#D97706",
    };

    const seriesGroups = g
      .selectAll(".stack-layer")
      .data(stackedSeries)
      .enter()
      .append("g")
      .attr("fill", (d) => seriesColors[d.key as (typeof stackKeys)[number]]);

    const rects = seriesGroups
      .selectAll("rect")
      .data((d) => d)
      .enter()
      .append("rect")
      .attr("y", (d) => y(d.data.shortName) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseenter", (_event, d) => setHoveredRepo(d.data))
      .on("mouseleave", () => setHoveredRepo(null));

    if (reducedMotion) {
      rects
        .attr("x", (d) => x(d[0]))
        .attr("width", (d) => Math.max(0, x(d[1]) - x(d[0])));
    } else {
      rects
        .attr("x", (d) => x(d[0]))
        .attr("width", 0)
        .transition()
        .duration(280)
        .ease(d3.easeCubicOut)
        .attr("width", (d) => Math.max(0, x(d[1]) - x(d[0])));
    }

    // Score labels at right end of each bar
    g.selectAll(".repo-score-label")
      .data(breakdowns)
      .enter()
      .append("text")
      .attr("x", innerW + 8)
      .attr("y", (d) => (y(d.shortName) ?? 0) + y.bandwidth() / 2 + 4)
      .attr(
        "class",
        "fill-slate-900 dark:fill-slate-100 font-mono text-[11px] font-semibold tabular-nums"
      )
      .text((d) => `${d.totalScore}%`);
  }, [breakdowns]);

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {labels.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {labels.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            <span>{labels.branchLabel} (45%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
            <span>{labels.commitLabel} (30%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
            <span>{labels.docsLabel} (25%)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: D3 Radial Gauge & Pillar Averages */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-3 lg:border-r lg:border-slate-200 dark:lg:border-slate-800 lg:pr-6">
          <div className="w-56">
            <svg
              ref={gaugeSvgRef}
              role="img"
              aria-label={`${labels.fleetScoreLabel}: ${fleetWeightedScore} / 100`}
              className="w-full h-auto overflow-visible"
            />
          </div>

          <div className="text-center space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {labels.fleetScoreLabel}
            </div>
            <div className={`text-sm font-bold ${statusMeta.textClass}`}>
              {statusMeta.label}
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-[11px]">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Branch</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {pillarAverages.branchPct}%
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Commit</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {pillarAverages.commitPct}%
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Docs</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {pillarAverages.docsPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Right: D3 Stacked Horizontal Repository Breakdown */}
        <div className="lg:col-span-8 space-y-3">
          <div className="w-full overflow-x-auto">
            <svg
              ref={barSvgRef}
              role="img"
              aria-label="Repository Health Score Breakdown Chart"
              className="w-full min-w-[460px] h-auto"
            />
          </div>

          <div className="min-h-6 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {hoveredRepo ? (
              <>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {hoveredRepo.fullName}
                </span>
                <span className="font-mono tabular-nums">
                  Branch +{hoveredRepo.branchScore} · Commit +{hoveredRepo.commitScore} · Docs +{hoveredRepo.docsScore} = {hoveredRepo.totalScore}/100
                </span>
              </>
            ) : (
              <span>
                Ubah aturan di tabel di bawah untuk melihat skor kesehatan D3 diperbarui secara langsung.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
