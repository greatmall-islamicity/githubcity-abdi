import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ArrowUpRight, Compass, Globe2, MapPin } from "lucide-react";
import { formatIdr } from "../data/platformData";
import {
  BlockchainTransaction,
  Campaign,
  FundType,
  MustahikRegion,
} from "../types";

interface GlobalImpactGeoMapProps {
  regions: MustahikRegion[];
  campaigns: Campaign[];
  transactions: BlockchainTransaction[];
  onQuickDonate: (campaign?: Campaign) => void;
  onNavigateMustahik: () => void;
}

type MapFocus = "global" | "sea" | "mena";
type LayerFilter = "ALL" | "mustahik" | "campaigns";

interface GeoNode {
  id: string;
  kind: "mustahik" | "campaign";
  name: string;
  locationLabel: string;
  coords: [number, number]; // [lon, lat]
  amountIdr: number;
  beneficiaries: number;
  fundType: FundType;
  progressPct: number;
  urgent: boolean;
  detailLine: string;
  linkedCampaign?: Campaign;
  regionData?: MustahikRegion;
}

interface CorridorArc {
  id: string;
  fromName: string;
  toName: string;
  from: [number, number];
  to: [number, number];
  volumeLabel: string;
}

// Lightweight embedded GeoJSON continents & archipelago polygons (WGS84 [lon, lat])
// Winding-verified dynamically via d3.geoArea before rendering.
const RAW_WORLD_POLYGONS: {
  name: string;
  ring: [number, number][];
}[] = [
  {
    name: "North America",
    ring: [
      [-168, 66], [-162, 71], [-135, 70], [-115, 73], [-85, 72], [-64, 63],
      [-55, 52], [-66, 44], [-75, 36], [-81, 25], [-90, 29], [-97, 26],
      [-96, 18], [-88, 21], [-83, 10], [-78, 8], [-85, 11], [-94, 15],
      [-105, 20], [-112, 30], [-122, 37], [-125, 49], [-138, 59], [-156, 58],
      [-165, 61], [-168, 66],
    ],
  },
  {
    name: "Greenland",
    ring: [
      [-52, 60], [-42, 60], [-22, 70], [-18, 81], [-45, 83], [-68, 77],
      [-56, 68], [-52, 60],
    ],
  },
  {
    name: "South America",
    ring: [
      [-78, 9], [-72, 12], [-62, 10], [-50, 1], [-35, -6], [-38, -14],
      [-41, -22], [-49, -28], [-54, -34], [-63, -41], [-68, -54], [-74, -52],
      [-73, -40], [-71, -30], [-70, -18], [-77, -12], [-81, -5], [-79, 2],
      [-78, 9],
    ],
  },
  {
    name: "Europe",
    ring: [
      [-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [9, 58],
      [5, 61], [15, 69], [28, 71], [42, 67], [58, 68], [58, 52], [44, 46],
      [35, 45], [29, 41], [23, 38], [18, 40], [15, 38], [12, 43], [8, 44],
      [3, 42], [-5, 36], [-9, 37],
    ],
  },
  {
    name: "UK & Ireland",
    ring: [
      [-6, 50], [1, 51], [-2, 58], [-7, 57], [-6, 50],
    ],
  },
  {
    name: "Africa",
    ring: [
      [-17, 15], [-16, 23], [-6, 36], [10, 37], [15, 32], [25, 31], [33, 31],
      [39, 21], [43, 12], [51, 12], [47, 2], [40, -6], [40, -16], [35, -24],
      [28, -33], [18, -35], [14, -22], [12, -12], [9, 4], [2, 6], [-8, 5],
      [-15, 10], [-17, 15],
    ],
  },
  {
    name: "Madagascar",
    ring: [
      [44, -25], [47, -25], [50, -15], [49, -12], [44, -17], [44, -25],
    ],
  },
  {
    name: "Asia Mainland",
    ring: [
      [27, 41], [36, 37], [35, 31], [39, 21], [44, 13], [54, 17], [59, 22],
      [51, 26], [56, 27], [62, 25], [68, 23], [73, 18], [77, 8], [82, 16],
      [89, 22], [92, 20], [97, 16], [100, 13], [103, 2], [104, 10], [109, 13],
      [108, 21], [116, 23], [121, 31], [120, 38], [126, 38], [129, 35],
      [135, 44], [141, 53], [156, 52], [163, 60], [178, 66], [160, 70],
      [132, 72], [104, 77], [75, 73], [58, 68], [58, 52], [44, 46], [35, 45],
      [27, 41],
    ],
  },
  {
    name: "Japan",
    ring: [
      [130, 31], [136, 34], [141, 38], [145, 44], [140, 42], [135, 36],
      [130, 31],
    ],
  },
  {
    name: "Sumatra",
    ring: [
      [95.3, 5.5], [98.8, 3.8], [103.5, 0.2], [105.9, -5.8], [103.6, -5.2],
      [100.1, -1.2], [96.6, 3.2], [95.3, 5.5],
    ],
  },
  {
    name: "Java & Bali-Nusa",
    ring: [
      [105.3, -6.1], [114.5, -7.8], [123.5, -8.8], [123.3, -9.8], [114.4, -8.7],
      [105.2, -7.1], [105.3, -6.1],
    ],
  },
  {
    name: "Kalimantan",
    ring: [
      [109.1, 1.5], [115.2, 6.2], [118.8, 4.8], [117.6, -1.8], [115.5, -3.9],
      [110.5, -3.2], [109.1, 1.5],
    ],
  },
  {
    name: "Sulawesi",
    ring: [
      [119.2, -5.5], [122.4, -4.6], [125.1, 1.5], [121.2, 1.2], [119.0, -1.2],
      [119.2, -5.5],
    ],
  },
  {
    name: "Papua & PNG",
    ring: [
      [131.0, -1.4], [141.0, -2.6], [150.2, -9.8], [146.2, -9.2], [137.8, -8.2],
      [132.4, -4.2], [131.0, -1.4],
    ],
  },
  {
    name: "Philippines",
    ring: [
      [120.0, 18.2], [122.5, 16.5], [126.2, 7.2], [122.1, 6.8], [120.2, 13.8],
      [120.0, 18.2],
    ],
  },
  {
    name: "Australia",
    ring: [
      [114, -22], [122, -17], [131, -12], [136, -15], [142, -11], [153, -27],
      [150, -37], [140, -38], [129, -32], [115, -34], [113, -26], [114, -22],
    ],
  },
];

function ensureValidSphericalWinding(ring: [number, number][]): [number, number][] {
  const testFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
  // In D3 spherical geometry, hemisphere complement occurs if geoArea > 2 * PI
  if (d3.geoArea(testFeature) > 2 * Math.PI) {
    return [...ring].reverse();
  }
  return ring;
}

export const WORLD_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: "FeatureCollection",
  features: RAW_WORLD_POLYGONS.map((poly) => ({
    type: "Feature",
    properties: { name: poly.name },
    geometry: {
      type: "Polygon",
      coordinates: [ensureValidSphericalWinding(poly.ring)],
    },
  })),
};

