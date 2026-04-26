// C:\Users\User\Downloads\HotelPlanner_Solver\HotelPlanner_Solver\client\src\App.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  Grid2X2,
  Search,
  UploadCloud,
  WandSparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Activity,
  Settings,
  RefreshCw,
} from "lucide-react";
import {
  generateDemoTickets,
  getHealth,
  getRules,
  startSolve,
} from "./api/client.js";

const fallbackTickets = [
  {
    id: "ZD-1001",
    requester: "Guest Example",
    subject: "Guest wants to cancel prepaid non-refundable reservation",
    category: "Cancellation",
    issue: "Non Refundable",
    priority: "high",
    status: "open",
  },
  {
    id: "ZD-1002",
    requester: "Hotel Partner",
    subject: "Hotel cannot locate the reservation",
    category: "Booking Issue",
    issue: "Reservation Not Found",
    priority: "urgent",
    status: "open",
  },
  {
    id: "ZD-1003",
    requester: "Guest Example",
    subject: "Guest says someone else used credit card",
    category: "Billing",
    issue: "Unauthorized Charge",
    priority: "urgent",
    status: "open",
  },
];

function App() {
  const [health, setHealth] = useState(null);
  const [rules, setRules] = useState([]);
  const [tickets, setTickets] = useState(fallbackTickets);
  const [selectedTicket, setSelectedTicket] = useState(fallbackTickets[0]);
  const [query, setQuery] = useState("");
  const [solveResult, setSolveResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isSolving, setIsSolving] = useState(false);
  const [adminMode, setAdminMode] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [healthData, rulesData, ticketData] = await Promise.allSettled([
        getHealth(),
        getRules(),
        generateDemoTickets(),
      ]);

      if (healthData.status === "fulfilled") {
        setHealth(healthData.value);
      }

      if (rulesData.status === "fulfilled") {
        const normalizedRules = Array.isArray(rulesData.value)
          ? rulesData.value
          : rulesData.value?.rules || [];
        setRules(normalizedRules);
      }

      if (ticketData.status === "fulfilled") {
        const normalizedTickets = Array.isArray(ticketData.value)
          ? ticketData.value
          : ticketData.value?.tickets || [];

        if (normalizedTickets.length > 0) {
          setTickets(normalizedTickets);
          setSelectedTicket(normalizedTickets[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }

  const filteredTickets = useMemo(() => {
    const text = query.toLowerCase().trim();

    if (!text) return tickets;

    return tickets.filter((ticket) => {
      return (
        String(ticket.id || "").toLowerCase().includes(text) ||
        String(ticket.subject || "").toLowerCase().includes(text) ||
        String(ticket.category || "").toLowerCase().includes(text) ||
        String(ticket.issue || "").toLowerCase().includes(text) ||
        String(ticket.requester || "").toLowerCase().includes(text)
      );
    });
  }, [query, tickets]);

  const ruleCount = Array.isArray(rules) ? rules.length : 0;

  async function handleSolve(ticket) {
    if (!ticket) return;

    setSelectedTicket(ticket);
    setSolveResult(null);
    setIsSolving(true);

    setLogs([
      `[Fetching Ticket] ${ticket.id}`,
      `[Reading Category] ${ticket.category || "Unknown"}`,
      `[Reading Issue] ${ticket.issue || "Unknown"}`,
      "[Checking Matrix Rule Engine]",
      "[Calling Backend One-Click Solver]",
    ]);

    try {
      const response = await startSolve(ticket);

      const matchedRule =
        response?.matchedRule ||
        response?.data?.matchedRule ||
        response?.rule ||
        null;

      const requiresHumanEscalation =
        response?.requiresHumanEscalation === true ||
        response?.data?.requiresHumanEscalation === true ||
        response?.escalationRequired === true;

      setSolveResult(response);

      setLogs((prev) => [
        ...prev,
        "[Verifying QA Compliance]",
        matchedRule
          ? `[Matrix Match] ${matchedRule.category || "Unknown"} / ${
              matchedRule.issue || "Unknown"
            }`
          : "[Matrix Match] No strict rule found",
        requiresHumanEscalation
          ? "[Final Decision] Human escalation required"
          : "[Final Decision] Safe deterministic action generated",
      ]);
    } catch (error) {
      console.error(error);

      setSolveResult({
        success: false,
        requiresHumanEscalation: true,
        message:
          "Backend unavailable or solve request failed. Defaulting to human escalation.",
        error: error.message,
      });

      setLogs((prev) => [
        ...prev,
        "[System Error] Backend unavailable or solve request failed",
        "[Final Decision] Human escalation required",
      ]);
    } finally {
      setTimeout(() => {
        setIsSolving(false);
      }, 600);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowOne} />
      <div style={styles.backgroundGlowTwo} />

      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>HotelPlanner.com</div>
          <h1 style={styles.title}>One-Click Ticket Solver</h1>
          <p style={styles.subtitle}>
            Deterministic matrix-first Zendesk automation with full boss
            override, visibility, and QA compliance control.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.secondaryButton} onClick={loadInitialData}>
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            style={adminMode ? styles.activeButton : styles.secondaryButton}
            onClick={() => setAdminMode((value) => !value)}
          >
            <ShieldCheck size={17} />
            {adminMode ? "Boss Mode On" : "Boss Mode Off"}
          </button>
        </div>
      </header>

      <main style={styles.grid}>
        <section style={{ ...styles.card, ...styles.heroCard }}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Automation Control</h2>
              <p style={styles.cardText}>
                Select a Zendesk ticket and run the strict rule engine.
              </p>
            </div>
            <Bot size={30} />
          </div>

          <div style={styles.selectedBox}>
            <div style={styles.ticketId}>
              {selectedTicket?.id || "No Ticket"}
            </div>

            <div style={styles.ticketSubject}>
              {selectedTicket?.subject || "Select a ticket to begin"}
            </div>

            <div style={styles.metaRow}>
              <span style={styles.pill}>
                Category: {selectedTicket?.category || "Unknown"}
              </span>

              <span style={styles.pill}>
                Issue: {selectedTicket?.issue || "Unknown"}
              </span>

              <span style={styles.priorityPill}>
                {selectedTicket?.priority || "normal"}
              </span>
            </div>
          </div>

          <button
            style={styles.solveButton}
            onClick={() => handleSolve(selectedTicket)}
            disabled={!selectedTicket || isSolving}
          >
            <WandSparkles size={20} />
            {isSolving ? "Solving..." : "One Click Solve"}
          </button>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>System Health</h2>
              <p style={styles.cardText}>Backend and automation readiness.</p>
            </div>
            <Activity size={26} />
          </div>

          <div style={styles.statusList}>
            <StatusRow
              label="Backend"
              value={health?.status || "Unknown"}
              good={health?.status === "ok" || health?.success === true}
            />

            <StatusRow
              label="Rule Engine"
              value={`${ruleCount} rules loaded`}
              good={ruleCount > 0}
            />

            <StatusRow label="Escalation Safety" value="Enabled" good={true} />

            <StatusRow label="LLM Drafting" value="Rules first" good={true} />
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Boss Panel</h2>
              <p style={styles.cardText}>Override and compliance visibility.</p>
            </div>
            <Settings size={26} />
          </div>

          <div style={styles.adminPanel}>
            <div style={styles.adminItem}>
              <span>Human escalation fallback</span>
              <strong>Always On</strong>
            </div>

            <div style={styles.adminItem}>
              <span>Undefined matrix issue</span>
              <strong>Escalate</strong>
            </div>

            <div style={styles.adminItem}>
              <span>Refund execution</span>
              <strong>Mock API</strong>
            </div>

            <div style={styles.adminItem}>
              <span>Manager override</span>
              <strong>{adminMode ? "Enabled" : "Disabled"}</strong>
            </div>
          </div>
        </section>

        <section style={{ ...styles.card, ...styles.ticketCard }}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Zendesk Ticket Queue</h2>
              <p style={styles.cardText}>Demo queue for matrix validation.</p>
            </div>
            <Grid2X2 size={26} />
          </div>

          <div style={styles.searchBox}>
            <Search size={18} />
            <input
              style={styles.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticket, category, issue..."
            />
          </div>

          <div style={styles.ticketList}>
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                style={
                  selectedTicket?.id === ticket.id
                    ? styles.ticketButtonActive
                    : styles.ticketButton
                }
                onClick={() => setSelectedTicket(ticket)}
              >
                <div style={styles.ticketButtonTop}>
                  <strong>{ticket.id}</strong>
                  <span>{ticket.priority || "normal"}</span>
                </div>

                <p>{ticket.subject}</p>

                <small>
                  {ticket.category || "Unknown"} / {ticket.issue || "Unknown"}
                </small>
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...styles.card, ...styles.resultCard }}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Solve Result</h2>
              <p style={styles.cardText}>Transparent deterministic output.</p>
            </div>
            <FileText size={26} />
          </div>

          {!solveResult ? (
            <div style={styles.emptyState}>
              <UploadCloud size={38} />
              <p>No solve result yet. Select a ticket and click solve.</p>
            </div>
          ) : (
            <div style={styles.resultBox}>
              <div
                style={
                  solveResult.requiresHumanEscalation
                    ? styles.warningBanner
                    : styles.successBanner
                }
              >
                {solveResult.requiresHumanEscalation ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}

                <span>
                  {solveResult.requiresHumanEscalation
                    ? "Human Escalation Required"
                    : "Matrix Rule Matched"}
                </span>
              </div>

              <pre style={styles.pre}>{JSON.stringify(solveResult, null, 2)}</pre>
            </div>
          )}
        </section>

        <section style={{ ...styles.card, ...styles.logsCard }}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Live Execution Trace</h2>
              <p style={styles.cardText}>
                What the system is checking step by step.
              </p>
            </div>
            <Bell size={26} />
          </div>

          <div style={styles.logsBox}>
            {logs.length === 0 ? (
              <p style={styles.mutedText}>No execution logs yet.</p>
            ) : (
              logs.map((log, index) => (
                <div key={`${log}-${index}`} style={styles.logLine}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{log}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {isSolving && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.loader} />

            <h2>Running One-Click Solver</h2>

            <p>
              The system is checking the matrix, QA rules, escalation triggers,
              and safe action path.
            </p>

            <div style={styles.modalLogs}>
              {logs.map((log, index) => (
                <div key={`${log}-modal-${index}`} style={styles.modalLogLine}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value, good }) {
  return (
    <div style={styles.statusRow}>
      <span>{label}</span>
      <strong style={good ? styles.goodText : styles.badText}>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #1d4ed8 0, transparent 28%), radial-gradient(circle at bottom right, #9333ea 0, transparent 24%), #070b16",
    color: "#f8fafc",
    padding: "34px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: "relative",
    overflowX: "hidden",
  },
  backgroundGlowOne: {
    position: "fixed",
    width: "360px",
    height: "360px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.18)",
    filter: "blur(60px)",
    top: "80px",
    left: "10%",
    pointerEvents: "none",
  },
  backgroundGlowTwo: {
    position: "fixed",
    width: "420px",
    height: "420px",
    borderRadius: "999px",
    background: "rgba(168, 85, 247, 0.18)",
    filter: "blur(70px)",
    bottom: "20px",
    right: "8%",
    pointerEvents: "none",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "24px",
    marginBottom: "28px",
    position: "relative",
    zIndex: 1,
  },
  eyebrow: {
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    fontSize: "44px",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  subtitle: {
    marginTop: "12px",
    color: "#cbd5e1",
    maxWidth: "720px",
    fontSize: "16px",
    lineHeight: 1.6,
  },
  headerActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: "18px",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "rgba(15, 23, 42, 0.68)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "26px",
    padding: "22px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.32)",
    backdropFilter: "blur(18px)",
    gridColumn: "span 4",
  },
  heroCard: {
    gridColumn: "span 6",
  },
  ticketCard: {
    gridColumn: "span 5",
  },
  resultCard: {
    gridColumn: "span 7",
  },
  logsCard: {
    gridColumn: "span 12",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "18px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    letterSpacing: "-0.02em",
  },
  cardText: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  selectedBox: {
    borderRadius: "22px",
    padding: "18px",
    background: "rgba(2, 6, 23, 0.55)",
    border: "1px solid rgba(255,255,255,0.1)",
    marginBottom: "18px",
  },
  ticketId: {
    color: "#93c5fd",
    fontWeight: 900,
    fontSize: "14px",
    marginBottom: "8px",
  },
  ticketSubject: {
    fontSize: "22px",
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: "14px",
  },
  metaRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  pill: {
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "12px",
    background: "rgba(148, 163, 184, 0.12)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  priorityPill: {
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "12px",
    background: "rgba(251, 191, 36, 0.14)",
    color: "#fde68a",
    border: "1px solid rgba(251, 191, 36, 0.25)",
    textTransform: "uppercase",
  },
  solveButton: {
    width: "100%",
    border: 0,
    borderRadius: "18px",
    padding: "15px 18px",
    background: "linear-gradient(135deg, #2563eb, #9333ea)",
    color: "white",
    fontWeight: 900,
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    cursor: "pointer",
    boxShadow: "0 16px 40px rgba(37, 99, 235, 0.32)",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "14px",
    padding: "11px 14px",
    background: "rgba(15, 23, 42, 0.68)",
    color: "#e2e8f0",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backdropFilter: "blur(16px)",
  },
  activeButton: {
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "14px",
    padding: "11px 14px",
    background: "rgba(34, 197, 94, 0.16)",
    color: "#bbf7d0",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backdropFilter: "blur(16px)",
  },
  statusList: {
    display: "grid",
    gap: "12px",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    padding: "12px",
    borderRadius: "16px",
    background: "rgba(2, 6, 23, 0.48)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  goodText: {
    color: "#86efac",
  },
  badText: {
    color: "#fca5a5",
  },
  adminPanel: {
    display: "grid",
    gap: "12px",
  },
  adminItem: {
    padding: "13px",
    borderRadius: "16px",
    background: "rgba(2, 6, 23, 0.48)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "16px",
    background: "rgba(2, 6, 23, 0.52)",
    border: "1px solid rgba(255,255,255,0.1)",
    marginBottom: "14px",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: 0,
    outline: 0,
    color: "#f8fafc",
    fontSize: "14px",
  },
  ticketList: {
    display: "grid",
    gap: "10px",
    maxHeight: "430px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  ticketButton: {
    textAlign: "left",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "14px",
    background: "rgba(2, 6, 23, 0.45)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  ticketButtonActive: {
    textAlign: "left",
    border: "1px solid rgba(96, 165, 250, 0.55)",
    borderRadius: "18px",
    padding: "14px",
    background: "rgba(37, 99, 235, 0.22)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  ticketButtonTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "8px",
  },
  emptyState: {
    minHeight: "260px",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: "#94a3b8",
    borderRadius: "20px",
    border: "1px dashed rgba(255,255,255,0.14)",
    background: "rgba(2, 6, 23, 0.34)",
  },
  resultBox: {
    display: "grid",
    gap: "14px",
  },
  warningBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderRadius: "16px",
    padding: "13px",
    background: "rgba(239, 68, 68, 0.16)",
    color: "#fecaca",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    fontWeight: 900,
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderRadius: "16px",
    padding: "13px",
    background: "rgba(34, 197, 94, 0.16)",
    color: "#bbf7d0",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    fontWeight: 900,
  },
  pre: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    margin: 0,
    padding: "16px",
    borderRadius: "18px",
    background: "rgba(2, 6, 23, 0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: "12px",
    maxHeight: "420px",
    overflowY: "auto",
  },
  logsBox: {
    minHeight: "170px",
    display: "grid",
    gap: "8px",
  },
  mutedText: {
    color: "#94a3b8",
  },
  logLine: {
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: "10px",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "14px",
    background: "rgba(2, 6, 23, 0.45)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.72)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
    padding: "24px",
    backdropFilter: "blur(12px)",
  },
  modal: {
    width: "min(680px, 100%)",
    borderRadius: "30px",
    background: "rgba(15, 23, 42, 0.78)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 30px 100px rgba(0,0,0,0.52)",
    padding: "28px",
    textAlign: "center",
  },
  loader: {
    width: "52px",
    height: "52px",
    borderRadius: "999px",
    border: "4px solid rgba(255,255,255,0.16)",
    borderTopColor: "#60a5fa",
    margin: "0 auto 16px",
    animation: "spin 1s linear infinite",
  },
  modalLogs: {
    marginTop: "18px",
    textAlign: "left",
    display: "grid",
    gap: "8px",
    maxHeight: "280px",
    overflowY: "auto",
  },
  modalLogLine: {
    padding: "10px 12px",
    borderRadius: "14px",
    background: "rgba(2, 6, 23, 0.54)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: "13px",
  },
};

export default App;