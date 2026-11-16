import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Film,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { formatIdr } from "../data/platformData";
import { WORLD_GEOJSON } from "./GlobalImpactGeoMap";
import {
  BlockchainTransaction,
  Campaign,
  FundType,
  MustahikRegion,
} from "../types";

interface GlobalImpactReelModalProps {
  campaigns: Campaign[];
  regions: MustahikRegion[];
  transactions: BlockchainTransaction[];
  onClose: () => void;
  onQuickDonate: (campaign?: Campaign) => void;
}

type ReelScene = 0 | 1 | 2;
type ReelMapFocus = "global" | "sea" | "mena";

interface ProjectProgressDay {
  date: Date;
  dateLabel: string;
  wakafSolarPct: number;
  zakatEduPct: number;
  reliefUrgentPct: number;
  cumulativeDisbursedIdr: number;
}

interface AidDeliverySite {
  id: string;
  siteName: string;
  country: string;
  coords: [number, number]; // [lon, lat]
  hubCoords: [number, number];
  hubName: string;
  fundType: FundType;
  delivered30dIdr: number;
  householdsServed: number;
  deliveryBatches: number;
  completionPct: number;
  highlight: string;
  linkedCampaign?: Campaign;
}

const SITE_COORDS: Record<
  string,
  { coords: [number, number]; hubCoords: [number, number]; hubName: string; batches: number }
> = {
  "reg-ntb": {
    coords: [116.53, -8.65],
    hubCoords: [106.8456, -6.2088],
    hubName: "Jakarta Logistics Node",
    batches: 14,
  },
  "reg-aceh": {
    coords: [97.14, 5.18],
    hubCoords: [101.6869, 3.139],
    hubName: "Kuala Lumpur Zakat Hub",
    batches: 11,
  },
  "reg-jabar": {
    coords: [107.45, -7.22],
    hubCoords: [106.8456, -6.2088],
    hubName: "Jakarta Logistics Node",
    batches: 19,
  },
  "reg-sulsel": {
    coords: [119.43, -5.14],
    hubCoords: [106.8456, -6.2088],
    hubName: "Jakarta Logistics Node",
    batches: 9,
  },
  "reg-mena": {
    coords: [35.2, 31.5],
    hubCoords: [55.2708, 25.2048],
    hubName: "Dubai Humanitarian Gateway",
    batches: 22,
  },
};

const SCENE_DURATION_MS = 6500;

