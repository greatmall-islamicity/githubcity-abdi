import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Pause,
  Play,
  RotateCcw,
  Search,
  Terminal,
} from "lucide-react";
import { CICDRun } from "../types";

type LogLevel = "INFO" | "WARN" | "ERROR";

interface TerminalLogLine {
  lineNumber: number;
  timeOffsetSec: number;
  stage: string;
  level: LogLevel;
  message: string;
}

interface CicdLiveTerminalLogsProps {
  cicdRuns: CICDRun[];
  selectedRunId?: string;
  onSelectRun?: (runId: string) => void;
  onResolveBuildRun: (runId: string) => void;
}

function generateLogsForRun(run: CICDRun): TerminalLogLine[] {
  const isSmartContract = run.repo.includes("smart-contracts");
  const isAiEngine = run.repo.includes("mustahik-ai");
  const isIndexer = run.repo.includes("indexer");

  const lines: Omit<TerminalLogLine, "lineNumber">[] = [
    {
      timeOffsetSec: 0.2,
      stage: "Setup",
      level: "INFO",
      message: `Runner 'abdcity-ubuntu-24.04-node-03' initialized (GitHub App #48921)`,
    },
    {
      timeOffsetSec: 1.1,
      stage: "Checkout",
      level: "INFO",
      message: `git fetch origin ${run.branch} && git checkout ${run.commitSha} (${run.repo})`,
    },
    {
      timeOffsetSec: 2.4,
      stage: "Bot Gate",
      level: "INFO",
      message: `ABDICity-Integration-Bot: Verified conventional commit header & signed GPG commit`,
    },
    {
      timeOffsetSec: 4.8,
      stage: "Install",
      level: "INFO",
      message: isSmartContract
        ? `forge install --no-commit && solc 0.8.26 cached (0.9s)`
        : `npm ci --prefer-offline --audit=false (packages verified via SHA-512 lockfile)`,
    },
    {
      timeOffsetSec: 8.3,
      stage: "Test",
      level: "INFO",
      message: isSmartContract
        ? `Running 42 unit tests & 1,024 invariant fuzz sequences in test/ZakatEscrow8Asnaf.t.sol`
        : isAiEngine
          ? `pytest tests/test_mustahik_dedup.py --cov=engine (threshold >= 90%)`
          : `vitest run --reporter=verbose (AES-256-GCM envelope & QRIS payload suites)`,
    },
  ];

  if (run.status === "Failed") {
    lines.push(
      {
        timeOffsetSec: 12.6,
        stage: run.stage,
        level: "WARN",
        message: isSmartContract
          ? `Detected gas spike on batchMerkleVerify(): 1,842,110 gas exceeds soft cap (1,500,000)`
          : `Retry attempt 1/2 on verification sandbox RPC endpoint`,
      },
      {
        timeOffsetSec: 15.9,
        stage: run.stage,
        level: "ERROR",
        message: isSmartContract
          ? `FAIL [invariant_8AsnafMultisigTimelock]: Emergency pool release bypassed 24h timelock check (src/ZakatEscrow.sol:218)`
          : isAiEngine
            ? `AssertionError: Duplicate household hash collision detected for cluster NTB-04 (expected 0, got 3)`
            : `ERR_BUILD_GATE: Webhook signature verification failed for payload digest sha256=9f81c2`,
      },
      {
        timeOffsetSec: 17.4,
        stage: run.stage,
        level: "ERROR",
        message: `Trace: at EscrowVault.releaseEmergency (ZakatEscrow.sol:218:9) <- TimelockGuard.checkQuorum (TimelockGuard.sol:74:5)`,
      },
      {
        timeOffsetSec: 18.8,
        stage: "Webhook",
        level: "ERROR",
        message: `Process exited with code 1. Production release BLOCKED by ABDICity Bot; escalation alert dispatched.`,
      }
    );
  } else if (run.status === "Running") {
    lines.push(
      {
        timeOffsetSec: 11.4,
        stage: "Test",
        level: "INFO",
        message: isAiEngine
          ? `Passed 18/18 deduplication assertions · F1-score 0.964`
          : `Passed 38/38 unit & integration checks`,
      },
      {
        timeOffsetSec: 15.2,
        stage: run.stage,
        level: "WARN",
        message: `Stage '${run.stage}' running (awaiting deterministic worker #2 checksum)...`,
      },
      {
        timeOffsetSec: 21.0,
        stage: run.stage,
        level: "INFO",
        message: `Streaming live telemetry from worker pod abdcity-ci-${run.commitSha.slice(0, 4)}...`,
      }
    );
  } else {
    lines.push(
      {
        timeOffsetSec: 14.2,
        stage: "Security Audit",
        level: "INFO",
        message: isSmartContract
          ? `Foundry invariant & Slither static audit: 0 critical, 0 high, 0 medium findings`
          : `SLSA Level-3 provenance & dependency CVE scan passed (0 vulnerabilities)`,
      },
      {
        timeOffsetSec: 26.5,
        stage: "Build",
        level: "INFO",
        message: isIndexer
          ? `Built Polygon/Base event indexer binary + ABI bindings (sha256:4a91f8e2...)`
          : `Production bundle compiled cleanly (gzipped 142.8 kB, zero warnings)`,
      },
      {
        timeOffsetSec: Math.max(30, run.durationSec - 6),
        stage: "Deploy",
        level: "INFO",
        message: `Zero-downtime rollout to production node pool complete · Health probe /api/health -> 200 OK`,
      },
      {
        timeOffsetSec: run.durationSec,
        stage: "Webhook",
        level: "INFO",
        message: `Pipeline finished with exit code 0 in ${run.durationSec}s · Ledger proof anchored.`,
      }
    );
  }

  return lines.map((item, idx) => ({
    ...item,
    lineNumber: idx + 1,
  }));
}

