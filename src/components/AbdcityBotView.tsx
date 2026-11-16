import { useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  GitBranch,
  GitPullRequest,
  Github,
  Play,
  Shield,
  Tag,
  Terminal,
  X,
} from "lucide-react";
import { TranslationBundle } from "../i18n/translations";
import { RepoHealthScoreChart, computeRepoScore } from "./RepoHealthScoreChart";
import { RepoInsightsView } from "./RepoInsightsView";
import { BotPerformanceDashboard } from "./BotPerformanceDashboard";
import { CicdPipelineFlowchart } from "./CicdPipelineFlowchart";
import { CicdLiveTerminalLogs } from "./CicdLiveTerminalLogs";
import { ReleaseLifecycleTimeline } from "./ReleaseLifecycleTimeline";
import {
  CICDRun,
  GitHubIssueItem,
  LanguageCode,
  ManagedRepo,
  PullRequestItem,
} from "../types";

interface AbdcityBotViewProps {
  t: TranslationBundle;
  language: LanguageCode;
  repos: ManagedRepo[];
  pullRequests: PullRequestItem[];
  cicdRuns: CICDRun[];
  issues: GitHubIssueItem[];
  onToggleRepoRule: (
    repoId: string,
    field: "branchProtection" | "commitConventionCheck" | "docsCompletenessCheck"
  ) => void;
  onRunPrCheck: (prId: string) => void;
  onTriggerWebhook: () => void;
  onSimulateBuildFailure: () => void;
  onResolveBuildRun: (runId: string) => void;
  onAddTriagedIssue: (issue: GitHubIssueItem) => void;
}

