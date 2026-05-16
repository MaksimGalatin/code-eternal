export type SiteStatus = {
  status: "none" | "pending" | "done" | "error";
  arweaveUrl?: string | null;
  tier: number;
  regenCount?: number;
  regenLimit?: number;
  username?: string;
};
