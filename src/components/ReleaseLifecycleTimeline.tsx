import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitCommit,
  Milestone,
  ShieldCheck,
} from "lucide-react";
import { CICDRun } from "../types";

interface ReleaseLifecycleItem {
  runId: string;
  releaseTag: string;
  repo: string;
  branch: string;
  commitSha: string;
  status: CICDRun["status"];
  startTime: Date;
  auditStartTime: Date;
  auditEndTime: Date;
  completionTime: Date;
  buildSec: number;
  auditSec: number;
  deploySec: number;
  totalSec: number;
}

interface ReleaseLifecycleTimelineProps {
  cicdRuns: CICDRun[];
  onResolveBuildRun: (runId: string) => void;
}

function parseUtcTimestamp(ts: string): Date {
  // Expected format: "2026-11-15 03:40 UTC"
  const normalized = ts.replace(" UTC", "Z").replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date("2026-11-15T03:40:00Z");
}

function deriveReleaseTag(run: CICDRun, idx: number): string {
  if (run.repo.includes("smart-contracts")) {
    return run.branch.includes("release/")
      ? run.branch.replace("release/", "")
      : `v2.4.${Math.max(1, 3 - idx)}`;
  }
  if (run.repo.includes("indexer")) return `v1.9.${Math.max(0, 6 - idx)}`;
  if (run.repo.includes("mustahik-ai")) return `v2.1.${Math.max(0, 4 - idx)}-rc`;
  if (run.repo.includes("superapp-web")) return `v3.2.${Math.max(0, 5 - idx)}`;
  return `v1.5.${Math.max(1, 8 - idx)}`;
}

function buildReleaseLifecycles(runs: CICDRun[]): ReleaseLifecycleItem[] {
  return runs.slice(0, 8).map((run, idx) => {
    const startTime = parseUtcTimestamp(run.timestamp);
    const totalSec = Math.max(18, run.durationSec);
    // Split duration cleanly into Build/Test -> Security Audit -> Rollout/Completion
    const buildSec = Math.max(6, Math.round(totalSec * 0.34));
    const auditSec = Math.max(6, Math.round(totalSec * 0.38));
    const deploySec = Math.max(4, totalSec - buildSec - auditSec);

    const auditStartTime = new Date(startTime.getTime() + buildSec * 1000);
    const auditEndTime = new Date(
      auditStartTime.getTime() + auditSec * 1000
    );
    const completionTime = new Date(
      auditEndTime.getTime() + deploySec * 1000
    );

    return {
      runId: run.id,
      releaseTag: deriveReleaseTag(run, idx),
      repo: run.repo,
      branch: run.branch,
      commitSha: run.commitSha,
      status: run.status,
      startTime,
      auditStartTime,
      auditEndTime,
      completionTime,
      buildSec,
      auditSec,
      deploySec,
      totalSec,
    };
  });
}

function formatUtcHms(d: Date): string {
  return d.toISOString().slice(11, 19) + " UTC";
}