function formatLogTimestamp(baseTimestamp: string, offsetSec: number): string {
  // baseTimestamp looks like "2026-11-15 03:40 UTC"
  const match = baseTimestamp.match(/(\d{2}):(\d{2})/);
  const baseH = match ? Number(match[1]) : 3;
  const baseM = match ? Number(match[2]) : 40;
  const totalMs = Math.round(offsetSec * 1000);
  const addSec = Math.floor(totalMs / 1000);
  const ms = String(totalMs % 1000).padStart(3, "0");
  const totalSec = baseH * 3600 + baseM * 60 + addSec;
  const hh = String(Math.floor(totalSec / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function CicdLiveTerminalLogs({
  cicdRuns,
  selectedRunId,
  onSelectRun,
  onResolveBuildRun,
}: CicdLiveTerminalLogsProps) {
  const [internalRunId, setInternalRunId] = useState<string>(
    cicdRuns[0]?.id ?? ""
  );
  const activeRunId = selectedRunId ?? internalRunId;

  // Auto-follow newest run when a new run is prepended (e.g. Simulate Failure or Trigger Webhook)
  const newestRunId = cicdRuns[0]?.id;
  const prevNewestRef = useRef<string | undefined>(newestRunId);
  useEffect(() => {
    if (newestRunId && prevNewestRef.current !== newestRunId) {
      prevNewestRef.current = newestRunId;
      if (onSelectRun) {
        onSelectRun(newestRunId);
      } else {
        setInternalRunId(newestRunId);
      }
    }
  }, [newestRunId, onSelectRun]);

  const activeRun = useMemo(
    () => cicdRuns.find((r) => r.id === activeRunId) ?? cicdRuns[0] ?? null,
    [cicdRuns, activeRunId]
  );

  const fullLogs = useMemo(
    () => (activeRun ? generateLogsForRun(activeRun) : []),
    [activeRun]
  );

  const [visibleCount, setVisibleCount] = useState<number>(fullLogs.length);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [levelFilter, setLevelFilter] = useState<"ALL" | LogLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [tickCount, setTickCount] = useState<number>(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Reset & start live streaming sequence whenever activeRun changes
  useEffect(() => {
    if (!activeRun) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setTickCount(0);
    if (reducedMotion) {
      setVisibleCount(fullLogs.length);
      setIsStreaming(false);
    } else {
      setVisibleCount(2);
      setIsStreaming(true);
    }
  }, [activeRun?.id, activeRun?.status, fullLogs.length]);

  // Progressive streaming interval
  useEffect(() => {
    if (!isStreaming || !activeRun) return;

    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev < fullLogs.length) {
          return prev + 1;
        }
        // If run is actively "Running", append live heartbeat ticks
        if (activeRun.status === "Running") {
          setTickCount((t) => (t < 8 ? t + 1 : t));
          return prev;
        }
        setIsStreaming(false);
        return prev;
      });
    }, 320);

    return () => clearInterval(timer);
  }, [isStreaming, activeRun, fullLogs.length]);

  const streamedLogs = useMemo(() => {
    const base = fullLogs.slice(0, visibleCount);
    if (activeRun?.status === "Running" && tickCount > 0) {
      const extra: TerminalLogLine[] = Array.from({ length: tickCount }).map(
        (_, i) => ({
          lineNumber: fullLogs.length + i + 1,
          timeOffsetSec: 23 + i * 2.4,
          stage: activeRun.stage,
          level: "INFO" as LogLevel,
          message: `heartbeat[${i + 1}]: worker sandbox verified ${
            (i + 1) * 128
          } ledger test assertions (mem: ${184 + i * 3}MB)`,
        })
      );
      return [...base, ...extra];
    }
    return base;
  }, [fullLogs, visibleCount, activeRun, tickCount]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return streamedLogs.filter((line) => {
      const matchesLevel = levelFilter === "ALL" || line.level === levelFilter;
      if (!q) return matchesLevel;
      return (
        matchesLevel &&
        (line.message.toLowerCase().includes(q) ||
          line.stage.toLowerCase().includes(q))
      );
    });
  }, [streamedLogs, levelFilter, searchQuery]);

  // Auto-scroll terminal viewport as new streamed lines appear
  useEffect(() => {
    if (viewportRef.current && isStreaming) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [filteredLogs.length, isStreaming]);

  const handleSelectRun = (id: string) => {
    if (onSelectRun) {
      onSelectRun(id);
    } else {
      setInternalRunId(id);
    }
  };

  const handleReplay = () => {
    setTickCount(0);
    setVisibleCount(1);
    setIsStreaming(true);
  };

  const handleCopy = async () => {
    if (!activeRun) return;
    const text = filteredLogs
      .map(
        (l) =>
          `${formatLogTimestamp(activeRun.timestamp, l.timeOffsetSec)} [${l.level}] [${l.stage}] ${l.message}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in sandbox fallback ignored cleanly
    }
  };

  if (!activeRun) return null;

  const errorCount = streamedLogs.filter((l) => l.level === "ERROR").length;
  const warnCount = streamedLogs.filter((l) => l.level === "WARN").length;

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
      {/* Section Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Live Streaming Log Terminal CI/CD
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspeksi stdout/stderr pipeline GitHub Actions secara real-time untuk transparansi penuh atas status build maupun penyebab kegagalan.
          </p>
        </div>

        {/* Pipeline Run Selector & Stream Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Pilih pipeline run untuk log"
            value={activeRun.id}
            onChange={(e) => handleSelectRun(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {cicdRuns.map((run) => (
              <option key={run.id} value={run.id}>
                {run.repo} ({run.commitSha}) · {run.status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsStreaming((s) => !s)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Stream</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Logs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Filter & Telemetry Toolbar */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {activeRun.repo}@{activeRun.branch}
          </span>
          <span aria-hidden="true">·</span>
          <span>SHA {activeRun.commitSha}</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              activeRun.status === "Failed"
                ? "text-rose-600 dark:text-rose-400 font-semibold"
                : activeRun.status === "Running"
                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-emerald-700 dark:text-emerald-400 font-semibold"
            }
          >
            {activeRun.status === "Failed"
              ? "Exit Code 1 (Failed)"
              : activeRun.status === "Running"
                ? "Streaming Active"
                : "Exit Code 0 (Passed)"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {errorCount} error / {warnCount} warn
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Grep log output..."
              className="pl-8 pr-3 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="inline-flex items-center p-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                  levelFilter === lvl
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dark Console Terminal Output */}
      <div
        ref={viewportRef}
        role="log"
        aria-live="polite"
        aria-label="CI/CD Pipeline Terminal Output"
        className="bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed p-4 h-72 overflow-y-auto space-y-1.5"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 py-8 text-center">
            Tidak ada baris log yang cocok dengan filter ({levelFilter}).
          </div>
        ) : (
          filteredLogs.map((line) => (
            <div
              key={`${activeRun.id}-${line.lineNumber}`}
              className={`flex items-start gap-3 px-2 py-0.5 rounded ${
                line.level === "ERROR"
                  ? "bg-rose-950/50 text-rose-200"
                  : line.level === "WARN"
                    ? "bg-amber-950/40 text-amber-200"
                    : "hover:bg-slate-900/80"
              }`}
            >
              <span className="text-slate-600 select-none w-6 text-right shrink-0 tabular-nums">
                {line.lineNumber}
              </span>
              <span className="text-slate-500 shrink-0 tabular-nums">
                {formatLogTimestamp(activeRun.timestamp, line.timeOffsetSec)}
              </span>
              <span
                className={`w-12 shrink-0 font-bold ${
                  line.level === "ERROR"
                    ? "text-rose-400"
                    : line.level === "WARN"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                [{line.level}]
              </span>
              <span className="text-slate-400 w-28 truncate shrink-0">
                [{line.stage}]
              </span>
              <span className="break-all flex-1">{line.message}</span>
            </div>
          ))
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 px-2 pt-1 text-emerald-400">
            <span className="text-slate-600 w-6 text-right select-none">›</span>
            <span>Streaming worker output...</span>
          </div>
        )}
      </div>

      {/* Diagnostic Footer for Failed or Passed Build */}
      <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {activeRun.status === "Failed" ? (
          <>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Build gagal pada stage <span className="font-mono font-bold">{activeRun.stage}</span>. Rilis produksi ditahan otomatis oleh ABDICity Bot.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onResolveBuildRun(activeRun.id)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Terapkan Fix & Retry Deploy
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Menampilkan {filteredLogs.length} baris stdout/stderr untuk{" "}
              <span className="font-mono text-slate-900 dark:text-slate-200">
                {activeRun.id}
              </span>
              .
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
