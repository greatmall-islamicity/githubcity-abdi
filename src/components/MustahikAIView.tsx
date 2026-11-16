import { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Cpu, MapPin, ShieldCheck } from "lucide-react";
import { formatIdr } from "../data/platformData";
import { TranslationBundle } from "../i18n/translations";
import { FundType, LanguageCode, MustahikForecast, MustahikRegion } from "../types";

interface MustahikAIViewProps {
  t: TranslationBundle;
  language: LanguageCode;
  regions: MustahikRegion[];
  onApplyAllocation: (regionName: string, pct: number) => void;
}

export function MustahikAIView({
  t,
  language,
  regions,
  onApplyAllocation,
}: MustahikAIViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<MustahikRegion>(regions[0]);
  const [fundPool, setFundPool] = useState<FundType>(regions[0].recommendedPool);
  const [fieldNotes, setFieldNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<MustahikForecast | null>(null);
  const [appliedRegionId, setAppliedRegionId] = useState<string | null>(null);

  const handleSelectRegion = (reg: MustahikRegion) => {
    setSelectedRegion(reg);
    setFundPool(reg.recommendedPool);
    setForecast(null);
    setError(null);
  };

  const handleRunPrediction = async () => {
    setLoading(true);
    setError(null);
    setAppliedRegionId(null);

    try {
      const response = await fetch("/api/ai/predict-mustahik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionName: selectedRegion.name,
          fundPool,
          registeredHouseholds: selectedRegion.registeredHouseholds,
          povertyIndex: selectedRegion.povertyIndex,
          foodInsecurityRate: selectedRegion.foodInsecurityRate,
          fieldNotes: fieldNotes.trim(),
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menjalankan prediksi AI.");
      }

      setForecast(data.forecast);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.mustahik.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          {t.mustahik.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Regional Vulnerability Matrix */}
        <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t.mustahik.regionMatrixTitle}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Klik baris wilayah untuk analisis AI
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {regions.map((region) => {
              const isSelected = region.id === selectedRegion.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleSelectRegion(region)}
                  className={`w-full text-left p-5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={`w-4 h-4 shrink-0 ${
                          isSelected
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400"
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {region.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                      <span>{region.registeredHouseholds.toLocaleString("id-ID")} KK</span>
                      <span aria-hidden="true"> · </span>
                      <span>Asnaf: {region.topAsnaf}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pl-6 sm:pl-0 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Indeks Kerentanan
                      </div>
                      <div
                        className={`text-sm font-mono font-bold tabular-nums ${
                          region.povertyIndex >= 85
                            ? "text-rose-600 dark:text-rose-400"
                            : region.povertyIndex >= 75
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {region.povertyIndex}/100
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Alokasi Berjalan
                      </div>
                      <div className="text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatIdr(region.allocatedIdr)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Gemini AI Predictive Engine */}
        <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Cpu className="w-4 h-4" />
              <span>Gemini Predictive Engine</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {t.mustahik.aiEngineTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.mustahik.aiEngineSubtitle}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Wilayah Terpilih</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedRegion.name}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {selectedRegion.registeredHouseholds.toLocaleString("id-ID")} KK · Kerawanan Pangan {selectedRegion.foodInsecurityRate}%
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fund-pool-select"
                className="block font-medium text-slate-700 dark:text-slate-300"
              >
                Sumber Dana Syariah
              </label>
              <select
                id="fund-pool-select"
                value={fundPool}
                onChange={(e) => setFundPool(e.target.value as FundType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Zakat Mal">Zakat Mal</option>
                <option value="Zakat Fitrah">Zakat Fitrah</option>
                <option value="Wakaf Produktif">Wakaf Produktif</option>
                <option value="Infaq & Emergency">Infaq & Emergency</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="field-notes-input"
                className="block font-medium text-slate-700 dark:text-slate-300"
              >
                {t.mustahik.fieldNotesLabel}
              </label>
              <textarea
                id="field-notes-input"
                rows={3}
                value={fieldNotes}
                onChange={(e) => setFieldNotes(e.target.value)}
                placeholder={t.mustahik.fieldNotesPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="button"
              onClick={handleRunPrediction}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {loading ? t.mustahik.runningPrediction : t.mustahik.runPrediction}
            </button>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Forecast Output */}
          {forecast && !loading && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Prioritas</span>
                  <span className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {forecast.priorityScore}/100
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Alokasi</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {forecast.recommendedAllocationPct}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Target KK</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {forecast.estimatedHouseholdsReached.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Fokus Asnaf: {forecast.primaryAsnafFocus}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {forecast.distributionStrategy}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Faktor Kerentanan Terdeteksi
                </div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                  {forecast.vulnerabilityDrivers.map((drv, idx) => (
                    <li key={idx}>{drv}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forecast.integritySafeguard}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onApplyAllocation(selectedRegion.name, forecast.recommendedAllocationPct);
                  setAppliedRegionId(selectedRegion.id);
                }}
                className="w-full py-2 px-4 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {appliedRegionId === selectedRegion.id ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Masuk Antrean Penyaluran Smart Contract</span>
                  </>
                ) : (
                  <>
                    <span>{t.mustahik.applyAllocation}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
