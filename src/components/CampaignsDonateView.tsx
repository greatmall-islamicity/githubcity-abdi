import { useState } from "react";
import {
  Calculator,
  Check,
  Lock,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { formatIdr } from "../data/platformData";
import { TranslationBundle } from "../i18n/translations";
import { Campaign } from "../types";

interface CampaignsDonateViewProps {
  t: TranslationBundle;
  campaigns: Campaign[];
  onOpenDonateModal: (campaign: Campaign, presetAmount?: number) => void;
  onShareFeedback: (message: string) => void;
}

export function CampaignsDonateView({
  t,
  campaigns,
  onOpenDonateModal,
  onShareFeedback,
}: CampaignsDonateViewProps) {
  const [monthlyIncome, setMonthlyIncome] = useState<string>("18000000");
  const [goldSavings, setGoldSavings] = useState<string>("140000000");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareMenuId, setShareMenuId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const incomeNum = Math.max(0, Number(monthlyIncome) || 0);
  const savingsNum = Math.max(0, Number(goldSavings) || 0);
  const annualTotal = incomeNum * 12 + savingsNum;
  const nisabThreshold = 119000000;
  const zakatDue = annualTotal >= nisabThreshold ? Math.round(annualTotal * 0.025) : 0;

  const handleCopyShare = async (campaign: Campaign, platform?: string) => {
    const shareUrl = `${window.location.origin}/?campaign=${campaign.id}`;
    const shareText = `${campaign.title} — Terverifikasi On-Chain GitHubCity : Islamicity & ABDICity (${shareUrl})`;
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Clipboard fallback ignored cleanly in restricted frames
    }
    setCopiedId(campaign.id);
    setShareMenuId(null);
    onShareFeedback(
      platform
        ? `Teks & tautan kampanye untuk ${platform} siap dibagikan (disalin ke clipboard).`
        : t.campaigns.linkCopied
    );
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.campaigns.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          {t.campaigns.subtitle}
        </p>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {campaigns.map((campaign) => {
          const progress = Math.min(
            100,
            Math.round((campaign.raisedIdr / campaign.targetIdr) * 1000) / 10
          );
          const hasImgError = imgErrors[campaign.id];

          return (
            <article
              key={campaign.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {hasImgError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/20 to-slate-900/30 p-4 text-center">
                      <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {campaign.title}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={campaign.imagePath}
                      alt={campaign.title}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImgErrors((prev) => ({ ...prev, [campaign.id]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {campaign.fundType} · {campaign.region}
                    </span>
                    <span className="font-mono tabular-nums">
                      {campaign.smartContractAddress}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 leading-snug">
                    {campaign.title}
                  </h2>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {campaign.subtitle}
                  </p>

                  <div className="pt-2 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-50">
                        {formatIdr(campaign.raisedIdr)}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {progress}% dari {formatIdr(campaign.targetIdr)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="w-3.5 h-3.5" />
                        {campaign.donorCount.toLocaleString("id-ID")} donatur
                      </span>
                      <span className="tabular-nums">
                        {campaign.beneficiariesReached.toLocaleString("id-ID")} penerima manfaat
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                    Progres terbaru: {campaign.lastProgressUpdate}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center gap-2 relative">
                <button
                  type="button"
                  onClick={() => onOpenDonateModal(campaign)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t.campaigns.donateNow}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShareMenuId(shareMenuId === campaign.id ? null : campaign.id)
                    }
                    className="py-2.5 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedId === campaign.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>{t.campaigns.shareCampaign}</span>
                  </button>

                  {shareMenuId === campaign.id && (
                    <div className="absolute right-0 bottom-12 z-20 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 text-xs space-y-1">
                      {["WhatsApp", "X / Twitter", "LinkedIn", "Salin Tautan"].map(
                        (channel) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => handleCopyShare(campaign, channel)}
                            className="w-full text-left px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            {channel}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Interactive Zakat Calculator */}
      <section className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Calculator className="w-4 h-4" />
            <span>Standar Nisab 85g Emas (Rp 119.000.000/thn)</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {t.campaigns.zakatCalcTitle}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {t.campaigns.zakatCalcSubtitle}
          </p>
        </div>

        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label
              htmlFor="zakat-income"
              className="block font-medium text-slate-700 dark:text-slate-300"
            >
              {t.campaigns.monthlyIncomeLabel}
            </label>
            <input
              id="zakat-income"
              type="number"
              min={0}
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="zakat-savings"
              className="block font-medium text-slate-700 dark:text-slate-300"
            >
              {t.campaigns.goldSavingsLabel}
            </label>
            <input
              id="zakat-savings"
              type="number"
              min={0}
              value={goldSavings}
              onChange={(e) => setGoldSavings(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="lg:col-span-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {t.campaigns.calculatedZakatLabel}
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatIdr(zakatDue)}
            </span>
          </div>
          <button
            type="button"
            disabled={zakatDue <= 0}
            onClick={() => onOpenDonateModal(campaigns[1], zakatDue)}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            {t.campaigns.donateCalculated}
          </button>
        </div>
      </section>
    </div>
  );
}
