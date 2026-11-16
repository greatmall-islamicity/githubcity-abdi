import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { CICDRun } from "../types";

export type PipelineStageId =
  | "commit"
  | "test"
  | "audit"
  | "build"
  | "deploy";

export interface PipelineStageNode {
  id: PipelineStageId;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  status: "Success" | "Running" | "Bottleneck" | "Failed" | "Blocked";
  durationSec: number;
  queueWaitSec: number;
  isBottleneck: boolean;
  bottleneckReason?: string;
  matchingRun?: CICDRun;
}

interface PipelineEdge {
  source: PipelineStageId;
  target: PipelineStageId;
  status: "Nominal" | "Slow" | "Blocked";
}

interface CicdPipelineFlowchartProps {
  cicdRuns: CICDRun[];
  onResolveBuildRun: (runId: string) => void;
}

export function CicdPipelineFlowchart({
  cicdRuns,
  onResolveBuildRun,
}: CicdPipelineFlowchartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<PipelineStageId>("audit");
  const [optimizedStages, setOptimizedStages] = useState<Record<string, boolean>>({});

  const { nodes, edges, bottleneckStage } = useMemo(() => {
    const failedAudit = cicdRuns.find(
      (r) => r.status === "Failed" && r.stage === "Foundry Audit"
    );
    const failedAny = cicdRuns.find((r) => r.status === "Failed");
    const runningTest = cicdRuns.find(
      (r) => r.status === "Running" && r.stage === "Integration Test"
    );
    const latestBuild = cicdRuns.find((r) => r.stage === "Build");
    const latestDeploy = cicdRuns.find((r) => r.stage === "Production Deploy");

    const auditWait = optimizedStages["audit"] ? 6 : failedAudit ? 42 : 24;
    const testWait = optimizedStages["test"] ? 4 : runningTest ? 21 : 9;
    const buildWait = optimizedStages["build"] ? 5 : 18;

    const auditDuration = failedAudit ? 68 : optimizedStages["audit"] ? 34 : 64;
    const testDuration = runningTest ? 47 : optimizedStages["test"] ? 22 : 29;
    const buildDuration = latestBuild?.durationSec ?? (optimizedStages["build"] ? 28 : 52);
    const deployDuration = latestDeploy?.durationSec ?? 41;

    const hasUpstreamFailure = Boolean(failedAudit || failedAny);

    const computedNodes: PipelineStageNode[] = [
      {
        id: "commit",
        label: "Commit & Lint",
        subtitle: "Conventional PR Gate",
        x: 90,
        y: 130,
        status: "Success",
        durationSec: 11,
        queueWaitSec: 2,
        isBottleneck: false,
      },
      {
        id: "test",
        label: "Test",
        subtitle: "Unit & Integration",
        x: 315,
        y: 64,
        status: runningTest ? "Running" : "Success",
        durationSec: testDuration,
        queueWaitSec: testWait,
        isBottleneck: Boolean(runningTest) && !optimizedStages["test"],
        bottleneckReason: runningTest
          ? `Antrean runner Integration Test (${testWait}s wait) pada ${runningTest.repo}.`
          : undefined,
        matchingRun: runningTest,
      },
      {
        id: "audit",
        label: "Security Audit",
        subtitle: "Foundry & Slither ZK",
        x: 315,
        y: 196,
        status: failedAudit ? "Failed" : auditDuration >= 55 ? "Bottleneck" : "Success",
        durationSec: auditDuration,
        queueWaitSec: auditWait,
        isBottleneck: Boolean(failedAudit) || (!optimizedStages["audit"] && auditDuration >= 55),
        bottleneckReason: failedAudit
          ? `Kegagalan invariant check di ${failedAudit.repo} (${failedAudit.branch}) menahan rilis.`
          : !optimizedStages["audit"] && auditDuration >= 55
            ? `Eksekusi simbolik Solidity & verifikasi Slither memakan ${auditDuration}s (+${auditWait}s antrean).`
            : undefined,
        matchingRun: failedAudit,
      },
      {
        id: "build",
        label: "Build",
        subtitle: "Bundle & Container",
        x: 560,
        y: 130,
        status: hasUpstreamFailure
          ? "Blocked"
          : !optimizedStages["build"] && buildDuration >= 50
            ? "Bottleneck"
            : "Success",
        durationSec: buildDuration,
        queueWaitSec: buildWait,
        isBottleneck: !hasUpstreamFailure && !optimizedStages["build"] && buildDuration >= 50,
        bottleneckReason: hasUpstreamFailure
          ? "Menunggu pemulihan kegagalan pada tahap Security Audit."
          : !optimizedStages["build"] && buildDuration >= 50
            ? "Layer image Docker belum di-cache sepenuhnya (+18s build overhead)."
            : undefined,
      },
      {
        id: "deploy",
        label: "Deployment",
        subtitle: "Production Rollout",
        x: 790,
        y: 130,
        status: hasUpstreamFailure ? "Blocked" : "Success",
        durationSec: deployDuration,
        queueWaitSec: 3,
        isBottleneck: false,
        bottleneckReason: hasUpstreamFailure
          ? "Rilis produksi ditahan otomatis oleh ABDICity Bot hingga Security Audit lolos."
          : undefined,
        matchingRun: latestDeploy,
      },
    ];

    const nodeMap = new Map(computedNodes.map((n) => [n.id, n]));

    const computedEdges: PipelineEdge[] = [
      {
        source: "commit",
        target: "test",
        status: nodeMap.get("test")?.isBottleneck ? "Slow" : "Nominal",
      },
      {
        source: "commit",
        target: "audit",
        status:
          nodeMap.get("audit")?.status === "Failed"
            ? "Blocked"
            : nodeMap.get("audit")?.isBottleneck
              ? "Slow"
              : "Nominal",
      },
      {
        source: "test",
        target: "build",
        status: nodeMap.get("build")?.status === "Blocked" ? "Blocked" : "Nominal",
      },
      {
        source: "audit",
        target: "build",
        status:
          nodeMap.get("audit")?.status === "Failed"
            ? "Blocked"
            : nodeMap.get("audit")?.isBottleneck
              ? "Slow"
              : "Nominal",
      },
      {
        source: "build",
        target: "deploy",
        status:
          nodeMap.get("deploy")?.status === "Blocked"
            ? "Blocked"
            : nodeMap.get("build")?.isBottleneck
              ? "Slow"
              : "Nominal",
      },
    ];

    const primaryBottleneck =
      computedNodes.find((n) => n.status === "Failed") ||
      computedNodes.find((n) => n.isBottleneck) ||
      null;

    return {
      nodes: computedNodes,
      edges: computedEdges,
      bottleneckStage: primaryBottleneck,
    };
  }, [cicdRuns, optimizedStages]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedStageId) ?? nodes[2],
    [nodes, selectedStageId]
  );

  // Render D3 Interactive Flowchart SVG
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 900;
    const height = 260;
    const nodeW = 156;
    const nodeH = 68;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");

    const markerConfigs = [
      { id: "arrow-nominal", color: "#059669" },
      { id: "arrow-slow", color: "#D97706" },
      { id: "arrow-blocked", color: "#DC2626" },
    ];

    markerConfigs.forEach((m) => {
      defs
        .append("marker")
        .attr("id", m.id)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 8)
        .attr("refY", 5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 1 L 9 5 L 0 9 z")
        .attr("fill", m.color);
    });

    const nodeLookup = new Map(nodes.map((n) => [n.id, n]));

    const linkGen = d3
      .linkHorizontal<{ source: [number, number]; target: [number, number] }, [number, number]>()
      .x((d) => d[0])
      .y((d) => d[1]);

    // Draw Bezier edges between stages
    const edgeGroup = svg.append("g");
    edges.forEach((edge) => {
      const s = nodeLookup.get(edge.source);
      const t = nodeLookup.get(edge.target);
      if (!s || !t) return;

      const pathData = linkGen({
        source: [s.x + nodeW / 2, s.y],
        target: [t.x - nodeW / 2 - 4, t.y],
      });

      const strokeColor =
        edge.status === "Blocked"
          ? "#DC2626"
          : edge.status === "Slow"
            ? "#D97706"
            : "#059669";

      const markerId =
        edge.status === "Blocked"
          ? "url(#arrow-blocked)"
          : edge.status === "Slow"
            ? "url(#arrow-slow)"
            : "url(#arrow-nominal)";

      edgeGroup
        .append("path")
        .attr("d", pathData || "")
        .attr("fill", "none")
        .attr("stroke", strokeColor)
        .attr("stroke-width", edge.status === "Nominal" ? 2 : 2.4)
        .attr("stroke-dasharray", edge.status === "Blocked" ? "5,4" : edge.status === "Slow" ? "7,3" : "none")
        .attr("marker-end", markerId);
    });

    // Draw Stage Nodes
    const nodeGroups = svg
      .selectAll(".pipeline-node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x - nodeW / 2}, ${d.y - nodeH / 2})`)
      .style("cursor", "pointer")
      .on("click", (_e, d) => setSelectedStageId(d.id));

    const getStrokeColor = (d: PipelineStageNode) => {
      if (d.id === selectedStageId) return "#0F172A";
      if (d.status === "Failed" || d.status === "Blocked") return "#DC2626";
      if (d.status === "Bottleneck" || d.status === "Running" || d.isBottleneck)
        return "#D97706";
      return "#059669";
    };

    // Node card background
    nodeGroups
      .append("rect")
      .attr("width", nodeW)
      .attr("height", nodeH)
      .attr("rx", 10)
      .attr("class", (d) =>
        d.id === selectedStageId
          ? "fill-emerald-50/80 dark:fill-slate-800"
          : "fill-white dark:fill-slate-900"
      )
      .attr("stroke", getStrokeColor)
      .attr("stroke-width", (d) => (d.id === selectedStageId || d.isBottleneck ? 2.2 : 1.4));

    // Top status strip inside node
    nodeGroups
      .append("text")
      .attr("x", 12)
      .attr("y", 20)
      .attr("class", "fill-slate-900 dark:fill-slate-50 font-semibold text-[12px]")
      .text((d) => d.label);

    nodeGroups
      .append("text")
      .attr("x", 12)
      .attr("y", 36)
      .attr("class", "fill-slate-500 dark:fill-slate-400 text-[10px]")
      .text((d) => d.subtitle);

    // Bottom metric row (duration + bottleneck indicator)
    nodeGroups
      .append("text")
      .attr("x", 12)
      .attr("y", 55)
      .attr("class", "font-mono text-[10px] font-semibold tabular-nums")
      .attr("fill", (d) =>
        d.status === "Failed" || d.status === "Blocked"
          ? "#DC2626"
          : d.isBottleneck || d.status === "Running"
            ? "#D97706"
            : "#059669"
      )
      .text((d) => {
        if (d.status === "Failed") return `FAILED · ${d.durationSec}s`;
        if (d.status === "Blocked") return "BLOCKED";
        if (d.isBottleneck) return `BOTTLENECK · ${d.durationSec}s`;
        return `${d.status.toUpperCase()} · ${d.durationSec}s`;
      });

    // Queue wait badge on bottom right
    nodeGroups
      .append("text")
      .attr("x", nodeW - 10)
      .attr("y", 55)
      .attr("text-anchor", "end")
      .attr("class", "fill-slate-400 dark:fill-slate-500 font-mono text-[9.5px] tabular-nums")
      .text((d) => `+${d.queueWaitSec}s q`);
  }, [nodes, edges, selectedStageId]);

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Alur Pipeline CI/CD & Deteksi Bottleneck Real-Time (D3)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Klik setiap node tahap (Commit → Test / Security Audit → Build → Deployment) untuk memeriksa hambatan build.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            Nominal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
            Bottleneck / Running
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
            Failed / Blocked
          </span>
        </div>
      </div>

      {/* D3 DAG Canvas */}
      <div className="w-full overflow-x-auto bg-slate-50/60 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Interactive CI/CD Pipeline Flowchart"
          className="w-full min-w-[700px] h-auto"
        />
      </div>

      {/* Interactive Stage Diagnostics Panel */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {selectedNode.status === "Failed" || selectedNode.status === "Blocked" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : selectedNode.isBottleneck || selectedNode.status === "Running" ? (
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="font-bold text-slate-900 dark:text-slate-50">
              Stage: {selectedNode.label} ({selectedNode.subtitle})
            </span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              · Eksekusi {selectedNode.durationSec}s · Antrean {selectedNode.queueWaitSec}s
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-400 pl-6">
            {selectedNode.bottleneckReason
              ? selectedNode.bottleneckReason
              : bottleneckStage
                ? `Tahap ini berjalan normal. Bottleneck aktif saat ini terdeteksi pada tahap ${bottleneckStage.label}.`
                : "Seluruh tahap pipeline berjalan optimal tanpa hambatan antrean."}
          </p>
        </div>

        <div className="flex items-center gap-2 pl-6 lg:pl-0 shrink-0">
          {selectedNode.matchingRun && selectedNode.status === "Failed" && (
            <button
              type="button"
              onClick={() => onResolveBuildRun(selectedNode.matchingRun!.id)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Pulihkan & Retry Stage</span>
            </button>
          )}

          {(selectedNode.id === "audit" ||
            selectedNode.id === "test" ||
            selectedNode.id === "build") &&
            selectedNode.status !== "Failed" && (
              <button
                type="button"
                onClick={() =>
                  setOptimizedStages((prev) => ({
                    ...prev,
                    [selectedNode.id]: !prev[selectedNode.id],
                  }))
                }
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer whitespace-nowrap"
              >
                {optimizedStages[selectedNode.id]
                  ? "Kembalikan Baseline Cache"
                  : "Aktifkan Cache & Paralelisasi"}
              </button>
            )}
        </div>
      </div>
    </section>
  );
}
