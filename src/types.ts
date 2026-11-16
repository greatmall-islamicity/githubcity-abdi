export type LanguageCode = "id" | "en" | "ms" | "ar";

export type AppView =
  | "overview"
  | "mustahik-ai"
  | "campaigns"
  | "abdcity-bot"
  | "security";

export type FundType =
  | "Zakat Mal"
  | "Zakat Fitrah"
  | "Wakaf Produktif"
  | "Infaq & Emergency";

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  merkleRoot: string;
  blockHeight: number;
  timestamp: string;
  campaignId: string;
  campaignTitle: string;
  fundType: FundType;
  donorDisplay: string;
  walletProvider: string;
  amountIdr: number;
  amountUsd: number;
  encryptionCipher: string;
  encryptedEnvelopeId: string;
  status: "Verified On-Chain" | "Distributing";
}

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  fundType: FundType;
  region: string;
  imagePath: string;
  targetIdr: number;
  raisedIdr: number;
  donorCount: number;
  beneficiariesReached: number;
  smartContractAddress: string;
  urgent?: boolean;
  lastProgressUpdate: string;
}

export interface MustahikRegion {
  id: string;
  name: string;
  country: string;
  registeredHouseholds: number;
  povertyIndex: number;
  foodInsecurityRate: number;
  recommendedPool: FundType;
  allocatedIdr: number;
  disbursedPct: number;
  topAsnaf: string;
}

export interface MustahikForecast {
  priorityScore: number;
  recommendedAllocationPct: number;
  estimatedHouseholdsReached: number;
  primaryAsnafFocus: string;
  vulnerabilityDrivers: string[];
  distributionStrategy: string;
  integritySafeguard: string;
}

export interface ManagedRepo {
  id: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  branchProtection: boolean;
  commitConventionCheck: boolean;
  docsCompletenessCheck: boolean;
  openPrCount: number;
  lastSync: string;
  health: "Nominal" | "Warning" | "Failing";
}

export interface PullRequestItem {
  id: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  commitFormatValid: boolean;
  docsComplete: boolean;
  checksStatus: "Passed" | "Pending" | "Needs Docs";
  updatedAt: string;
}

export interface CICDRun {
  id: string;
  repo: string;
  branch: string;
  commitSha: string;
  stage: "Build" | "Foundry Audit" | "Integration Test" | "Production Deploy";
  status: "Success" | "Running" | "Failed";
  durationSec: number;
  timestamp: string;
  alertSent?: boolean;
}

export interface GitHubIssueItem {
  id: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  labels: string[];
  priority: "critical" | "high" | "medium" | "low";
  assignedTeam: string;
  status: "Open" | "In Progress" | "Resolved";
  createdAt: string;
  botTriaged: boolean;
}

export interface PlatformNotification {
  id: string;
  category: "donation" | "cicd" | "milestone" | "security";
  urgent: boolean;
  title: string;
  message: string;
  timestamp: string;
  channel: "Push & Email" | "Webhook Alert" | "Push";
  read: boolean;
}

export interface DonorTestimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  beforeState: string;
  outcome: string;
  verifiedTxHash: string;
}