const REGION_COORDS: Record<string, [number, number]> = {
  "reg-ntb": [116.53, -8.65],
  "reg-aceh": [97.14, 5.18],
  "reg-jabar": [107.45, -7.22],
  "reg-sulsel": [119.43, -5.14],
  "reg-mena": [35.2, 31.5],
};

const CAMPAIGN_COORDS: Record<string, [number, number]> = {
  "cmp-wakaf-solar": [116.1, -8.58],
  "cmp-zakat-edu": [106.95, -6.78],
  "cmp-relief-urgent": [35.9, 31.95],
};

const CORRIDOR_ARCS: CorridorArc[] = [
  {
    id: "arc-1",
    fromName: "London Islamic Fintech Hub",
    toName: "Koridor Kemanusiaan MENA",
    from: [-0.1276, 51.5072],
    to: [35.2, 31.5],
    volumeLabel: "USD 124k cross-border",
  },
  {
    id: "arc-2",
    fromName: "Dubai Islamic Guild",
    toName: "Lombok Timur & Pesisir NTB",
    from: [55.2708, 25.2048],
    to: [116.53, -8.65],
    volumeLabel: "Wakaf Surya Batch #14",
  },
  {
    id: "arc-3",
    fromName: "Kuala Lumpur Zakat Hub",
    toName: "Aceh Utara & Pidie",
    from: [101.6869, 3.139],
    to: [97.14, 5.18],
    volumeLabel: "Zakat Mal Cross-Pool",
  },
  {
    id: "arc-4",
    fromName: "Jakarta Islamicity Node",
    toName: "Jeneponto & Pesisir Makassar",
    from: [106.8456, -6.2088],
    to: [119.43, -5.14],
    volumeLabel: "Smart Contract Auto-Split",
  },
  {
    id: "arc-5",
    fromName: "Jakarta Islamicity Node",
    toName: "Koridor Kemanusiaan MENA",
    from: [106.8456, -6.2088],
    to: [35.9, 31.95],
    volumeLabel: "QRIS Corporate Relief",
  },
];