export function AbdcityBotView({
  t,
  language,
  repos,
  pullRequests,
  cicdRuns,
  issues,
  onToggleRepoRule,
  onRunPrCheck,
  onTriggerWebhook,
  onSimulateBuildFailure,
  onResolveBuildRun,
  onAddTriagedIssue,
}: AbdcityBotViewProps) {
  const [activeTab, setActiveTab] = useState<"repos" | "cicd" | "issues" | "insights" | "performance">("repos");
  const [selectedLogRunId, setSelectedLogRunId] = useState<string | undefined>(undefined);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Issue submission form
  const [issueRepo, setIssueRepo] = useState(repos[0]?.fullName || "abdcity/zakat-smart-contracts");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [triaging, setTriaging] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim()) return;
    setTriaging(true);
    setTriageError(null);

    try {
      const response = await fetch("/api/ai/triage-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: issueRepo,
          title: issueTitle.trim(),
          body: issueBody.trim(),
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menjalankan klasifikasi otomatis.");
      }

      const triage = data.triage;
      const newIssue: GitHubIssueItem = {
        id: `iss-${Date.now()}`,
        repo: issueRepo,
        number: 420 + issues.length,
        title: issueTitle.trim(),
        body: `${issueBody.trim()}\n\nBot Summary: ${triage.botSummary}`,
        labels: triage.labels || ["triage", "abdcity-bot"],
        priority: (["critical", "high", "medium", "low"].includes(triage.priority)
          ? triage.priority
          : "medium") as GitHubIssueItem["priority"],
        assignedTeam: triage.assignedTeam || "@abdcity/core-engineering",
        status: "Open",
        createdAt: "Baru saja",
        botTriaged: true,
      };
      onAddTriagedIssue(newIssue);
      setIssueTitle("");
      setIssueBody("");
    } catch (err: unknown) {
      setTriageError(err instanceof Error ? err.message : "Gagal memanggil bot triage.");
    } finally {
      setTriaging(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header matching ABDICity-Integration-Bot identity */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-700/40"
            style={{ backgroundColor: "#F6AE77" }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
              <path d="M11 4h2v3h4v2h-4v2h3v2h-3v2h4v2h-4v3h-2v-3H7v-2h4v-2H8v-2h3V9H7V7h4V4z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">GitHubCity : ABDICity</span>
              <span aria-hidden="true">·</span>
              <span>GitHub App</span>
              <span aria-hidden="true">·</span>
              <span>Internal Open-Source Infrastructure</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-0.5">
              {t.bot.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              {t.bot.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-auto"
        >
          <Github className="w-4 h-4" />
          <span>{t.bot.viewGithubManifest}</span>
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto max-w-full">
        {(
          [
            { id: "repos", label: t.bot.tabRepos },
            { id: "cicd", label: t.bot.tabCicd },
            { id: "issues", label: t.bot.tabIssues },
            { id: "insights", label: t.bot.tabInsights },
            { id: "performance", label: t.bot.tabPerformance },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Repository Management */}
      {activeTab === "repos" && (
        <div className="space-y-6">
          <RepoHealthScoreChart
            repos={repos}
            labels={{
              title: t.bot.healthScoreTitle,
              subtitle: t.bot.healthScoreSubtitle,
              fleetScoreLabel: t.bot.fleetScoreLabel,
              branchLabel: t.bot.branchLabel,
              commitLabel: t.bot.commitLabel,
              docsLabel: t.bot.docsLabel,
              optimal: t.bot.healthOptimal,
              moderate: t.bot.healthModerate,
              atRisk: t.bot.healthAtRisk,
            }}
          />

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Sinkronisasi Konfigurasi & Aturan Perlindungan Cabang
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kelola aturan perlindungan cabang, validasi format commit, dan kelengkapan dokumen sebelum merge.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/60">
                    <th className="py-3 px-4">Repositori</th>
                    <th className="py-3 px-4">Branch Protection</th>
                    <th className="py-3 px-4">Format Commit</th>
                    <th className="py-3 px-4">Kelengkapan Dokumen</th>
                    <th className="py-3 px-4 text-right">Skor</th>
                    <th className="py-3 px-4 text-right">PR Terbuka</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {repos.map((repo) => {
                    const score = computeRepoScore(repo).totalScore;
                    return (
                    <tr
                      key={repo.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {repo.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md truncate">
                          {repo.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleRepoRule(repo.id, "branchProtection")}
                          className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                            repo.branchProtection
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-500"
                          }`}
                        >
                          {repo.branchProtection ? "Aktif (main)" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleRepoRule(repo.id, "commitConventionCheck")}
                          className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                            repo.commitConventionCheck
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-500"
                          }`}
                        >
                          {repo.commitConventionCheck ? "Conventional" : "Opsional"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleRepoRule(repo.id, "docsCompletenessCheck")}
                          className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                            repo.docsCompletenessCheck
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {repo.docsCompletenessCheck ? "Wajib Docs" : "Longgar"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {score}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {repo.openPrCount} PR
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            repo.health === "Nominal"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {repo.health}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pull Request Gate Queue */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Antrean Validasi Pull Request & Kelengkapan Dokumen
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {pr.repo} #{pr.number}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {pr.title}
                      </span>
                    </div>
                    <div className="pl-6 text-slate-500 dark:text-slate-400">
                      Author: {pr.author} · Commit Format:{" "}
                      <span
                        className={
                          pr.commitFormatValid
                            ? "text-emerald-700 dark:text-emerald-400 font-medium"
                            : "text-rose-600 dark:text-rose-400 font-medium"
                        }
                      >
                        {pr.commitFormatValid ? "Valid" : "Perlu Perbaikan"}
                      </span>{" "}
                      · Docs:{" "}
                      <span
                        className={
                          pr.docsComplete
                            ? "text-emerald-700 dark:text-emerald-400 font-medium"
                            : "text-amber-600 dark:text-amber-400 font-medium"
                        }
                      >
                        {pr.docsComplete ? "Lengkap" : "Belum Lengkap"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-6 sm:pl-0 shrink-0">
                    <span
                      className={`font-semibold ${
                        pr.checksStatus === "Passed"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {pr.checksStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRunPrCheck(pr.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap cursor-pointer"
                    >
                      {t.bot.runBotCheck}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: CI/CD Notifications & Webhook Monitor */}
      {activeTab === "cicd" && (
        <div className="space-y-6">
          <CicdPipelineFlowchart
            cicdRuns={cicdRuns}
            onResolveBuildRun={onResolveBuildRun}
          />

          <ReleaseLifecycleTimeline
            cicdRuns={cicdRuns}
            onResolveBuildRun={onResolveBuildRun}
          />

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Pemantauan Build, Testing & Deployment Real-Time
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Integrasi webhook mengirim peringatan cepat jika terjadi kegagalan integrasi maupun rilis produksi.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onTriggerWebhook}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{t.bot.triggerWebhook}</span>
              </button>
              <button
                type="button"
                onClick={onSimulateBuildFailure}
                className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{t.bot.simulateAlert}</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {cicdRuns.map((run) => (
              <div
                key={run.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {run.repo}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 font-mono">
                      <GitBranch className="w-3 h-3" />
                      {run.branch} ({run.commitSha})
                    </span>
                  </div>
                  <div className="pl-6 text-slate-500 dark:text-slate-400">
                    Stage: {run.stage} · Durasi:{" "}
                    <span className="font-mono tabular-nums">{run.durationSec}s</span> ·{" "}
                    {run.timestamp}
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-6 sm:pl-0 shrink-0">
                  {run.status === "Success" && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Success
                    </span>
                  )}
                  {run.status === "Running" && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Running...
                    </span>
                  )}
                  {run.status === "Failed" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        Failed (Alert Sent)
                      </span>
                      <button
                        type="button"
                        onClick={() => onResolveBuildRun(run.id)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Retry Deploy
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLogRunId(run.id)}
                    className={`px-2.5 py-1 rounded border text-[11px] font-mono font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      (selectedLogRunId ?? cicdRuns[0]?.id) === run.id
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Stream Logs
                  </button>
                </div>
              </div>
            ))}
          </div>
          </div>

          <CicdLiveTerminalLogs
            cicdRuns={cicdRuns}
            selectedRunId={selectedLogRunId}
            onSelectRun={setSelectedLogRunId}
            onResolveBuildRun={onResolveBuildRun}
          />
        </div>
      )}

      {/* Tab 3: Issue Tracking with AI Auto-Label & Auto-Assign */}
      {activeTab === "issues" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Pelacakan Masalah & Klasifikasi Otomatis Bot
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {issues.map((issue) => (
                <div key={issue.id} className="p-5 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-mono">
                        {issue.repo} #{issue.number} · {issue.createdAt}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {issue.title}
                      </h3>
                    </div>
                    <span
                      className={`font-semibold shrink-0 uppercase tracking-wide text-[11px] ${
                        issue.priority === "critical"
                          ? "text-rose-600 dark:text-rose-400"
                          : issue.priority === "high"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                    {issue.body}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{issue.labels.join(" · ")}</span>
                    </div>
                    <div className="font-mono text-emerald-700 dark:text-emerald-400">
                      Assigned: {issue.assignedTeam}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmitIssue}
            className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 space-y-4 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                <Shield className="w-4 h-4" />
                <span>Auto-Label & Auto-Assign (Gemini AI)</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                {t.bot.submitIssueTitle}
              </h2>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="issue-repo"
                className="block font-medium text-slate-700 dark:text-slate-300"
              >
                Repositori Target
              </label>
              <select
                id="issue-repo"
                value={issueRepo}
                onChange={(e) => setIssueRepo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.fullName}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="issue-title"
                className="block font-medium text-slate-700 dark:text-slate-300"
              >
                Judul Issue / Laporan Bug
              </label>
              <input
                id="issue-title"
                type="text"
                required
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="Contoh: Webhook timeout saat verifikasi batch QRIS"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="issue-body"
                className="block font-medium text-slate-700 dark:text-slate-300"
              >
                Detail Teknis
              </label>
              <textarea
                id="issue-body"
                rows={4}
                value={issueBody}
                onChange={(e) => setIssueBody(e.target.value)}
                placeholder="Jelaskan gejala, log error, atau dampak pada modul zakat/wakaf..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {triageError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                {triageError}
              </div>
            )}

            <button
              type="submit"
              disabled={triaging || !issueTitle.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {triaging ? "Bot Mengklasifikasi Issue..." : "Kirim & Jalankan Auto-Triage"}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Repository Insights (D3 30-Day Analytics) */}
      {activeTab === "insights" && (
        <RepoInsightsView
          repos={repos}
          issues={issues}
          labels={t.bot.insights}
        />
      )}

      {/* Tab 5: Performance Dashboard (D3 90-Day DORA CI/CD Analytics) */}
      {activeTab === "performance" && (
        <BotPerformanceDashboard
          repos={repos}
          cicdRuns={cicdRuns}
          labels={t.bot.performance}
        />
      )}

      {/* Official GitHub App Profile Modal featuring user's attached screenshot */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  ABDICity-Integration-Bot — Dokumentasi Resmi GitHub App
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  github.com/apps/abdcity-integration-bot · Dikelola internal untuk infrastruktur perangkat lunak ABDICity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                aria-label="Tutup dokumentasi GitHub App"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
              <img
                src="/assets/aistudio/image_3ef675a6.png"
                alt="Halaman GitHub App ABDICity-Integration-Bot"
                referrerPolicy="no-referrer"
                className="w-full max-h-[65vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