export function GlobalImpactReelModal({
  campaigns,
  regions,
  transactions,
  onClose,
  onQuickDonate,
}: GlobalImpactReelModalProps) {
  const [scene, setScene] = useState<ReelScene>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [sceneProgress, setSceneProgress] = useState<number>(0);

  // Scene 1 animated counter progress (0..1)
  const [countRatio, setCountRatio] = useState<number>(0);

  // Scene 2 D3 Line Chart state
  const lineSvgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredDay, setHoveredDay] = useState<ProjectProgressDay | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<{
    wakafSolar: boolean;
    zakatEdu: boolean;
    reliefUrgent: boolean;
  }>({
    wakafSolar: true,
    zakatEdu: true,
    reliefUrgent: true,
  });

  // Scene 3 Interactive Aid Map state
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const [mapFocus, setMapFocus] = useState<ReelMapFocus>("global");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("reg-mena");
  const [hoveredSite, setHoveredSite] = useState<AidDeliverySite | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Auto-advance reel scenes when playing
  useEffect(() => {
    if (!isPlaying) return;
    const stepMs = 100;
    const interval = setInterval(() => {
      setSceneProgress((prev) => {
        const next = prev + (stepMs / SCENE_DURATION_MS) * 100;
        if (next >= 100) {
          setScene((s) => ((s + 1) % 3) as ReelScene);
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Smooth count-up animation when entering Scene 0
  useEffect(() => {
    if (scene !== 0) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setCountRatio(1);
      return;
    }
    setCountRatio(0);
    const start = performance.now();
    const duration = 650;
    let rafId = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setCountRatio(eased);
      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      }
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [scene]);

  // Compute past-month metrics from live platform collections
  const pastMonthMetrics = useMemo(() => {
    const totalAllocatedIdr = regions.reduce((acc, r) => acc + r.allocatedIdr, 0);
    const pastMonthDistributedIdr = Math.round(totalAllocatedIdr * 0.44) +
      transactions.reduce((acc, tx) => acc + tx.amountIdr, 0);
    const totalHouseholds = regions.reduce(
      (acc, r) => acc + r.registeredHouseholds,
      0
    );
    const pastMonthHouseholds = Math.round(totalHouseholds * 0.38);
    const verifiedBatches = Object.values(SITE_COORDS).reduce(
      (acc, s) => acc + s.batches,
      0
    );
    const avgDisbursedPct = Math.round(
      regions.reduce((acc, r) => acc + r.disbursedPct, 0) /
        Math.max(1, regions.length)
    );
    return {
      pastMonthDistributedIdr,
      pastMonthHouseholds,
      verifiedBatches,
      avgDisbursedPct,
      deliverySitesCount: regions.length,
    };
  }, [regions, transactions]);

  // Build 30-day project progress trajectory anchored on Nov 15, 2026
  const progressSeries = useMemo<ProjectProgressDay[]>(() => {
    const anchorEnd = new Date(2026, 10, 15);
    const solarCamp = campaigns.find((c) => c.id === "cmp-wakaf-solar");
    const eduCamp = campaigns.find((c) => c.id === "cmp-zakat-edu");
    const reliefCamp = campaigns.find((c) => c.id === "cmp-relief-urgent");

    const solarTargetPct = solarCamp
      ? Math.min(100, Math.round((solarCamp.raisedIdr / solarCamp.targetIdr) * 100))
      : 77;
    const eduTargetPct = eduCamp
      ? Math.min(100, Math.round((eduCamp.raisedIdr / eduCamp.targetIdr) * 100))
      : 76;
    const reliefTargetPct = reliefCamp
      ? Math.min(100, Math.round((reliefCamp.raisedIdr / reliefCamp.targetIdr) * 100))
      : 86;

    const solarStart = Math.max(18, solarTargetPct - 24);
    const eduStart = Math.max(16, eduTargetPct - 22);
    const reliefStart = Math.max(22, reliefTargetPct - 29);

    const points: ProjectProgressDay[] = [];
    let runningIdr = 1_120_000_000;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchorEnd);
      d.setDate(anchorEnd.getDate() - i);
      const t = (29 - i) / 29; // 0 -> 1
      const sCurve = t * t * (3 - 2 * t);
      const jitter = Math.sin((29 - i) * 0.6) * 0.9;

      const wakafSolarPct = Math.min(
        solarTargetPct,
        Math.round((solarStart + (solarTargetPct - solarStart) * sCurve + (i === 0 ? 0 : jitter)) * 10) / 10
      );
      const zakatEduPct = Math.min(
        eduTargetPct,
        Math.round((eduStart + (eduTargetPct - eduStart) * Math.pow(t, 0.9) + (i === 0 ? 0 : jitter * 0.7)) * 10) / 10
      );
      const reliefUrgentPct = Math.min(
        reliefTargetPct,
        Math.round((reliefStart + (reliefTargetPct - reliefStart) * Math.pow(t, 0.78)) * 10) / 10
      );

      runningIdr += Math.round(34_000_000 + ((29 - i) % 5) * 9_500_000);

      points.push({
        date: d,
        dateLabel: d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        }),
        wakafSolarPct: i === 0 ? solarTargetPct : wakafSolarPct,
        zakatEduPct: i === 0 ? eduTargetPct : zakatEduPct,
        reliefUrgentPct: i === 0 ? reliefTargetPct : reliefUrgentPct,
        cumulativeDisbursedIdr: runningIdr,
      });
    }

    return points;
  }, [campaigns]);

  // Build Aid Delivery Sites for Scene 3 Interactive Map
  const deliverySites = useMemo<AidDeliverySite[]>(() => {
    return regions.map((r) => {
      const geo = SITE_COORDS[r.id] ?? {
        coords: [106.8456, -6.2088],
        hubCoords: [106.8456, -6.2088],
        hubName: "Jakarta Node",
        batches: 8,
      };
      const linkedCampaign = campaigns.find((c) => c.fundType === r.recommendedPool);
      return {
        id: r.id,
        siteName: r.name,
        country: r.country,
        coords: geo.coords,
        hubCoords: geo.hubCoords,
        hubName: geo.hubName,
        fundType: r.recommendedPool,
        delivered30dIdr: Math.round(r.allocatedIdr * 0.44),
        householdsServed: Math.round(r.registeredHouseholds * 0.38),
        deliveryBatches: geo.batches,
        completionPct: r.disbursedPct,
        highlight: linkedCampaign
          ? linkedCampaign.lastProgressUpdate
          : `Penyaluran ${r.topAsnaf} terverifikasi on-chain`,
        linkedCampaign,
      };
    });
  }, [regions, campaigns]);

  const activeSite = useMemo(
    () =>
      hoveredSite ??
      deliverySites.find((s) => s.id === selectedSiteId) ??
      deliverySites[0] ??
      null,
    [hoveredSite, deliverySites, selectedSiteId]
  );

  // Scene 2: D3 Animated Line Chart for 30-Day Project Progress
  useEffect(() => {
    if (scene !== 1) return;
    const svgEl = lineSvgRef.current;
    if (!svgEl || progressSeries.length === 0) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 820;
    const height = 270;
    const margin = { top: 20, right: 24, bottom: 32, left: 48 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scaleTime()
      .domain([
        progressSeries[0].date,
        progressSeries[progressSeries.length - 1].date,
      ])
      .range([0, innerW]);

    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    // Horizontal Gridlines
    g.selectAll(".grid-y")
      .data([20, 40, 60, 80, 100])
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("class", "stroke-slate-200 dark:stroke-slate-800")
      .attr("stroke-dasharray", "2,2");

    // Y Axis
    const yAxisG = g.append("g").call(
      d3
        .axisLeft(y)
        .tickValues([0, 25, 50, 75, 100])
        .tickSize(0)
        .tickFormat((d) => `${d}%`)
    );
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      )
      .attr("dx", "-6");

    // X Axis
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0, ${innerH + 8})`)
      .call(
        d3
          .axisBottom<Date>(x)
          .ticks(6)
          .tickSize(0)
          .tickFormat((d) =>
            d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
          )
      );
    xAxisG.select(".domain").remove();
    xAxisG
      .selectAll("text")
      .attr(
        "class",
        "fill-slate-500 dark:fill-slate-400 font-mono text-[10px] tabular-nums"
      );

    const configs: {
      key: keyof typeof visibleSeries;
      color: string;
      accessor: (d: ProjectProgressDay) => number;
    }[] = [
      {
        key: "reliefUrgent",
        color: "#D97706",
        accessor: (d) => d.reliefUrgentPct,
      },
      {
        key: "wakafSolar",
        color: "#059669",
        accessor: (d) => d.wakafSolarPct,
      },
      {
        key: "zakatEdu",
        color: "#0284C7",
        accessor: (d) => d.zakatEduPct,
      },
    ];

    configs.forEach((cfg) => {
      if (!visibleSeries[cfg.key]) return;

      const areaGen = d3
        .area<ProjectProgressDay>()
        .x((d) => x(d.date))
        .y0(innerH)
        .y1((d) => y(cfg.accessor(d)))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(progressSeries)
        .attr("fill", cfg.color)
        .attr("fill-opacity", 0.08)
        .attr("d", areaGen);

      const lineGen = d3
        .line<ProjectProgressDay>()
        .x((d) => x(d.date))
        .y((d) => y(cfg.accessor(d)))
        .curve(d3.curveMonotoneX);

      const path = g
        .append("path")
        .datum(progressSeries)
        .attr("fill", "none")
        .attr("stroke", cfg.color)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("d", lineGen);

      const pathNode = path.node();
      if (pathNode && !reducedMotion) {
        const totalLength = pathNode.getTotalLength();
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(950)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      // End node dot
      const lastPt = progressSeries[progressSeries.length - 1];
      g.append("circle")
        .attr("cx", x(lastPt.date))
        .attr("cy", y(cfg.accessor(lastPt)))
        .attr("r", 4.5)
        .attr("fill", cfg.color)
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 1.5);
    });

    // Interactive invisible scrub columns
    const colW = innerW / Math.max(1, progressSeries.length);
    g.selectAll(".scrub-col")
      .data(progressSeries)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.date) - colW / 2)
      .attr("y", 0)
      .attr("width", colW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mouseenter", (_e, d) => {
        setIsPlaying(false);
        setHoveredDay(d);
      })
      .on("mouseleave", () => setHoveredDay(null));
  }, [scene, progressSeries, visibleSeries]);

  // Scene 3: Interactive D3 Aid Delivery Sites Map
  useEffect(() => {
    if (scene !== 2) return;
    const svgEl = mapSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 620;
    const height = 310;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    let projection: d3.GeoProjection;
    if (mapFocus === "sea") {
      projection = d3
        .geoMercator()
        .center([111, -2])
        .scale(760)
        .translate([width / 2, height / 2]);
    } else if (mapFocus === "mena") {
      projection = d3
        .geoMercator()
        .center([39, 29])
        .scale(520)
        .translate([width / 2, height / 2]);
    } else {
      projection = d3
        .geoNaturalEarth1()
        .fitExtent(
          [
            [12, 12],
            [width - 12, height - 12],
          ],
          WORLD_GEOJSON
        );
    }

    const pathGen = d3.geoPath(projection);
    const graticule = d3.geoGraticule10();

    svg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("class", "fill-slate-100/80 dark:fill-slate-950");

    svg
      .append("path")
      .datum(graticule)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("class", "stroke-slate-200/80 dark:stroke-slate-800/80")
      .attr("stroke-width", 0.5);

    svg
      .selectAll(".reel-land")
      .data(WORLD_GEOJSON.features)
      .enter()
      .append("path")
      .attr("d", (d) => pathGen(d) ?? "")
      .attr(
        "class",
        "fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700"
      )
      .attr("stroke-width", 0.7);

    // Dispatch arcs from regional hubs to aid delivery sites
    deliverySites.forEach((site) => {
      const geoLine: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [site.hubCoords, site.coords],
        },
      };
      const dStr = pathGen(geoLine);
      if (!dStr) return;
      svg
        .append("path")
        .attr("d", dStr)
        .attr("fill", "none")
        .attr(
          "stroke",
          activeSite?.id === site.id ? "#D97706" : "#059669"
        )
        .attr("stroke-width", activeSite?.id === site.id ? 2 : 1.3)
        .attr("stroke-dasharray", "4,3")
        .attr("stroke-opacity", 0.75);
    });

    const maxDelivered = Math.max(
      1,
      d3.max(deliverySites, (s) => s.delivered30dIdr) ?? 500_000_000
    );
    const rScale = d3
      .scaleSqrt()
      .domain([50_000_000, maxDelivered])
      .range([6, 15])
      .clamp(true);

    const siteG = svg
      .selectAll(".delivery-site")
      .data(deliverySites)
      .enter()
      .append("g")
      .attr("transform", (d) => {
        const pt = projection(d.coords);
        return pt ? `translate(${pt[0]}, ${pt[1]})` : "translate(-100,-100)";
      })
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => {
        setIsPlaying(false);
        setHoveredSite(d);
      })
      .on("mouseleave", () => setHoveredSite(null))
      .on("click", (_e, d) => {
        setIsPlaying(false);
        setSelectedSiteId(d.id);
      });

    siteG
      .append("circle")
      .attr("r", (d) => rScale(d.delivered30dIdr) + 5)
      .attr("fill", (d) =>
        d.fundType === "Infaq & Emergency" ? "#D97706" : "#059669"
      )
      .attr("fill-opacity", (d) => (activeSite?.id === d.id ? 0.28 : 0.14))
      .attr("stroke", (d) =>
        d.fundType === "Infaq & Emergency" ? "#D97706" : "#059669"
      )
      .attr("stroke-width", (d) => (activeSite?.id === d.id ? 2 : 1));

    siteG
      .append("circle")
      .attr("r", (d) => rScale(d.delivered30dIdr) * 0.55)
      .attr("fill", (d) =>
        d.fundType === "Infaq & Emergency" ? "#D97706" : "#059669"
      )
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5);

    siteG
      .append("text")
      .attr("y", (d) => -(rScale(d.delivered30dIdr) + 8))
      .attr("text-anchor", "middle")
      .attr(
        "class",
        "fill-slate-800 dark:fill-slate-100 font-mono text-[9.5px] font-semibold"
      )
      .text((d) =>
        mapFocus !== "global" || activeSite?.id === d.id
          ? d.siteName.split(" ").slice(0, 2).join(" ")
          : ""
      );
  }, [scene, mapFocus, deliverySites, activeSite?.id]);

  const goToScene = (target: ReelScene) => {
    setScene(target);
    setSceneProgress(0);
  };

  const inspectDay =
    hoveredDay ?? progressSeries[progressSeries.length - 1] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="impact-reel-title"
    >
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Top Modal Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2
                id="impact-reel-title"
                className="text-base font-bold text-slate-900 dark:text-slate-50"
              >
                Global Impact Reel — Ringkasan Dampak Zakat 30 Hari Terakhir
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Periode 17 Okt – 15 Nov 2026 · Terverifikasi On-Chain & ABDICity Bot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Jeda Reel</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Putar Reel</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                goToScene(0);
                setIsPlaying(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Global Impact Reel"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Chapter Storyboard Progress & Selector */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                idx: 0 as ReelScene,
                title: "01. Ringkasan Penyaluran 30 Hari",
              },
              {
                idx: 1 as ReelScene,
                title: "02. Tren Progres Proyek (D3)",
              },
              {
                idx: 2 as ReelScene,
                title: "03. Peta Lokasi Pengiriman Bantuan",
              },
            ] as const
          ).map((item) => {
            const isActive = scene === item.idx;
            const fillPct =
              scene > item.idx ? 100 : isActive ? sceneProgress : 0;
            return (
              <button
                key={item.idx}
                type="button"
                onClick={() => goToScene(item.idx)}
                className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isActive
                    ? "border-emerald-600/60 bg-white dark:bg-slate-900"
                    : "border-slate-200 dark:border-slate-800 hover:bg-white/70 dark:hover:bg-slate-900/60"
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2 truncate">
                  {item.title}
                </div>
                <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-100"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Scene Canvas */}
        <div className="p-6 flex-1 space-y-6">
          {/* SCENE 0: 30-Day Executive Summary */}
          {scene === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/60 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                <div className="p-5 space-y-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Zakat & Wakaf Tersalurkan (30H)
                  </span>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatIdr(
                      Math.round(
                        pastMonthMetrics.pastMonthDistributedIdr * countRatio
                      )
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    100% terenkripsi AES-256-GCM
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Keluarga Mustahik Terbantu
                  </span>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                    {Math.round(
                      pastMonthMetrics.pastMonthHouseholds * countRatio
                    ).toLocaleString("id-ID")}{" "}
                    KK
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lintas 5 klaster regional
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Batch Pengiriman Terverifikasi
                  </span>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                    {Math.round(
                      pastMonthMetrics.verifiedBatches * countRatio
                    )}{" "}
                    Kloter
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pastMonthMetrics.deliverySitesCount} titik distribusi aktif
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Rata-Rata Realisasi Lapangan
                  </span>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                    {Math.round(pastMonthMetrics.avgDisbursedPct * countRatio)}%
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Zero duplikasi data mustahik
                  </div>
                </div>
              </div>

              {/* Flagship 30-Day Milestones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-50 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Sorotan Keberhasilan Penyaluran Bulan Ini
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    {campaigns.length} Program Prioritas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {campaigns.map((camp) => {
                    const pct = Math.min(
                      100,
                      Math.round((camp.raisedIdr / camp.targetIdr) * 100)
                    );
                    return (
                      <div
                        key={camp.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                            {camp.fundType} · {camp.region}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-snug">
                            {camp.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {camp.lastProgressUpdate}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatIdr(camp.raisedIdr)}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SCENE 1: D3-Powered Animated Line Chart of 30-Day Project Progress */}
          {scene === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 inline-flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Progres Capaian Proyek Zakat & Wakaf (30 Hari Terakhir)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kurva D3 menampilkan percepatan penyaluran dan pemenuhan target dari 17 Okt hingga 15 Nov 2026.
                  </p>
                </div>

                {/* Toggleable Series Legend */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {(
                    [
                      {
                        key: "reliefUrgent" as const,
                        label: "Logistik Darurat MENA",
                        color: "bg-amber-600",
                      },
                      {
                        key: "wakafSolar" as const,
                        label: "Wakaf Surya NTB",
                        color: "bg-emerald-600",
                      },
                      {
                        key: "zakatEdu" as const,
                        label: "Beasiswa Zakat Digital",
                        color: "bg-sky-600",
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setVisibleSeries((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-opacity ${
                        visibleSeries[item.key]
                          ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                          : "border-slate-200 dark:border-slate-800 text-slate-400 opacity-50"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${item.color} inline-block`}
                      />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/70 p-3">
                <svg
                  ref={lineSvgRef}
                  role="img"
                  aria-label="30-Day Zakat and Waqf Project Progress D3 Line Chart"
                  className="w-full min-w-[580px] h-auto"
                />
              </div>

              {inspectDay && (
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Tanggal: {inspectDay.dateLabel} 2026
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-amber-600 dark:text-amber-400">
                      Darurat MENA: {inspectDay.reliefUrgentPct}%
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Wakaf Surya: {inspectDay.wakafSolarPct}%
                    </span>
                    <span className="text-sky-600 dark:text-sky-400">
                      Beasiswa Zakat: {inspectDay.zakatEduPct}%
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      Kumulatif: {formatIdr(inspectDay.cumulativeDisbursedIdr)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCENE 2: Interactive Aid Delivery Sites Map */}
          {scene === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Peta Interaktif Lokasi Pengiriman Bantuan Zakat & Wakaf
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Klik titik pengiriman atau ubah fokus wilayah untuk meninjau dampak penyaluran bulan lalu di tiap lokasi.
                  </p>
                </div>

                <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
                  {(
                    [
                      { id: "global", label: "Global" },
                      { id: "sea", label: "Indonesia" },
                      { id: "mena", label: "MENA" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setMapFocus(opt.id);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        mapFocus === opt.id
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-7 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
                  <svg
                    ref={mapSvgRef}
                    role="img"
                    aria-label="Interactive Aid Delivery Sites D3 Map"
                    className="w-full h-auto block"
                  />
                </div>

                <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-4 flex flex-col justify-between space-y-4 text-xs">
                  {activeSite ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span>{activeSite.hubName} → Lokasi</span>
                          <span>
                            {activeSite.coords[1].toFixed(2)}°,{" "}
                            {activeSite.coords[0].toFixed(2)}°
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                            {activeSite.siteName}
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                            {activeSite.country} · {activeSite.fundType}
                          </p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Tersalurkan (30 Hari)
                            </span>
                            <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                              {formatIdr(activeSite.delivered30dIdr)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Penerima Terlayani
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                              {activeSite.householdsServed.toLocaleString("id-ID")} KK ·{" "}
                              {activeSite.deliveryBatches} kloter
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Realisasi Target
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                              {activeSite.completionPct}%
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                          {activeSite.highlight}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex flex-wrap gap-1.5">
                          {deliverySites.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setIsPlaying(false);
                                setSelectedSiteId(s.id);
                              }}
                              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                                activeSite.id === s.id
                                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900"
                              }`}
                            >
                              {s.siteName.split(" ")[0]}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onQuickDonate(activeSite.linkedCampaign ?? campaigns[0]);
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Dukung Lokasi Pengiriman Ini</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Scene Navigation Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => goToScene(((scene + 2) % 3) as ReelScene)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Bab Sebelumnya</span>
          </button>

          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Bab {scene + 1} / 3 · {isPlaying ? "Auto-play aktif" : "Mode interaktif"}
          </span>

          <button
            type="button"
            onClick={() => goToScene(((scene + 1) % 3) as ReelScene)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold inline-flex items-center gap-1 hover:opacity-90 cursor-pointer"
          >
            <span>Bab Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
