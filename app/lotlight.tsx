"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ScanLine,
  Layers,
  ClipboardCheck,
  BookOpen,
  Plus,
  ShieldCheck,
  Package,
  FileText,
  ChevronRight,
  LogIn,
  Download,
  Check,
  AlertTriangle,
  Search,
  RotateCcw,
  Loader2,
  Sparkles,
  X,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Upload,
  Trash2,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import {
  initialWorkspace,
  SAMPLE_CSV,
  SAMPLE_NOTICE_TEXT,
  BAXTER_URL,
} from "@/lib/lotlight/sample";
import {
  activeAction,
  reduceWorkspace,
  type Command,
} from "@/lib/lotlight/commands";
import {
  reconcile,
  extractScope,
  parseCsv,
  validateScope,
} from "@/lib/lotlight/engine";
import {
  download,
  exportAudit,
  exportMatches,
  readNoticeFile,
} from "@/lib/lotlight/files";
import type {
  Workspace,
  Notice,
  Match,
  Scope,
  UserInfo,
  ResponseAction,
  InventoryItem,
} from "@/lib/lotlight/types";

type View =
  | "overview"
  | "inventory"
  | "actions"
  | "about"
  | "review"
  | "report";
const NAV = [
  { icon: Layers, label: "Recall workspace", view: "overview" },
  { icon: Package, label: "Inventory", view: "inventory" },
  { icon: ClipboardCheck, label: "Action log", view: "actions" },
  { icon: BookOpen, label: "Evidence & approach", view: "about" },
] as const;
const LABELS = {
  exact: "Identifier match",
  missing: "Needs information",
  possible: "AI candidate",
  unlisted: "No listed match",
};
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export default function Lotlight({ user }: { user: UserInfo }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const [noticeNonce, setNoticeNonce] = useState(0);
  const [correcting, setCorrecting] = useState<InventoryItem | null>(null);
  const [state, setState] = useState<Workspace>(initialWorkspace);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(!!user);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [noticeId, setNoticeId] = useState("baxter-demo");
  const [noticeDialog, setNoticeDialog] = useState(false);
  const [editing, setEditing] = useState<Notice | undefined>();
  const [inventoryDialog, setInventoryDialog] = useState(false);
  const [actionMatch, setActionMatch] = useState<Match | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reset, setReset] = useState<"reset_demo" | "clear_workspace" | null>(
    null,
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiMessage, setAiMessage] = useState("");
  const worker = useRef<Worker | null>(null);
  const [query, setQuery] = useState("");
  const notice =
    state.notices.find((n) => n.id === noticeId) ?? state.notices[0];
  const matches = useMemo(
    () => (notice ? reconcile(state.inventory, notice, scores) : []),
    [state.inventory, notice, scores],
  );
  const attention = matches.filter((m) => m.kind !== "unlisted");
  const exact = matches.filter((m) => m.kind === "exact");
  const uncertain = matches.filter(
    (m) => m.kind === "missing" || m.kind === "possible",
  );
  const completed = notice
    ? attention.filter(
        (m) =>
          activeAction(state, notice.id, m.item.id)?.status === "completed",
      ).length
    : 0;
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = (await res.json()) as Workspace & { error: string };
      if (!res.ok) throw new Error(data.error);
      setState(data);
      setSaveError("");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not load workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setScores({});
    setAiStatus("idle");
    worker.current?.terminate();
    worker.current = null;
    return () => {
      worker.current?.terminate();
    };
  }, [notice?.id, notice?.version, state.inventoryVersion]);
  const send = async (command: Command): Promise<boolean> => {
    if (busyRef.current || loading) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      if (user) {
        if (saveError)
          throw new Error("Reload your saved workspace before making changes.");
        const res = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: state.revision, command }),
        });
        const data = (await res.json()) as Workspace & { error: string };
        if (!res.ok) {
          if (res.status === 409) setSaveError(data.error);
          throw new Error(data.error);
        }
        setState(data);
      } else
        setState(reduceWorkspace(state, command, "Demo operator (unsaved)"));
      toast.success(
        user ? "Saved to your workspace" : "Updated this unsaved demo",
      );
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save. Your inputs are preserved.",
      );
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  function openReview(n: Notice) {
    setNoticeId(n.id);
    setView("review");
    setQuery("");
  }
  function runAI() {
    if (!notice || !state.inventory.length || aiStatus === "loading") return;
    setAiStatus("loading");
    setAiMessage(
      "Loading the local model. First use downloads about 23 MB of model weights.",
    );
    try {
      worker.current?.terminate();
      const current = new Worker("/ai/semantic-worker.js", { type: "module" });
      worker.current = current;
      current.onmessage = (e) => {
        if (e.data.type === "progress") setAiMessage(e.data.message);
        if (e.data.type === "result") {
          setScores(e.data.scores);
          setAiStatus("ready");
          setAiMessage(
            "Semantic comparison complete. Similarity ranks candidates; it cannot establish a recall match.",
          );
        }
        if (e.data.type === "error") {
          setAiStatus("error");
          setAiMessage(
            "Local AI could not load. Identifier checks still work. Check your connection and retry.",
          );
          current.terminate();
        }
      };
      current.onerror = (event) => {
        console.error(
          "AI worker error",
          event.message,
          event.filename,
          event.lineno,
        );
        setAiStatus("error");
        setAiMessage(
          "Local AI is unavailable in this browser. Identifier checks still work.",
        );
        current.terminate();
      };
      current.postMessage({
        query: `${notice.manufacturer} ${notice.text.match(/^Product:\s*(.+)$/m)?.[1] ?? notice.title}`,
        items: state.inventory.map((i) => ({ id: i.id, product: i.product })),
      });
    } catch (error) {
      console.error("AI worker initialization", error);
      setAiStatus("error");
      setAiMessage(
        "This browser could not start the local AI worker. Identifier checks remain available.",
      );
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      context.registerTool(
        {
          name: "lotlight_read_review",
          title: "Read recall review",
          description:
            "Read the current inventory review, source approval, and unresolved lines. Does not change records.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("Expected an empty object.");
            return {
              notice: notice?.title ?? null,
              sourceApproved: !!notice?.approvedAt,
              inventoryLines: state.inventory.length,
              matches: matches.map((m) => ({
                product: m.item.product,
                catalog: m.item.catalog,
                lot: m.item.lot,
                kind: m.kind,
                reason: m.reason,
              })),
              unsavedDemo: !user,
            };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch {
      /* Optional browser capability. */
    }
    return () => lifecycle.abort();
  }, [notice, state.inventory, matches, user]);
  const isTraining = state.notices.some((n) => n.training);
  const navTitle = {
    overview: "Recall review",
    inventory: "Inventory",
    actions: "Action log",
    about: "Evidence & approach",
    review: "Recall review",
    report: "Audit report",
  }[view];
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "224px" } as React.CSSProperties}
    >
      <Toaster richColors position="bottom-right" />
      <Sidebar className="lot-sidebar">
        <SidebarHeader>
          <a className="brand" href="/">
            <span className="brand-mark">
              <ScanLine size={23} />
            </span>
            lotlight<span className="brand-dot">✳</span>
          </a>
          <div className="workspace-label">
            <span className="workspace-avatar">{user ? "P" : "W"}</span>
            <div>
              {user ? "Personal workspace" : "Willow Community Clinic"}
              <small>
                {user
                  ? "Private account records"
                  : "Fictional demonstration clinic"}
              </small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <span className="nav-caption">WORKSPACE</span>
          <SidebarMenu>
            {NAV.map(({ icon: Icon, label, view: target }) => (
              <SidebarMenuItem key={target}>
                <SidebarMenuButton
                  onClick={() => {
                    setView(target);
                    setQuery("");
                  }}
                  isActive={
                    view === target ||
                    (view === "review" && target === "overview")
                  }
                  className={
                    view === target ||
                    (view === "review" && target === "overview")
                      ? "nav-active"
                      : ""
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {target === "overview" && (
                    <span className="nav-count">{state.notices.length}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="side-note">
            <ShieldCheck size={20} />
            <strong>
              Human judgment.
              <br />A better paper trail.
            </strong>
            <p>Every match shows its evidence. Every action has an owner.</p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="creator">
            <span>SG</span>
            <div>
              Shivam Gupta<small>Creator · DSH Hacks V2</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <SidebarTrigger className="mobile-menu" />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{navTitle}</b>
          </div>
          <div className="account-area">
            <span className="save-status">
              {loading
                ? "Loading…"
                : busy
                  ? "Saving…"
                  : saveError
                    ? "Save unavailable"
                    : user
                      ? "Account storage"
                      : "Demo · not saved"}
            </span>
            <a
              className="top-account"
              href={
                user
                  ? "/signout-with-chatgpt?return_to=%2F"
                  : "/signin-with-chatgpt?return_to=%2F"
              }
              title={
                user ? user.email : "Demo changes will not transfer on sign-in"
              }
            >
              <LogIn size={15} />
              {user ? "Sign out" : "Sign in to save"}
            </a>
          </div>
        </header>
        <main className="main-content" data-ready={hydrated} inert={!hydrated}>
          {saveError && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={18} />
              <span>{saveError}</span>
              <button className="text-button" onClick={() => void load()}>
                Reload saved version
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <Loader2 className="spin" />
              <h1>Opening your workspace</h1>
              <p>Loading your saved inventory and source reviews.</p>
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">
                        <span />
                        THE LAST MILE OF RECALL RESPONSE
                      </p>
                      <h1>
                        A notice is only
                        <br />
                        the beginning.
                      </h1>
                      <p className="intro">
                        Find what’s on your shelves. See why it matches.
                        <br />
                        Give every response a clear next step.
                      </p>
                    </div>
                    <div className="heading-actions">
                      <span className="demo-label">
                        {isTraining
                          ? "HISTORICAL NOTICE · SYNTHETIC STOCK"
                          : "PRIVATE REVIEW WORKSPACE"}
                      </span>
                      <button
                        className="button primary"
                        onClick={() => {
                          setEditing(undefined);
                          setNoticeDialog(true);
                        }}
                      >
                        <Plus size={17} /> New recall review
                      </button>
                    </div>
                  </div>
                  <div className="overview-strip">
                    <div>
                      <span>Inventory lines</span>
                      <strong>
                        {state.inventory.length}
                        <small>
                          across{" "}
                          {new Set(state.inventory.map((i) => i.location)).size}{" "}
                          locations
                        </small>
                      </strong>
                    </div>
                    <div>
                      <span>Identifier matches</span>
                      <strong className="orange-text">
                        {exact.length}
                        <small>in the selected notice</small>
                      </strong>
                    </div>
                    <div>
                      <span>Needs more evidence</span>
                      <strong>
                        {uncertain.length}
                        <small>never silently cleared</small>
                      </strong>
                    </div>
                    <div>
                      <span>Responses completed</span>
                      <strong>
                        {completed}
                        <small>with staff-recorded evidence</small>
                      </strong>
                    </div>
                  </div>
                  <div className="section-heading">
                    <h2>
                      Recall workspace{" "}
                      <span>
                        {String(state.notices.length).padStart(2, "0")}
                      </span>
                    </h2>
                    <span>
                      {notice
                        ? "Summary for " + notice.title
                        : "Ready for your first notice"}
                    </span>
                  </div>
                  <div className="review-grid">
                    <div className="notice-stack">
                      {state.notices.length === 0 ? (
                        <Empty
                          title="Start with the notice"
                          text="Add the original text and paired identifiers, then import a stock spreadsheet."
                          action={
                            <button
                              className="button primary"
                              onClick={() => {
                                setEditing(undefined);
                                setNoticeDialog(true);
                              }}
                            >
                              Create a review <Plus size={15} />
                            </button>
                          }
                        />
                      ) : (
                        state.notices.map((n) => {
                          const m = reconcile(state.inventory, n);
                          const count = m.filter(
                            (x) => x.kind !== "unlisted",
                          ).length;
                          return (
                            <section className="review-card" key={n.id}>
                              <div className="card-topline">
                                <span
                                  className={
                                    "status-tag " +
                                    (n.approvedAt ? "approved" : "")
                                  }
                                >
                                  <span />
                                  {n.approvedAt
                                    ? "SOURCE REVIEWED"
                                    : "SOURCE REVIEW REQUIRED"}
                                </span>
                                <span className="mono">
                                  {n.training
                                    ? "FA-2025-039 · TRAINING"
                                    : `VERSION ${n.version}`}
                                </span>
                              </div>
                              <h2>{n.title}</h2>
                              <p>
                                {n.manufacturer} · Notice dated {date(n.date)}
                                {n.training
                                  ? " · Two-pair training extract"
                                  : ""}
                              </p>
                              <div className="scope-line">
                                <span>Reviewed scope</span>
                                {n.scope.slice(0, 3).map((s, i) => (
                                  <code key={i}>
                                    {s.catalog} /{" "}
                                    {s.allLots ? "all lots" : s.lots.join(", ")}
                                  </code>
                                ))}
                              </div>
                              <div className="match-visual">
                                <div className="match-bars">
                                  {m.slice(0, 24).map((x) => (
                                    <span
                                      key={x.item.id}
                                      style={{
                                        background:
                                          x.kind === "exact"
                                            ? "#c9865a"
                                            : x.kind === "unlisted"
                                              ? "#dfe5d4"
                                              : "#d9ca80",
                                      }}
                                    />
                                  ))}
                                </div>
                                <span>
                                  <b>{m.length}</b> inventory lines checked{" "}
                                  <span>·</span> <b>{count}</b> need attention
                                </span>
                              </div>
                              <div className="card-bottom">
                                <span>
                                  <FileText size={16} />{" "}
                                  {n.approvedAt
                                    ? "Staff-attested source review"
                                    : "Source-linked decisions"}
                                </span>
                                <button
                                  className="text-button"
                                  onClick={() => openReview(n)}
                                >
                                  Open review <ArrowRight size={16} />
                                </button>
                              </div>
                            </section>
                          );
                        })
                      )}
                    </div>
                    <aside className="principle-card">
                      <div className="mini-orbit">
                        <ScanLine size={25} />
                        <span />
                        <span />
                      </div>
                      <p className="eyebrow">BUILT FOR THE IN-BETWEEN</p>
                      <h3>
                        Published doesn’t
                        <br />
                        mean resolved.
                      </h3>
                      <p>
                        Connect the notice to the shelf, and the shelf to a
                        documented response.
                      </p>
                      <button
                        className="principle-footer"
                        onClick={() => setView("about")}
                      >
                        EVIDENCE BEFORE ACTION <ArrowUpRight size={17} />
                      </button>
                    </aside>
                  </div>
                  <div className="bottom-explainer">
                    <div>
                      <span className="step-number">01</span>
                      <h3>Bring the notice</h3>
                      <p>Preserve the original wording and scope.</p>
                    </div>
                    <div>
                      <span className="step-number">02</span>
                      <h3>Reconcile the shelf</h3>
                      <p>Exact identifiers first. AI helps find aliases.</p>
                    </div>
                    <div>
                      <span className="step-number">03</span>
                      <h3>Document the response</h3>
                      <p>Assign, verify, and record completion.</p>
                    </div>
                  </div>
                  <div className="workspace-tools">
                    <button
                      className="text-button muted"
                      onClick={() => setReset("reset_demo")}
                    >
                      <RotateCcw size={13} /> Restart demo
                    </button>
                    <button
                      className="text-button muted"
                      onClick={() => setReset("clear_workspace")}
                    >
                      <Plus size={13} /> Start empty workspace
                    </button>
                  </div>
                </>
              )}
              {view === "review" && notice && (
                <>
                  <button
                    className="back-button"
                    onClick={() => setView("overview")}
                  >
                    <ArrowLeft size={14} /> Recall workspace
                  </button>
                  <div className="page-heading compact">
                    <div>
                      <p className="eyebrow">
                        {notice.training
                          ? "HISTORICAL TRAINING EXTRACT"
                          : "SOURCE REVIEW"}{" "}
                        · VERSION {notice.version}
                      </p>
                      <h1>{notice.title}</h1>
                      <p className="intro">
                        {notice.manufacturer} · Issued {date(notice.date)} ·{" "}
                        {notice.scope.length} catalog/lot groups
                      </p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setExportOpen(true)}
                    >
                      <Download size={15} /> Export record
                    </button>
                  </div>
                  <div className="review-disclaimer">
                    <ShieldCheck size={16} />
                    <span>
                      {notice.training
                        ? "This historical example contains only two catalog/lot pairs. Verify the full, current notice before any real-world action."
                        : "This review covers only the source and identifiers entered here. Verify the complete current manufacturer instructions before acting."}{" "}
                      Inventory: {state.inventoryProvenance ?? "synthetic"}.
                    </span>
                  </div>
                  <Tabs defaultValue="inventory" className="review-tabs">
                    <TabsList variant="line">
                      <TabsTrigger value="inventory">
                        Inventory review{" "}
                        <span className="tab-count">{matches.length}</span>
                      </TabsTrigger>
                      <TabsTrigger value="source">Source & scope</TabsTrigger>
                      <TabsTrigger value="response">
                        Response plan{" "}
                        <span className="tab-count">{attention.length}</span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="inventory">
                      <div className="ai-banner">
                        <div className="ai-icon">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <strong>Find the product behind the wording.</strong>
                          <p>
                            {aiStatus === "idle"
                              ? "Local AI compares descriptions like “IV line extender” and “extension set.” Identifiers always decide the match."
                              : aiMessage}
                          </p>
                        </div>
                        <button
                          className="button"
                          disabled={
                            aiStatus === "loading" || !state.inventory.length
                          }
                          onClick={runAI}
                        >
                          {aiStatus === "loading" ? (
                            <Loader2 className="spin" size={15} />
                          ) : (
                            <Sparkles size={15} />
                          )}{" "}
                          {aiStatus === "ready"
                            ? "Run again"
                            : aiStatus === "error"
                              ? "Retry AI"
                              : "Run local AI"}
                        </button>
                        {aiStatus === "loading" && (
                          <button
                            aria-label="Cancel AI"
                            className="icon-button"
                            onClick={() => {
                              worker.current?.terminate();
                              setAiStatus("idle");
                              setAiMessage("");
                            }}
                          >
                            <X size={17} />
                          </button>
                        )}
                      </div>
                      <div className="table-toolbar">
                        <div className="legend">
                          <span>
                            <i className="dot-exact" />
                            {exact.length} identifier matches
                          </span>
                          <span>
                            <i className="dot-missing" />
                            {uncertain.length} need review
                          </span>
                          <span>
                            <i className="dot-unlisted" />
                            {matches.length - attention.length} not listed
                          </span>
                        </div>
                        <label className="search-box">
                          <Search size={15} />
                          <input
                            placeholder="Search inventory…"
                            aria-label="Search inventory"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="inventory-review-list">
                        {matches
                          .filter((m) =>
                            [
                              m.item.product,
                              m.item.catalog,
                              m.item.lot,
                              m.item.location,
                            ]
                              .join(" ")
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((m) => (
                            <MatchRow
                              key={m.item.id}
                              match={m}
                              action={activeAction(state, notice.id, m.item.id)}
                              onAction={() => setActionMatch(m)}
                              sourceApproved={!!notice.approvedAt}
                            />
                          ))}
                        {!matches.length && (
                          <Empty
                            title="Your shelves are next"
                            text="Import a CSV to reconcile stock against this source."
                            action={
                              <button
                                className="button"
                                onClick={() => setInventoryDialog(true)}
                              >
                                Import inventory
                              </button>
                            }
                          />
                        )}
                      </div>
                      <p className="fine-print">
                        AI similarity is not a probability of recall. A missing
                        or unlisted identifier never establishes safety. Model:
                        MiniLM-L6-v2, quantized, running on this device.
                      </p>
                    </TabsContent>
                    <TabsContent value="source">
                      <SourceReview
                        notice={notice}
                        busy={busy}
                        onApprove={() =>
                          send({
                            type: "approve_notice",
                            noticeId: notice.id,
                            sourceConfirmed: true,
                          })
                        }
                        onEdit={() => {
                          setEditing(notice);
                          setNoticeDialog(true);
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="response">
                      <div className="section-heading response-heading">
                        <div>
                          <h2>Every open line gets a next step</h2>
                          <p className="fine-print">
                            {completed} of {attention.length} responses
                            complete. Missing identifiers stay open until
                            corrected in inventory.
                          </p>
                        </div>
                        {!notice.approvedAt && (
                          <span className="status-tag">
                            Review the source first
                          </span>
                        )}
                      </div>
                      {attention.map((m) => (
                        <MatchRow
                          key={m.item.id}
                          match={m}
                          action={activeAction(state, notice.id, m.item.id)}
                          onAction={() => setActionMatch(m)}
                          sourceApproved={!!notice.approvedAt}
                        />
                      ))}
                      {!attention.length && (
                        <Empty
                          title="No listed identifier matches"
                          text="This result covers only this reviewed scope. It is not a safety certification."
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
              {view === "inventory" && (
                <>
                  <div className="page-heading compact">
                    <div>
                      <p className="eyebrow">
                        THE STOCKROOM, WITHOUT THE GUESSWORK
                      </p>
                      <h1>Your inventory.</h1>
                      <p className="intro">
                        {state.inventoryProvenance ?? "synthetic"} ·{" "}
                        {state.inventory.length} lines ·{" "}
                        {state.inventory.reduce((n, i) => n + i.quantity, 0)}{" "}
                        units · Inventory revision {state.inventoryVersion}
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => setInventoryDialog(true)}
                    >
                      <Upload size={16} /> Import CSV
                    </button>
                  </div>
                  <div className="info-banner">
                    <Package size={17} />
                    <span>
                      Missing catalog or lot numbers are preserved and flagged.
                      Replacing inventory opens a new review version and
                      archives previous response actions.
                    </span>
                  </div>
                  <div className="data-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {[
                            "Product",
                            "Manufacturer",
                            "Catalog",
                            "Lot",
                            "Quantity",
                            "Location",
                            "Review",
                          ].map((h) => (
                            <TableHead key={h}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.inventory.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell className="product-cell">
                              {i.product}
                            </TableCell>
                            <TableCell>
                              {i.manufacturer || (
                                <span className="missing-text">Missing</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <code>{i.catalog || "Missing"}</code>
                            </TableCell>
                            <TableCell>
                              <code className={!i.lot ? "missing-text" : ""}>
                                {i.lot || "Missing"}
                              </code>
                            </TableCell>
                            <TableCell>{i.quantity}</TableCell>
                            <TableCell>{i.location}</TableCell>
                            <TableCell>
                              <button
                                className="text-button"
                                onClick={() => setCorrecting(i)}
                                aria-label={`Correct ${i.product} in ${i.location}`}
                              >
                                Correct <ArrowRight size={12} />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {!state.inventory.length && (
                    <Empty
                      title="Nothing on the shelf yet"
                      text="Download the template, add your inventory, and import it."
                    />
                  )}
                  <button
                    className="text-button download-template"
                    onClick={() =>
                      download(
                        "lotlight-inventory-template.csv",
                        SAMPLE_CSV,
                        "text/csv",
                      )
                    }
                  >
                    <Download size={14} /> Download synthetic example CSV
                  </button>
                </>
              )}
              {view === "actions" && (
                <>
                  <div className="page-heading compact">
                    <div>
                      <p className="eyebrow">ACCOUNTABILITY YOU CAN FOLLOW</p>
                      <h1>The response record.</h1>
                      <p className="intro">
                        Staff-recorded activity, with source and inventory
                        versions.
                      </p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setExportOpen(true)}
                    >
                      <Download size={15} /> Export record
                    </button>
                  </div>
                  <div className="action-cards">
                    {state.actions.map((a) => {
                      const n = state.notices.find((n) => n.id === a.noticeId);
                      const historic =
                        activeAction(state, a.noticeId, a.itemId)?.id !== a.id;
                      return (
                        <div key={a.id} className="action-card">
                          <div>
                            <span
                              className={
                                "pill " +
                                (historic
                                  ? "unlisted"
                                  : a.status === "completed"
                                    ? "complete"
                                    : "missing")
                              }
                            >
                              {historic ? "Historical version" : a.status}
                            </span>
                            <h3>{a.itemLabel}</h3>
                            <p>
                              {a.owner} · Due {date(a.dueDate)} ·{" "}
                              {a.handledQuantity} units handled
                            </p>
                            <p>{a.evidence || "Response evidence pending"}</p>
                          </div>
                          <span className="mono">{date(a.updatedAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {!state.actions.length && (
                    <Empty
                      title="The paper trail starts here"
                      text="Review a notice’s source, then assign a response to an inventory line."
                      action={
                        <button
                          className="button"
                          onClick={() => notice && openReview(notice)}
                        >
                          Open recall review <ArrowRight size={15} />
                        </button>
                      }
                    />
                  )}
                  <h2 className="activity-title">Activity timeline</h2>
                  <div className="timeline">
                    {[...state.audit].reverse().map((e) => (
                      <div key={e.id} className="timeline-item">
                        <span className="timeline-dot" />
                        <div>
                          <strong>{e.type.replace(/[_\.]/g, " ")}</strong>
                          <p>{e.detail}</p>
                          <small>
                            {e.actor} · {new Date(e.at).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {view === "about" && <About />}
              {view === "report" && (
                <>
                  <div className="report-toolbar">
                    <button
                      className="text-button"
                      onClick={() => setView("overview")}
                    >
                      <ArrowLeft size={14} /> Workspace
                    </button>
                    <button
                      className="button primary"
                      onClick={() => window.print()}
                    >
                      <Download size={15} /> Print / save PDF
                    </button>
                  </div>
                  <AuditReport state={state} />
                </>
              )}
              <footer className="page-footer">
                <span>
                  <ShieldCheck size={14} /> Decision support. Verify current
                  manufacturer instructions before acting.
                </span>
                <span>Built with care, by Shivam Gupta</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {correcting && (
        <CorrectionDialog
          item={correcting}
          busy={busy}
          onClose={() => setCorrecting(null)}
          onSave={async (command) => {
            if (await send(command)) setCorrecting(null);
          }}
        />
      )}
      <NoticeDialog
        key={editing?.id ?? `new-${noticeNonce}`}
        open={noticeDialog}
        onOpenChange={setNoticeDialog}
        existing={editing}
        busy={busy}
        onSave={async (n) => {
          if (await send({ type: "save_notice", notice: n })) {
            setNoticeDialog(false);
            setNoticeNonce((x) => x + 1);
            setView("overview");
          }
        }}
      />
      <InventoryDialog
        open={inventoryDialog}
        onOpenChange={setInventoryDialog}
        busy={busy}
        onSave={async (csv, synthetic) => {
          if (await send({ type: "import_inventory", csv, synthetic })) {
            setInventoryDialog(false);
          }
        }}
      />
      {actionMatch && notice && (
        <ActionDialog
          match={actionMatch}
          notice={notice}
          action={activeAction(state, notice.id, actionMatch.item.id)}
          busy={busy}
          onClose={() => setActionMatch(null)}
          onSave={async (command) => {
            if (await send(command)) setActionMatch(null);
          }}
        />
      )}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take the evidence with you.</DialogTitle>
            <DialogDescription>
              Exports include source scope, unresolved lines, and staff-recorded
              actions. They do not certify device safety.
            </DialogDescription>
          </DialogHeader>
          <div className="export-options">
            <button
              onClick={() => {
                void exportAudit(state, !!user);
                setExportOpen(false);
              }}
            >
              <FileText />
              <span>
                <strong>Complete audit record</strong>
                <small>
                  JSON with source text, versions, activity, and SHA-256 digest
                </small>
              </span>
              <Download size={17} />
            </button>
            <button
              onClick={() => {
                exportMatches(state, !!user);
                setExportOpen(false);
              }}
            >
              <Layers />
              <span>
                <strong>Inventory review spreadsheet</strong>
                <small>
                  CSV with identifiers, match rationale, and response status
                </small>
              </span>
              <Download size={17} />
            </button>
            <button
              onClick={() => {
                setView("report");
                setExportOpen(false);
              }}
            >
              <ClipboardCheck />
              <span>
                <strong>Readable audit report</strong>
                <small>Print or save as PDF from your browser</small>
              </span>
              <ArrowRight size={17} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!reset}
        onOpenChange={(open) => {
          if (!open) setReset(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {reset === "clear_workspace"
              ? "Start an empty workspace?"
              : "Restart the demonstration?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This replaces the current inventory, notices, and response records.
            Export your audit record first if you need to keep it.{" "}
            {user
              ? "The change will update your saved account."
              : "Your demo is temporary and unsaved."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my workspace</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reset)
                  void send({ type: reset }).then((ok) => {
                    if (ok) {
                      setView("overview");
                      setNoticeId("baxter-demo");
                    }
                  });
                setReset(null);
              }}
            >
              Replace workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <ScanLine size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function MatchRow({
  match: m,
  action,
  onAction,
  sourceApproved,
}: {
  match: Match;
  action?: ResponseAction;
  onAction: () => void;
  sourceApproved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={"match-row " + m.kind}>
      <div className="match-row-main">
        <div className="match-product">
          <span className={"match-symbol " + m.kind}>
            {m.kind === "exact" ? (
              <ScanLine size={18} />
            ) : m.kind === "unlisted" ? (
              <Package size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
          </span>
          <div>
            <h3>{m.item.product}</h3>
            <p>
              {m.item.location} <span>·</span> {m.item.quantity} units{" "}
              <span>·</span> {m.item.manufacturer || "Manufacturer missing"}
            </p>
          </div>
        </div>
        <div className="match-identifiers">
          <code>{m.item.catalog || "No catalog"}</code>
          <span>
            LOT <b>{m.item.lot || "Missing"}</b>
          </span>
        </div>
        <div className="match-state">
          <span
            className={
              "pill " + (action?.status === "completed" ? "complete" : m.kind)
            }
          >
            {action?.status === "completed"
              ? "Response complete"
              : LABELS[m.kind]}
          </span>
          {m.similarity !== undefined && (
            <small>AI similarity {m.similarity.toFixed(2)}</small>
          )}
        </div>
        <button
          className="icon-button"
          aria-label={`Show evidence for ${m.item.product} in ${m.item.location}`}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight size={17} className={expanded ? "rotate-90" : ""} />
        </button>
      </div>
      {expanded && (
        <div className="match-expanded">
          <div>
            <strong>Why this result</strong>
            <p>{m.reason}</p>
            <blockquote>{m.evidence}</blockquote>
            {action && (
              <p className="action-summary">
                Owner: {action.owner} · {action.status} ·{" "}
                {action.handledQuantity}/{m.item.quantity} units handled
              </p>
            )}
          </div>
          {m.kind !== "unlisted" && (
            <div>
              <button
                className="button"
                disabled={!sourceApproved}
                onClick={onAction}
              >
                {action ? "Update response" : "Assign response"}{" "}
                <ArrowRight size={14} />
              </button>
              {!sourceApproved && (
                <small className="gate-hint">
                  Confirm the Source & scope tab first.
                </small>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
function SourceReview({
  notice,
  busy,
  onApprove,
  onEdit,
}: {
  notice: Notice;
  busy: boolean;
  onApprove: () => Promise<boolean>;
  onEdit: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="source-grid">
      <section className="source-document">
        <div className="source-document-heading">
          <FileText size={18} />
          <strong>Preserved source text</strong>
          <a href={notice.sourceUrl} target="_blank" rel="noreferrer">
            Open original <ExternalLink size={13} />
          </a>
        </div>
        <pre>{notice.text}</pre>
        <button className="text-button" onClick={onEdit}>
          Edit source or paired scope <ArrowRight size={14} />
        </button>
      </section>
      <aside className="source-review-panel">
        <span className="eyebrow">HUMAN REVIEW GATE</span>
        <h3>The source sets the scope.</h3>
        <p>
          Confirm catalog-to-lot pairs against the full current notice. Ranges,
          exclusions, kit components, and packaging exceptions need specialist
          review. Supported scope uses one labeled catalog/lot line at a time.
        </p>
        {notice.scope.map((s, i) => (
          <div className="scope-review-row" key={i}>
            <strong>{s.catalog}</strong>
            <span>{s.allLots ? "All lots" : s.lots.join(", ")}</span>
            <small>“{s.evidence}”</small>
          </div>
        ))}
        <div className="source-action">
          <strong>Response summary</strong>
          <p>{notice.action}</p>
          <small>
            Staff-entered summary. The original instructions control.
          </small>
        </div>
        {notice.approvedAt ? (
          <div className="approved-box">
            <CheckCircle2 size={20} />
            <div>
              <strong>Source review recorded</strong>
              <small>
                {notice.approvedBy}
                <br />
                {new Date(notice.approvedAt).toLocaleString()}
              </small>
            </div>
          </div>
        ) : (
          <>
            <label className="check-label">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
                id="source-check"
              />
              <span>
                {notice.training
                  ? "For this demonstration, I have reviewed the source link and confirmed these two training pairs."
                  : "I checked the current original notice, including affected pairs, exceptions, and response instructions."}
              </span>
            </label>
            <button
              className="button primary full-width"
              disabled={!checked || busy}
              onClick={() => void onApprove()}
            >
              {busy ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Check size={15} />
              )}{" "}
              Confirm source review
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
function InventoryDialog({
  open,
  onOpenChange,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  busy: boolean;
  onSave: (s: string, synthetic: boolean) => Promise<void>;
}) {
  const [csv, setCsv] = useState("");
  const [synthetic, setSynthetic] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => {
    try {
      return csv ? parseCsv(csv) : null;
    } catch {
      return null;
    }
  }, [csv]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>Bring your inventory.</DialogTitle>
          <DialogDescription>
            CSV columns: product, manufacturer, catalog, lot, quantity,
            location. Up to 500 lines. Use equipment and supply records only,
            without patient information.
          </DialogDescription>
        </DialogHeader>
        <label className="file-input-label">
          <Upload size={18} /> Choose a CSV
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Upload inventory CSV"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 500000) {
                  setError("Use a CSV smaller than 500 KB.");
                  return;
                }
                setCsv(await file.text());
                setError("");
              }
            }}
          />
        </label>
        <label className="field-label">
          Or paste CSV
          <textarea
            aria-label="Inventory CSV"
            rows={9}
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setError("");
            }}
            placeholder="product,manufacturer,catalog,lot,quantity,location"
          />
        </label>
        <div className="form-meta">
          <button
            className="text-button"
            onClick={() => {
              setCsv(SAMPLE_CSV);
              setSynthetic(true);
            }}
          >
            Use synthetic example
          </button>
          <span>
            {preview
              ? `${preview.length} valid lines · ${preview.filter((i) => !i.lot || !i.catalog).length} with missing identifiers`
              : "Paste or upload to validate"}
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label className="check-label">
          <Checkbox
            checked={synthetic}
            onCheckedChange={(v) => setSynthetic(v === true)}
          />
          <span>This inventory is synthetic demonstration data</span>
        </label>
        <p className="fine-print">
          Import replaces the inventory. Previous response actions become
          historical; they cannot close new inventory obligations.
        </p>
        <DialogFooter>
          <button className="button" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy || !csv}
            onClick={() => {
              try {
                parseCsv(csv);
                void onSave(csv, synthetic);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid CSV");
              }
            }}
          >
            Validate & import <ArrowRight size={14} />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function NoticeDialog({
  open,
  onOpenChange,
  existing,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  existing?: Notice;
  busy: boolean;
  onSave: (
    n: Extract<Command, { type: "save_notice" }>["notice"],
  ) => Promise<void>;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [manufacturer, setManufacturer] = useState(
    existing?.manufacturer ?? "",
  );
  const [noticeDate, setDate] = useState(
    existing?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [url, setUrl] = useState(existing?.sourceUrl ?? "");
  const [text, setText] = useState(existing?.text ?? "");
  const [action, setAction] = useState(existing?.action ?? "");
  const [scope, setScope] = useState<Scope[]>(existing?.scope ?? []);
  const [training, setTraining] = useState(existing?.training ?? false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const editScope = (i: number, patch: Partial<Scope>) =>
    setScope((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="notice-dialog">
        <DialogHeader>
          <DialogTitle>
            {existing
              ? "Revise the source. Reopen the review."
              : "Start with the source."}
          </DialogTitle>
          <DialogDescription>
            Import a text-based PDF or paste the notice. Preserve paired scope
            and supporting excerpts. OCR and automatic range interpretation are
            not included.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = {
              id: existing?.id,
              title,
              manufacturer,
              date: noticeDate,
              sourceUrl: url,
              text,
              action,
              scope,
              training,
            };
            const problem = validateScope(n);
            if (problem) {
              setError(problem);
              return;
            }
            setError("");
            void onSave(n);
          }}
        >
          <div className="form-two">
            <label className="field-label">
              Product / review title
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CLEARLINK IV sets"
              />
            </label>
            <label className="field-label">
              Manufacturer as listed in inventory
              <input
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Baxter"
              />
            </label>
            <label className="field-label">
              Notice date
              <input
                required
                type="date"
                value={noticeDate}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field-label">
              Original source URL
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://manufacturer.example/notice"
              />
            </label>
          </div>
          <div className="source-upload-row">
            <label className="file-input-label">
              <Upload size={16} />
              {reading ? "Reading PDF…" : "Import PDF or text"}
              <input
                type="file"
                accept=".pdf,.txt"
                aria-label="Upload recall notice"
                disabled={reading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setReading(true);
                  try {
                    const t = await readNoticeFile(f);
                    if (t.length > 50000)
                      throw new Error("Notice text exceeds 50,000 characters.");
                    setText(t);
                    setScope(extractScope(t));
                    setError("");
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Could not read file.",
                    );
                  } finally {
                    setReading(false);
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTitle("CLEARLINK IV sets");
                setManufacturer("Baxter");
                setDate("2025-08-29");
                setUrl(BAXTER_URL);
                setText(SAMPLE_NOTICE_TEXT);
                setScope(extractScope(SAMPLE_NOTICE_TEXT));
                setTraining(true);
                setAction(
                  "Identify affected stock and follow the manufacturer’s supplier-specific isolation, return or replacement, and acknowledgement instructions. Verify the current full notice first.",
                );
              }}
            >
              Use historical training extract
            </button>
          </div>
          <label className="field-label">
            Original notice text / clearly labeled training extract
            <textarea
              required
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={50000}
            />
          </label>
          <div className="section-heading scope-editor-heading">
            <h2>Paired catalog / lot scope</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                const found = extractScope(text);
                setScope(found);
                if (!found.length)
                  setError(
                    "No explicitly labeled pairs found. Add rows manually and copy supporting excerpts from the source.",
                  );
              }}
            >
              Extract labeled pairs
            </button>
          </div>
          <p className="fine-print">
            Auto-extraction accepts “Catalog: ABC; Lots: 123, 456”. For tables,
            append a staff-checked labeled transcription to the preserved
            source. Each scope excerpt must contain one complete pair.
            Conditional ranges are unsupported.
          </p>
          {scope.map((s, i) => (
            <div className="scope-editor" key={i}>
              <div className="scope-editor-fields">
                <label className="field-label">
                  Catalog
                  <input
                    required
                    value={s.catalog}
                    onChange={(e) => editScope(i, { catalog: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Exact lots, comma-separated
                  <input
                    value={s.lots.join(", ")}
                    disabled={s.allLots}
                    onChange={(e) =>
                      editScope(i, {
                        lots: e.target.value.split(",").map((l) => l.trim()),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove scope row ${i + 1}`}
                  onClick={() =>
                    setScope((rows) => rows.filter((_, j) => i !== j))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <label className="check-label">
                <Checkbox
                  checked={s.allLots}
                  onCheckedChange={(v) =>
                    editScope(i, {
                      allLots: v === true,
                      lots: v === true ? [] : s.lots,
                    })
                  }
                />
                <span>
                  Original source explicitly says “all lots” without exceptions
                </span>
              </label>
              <label className="field-label">
                Verbatim excerpt supporting this specific pair
                <textarea
                  required
                  rows={2}
                  value={s.evidence}
                  onChange={(e) => editScope(i, { evidence: e.target.value })}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="text-button add-scope"
            onClick={() =>
              setScope([
                ...scope,
                { catalog: "", lots: [], allLots: false, evidence: "" },
              ])
            }
          >
            <Plus size={14} /> Add paired scope row
          </button>
          <label className="field-label">
            Staff-entered response summary
            <textarea
              required
              minLength={15}
              rows={3}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Summarize the actual manufacturer instructions. Do not infer stop-use from the word recall."
            />
          </label>
          <label className="check-label">
            <Checkbox
              checked={training}
              onCheckedChange={(v) => setTraining(v === true)}
            />
            <span>This is a historical or synthetic training example</span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <button
              type="button"
              className="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={busy || reading}
            >
              Save for source review <ArrowRight size={14} />
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ActionDialog({
  match,
  notice,
  action,
  busy,
  onClose,
  onSave,
}: {
  match: Match;
  notice: Notice;
  action?: ResponseAction;
  busy: boolean;
  onClose: () => void;
  onSave: (c: Command) => Promise<void>;
}) {
  const [owner, setOwner] = useState(action?.owner ?? "");
  const [due, setDue] = useState(
    action?.dueDate ??
      new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [status, setStatus] = useState<ResponseAction["status"]>(
    action?.status ?? "assigned",
  );
  const [verification, setVerification] = useState(action?.verification ?? "");
  const [evidence, setEvidence] = useState(action?.evidence ?? "");
  const [handled, setHandled] = useState(action?.handledQuantity ?? 0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>A clear next step.</DialogTitle>
          <DialogDescription>
            {match.item.product} · {match.item.catalog || "Catalog missing"} ·{" "}
            {match.item.lot || "Lot missing"} · {match.item.quantity} units
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              type: "save_action",
              noticeId: notice.id,
              itemId: match.item.id,
              owner,
              dueDate: due,
              status,
              verification,
              evidence,
              handledQuantity: handled,
            });
          }}
        >
          <div className="form-two">
            <label className="field-label">
              Responsible person
              <input
                required
                minLength={2}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Maya Rao, stock coordinator"
              />
            </label>
            <label className="field-label">
              Response due date
              <input
                required
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </div>
          <label className="field-label">
            Response stage
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ResponseAction["status"])}
            >
              <SelectTrigger className="full-width" aria-label="Response stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned">
                  Assigned · review pending
                </SelectItem>
                <SelectItem value="verified" disabled={match.kind !== "exact"}>
                  Verified · physical label checked
                </SelectItem>
                <SelectItem value="completed" disabled={match.kind !== "exact"}>
                  Completed · response evidence recorded
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          {match.kind !== "exact" && (
            <div className="info-banner">
              <AlertTriangle size={16} />
              <span>
                Collect missing identifiers, then replace the inventory with
                corrected records. This uncertain line cannot be marked
                complete.
              </span>
            </div>
          )}
          <label className="field-label">
            Physical-label and current-source verification
            <textarea
              rows={2}
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              placeholder="Record what you checked, by whom, and against which current instructions."
            />
          </label>
          <div className="form-two">
            <label className="field-label">
              Units handled
              <input
                type="number"
                min={0}
                max={match.item.quantity}
                required
                value={handled}
                onChange={(e) => setHandled(Number(e.target.value))}
              />
            </label>
            <div className="quantity-note">
              {handled} of {match.item.quantity} units
              <br />
              <small>Partial handling keeps the response open.</small>
            </div>
          </div>
          <label className="field-label">
            Response evidence / reference
            <textarea
              rows={3}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. Staff-recorded isolation log Q-104, supplier return reference RMA-210. No patient data."
            />
          </label>
          <p className="fine-print">
            Completion records the staff response for this stock and source
            version. It does not independently verify the evidence or terminate
            the recall.
          </p>
          <DialogFooter>
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={busy || !notice.approvedAt}
            >
              Save response <Check size={14} />
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function About() {
  return (
    <div className="about-page">
      <p className="eyebrow">THE REASON BEHIND THE REVIEW</p>
      <h1>
        A recall is a handoff.
        <br />
        Someone has to catch it.
      </h1>
      <p className="intro large">
        Lotlight helps independent clinics turn a manufacturer notice and a
        spreadsheet into a review someone can explain, own, and finish.
      </p>
      <div className="about-story">
        <span className="eyebrow">THE DEMONSTRATION</span>
        <h2>
          One letter. Four stock locations.
          <br />
          One missing lot number.
        </h2>
        <p>
          Willow is a fictional clinic. Its eight inventory lines include two
          exact pairs from a real Baxter notice, an incomplete label, and an “IV
          line extender” that AI can surface despite different wording. Every
          count is demonstration data.
        </p>
        <a
          className="text-button"
          href={BAXTER_URL}
          target="_blank"
          rel="noreferrer"
        >
          Read the original manufacturer notice <ExternalLink size={14} />
        </a>
      </div>
      <div className="about-columns">
        <section>
          <h2>What the AI actually does</h2>
          <p>
            A quantized MiniLM sentence transformer compares product
            descriptions locally in a browser worker. It can rank an alias for
            review. It never supplies a recalled lot, clears an unknown
            identifier, writes medical instructions, or approves a response.
          </p>
          <p>
            Exact matching uses paired catalog and lot scope plus manufacturer
            identity. Source extraction supports explicitly labeled lines; other
            formats require human pairing.
          </p>
          <a
            href="https://huggingface.co/Xenova/all-MiniLM-L6-v2"
            target="_blank"
            rel="noreferrer"
          >
            Model card and Apache 2.0 license ↗
          </a>
        </section>
        <section>
          <h2>A credible first customer</h2>
          <p>
            Our proposed customer is an independent clinic using spreadsheet
            stock records. Enterprise products such as ECRI already manage
            recalls. Lotlight explores a smaller, transparent
            inventory-reconciliation workflow.
          </p>
          <p>
            <strong>Pricing hypothesis: $149 per site per month.</strong> At an
            assumed loaded staff cost of $30/hour, five hours saved monthly
            would cover that price. This is a testable business hypothesis, not
            customer traction.
          </p>
          <a
            href="https://home.ecri.org/solutions/healthcare-product-alerts"
            target="_blank"
            rel="noreferrer"
          >
            Explore the established category ↗
          </a>
        </section>
        <section>
          <h2>Clear boundaries</h2>
          <p>
            This is a tested hackathon MVP, not a clinically validated or
            certified recall-management system. It has private per-account
            storage, not shared clinic roles. It does not monitor all recalls,
            contact suppliers, provide OCR, or decide patient treatment.
          </p>
          <p>
            No patient information is needed. Public model files download on
            first AI use; inference happens on the device. Signed-in records are
            stored in the hosted database. Anonymous demo changes remain in
            memory and are lost on reload or sign-in.
          </p>
        </section>
        <section>
          <h2>Evidence, without overclaiming</h2>
          <p>
            The FDA explains that a recall can involve correction or removal.
            Follow the actual current instructions. openFDA is a weekly research
            source and explicitly does not support public alerts or recall
            lifecycle tracking. Lotlight therefore starts with an uploaded
            notice.
          </p>
          <a
            href="https://www.fda.gov/medical-devices/medical-device-recalls-and-early-alerts/what-medical-device-recall"
            target="_blank"
            rel="noreferrer"
          >
            FDA: what a medical device recall means ↗
          </a>
          <a
            href="https://open.fda.gov/apis/device/recall/"
            target="_blank"
            rel="noreferrer"
          >
            openFDA usage limitations ↗
          </a>
        </section>
      </div>
      <div className="creator-credit">
        <span className="brand-mark">
          <ScanLine size={24} />
        </span>
        <div>
          <strong>A project by Shivam Gupta</strong>
          <p>
            Built for DSH Hacks V2 with AI-assisted research, implementation,
            testing, and presentation preparation.
          </p>
        </div>
        <a
          href="https://github.com/shi1720/DSH-Hacks-V2"
          target="_blank"
          rel="noreferrer"
        >
          View the code ↗
        </a>
      </div>
    </div>
  );
}
function AuditReport({ state }: { state: Workspace }) {
  return (
    <article className="audit-report">
      <div className="report-head">
        <div className="brand">
          <span className="brand-mark">
            <ScanLine size={23} />
          </span>
          lotlight
        </div>
        <span>AUDIT RECORD · {date(new Date().toISOString())}</span>
      </div>
      <h1>Recall review record</h1>
      <p>
        Workspace revision {state.revision}. Inventory revision{" "}
        {state.inventoryVersion}. {state.inventory.length} stock lines.
        Staff-recorded evidence, not independent verification.
      </p>
      <p>
        Inventory provenance: {state.inventoryProvenance ?? "synthetic"}. Last
        record update: {state.savedAt ?? "No recorded update"}.
      </p>
      <p className="report-notice">
        {state.notices.some((n) => n.training)
          ? "HISTORICAL TRAINING SOURCE: this does not show current recall status. Inventory provenance is listed separately above."
          : "USER-SUPPLIED RECORDS: verify complete current manufacturer instructions before acting."}
      </p>
      {state.notices.map((n) => (
        <section key={n.id}>
          <h2>
            {n.title} · version {n.version}
          </h2>
          <p>
            {n.manufacturer} · Notice {n.date} ·{" "}
            {n.approvedAt
              ? `Source review recorded by ${n.approvedBy} on ${date(n.approvedAt)}`
              : "SOURCE NOT APPROVED"}
          </p>
          <a href={n.sourceUrl}>{n.sourceUrl}</a>
          <h3>Source scope</h3>
          {n.scope.map((s, i) => (
            <p key={i}>
              {s.catalog}: {s.allLots ? "All lots" : s.lots.join(", ")}
              <br />
              <em>{s.evidence}</em>
            </p>
          ))}
          <h3>Response summary</h3>
          <p>{n.action}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock / location</TableHead>
                <TableHead>Identifiers</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconcile(state.inventory, n).map((m) => {
                const a = activeAction(state, n.id, m.item.id);
                return (
                  <TableRow key={m.item.id}>
                    <TableCell>
                      {m.item.product}
                      <br />
                      {m.item.location} · {m.item.quantity} units
                    </TableCell>
                    <TableCell>
                      {m.item.catalog || "Missing catalog"}
                      <br />
                      {m.item.lot || "Missing lot"}
                    </TableCell>
                    <TableCell>
                      {LABELS[m.kind]}
                      <br />
                      <small>{m.reason}</small>
                    </TableCell>
                    <TableCell>
                      {a
                        ? `${a.status} · ${a.owner} · ${a.handledQuantity} units handled`
                        : "No response recorded"}
                      <br />
                      {a?.evidence}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      ))}
      <h2>Activity history</h2>
      {state.audit.map((e) => (
        <div className="report-event" key={e.id}>
          <strong>
            {e.type} · {e.actor}
          </strong>
          <small>{e.at}</small>
          <p>{e.detail}</p>
        </div>
      ))}
      <p className="fine-print">
        No listed match is not a safety clearance. The JSON export includes full
        source text and historical response records. No inference about patient
        safety or FDA recall termination is made.
      </p>
    </article>
  );
}
function CorrectionDialog({
  item,
  busy,
  onClose,
  onSave,
}: {
  item: InventoryItem;
  busy: boolean;
  onClose: () => void;
  onSave: (c: Command) => Promise<void>;
}) {
  const [form, setForm] = useState(item);
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>Correct the physical record.</DialogTitle>
          <DialogDescription>
            Check the label before editing. This line gets a new revision and
            fresh response review. Other unchanged lines keep their current
            response state.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              type: "correct_item",
              id: item.id,
              product: form.product,
              manufacturer: form.manufacturer,
              catalog: form.catalog,
              lot: form.lot,
              quantity: form.quantity,
              location: form.location,
            });
          }}
        >
          <div className="form-two">
            {(
              ["product", "manufacturer", "catalog", "lot", "location"] as const
            ).map((key) => (
              <label className="field-label" key={key}>
                {key[0].toUpperCase() + key.slice(1)}
                <input
                  value={form[key]}
                  required={key === "product" || key === "location"}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="field-label">
              Quantity
              <input
                type="number"
                min={1}
                max={1000000}
                required
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <DialogFooter>
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              Save correction <Check size={14} />
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
