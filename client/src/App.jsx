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
  Lock,
  LogOut,
  UserCheck,
  Database,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
import {
  generateDemoTickets,
  getHealth,
  getRules,
  startSolve,
} from "./api/client.js";

const SUPER_BOSS_EMAIL = "april@hotelplanner.com";

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
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState(SUPER_BOSS_EMAIL);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [health, setHealth] = useState(null);
  const [rules, setRules] = useState([]);
  const [tickets, setTickets] = useState(fallbackTickets);
  const [selectedTicket, setSelectedTicket] = useState(fallbackTickets[0]);
  const [queryText, setQueryText] = useState("");
  const [solveResult, setSolveResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isSolving, setIsSolving] = useState(false);
  const [adminMode, setAdminMode] = useState(true);
  const [workedTickets, setWorkedTickets] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (
        currentUser &&
        currentUser.email?.toLowerCase() === SUPER_BOSS_EMAIL.toLowerCase()
      ) {
        setUser(currentUser);
        await loadInitialData();
        await loadWorkedTickets();
      } else {
        if (currentUser) {
          await signOut(auth);
        }
        setUser(null);
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );

      if (
        credential.user.email?.toLowerCase() !== SUPER_BOSS_EMAIL.toLowerCase()
      ) {
        await signOut(auth);
        setLoginError("Only the Super Boss Admin account can access this app.");
        return;
      }

      setUser(credential.user);
      await loadInitialData();
      await loadWorkedTickets();
    } catch (error) {
      setLoginError(
        "Login failed. Make sure Email/Password sign-in is enabled in Firebase and the boss account exists."
      );
      console.error(error);
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
    setSolveResult(null);
    setLogs([]);
  }

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

  async function loadWorkedTickets() {
    try {
      const workedTicketsQuery = query(
        collection(db, "worked_tickets"),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const snapshot = await getDocs(workedTicketsQuery);

      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setWorkedTickets(rows);
    } catch (error) {
      console.error("Failed to load worked tickets:", error);
    }
  }

  async function saveWorkedTicket(ticket, response, finalLogs) {
    const matchedRule =
      response?.matchedRule || response?.data?.matchedRule || response?.rule || null;

    const requiresHumanEscalation =
      response?.requiresHumanEscalation === true ||
      response?.data?.requiresHumanEscalation === true ||
      response?.escalationRequired === true ||
      !matchedRule;

    await addDoc(collection(db, "worked_tickets"), {
      ticketId: ticket.id || "",
      requester: ticket.requester || "",
      subject: ticket.subject || "",
      category: ticket.category || "",
      issue: ticket.issue || "",
      priority: ticket.priority || "",
      status: ticket.status || "",
      resultStatus: requiresHumanEscalation ? "ESCALATED" : "SOLVED",
      requiresHumanEscalation,
      matchedRule: matchedRule || null,
      solveResult: response || null,
      logs: finalLogs,
      workedByEmail: user?.email || "",
      createdAt: serverTimestamp(),
    });

    await loadWorkedTickets();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function addSlowLog(message, type = "info", delay = 900) {
    await wait(delay);
    setLogs((prev) => [...prev, { message, type }]);
  }

  const filteredTickets = useMemo(() => {
    const text = queryText.toLowerCase().trim();

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
  }, [queryText, tickets]);

  const ruleCount = Array.isArray(rules) ? rules.length : 0;

  async function handleSolve(ticket) {
    if (!ticket || isSolving) return;

    setSelectedTicket(ticket);
    setSolveResult(null);
    setLogs([]);
    setIsSolving(true);

    const finalLogMessages = [];

    try {
      const firstLog = {
        message: `[Fetching Ticket] ${ticket.id}`,
        type: "info",
      };
      setLogs([firstLog]);
      finalLogMessages.push(firstLog);

      await addSlowLog(
        `[Reading Category] ${ticket.category || "Unknown"}`,
        "info",
        1000
      );
      finalLogMessages.push({
        message: `[Reading Category] ${ticket.category || "Unknown"}`,
        type: "info",
      });

      await addSlowLog(
        `[Reading Issue] ${ticket.issue || "Unknown"}`,
        "info",
        1000
      );
      finalLogMessages.push({
        message: `[Reading Issue] ${ticket.issue || "Unknown"}`,
        type: "info",
      });

      await addSlowLog("[Checking Matrix Rule Engine]", "info", 1200);
      finalLogMessages.push({
        message: "[Checking Matrix Rule Engine]",
        type: "info",
      });

      await addSlowLog("[Verifying QA Compliance Rules]", "info", 1200);
      finalLogMessages.push({
        message: "[Verifying QA Compliance Rules]",
        type: "info",
      });

      await addSlowLog("[Calling Backend One-Click Solver]", "info", 1200);
      finalLogMessages.push({
        message: "[Calling Backend One-Click Solver]",
        type: "info",
      });

      const response = await startSolve(ticket);

      const matchedRule =
        response?.matchedRule ||
        response?.data?.matchedRule ||
        response?.rule ||
        null;

      const requiresHumanEscalation =
        response?.requiresHumanEscalation === true ||
        response?.data?.requiresHumanEscalation === true ||
        response?.escalationRequired === true ||
        !matchedRule;

      await addSlowLog(
        matchedRule
          ? `[Matrix Match] ${matchedRule.category || "Unknown"} / ${
              matchedRule.issue || "Unknown"
            }`
          : "[Matrix Match] No strict rule found",
        matchedRule ? "success" : "error",
        1200
      );
      finalLogMessages.push({
        message: matchedRule
          ? `[Matrix Match] ${matchedRule.category || "Unknown"} / ${
              matchedRule.issue || "Unknown"
            }`
          : "[Matrix Match] No strict rule found",
        type: matchedRule ? "success" : "error",
      });

      await addSlowLog(
        requiresHumanEscalation
          ? "[Final Decision] Human escalation required"
          : "[Final Decision] Safe deterministic action generated",
        requiresHumanEscalation ? "error" : "success",
        1200
      );
      finalLogMessages.push({
        message: requiresHumanEscalation
          ? "[Final Decision] Human escalation required"
          : "[Final Decision] Safe deterministic action generated",
        type: requiresHumanEscalation ? "error" : "success",
      });

      setSolveResult(response);

      await saveWorkedTicket(ticket, response, finalLogMessages);
    } catch (error) {
      console.error(error);

      const errorResult = {
        success: false,
        requiresHumanEscalation: true,
        message:
          "Backend unavailable or solve request failed. Defaulting to human escalation.",
        error: error.message,
      };

      setSolveResult(errorResult);

      await addSlowLog("[System Error] Backend unavailable or solve failed", "error", 900);
      await addSlowLog("[Final Decision] Human escalation required", "error", 900);

      finalLogMessages.push(
        {
          message: "[System Error] Backend unavailable or solve failed",
          type: "error",
        },
        {
          message: "[Final Decision] Human escalation required",
          type: "error",
        }
      );

      try {
        await saveWorkedTicket(ticket, errorResult, finalLogMessages);
      } catch (saveError) {
        console.error("Failed to save error ticket:", saveError);
      }
    } finally {
      await wait(1000);
      setIsSolving(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.loader} />
          <h1>Checking Super Boss Access...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginGlowOne} />
        <div style={styles.loginGlowTwo} />

        <form style={styles.loginCard} onSubmit={handleLogin}>
          <div style={styles.loginIcon}>
            <Lock size={34} />
          </div>

          <div style={styles.eyebrow}>HotelPlanner Super Boss Portal</div>

          <h1 style={styles.loginTitle}>Boss Admin Login</h1>

          <p style={styles.loginText}>
            Login is restricted to the Super Boss Admin account only.
          </p>

          <label style={styles.label}>Email</label>
          <input
            style={styles.loginInput}
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="april@hotelplanner.com"
            autoComplete="email"
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.loginInput}
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />

          {loginError && <div style={styles.loginError}>{loginError}</div>}

          <button style={styles.loginButton} disabled={loggingIn}>
            <UserCheck size={19} />
            {loggingIn ? "Logging in..." : "Login as Super Boss"}
          </button>

          <div style={styles.loginHint}>
            Firebase Auth must have Email/Password enabled and the user{" "}
            april@hotelplanner.com created with password 12345678.
          </div>
        </form>
      </div>
    );
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
          <div style={styles.loggedInText}>Logged in as {user.email}</div>
        </div>

        <div style={styles.headerActions}>
          <button
            style={styles.secondaryButton}
            onClick={async () => {
              await loadInitialData();
              await loadWorkedTickets();
            }}
          >
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

          <button style={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={17} />
            Logout
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
            <div style={styles.ticketId}>{selectedTicket?.id || "No Ticket"}</div>

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

            <StatusRow label="Firestore Save" value="Enabled" good={true} />
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
              <span>Worked tickets saving</span>
              <strong>Firestore</strong>
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
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
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
                Slow visible solving steps with green success and red danger
                status.
              </p>
            </div>
            <Bell size={26} />
          </div>

          <div style={styles.logsBox}>
            {logs.length === 0 ? (
              <p style={styles.mutedText}>No execution logs yet.</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={`${log.message}-${index}`}
                  style={{
                    ...styles.logLine,
                    ...(log.type === "success" ? styles.logSuccess : {}),
                    ...(log.type === "error" ? styles.logError : {}),
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{log.message}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={{ ...styles.card, ...styles.workedCard }}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Worked Tickets Saved</h2>
              <p style={styles.cardText}>
                Last solved or escalated tickets saved in Firebase Firestore.
              </p>
            </div>
            <Database size={26} />
          </div>

          <div style={styles.workedList}>
            {workedTickets.length === 0 ? (
              <p style={styles.mutedText}>No worked tickets saved yet.</p>
            ) : (
              workedTickets.map((ticket) => (
                <div key={ticket.id} style={styles.workedItem}>
                  <div style={styles.ticketButtonTop}>
                    <strong>{ticket.ticketId}</strong>
                    <span
                      style={
                        ticket.resultStatus === "SOLVED"
                          ? styles.greenBadge
                          : styles.redBadge
                      }
                    >
                      {ticket.resultStatus}
                    </span>
                  </div>

                  <p>{ticket.subject}</p>

                  <small>
                    {ticket.category || "Unknown"} / {ticket.issue || "Unknown"}{" "}
                    — by {ticket.workedByEmail}
                  </small>
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
              The system is slowly checking the matrix, QA rules, escalation
              triggers, and safe action path.
            </p>

            <div style={styles.modalLogs}>
              {logs.map((log, index) => (
                <div
                  key={`${log.message}-modal-${index}`}
                  style={{
                    ...styles.modalLogLine,
                    ...(log.type === "success" ? styles.modalLogSuccess : {}),
                    ...(log.type === "error" ? styles.modalLogError : {}),
                  }}
                >
                  {log.message}
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
  loginPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #16a34a 0, transparent 26%), radial-gradient(circle at bottom right, #dc2626 0, transparent 25%), #070b16",
    color: "#f8fafc",
    display: "grid",
    placeItems: "center",
    padding: "28px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: "relative",
    overflow: "hidden",
  },
  loginGlowOne: {
    position: "fixed",
    width: "380px",
    height: "380px",
    borderRadius: "999px",
    background: "rgba(34, 197, 94, 0.16)",
    filter: "blur(70px)",
    top: "10%",
    left: "10%",
  },
  loginGlowTwo: {
    position: "fixed",
    width: "380px",
    height: "380px",
    borderRadius: "999px",
    background: "rgba(239, 68, 68, 0.14)",
    filter: "blur(70px)",
    bottom: "10%",
    right: "10%",
  },
  loginCard: {
    width: "min(460px, 100%)",
    background: "rgba(15, 23, 42, 0.78)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "30px",
    padding: "30px",
    backdropFilter: "blur(18px)",
    boxShadow: "0 30px 100px rgba(0,0,0,0.45)",
    position: "relative",
    zIndex: 1,
  },
  loginIcon: {
    width: "68px",
    height: "68px",
    borderRadius: "22px",
    background: "linear-gradient(135deg, #16a34a, #2563eb)",
    display: "grid",
    placeItems: "center",
    marginBottom: "18px",
  },
  loginTitle: {
    margin: "0 0 10px",
    fontSize: "34px",
    letterSpacing: "-0.04em",
  },
  loginText: {
    color: "#cbd5e1",
    lineHeight: 1.6,
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#cbd5e1",
    fontWeight: 800,
    margin: "14px 0 7px",
  },
  loginInput: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "14px",
    background: "rgba(2, 6, 23, 0.55)",
    color: "#f8fafc",
    outline: 0,
    fontSize: "15px",
  },
  loginButton: {
    width: "100%",
    border: 0,
    borderRadius: "18px",
    padding: "15px 18px",
    marginTop: "18px",
    background: "linear-gradient(135deg, #16a34a, #2563eb)",
    color: "white",
    fontWeight: 900,
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    cursor: "pointer",
  },
  loginError: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "14px",
    background: "rgba(239, 68, 68, 0.16)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fecaca",
    fontWeight: 800,
  },
  loginHint: {
    marginTop: "14px",
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.5,
  },
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
  loggedInText: {
    marginTop: "10px",
    color: "#86efac",
    fontSize: "13px",
    fontWeight: 800,
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
    gridColumn: "span 7",
  },
  workedCard: {
    gridColumn: "span 5",
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
    background: "linear-gradient(135deg, #16a34a, #2563eb)",
    color: "white",
    fontWeight: 900,
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    cursor: "pointer",
    boxShadow: "0 16px 40px rgba(22, 163, 74, 0.28)",
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
  logoutButton: {
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "14px",
    padding: "11px 14px",
    background: "rgba(239, 68, 68, 0.14)",
    color: "#fecaca",
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
  logSuccess: {
    background: "rgba(34, 197, 94, 0.16)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    color: "#bbf7d0",
  },
  logError: {
    background: "rgba(239, 68, 68, 0.16)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
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
    borderTopColor: "#22c55e",
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
  modalLogSuccess: {
    background: "rgba(34, 197, 94, 0.16)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    color: "#bbf7d0",
  },
  modalLogError: {
    background: "rgba(239, 68, 68, 0.16)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
  },
  workedList: {
    display: "grid",
    gap: "10px",
    maxHeight: "420px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  workedItem: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "14px",
    background: "rgba(2, 6, 23, 0.45)",
    color: "#f8fafc",
  },
  greenBadge: {
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    background: "rgba(34, 197, 94, 0.16)",
    color: "#bbf7d0",
    border: "1px solid rgba(34, 197, 94, 0.35)",
  },
  redBadge: {
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    background: "rgba(239, 68, 68, 0.16)",
    color: "#fecaca",
    border: "1px solid rgba(239, 68, 68, 0.35)",
  },
};

export default App;