export function GlobalImpactGeoMap({
  regions,
  campaigns,
  transactions,
  onQuickDonate,
  onNavigateMustahik,
}: GlobalImpactGeoMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus>("global");
  const [layerFilter, setLayerFilter] = useState<LayerFilter>("ALL");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("reg-mena");
  const [hoveredNode, setHoveredNode] = useState<GeoNode | null>(null);

  const geoNodes = useMemo<GeoNode[]>(() => {
    const regionNodes: GeoNode[] = regions.map((r) => ({
      id: r.id,
      kind: "mustahik",
      name: r.name,
      locationLabel: `${r.country} · ${r.topAsnaf}`,
      coords: REGION_COORDS[r.id] ?? [106.85, -6.2],
      amountIdr: r.allocatedIdr,
      beneficiaries: r.registeredHouseholds,
      fundType: r.recommendedPool,
      progressPct: r.disbursedPct,
      urgent: r.povertyIndex >= 85,
      detailLine: `Indeks Kerentanan ${r.povertyIndex}/100 · Rawan Pangan ${r.foodInsecurityRate}%`,
      regionData: r,
    }));

    const campaignNodes: GeoNode[] = campaigns.map((c) => ({
      id: c.id,
      kind: "campaign",
      name: c.title,
      locationLabel: `${c.region} · ${c.smartContractAddress}`,
      coords: CAMPAIGN_COORDS[c.id] ?? [106.85, -6.2],
      amountIdr: c.raisedIdr,
      beneficiaries: c.beneficiariesReached,
      fundType: c.fundType,
      progressPct: Math.min(100, Math.round((c.raisedIdr / c.targetIdr) * 100)),
      urgent: Boolean(c.urgent),
      detailLine: c.lastProgressUpdate,
      linkedCampaign: c,
    }));

    const all = [...regionNodes, ...campaignNodes];
    if (layerFilter === "ALL") return all;
    return all.filter((n) => n.kind === layerFilter);
  }, [regions, campaigns, layerFilter]);

  const activeNode = useMemo(
    () =>
      hoveredNode ??
      geoNodes.find((n) => n.id === selectedNodeId) ??
      geoNodes[0] ??
      null,
    [hoveredNode, geoNodes, selectedNodeId]
  );

  const totalMappedIdr = useMemo(
    () => regions.reduce((acc, r) => acc + r.allocatedIdr, 0),
    [regions]
  );
  const totalLiveTx = transactions.length;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 960;
    const height = 430;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Configure D3 geo projection based on selected regional focus
    let projection: d3.GeoProjection;
    if (mapFocus === "sea") {
      projection = d3
        .geoMercator()
        .center([111, -1.5])
        .scale(1120)
        .translate([width / 2, height / 2]);
    } else if (mapFocus === "mena") {
      projection = d3
        .geoMercator()
        .center([34, 30])
        .scale(680)
        .translate([width / 2, height / 2]);
    } else {
      projection = d3
        .geoNaturalEarth1()
        .fitExtent(
          [
            [18, 18],
            [width - 18, height - 18],
          ],
          WORLD_GEOJSON
        );
    }

    const pathGen = d3.geoPath(projection);
    const graticule = d3.geoGraticule10();

    // Sphere / Ocean backdrop
    if (mapFocus === "global") {
      svg
        .append("path")
        .datum({ type: "Sphere" } as d3.GeoPermissibleObjects)
        .attr("d", pathGen)
        .attr("class", "fill-slate-100/70 dark:fill-slate-950/90 stroke-slate-200 dark:stroke-slate-800")
        .attr("stroke-width", 1);
    } else {
      svg
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("class", "fill-slate-100/70 dark:fill-slate-950/90");
    }

    // Graticule grid
    svg
      .append("path")
      .datum(graticule)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("class", "stroke-slate-200/75 dark:stroke-slate-800/80")
      .attr("stroke-width", 0.6);

    // Continents & Islands
    svg
      .selectAll(".land-poly")
      .data(WORLD_GEOJSON.features)
      .enter()
      .append("path")
      .attr("d", (d) => pathGen(d) ?? "")
      .attr(
        "class",
        "fill-slate-200/90 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700"
      )
      .attr("stroke-width", 0.8);

    // Distribution Corridor Great-Circle Arcs
    const arcGroup = svg.append("g");
    CORRIDOR_ARCS.forEach((arc) => {
      const geoLine: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [arc.from, arc.to],
        },
      };
      const dStr = pathGen(geoLine);
      if (!dStr) return;
      arcGroup
        .append("path")
        .attr("d", dStr)
        .attr("fill", "none")
        .attr("stroke", "#059669")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3")
        .attr("stroke-opacity", 0.65);

      const fromPt = projection(arc.from);
      if (fromPt) {
        arcGroup
          .append("circle")
          .attr("cx", fromPt[0])
          .attr("cy", fromPt[1])
          .attr("r", 3)
          .attr("class", "fill-slate-500 dark:fill-slate-400");
      }
    });

    // Proportional node radius scale
    const maxAmount = Math.max(
      1,
      d3.max(geoNodes, (d) => d.amountIdr) ?? 1_500_000_000
    );
    const radiusScale = d3
      .scaleSqrt()
      .domain([100_000_000, maxAmount])
      .range([7, 19])
      .clamp(true);

    // Impact & Distribution Nodes
    const nodesG = svg
      .selectAll(".geo-node")
      .data(geoNodes)
      .enter()
      .append("g")
      .attr("transform", (d) => {
        const pt = projection(d.coords);
        return pt ? `translate(${pt[0]}, ${pt[1]})` : "translate(-100,-100)";
      })
      .style("cursor", "pointer")
      .on("mouseenter", (_e, d) => setHoveredNode(d))
      .on("mouseleave", () => setHoveredNode(null))
      .on("click", (_e, d) => setSelectedNodeId(d.id));

    // Outer Halo
    nodesG
      .append("circle")
      .attr("r", (d) => radiusScale(d.amountIdr) + 5)
      .attr("fill", (d) => (d.urgent ? "#D97706" : "#059669"))
      .attr("fill-opacity", (d) =>
        activeNode?.id === d.id ? 0.25 : 0.12
      )
      .attr("stroke", (d) => (d.urgent ? "#D97706" : "#059669"))
      .attr("stroke-width", (d) => (activeNode?.id === d.id ? 2 : 1))
      .attr("stroke-dasharray", (d) =>
        d.kind === "campaign" ? "3,2" : "none"
      );

    // Core Node Circle
    nodesG
      .append("circle")
      .attr("r", (d) => radiusScale(d.amountIdr) * 0.58)
      .attr("fill", (d) => (d.urgent ? "#D97706" : "#059669"))
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5);

    // Compact label for focused or active node
    nodesG
      .append("text")
      .attr("y", (d) => -(radiusScale(d.amountIdr) + 9))
      .attr("text-anchor", "middle")
      .attr(
        "class",
        "fill-slate-800 dark:fill-slate-100 font-mono text-[10px] font-semibold"
      )
      .text((d) =>
        mapFocus !== "global" || activeNode?.id === d.id
          ? d.name.split(" ").slice(0, 2).join(" ")
          : ""
      );
  }, [geoNodes, mapFocus, activeNode?.id]);

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Peta Geospasial Distribusi Zakat & Dampak Proyek Global (D3)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pemetaan lokasi penyaluran zakat, infrastruktur wakaf produktif, serta koridor transfer donasi lintas negara secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Regional Projection Focus */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: "global", label: "Global" },
                { id: "sea", label: "Asia Tenggara" },
                { id: "mena", label: "MENA & Eropa" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMapFocus(opt.id)}
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

          {/* Layer Filter */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: "ALL", label: "Semua Node" },
                { id: "mustahik", label: "Klaster Mustahik" },
                { id: "campaigns", label: "Proyek Aktif" },
              ] as const
            ).map((lyr) => (
              <button
                key={lyr.id}
                type="button"
                onClick={() => setLayerFilter(lyr.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  layerFilter === lyr.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {lyr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split: 8-col Map + 4-col Location Impact Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 cols: D3 Geo Map */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
          <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <svg
              ref={svgRef}
              role="img"
              aria-label="Global Zakat Distribution and Project Impact D3 Map"
              className="w-full h-auto block"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                Distribusi Normal / Wakaf
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                Prioritas Darurat
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-emerald-600 inline-block" />
                Koridor Transfer Lintas Negara
              </span>
            </div>
            <span className="font-mono tabular-nums text-[11px]">
              {geoNodes.length} titik aktif · {totalLiveTx} tx teraudit
            </span>
          </div>
        </div>

        {/* Right 4 cols: Selected Node Telemetry & Impact */}
        <div className="lg:col-span-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-950/70 p-5 flex flex-col justify-between space-y-5">
          {activeNode ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {activeNode.kind === "mustahik"
                      ? "Klaster Mustahik"
                      : "Proyek Dampak"}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                    {activeNode.coords[1].toFixed(2)}°,{" "}
                    {activeNode.coords[0].toFixed(2)}°
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-snug">
                    {activeNode.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeNode.locationLabel}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      Dana Terverifikasi
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-50">
                      {formatIdr(activeNode.amountIdr)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      Penerima Manfaat
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {activeNode.beneficiaries.toLocaleString("id-ID")}{" "}
                      {activeNode.kind === "mustahik" ? "KK" : "Jiwa"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      Pool Utama
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {activeNode.fundType}
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Progres Realisasi
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                        {activeNode.progressPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          activeNode.urgent
                            ? "bg-amber-600"
                            : "bg-emerald-600"
                        }`}
                        style={{ width: `${activeNode.progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {activeNode.detailLine}
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Total Terpetakan Global</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {formatIdr(totalMappedIdr)}
                  </span>
                </div>

                {activeNode.linkedCampaign ? (
                  <button
                    type="button"
                    onClick={() => onQuickDonate(activeNode.linkedCampaign)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Salurkan ke Lokasi Ini</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateMustahik}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Buka Analisis AI Klaster Ini</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Pilih titik lokasi pada peta untuk melihat detail dampak dan alokasi dana.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
