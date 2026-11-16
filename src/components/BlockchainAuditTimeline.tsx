import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { CheckCircle2, Clock, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { formatIdr } from "../data/platformData";
import { BlockchainTransaction, FundType } from "../types";

interface BlockchainAuditTimelineProps {
  transactions: BlockchainTransaction[];
  onInspectTransaction: (tx: BlockchainTransaction) => void;
}

export function BlockchainAuditTimeline({
  transactions,
  onInspectTransaction,
}: BlockchainAuditTimelineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "Verified On-Chain" | "Distributing"
  >("ALL");
  const [fundFilter, setFundFilter] = useState<"ALL" | FundType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedTx, setFocusedTx] = useState<BlockchainTransaction | null>(null);

  const sortedChronological = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...transactions]
      .filter((tx) => {
        const matchesStatus =
          statusFilter === "ALL" || tx.status === statusFilter;
        const matchesFund = fundFilter === "ALL" || tx.fundType === fundFilter;
        if (!q) return matchesStatus && matchesFund;
        return (
          matchesStatus &&
          matchesFund &&
          (tx.txHash.toLowerCase().includes(q) ||
            tx.donorDisplay.toLowerCase().includes(q) ||
            tx.campaignTitle.toLowerCase().includes(q) ||
            String(tx.blockHeight).includes(q))
        );
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [transactions, statusFilter, fundFilter, searchQuery]);

  const chainHeadBlock = useMemo(() => {
    const maxBlock = Math.max(
      19842310,
      ...transactions.map((t) => t.blockHeight)
    );
    return maxBlock + 12;
  }, [transactions]);

  const activeInspectTx =
    focusedTx ?? sortedChronological[sortedChronological.length - 1] ?? null;

  // D3 Timeline Chart: Timestamp (X) vs Block Confirmation Height (Y)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 960;
    const height = 290;
    const margin = { top: 24, right: 32, bottom: 38, left: 82 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    if (sortedChronological.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "fill-slate-400 text-xs")
        .text("Tidak ada transaksi blockchain untuk filter saat ini.");
      return;
    }

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const dates = sortedChronological.map((d) => new Date(d.timestamp));
    const minDate = d3.min(dates) ?? new Date();
    const maxDate = d3.max(dates) ?? new Date();
    // Pad time domain slightly so edge points don't clip
    const timePad = Math.max(180000, (maxDate.getTime() - minDate.getTime()) * 0.08);
    const x = d3
      .scaleTime()
      .domain([
        new Date(minDate.getTime() - timePad),
        new Date(maxDate.getTime() + timePad),
      ])
      .range([0, innerW]);

    const minBlock = d3.min(sortedChronological, (d) => d.blockHeight) ?? 19842180;
    const maxBlock = d3.max(sortedChronological, (d) => d.blockHeight) ?? 19842320;
    const blockPad = Math.max(10, Math.round((maxBlock - minBlock) * 0.15));

    const y = d3
      .scaleLinear()
      .domain([minBlock - blockPad, maxBlock + blockPad])
      .nice()
      .range([innerH, 0]);

    // Horizontal gridlines
    g.selectAll(".grid-y")
      .data(y.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    // Vertical time gridlines
    g.selectAll(".grid-x")
      .data(x.ticks(6))
      .enter()
      .append("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("class", "stroke-slate-200/70 dark:stroke-slate-800/70")
      .attr("stroke-dasharray", "2,2");

    // Y axis (Block Confirmation Height)
    const yAxis = d3
      .axisLeft(y)
      .ticks(5)
      .tickSize(0)
      .tickFormat((d) => `#${d}`);
    const yAxisG = g.append("g").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      )
      .attr("dx", "-6");

    // X axis (Timestamps)
    const xAxis = d3
      .axisBottom<Date>(x)
      .ticks(6)
      .tickSize(0)
      .tickFormat((d) =>
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 10})`)
      .call(xAxis);
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      );

    // Block chain sequence line
    const lineGen = d3
      .line<BlockchainTransaction>()
      .x((d) => x(new Date(d.timestamp)))
      .y((d) => y(d.blockHeight))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(sortedChronological)
      .attr("fill", "none")
      .attr("stroke", "#059669")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.55)
      .attr("d", lineGen);

    // Transaction Nodes
    const nodeG = g
      .selectAll(".tx-node")
      .data(sortedChronological)
      .enter()
      .append("g")
      .attr(
        "transform",
        (d) => `translate(${x(new Date(d.timestamp))}, ${y(d.blockHeight)})`
      )
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setFocusedTx(d))
      .on("click", (_e, d) => {
        setFocusedTx(d);
        onInspectTransaction(d);
      });

    // Outer confirmation halo
    nodeG
      .append("circle")
      .attr("r", (d) => (activeInspectTx?.id === d.id ? 11 : 8))
      .attr("fill", "none")
      .attr("stroke", (d) =>
        d.status === "Verified On-Chain" ? "#059669" : "#D97706"
      )
      .attr("stroke-width", (d) => (activeInspectTx?.id === d.id ? 2 : 1.2))
      .attr("stroke-dasharray", (d) =>
        d.status === "Distributing" ? "3,2" : "none"
      )
      .attr("opacity", 0.7);

    // Inner status dot
    nodeG
      .append("circle")
      .attr("r", 5)
      .attr("fill", (d) =>
        d.status === "Verified On-Chain" ? "#059669" : "#D97706"
      );

    // Compact block & tx label above each point
    nodeG
      .append("text")
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .attr(
        "class",
        "fill-slate-700 dark:fill-slate-300 font-mono text-[9.5px] tabular-nums font-medium"
      )
      .text((d) => `${d.id}`);
  }, [sortedChronological, activeInspectTx?.id, onInspectTransaction]);

  return (
    <div className="space-y-6">
      {/* D3 Timeline Container */}
      <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Timeline Audit Log Blockchain (D3 Real-Time)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Jejak kronologis setiap transaksi on-chain beserta timestamp, status verifikasi, dan ketinggian blok konfirmasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari hash, blok, atau donatur..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <select
              aria-label="Filter status verifikasi"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "ALL" | "Verified On-Chain" | "Distributing"
                )
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Verified On-Chain">Verified On-Chain</option>
              <option value="Distributing">Distributing</option>
            </select>

            <select
              aria-label="Filter jenis dana"
              value={fundFilter}
              onChange={(e) => setFundFilter(e.target.value as "ALL" | FundType)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Semua Jenis Dana</option>
              <option value="Zakat Mal">Zakat Mal</option>
              <option value="Zakat Fitrah">Zakat Fitrah</option>
              <option value="Wakaf Produktif">Wakaf Produktif</option>
              <option value="Infaq & Emergency">Infaq & Emergency</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              Verified On-Chain
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
              Distributing (Menunggu Finalisasi)
            </span>
          </div>
          <span className="font-mono tabular-nums text-[11px]">
            Chain Head: #{chainHeadBlock} · {sortedChronological.length} entri audit
          </span>
        </div>

        {/* D3 Timeline SVG */}
        <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 p-3">
          <svg
            ref={svgRef}
            role="img"
            aria-label="Blockchain Transaction Audit Timeline"
            className="w-full min-w-[700px] h-auto"
          />
        </div>

        {/* Selected Transaction Inspection Strip */}
        {activeInspectTx && (
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {activeInspectTx.status === "Verified On-Chain" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span className="font-mono font-bold text-slate-900 dark:text-slate-50">
                  {activeInspectTx.id} · Block #{activeInspectTx.blockHeight}
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  ({Math.max(1, chainHeadBlock - activeInspectTx.blockHeight)} konfirmasi)
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  · {new Date(activeInspectTx.timestamp).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="pl-6 text-slate-600 dark:text-slate-400">
                {activeInspectTx.donorDisplay} ({activeInspectTx.walletProvider}) →{" "}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {activeInspectTx.campaignTitle}
                </span>{" "}
                ·{" "}
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatIdr(activeInspectTx.amountIdr)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onInspectTransaction(activeInspectTx)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Periksa Bukti Kriptografi</span>
            </button>
          </div>
        )}
      </section>

      {/* Chronological Audit Log Stream Table */}
      <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Riwayat Lengkap Audit Log Terverifikasi
            </h3>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Urutan Kronologis Terbaru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/60">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Tx ID & Hash</th>
                <th className="py-3 px-4">Block Confirmation Height</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-right">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {[...sortedChronological].reverse().map((tx) => {
                const confirmations = Math.max(
                  1,
                  chainHeadBlock - tx.blockHeight
                );
                return (
                  <tr
                    key={tx.id}
                    onMouseEnter={() => setFocusedTx(tx)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {tx.id}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tx.txHash.slice(0, 14)}...{tx.txHash.slice(-6)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        #{tx.blockHeight}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {confirmations} konfirmasi blok
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.status === "Verified On-Chain" ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Verified On-Chain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          Distributing
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatIdr(tx.amountIdr)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectTransaction(tx)}
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium whitespace-nowrap cursor-pointer"
                      >
                        Inspeksi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
