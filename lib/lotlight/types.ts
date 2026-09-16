export type InventoryItem = {
  id: string;
  version?: number;
  product: string;
  manufacturer: string;
  catalog: string;
  lot: string;
  quantity: number;
  location: string;
};
export type Scope = {
  catalog: string;
  lots: string[];
  allLots: boolean;
  evidence: string;
};
export type Notice = {
  id: string;
  title: string;
  manufacturer: string;
  date: string;
  sourceUrl: string;
  text: string;
  action: string;
  scope: Scope[];
  version: number;
  training: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
};
export type MatchKind = "exact" | "missing" | "possible" | "unlisted";
export type Match = {
  item: InventoryItem;
  kind: MatchKind;
  reason: string;
  evidence: string;
  similarity?: number;
};
export type ResponseAction = {
  id: string;
  noticeId: string;
  noticeVersion: number;
  itemId: string;
  inventoryVersion: number;
  itemVersion: number;
  itemLabel: string;
  owner: string;
  dueDate: string;
  status: "assigned" | "verified" | "completed";
  verification: string;
  evidence: string;
  handledQuantity: number;
  updatedAt: string;
  updatedBy: string;
};
export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  type: string;
  detail: string;
};
export type Workspace = {
  inventory: InventoryItem[];
  inventoryProvenance: "synthetic" | "user-supplied";
  noticeHistory: Notice[];
  inventoryHistory: {
    version: number;
    items: InventoryItem[];
    provenance: string;
  }[];
  inventoryVersion: number;
  notices: Notice[];
  actions: ResponseAction[];
  audit: AuditEvent[];
  revision: number;
  savedAt: string | null;
};
export type UserInfo = { name: string; email: string } | null;