export function ReleaseLifecycleTimeline({
  cicdRuns,
  onResolveBuildRun,
}: ReleaseLifecycleTimelineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [scaleMode, setScaleMode] = useState<"relative" | "utc">("relative");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | CICDRun["status"]
  >("ALL");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ReleaseLifecycleItem | null>(
    null
  );

  const releases = useMemo(() => {
    const built = buildReleaseLifecycles(cicdRuns);
    if (statusFilter === "ALL") return built;
    return built.filter((r) => r.status === statusFilter);
  }, [cicdRuns, statusFilter]);

  const activeRelease = useMemo(
    () =>
      hoveredItem ??
      releases.find((r) => r.runId === selectedRunId) ??
      releases[0] ??
      null,
    [hoveredItem, releases, selectedRunId]
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 960;
    const rowH = 52;
    const margin = { top: 34, right: 32, bottom: 26, left: 218 };
    const height = Math.max(
      180,
      margin.top + margin.bottom + releases.length * rowH
    );
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    if (releases.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "fill-slate-400 text-xs")
        .text("Tidak ada rilis deployment untuk filter status saat ini.");
      return;
    }

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const y = d3
      .scaleBand<string>()
      .domain(releases.map((r) => r.runId))
      .range([0, innerH])
      .padding(0.32);

    let xTime: d3.ScaleTime<number, number> | null = null;
    let xLinear: d3.ScaleLinear<number, number> | null = null;

    if (scaleMode === "utc") {
      const minStart =
        d3.min(releases, (r) => r.startTime) ?? new Date("2026-11-15T02:55:00Z");
      const maxEnd =
        d3.max(releases, (r) => r.completionTime) ??
        new Date("2026-11-15T03:55:00Z");
      const padMs = Math.max(
        60_000,
        (maxEnd.getTime() - minStart.getTime()) * 0.08
      );
      xTime = d3
        .scaleTime()
        .domain([
          new Date(minStart.getTime() - padMs * 0.3),
          new Date(maxEnd.getTime() + padMs),
        ])
        .range([0, innerW]);
    } else {
      const maxDur = Math.max(30, d3.max(releases, (r) => r.totalSec) ?? 70);
      xLinear = d3
        .scaleLinear()
        .domain([0, Math.ceil(maxDur * 1.12)])
        .range([0, innerW]);
    }

    const toX = (item: ReleaseLifecycleItem, point: "start" | "auditStart" | "auditEnd" | "end") => {
      if (scaleMode === "utc" && xTime) {
        const dt =
          point === "start"
            ? item.startTime
            : point === "auditStart"
              ? item.auditStartTime
              : point === "auditEnd"
                ? item.auditEndTime
                : item.completionTime;
        return xTime(dt);
      }
      if (xLinear) {
        const sec =
          point === "start"
            ? 0
            : point === "auditStart"
              ? item.buildSec
              : point === "auditEnd"
                ? item.buildSec + item.auditSec
                : item.totalSec;
        return xLinear(sec);
      }
      return 0;
    };

    // Vertical Gridlines + Top Axis
    if (scaleMode === "utc" && xTime) {
      const ticks = xTime.ticks(6);
      g.selectAll(".grid-x")
        .data(ticks)
        .enter()
        .append("line")
        .attr("x1", (d) => xTime!(d))
        .attr("x2", (d) => xTime!(d))
        .attr("y1", 0)
        .attr("y2", innerH)
        .attr("class", "stroke-slate-200/80 dark:stroke-slate-800/80")
        .attr("stroke-dasharray", "2,2");

      const topAxis = d3
        .axisTop<Date>(xTime)
        .ticks(6)
        .tickSize(0)
        .tickFormat((d) => d.toISOString().slice(11, 16) + " UTC");
      const axisG = g.append("g").attr("transform", "translate(0, -6)").call(topAxis);
      axisG.select(".domain").remove();
      axisG
        .selectAll("text")
        .attr(
          "class",
          "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
        );
    } else if (xLinear) {
      const ticks = xLinear.ticks(6);
      g.selectAll(".grid-x")
        .data(ticks)
        .enter()
        .append("line")
        .attr("x1", (d) => xLinear!(d))
        .attr("x2", (d) => xLinear!(d))
        .attr("y1", 0)
        .attr("y2", innerH)
        .attr("class", "stroke-slate-200/80 dark:stroke-slate-800/80")
        .attr("stroke-dasharray", "2,2");

      const topAxis = d3
        .axisTop(xLinear)
        .ticks(6)
        .tickSize(0)
        .tickFormat((d) => `${d}s`);
      const axisG = g.append("g").attr("transform", "translate(0, -6)").call(topAxis);
      axisG.select(".domain").remove();
      axisG
        .selectAll("text")
        .attr(
          "class",
          "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
        );
    }

    // Horizontal Row Guides & Left Release Labels
    const rowsG = g
      .selectAll(".release-row")
      .data(releases)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredItem(d))
      .on("mouseleave", () => setHoveredItem(null))
      .on("click", (_e, d) => setSelectedRunId(d.runId));

    // Row highlight band
    rowsG
      .append("rect")
      .attr("x", -margin.left + 8)
      .attr("y", (d) => (y(d.runId) ?? 0) - 4)
      .attr("width", margin.left + innerW - 4)
      .attr("height", y.bandwidth() + 8)
      .attr("rx", 6)
      .attr("class", (d) =>
        activeRelease?.runId === d.runId
          ? "fill-slate-100/90 dark:fill-slate-800/60"
          : "fill-transparent hover:fill-slate-100/50 dark:hover:fill-slate-800/30"
      );

    // Left Labels: Release Tag + Repo
    rowsG
      .append("text")
      .attr("x", -14)
      .attr("y", (d) => (y(d.runId) ?? 0) + y.bandwidth() * 0.42)
      .attr("text-anchor", "end")
      .attr(
        "class",
        "fill-slate-900 dark:fill-slate-100 font-mono text-[11px] font-bold"
      )
      .text((d) => `${d.releaseTag} · ${d.repo.replace("abdcity/", "")}`);

    rowsG
      .append("text")
      .attr("x", -14)
      .attr("y", (d) => (y(d.runId) ?? 0) + y.bandwidth() * 0.85)
      .attr("text-anchor", "end")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
      )
      .text((d) => `${d.branch} (${d.commitSha})`);

    // Track Baseline Guide
    rowsG
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => (y(d.runId) ?? 0) + y.bandwidth() / 2)
      .attr("y2", (d) => (y(d.runId) ?? 0) + y.bandwidth() / 2)
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-width", 1);

    const barHeight = Math.min(14, Math.max(10, y.bandwidth() * 0.42));

    // Phase 1: Start & Build Segment (Sky Blue)
    rowsG
      .append("rect")
      .attr("x", (d) => toX(d, "start"))
      .attr("y", (d) => (y(d.runId) ?? 0) + (y.bandwidth() - barHeight) / 2)
      .attr("width", (d) =>
        Math.max(4, toX(d, "auditStart") - toX(d, "start"))
      )
      .attr("height", barHeight)
      .attr("rx", 3)
      .attr("fill", "#0284C7");

    // Phase 2: Audit Window Segment (Amber or Rose if Failed during audit)
    rowsG
      .append("rect")
      .attr("x", (d) => toX(d, "auditStart"))
      .attr("y", (d) => (y(d.runId) ?? 0) + (y.bandwidth() - barHeight) / 2)
      .attr("width", (d) =>
        Math.max(4, toX(d, "auditEnd") - toX(d, "auditStart"))
      )
      .attr("height", barHeight)
      .attr("rx", 2)
      .attr("fill", (d) => (d.status === "Failed" ? "#DC2626" : "#D97706"));

    // Phase 3: Rollout & Completion Segment (Emerald for Success, Dashed/Muted for Running/Blocked)
    rowsG
      .append("rect")
      .attr("x", (d) => toX(d, "auditEnd"))
      .attr("y", (d) => (y(d.runId) ?? 0) + (y.bandwidth() - barHeight) / 2)
      .attr("width", (d) => Math.max(4, toX(d, "end") - toX(d, "auditEnd")))
      .attr("height", barHeight)
      .attr("rx", 3)
      .attr("fill", (d) =>
        d.status === "Success"
          ? "#059669"
          : d.status === "Failed"
            ? "#FCA5A5"
            : "#14B8A6"
      )
      .attr("fill-opacity", (d) => (d.status === "Failed" ? 0.35 : 0.95));

    // Milestone Dots: Start, Audit Checkpoint, Completion
    // 1. Start dot
    rowsG
      .append("circle")
      .attr("cx", (d) => toX(d, "start"))
      .attr("cy", (d) => (y(d.runId) ?? 0) + y.bandwidth() / 2)
      .attr("r", 4.5)
      .attr("fill", "#0284C7")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5);

    // 2. Audit checkpoint dot
    rowsG
      .append("circle")
      .attr("cx", (d) => toX(d, "auditStart"))
      .attr("cy", (d) => (y(d.runId) ?? 0) + y.bandwidth() / 2)
      .attr("r", 4.5)
      .attr("fill", "#D97706")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5);

    // 3. Completion / Halt dot
    rowsG
      .append("circle")
      .attr("cx", (d) => toX(d, "end"))
      .attr("cy", (d) => (y(d.runId) ?? 0) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", (d) =>
        d.status === "Success"
          ? "#059669"
          : d.status === "Failed"
            ? "#DC2626"
            : "#14B8A6"
      )
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5);

    // Duration / Timestamp summary tag at end of bar
    rowsG
      .append("text")
      .attr("x", (d) => toX(d, "end") + 9)
      .attr("y", (d) => (y(d.runId) ?? 0) + y.bandwidth() / 2 + 3.5)
      .attr(
        "class",
        "fill-slate-700 dark:fill-slate-300 font-mono text-[10px] tabular-nums font-semibold"
      )
      .text((d) =>
        d.status === "Failed"
          ? `HALT (${d.totalSec}s)`
          : d.status === "Running"
            ? `LIVE (${d.totalSec}s)`
            : `${d.totalSec}s`
      );
  }, [releases, scaleMode, activeRelease?.runId]);

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5">
      {/* Header & Scale / Status Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Milestone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Timeline Horizontal Siklus Hidup Rilis Deployment (D3)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Melacak fase waktu mulai build, jendela audit keamanan, hingga penyelesaian rilis produksi untuk setiap tag rilis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Scale Toggle */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setScaleMode("relative")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scaleMode === "relative"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Durasi Siklus (0s)
            </button>
            <button
              type="button"
              onClick={() => setScaleMode("utc")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scaleMode === "utc"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Kronologi (UTC)
            </button>
          </div>

          {/* Status Filter */}
          <select
            aria-label="Filter status rilis"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | CICDRun["status"])
            }
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">Semua Status Rilis</option>
            <option value="Success">Success</option>
            <option value="Running">Running</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Phase Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-2.5 rounded-xs bg-[#0284C7] inline-block" />
            1. Start & Build
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-2.5 rounded-xs bg-[#D97706] inline-block" />
            2. Security & Foundry Audit
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-2.5 rounded-xs bg-[#059669] inline-block" />
            3. Completion / Production
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-2.5 rounded-xs bg-[#DC2626] inline-block" />
            Audit / Build Blocked
          </span>
        </div>
        <span className="font-mono tabular-nums text-[11px]">
          {releases.length} rilis dilacak
        </span>
      </div>

      {/* D3 Horizontal SVG Timeline */}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 p-3">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Release Deployment Lifecycle D3 Horizontal Timeline"
          className="w-full min-w-[740px] h-auto"
        />
      </div>

      {/* Selected Release Phase Timestamps Inspector */}
      {activeRelease && (
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {activeRelease.status === "Success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : activeRelease.status === "Failed" ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              )}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-50">
                {activeRelease.releaseTag} · {activeRelease.repo}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400">
                <GitCommit className="w-3.5 h-3.5" />
                {activeRelease.commitSha} ({activeRelease.branch})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-6 font-mono tabular-nums">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Waktu Mulai (Build)
                </span>
                <span className="text-sky-700 dark:text-sky-400 font-semibold">
                  {formatUtcHms(activeRelease.startTime)} (+{activeRelease.buildSec}s)
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Jendela Audit Keamanan
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  {formatUtcHms(activeRelease.auditStartTime)} →{" "}
                  {formatUtcHms(activeRelease.auditEndTime)} ({activeRelease.auditSec}s)
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  {activeRelease.status === "Failed"
                    ? "Dihentikan pada"
                    : "Waktu Selesai (Deploy)"}
                </span>
                <span
                  className={`font-semibold ${
                    activeRelease.status === "Failed"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {formatUtcHms(activeRelease.completionTime)} (Total{" "}
                  {activeRelease.totalSec}s)
                </span>
              </div>
            </div>
          </div>

          {activeRelease.status === "Failed" && (
            <button
              type="button"
              onClick={() => onResolveBuildRun(activeRelease.runId)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-center"
            >
              Pulihkan & Rilis Ulang
            </button>
          )}
        </div>
      )}
    </section>
  );
}
