/* JustWait – shared script. Each page sets <body data-page="..."> and runs its own init. */

// ---- Data (prototype: hard-coded instead of a server) ----
const SERVICES = {
  affairs: { name: "Student Affairs", icon: "briefcase", color: "#e8604f", tint: "#fdecea", prefix: "A",
    desc: "Enrollment, records, financial aid, and campus life support.", waiting: 6, last: "A-027", wait: "15–20" },
  it: { name: "IT Support", icon: "laptop", color: "#3b7ea1", tint: "#e6f1f7", prefix: "IT",
    desc: "Accounts, campus Wi-Fi, software, and device assistance.", waiting: 2, last: "IT-042", wait: "12–16" },
  advising: { name: "Academic Advising", icon: "calendar", color: "#d19a1f", tint: "#fbf1d9",
    desc: "Course planning, degree progress, and academic guidance.",
    advisors: {
      jordan: { name: "Jordan Chen", prefix: "C2", waiting: 1, last: "C2-011", wait: "6–10" },
      maya:   { name: "Maya Okafor", prefix: "C1", waiting: 3, last: "C1-008", wait: "12–15" } } }
};

const ICONS = {
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const $ = sel => document.querySelector(sel);

// Returns the queue figures for a service (and advisor, for Advising)
function queueFor(key, advisorKey) {
  const s = SERVICES[key];
  return s.advisors ? (s.advisors[advisorKey] || null) : s;
}
function setTheme(el, s) { el.style.setProperty("--accent", s.color); el.style.setProperty("--tint", s.tint); }

// ---- Shared queue storage (prototype: localStorage stands in for a database) ----
const SAMPLE_NAMES = ["Sam Lee", "Ana Silva", "Omar Hassan", "Mia Wong", "Luca Rossi", "Noor Ali"];
const numPart = n => parseInt(n.split("-")[1], 10);
const saveQueue = q => localStorage.setItem("justwait-queue", JSON.stringify(q));
function getQueue() {
  let q = JSON.parse(localStorage.getItem("justwait-queue") || "null");
  if (!q) {   // first visit: build the sample waiting lists shown on the home page
    q = [];
    const add = (service, advisor, prefix, last, count) => {
      for (let i = 1; i <= count; i++) q.push({ number: `${prefix}-${String(numPart(last) + i).padStart(3, "0")}`,
        service, advisor, name: SAMPLE_NAMES[q.length % SAMPLE_NAMES.length] });
    };
    add("affairs", "", "A", "A-027", 6); add("it", "", "IT", "IT-042", 2);
    add("advising", "Jordan Chen", "C2", "C2-011", 1); add("advising", "Maya Okafor", "C1", "C1-008", 3);
    saveQueue(q);
  }
  return q;
}

// ---- Home page: service cards ----
function initHome() {
  const grid = $("#services");
  grid.innerHTML = Object.entries(SERVICES).map(([key, s]) => `
    <article class="card" id="card-${key}">
      <div class="card-top"><span class="icon">${icon(s.icon)}</span><span class="open">Open</span></div>
      <h2>${s.name}</h2><p>${s.desc}</p>
      ${s.advisors ? `<label for="advisor-${key}">Choose your advisor</label>
        <select id="advisor-${key}"><option value="">Select an advisor</option>
        ${Object.entries(s.advisors).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join("")}</select>` : ""}
      <div class="stats"></div>
      <a class="btn" href="#">Join queue ${icon("arrow")}</a>
    </article>`).join("");

  Object.entries(SERVICES).forEach(([key, s]) => {
    const card = $("#card-" + key), select = card.querySelector("select");
    setTheme(card, s);
    const refresh = () => {
      const q = queueFor(key, select && select.value);
      card.querySelector(".stats").innerHTML =
        `<div><b>${q ? q.waiting : "–"}</b><span>Waiting now</span></div><div><b>${q ? q.last : "–"}</b><span>Last called</span></div>`;
      const btn = card.querySelector(".btn");
      btn.setAttribute("aria-disabled", q ? "false" : "true");
      btn.href = q ? `join.html?service=${key}` + (select ? `&advisor=${select.value}` : "") : "#";
    };
    if (select) select.addEventListener("change", refresh);
    refresh();
  });
}

// ---- Join page: form + live summary ----
function initJoin() {
  const params = new URLSearchParams(location.search), key = params.get("service");
  const s = SERVICES[key];
  if (!s) { location.href = "index.html"; return; }
  setTheme(document.body, s);
  $("#service-title").textContent = s.name;
  $("#join-title").textContent = `Join the ${s.name} queue`;
  $("#summary-icon").innerHTML = icon(s.icon);

  const advisorField = $("#advisor-field"), select = $("#advisor");
  if (s.advisors) {   // Advising needs an advisor choice
    advisorField.hidden = false;
    select.innerHTML = Object.entries(s.advisors).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join("");
    select.value = params.get("advisor") || Object.keys(s.advisors)[0];
  }
  const current = () => queueFor(key, select.value);
  const render = () => {
    const q = current();
    $("#waiting").textContent = q.waiting; $("#last").textContent = q.last; $("#wait").textContent = q.wait;
  };
  select.addEventListener("change", render); render();

  const setError = (id, msg) => { $("#" + id + "-error").textContent = msg; return !!msg; };
  $("#join-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#name").value.trim(), sid = $("#sid").value.trim().toUpperCase(), n = parseInt(sid.slice(1), 10);
    const bad1 = setError("name", name ? "" : "Enter your full name.");
    const bad2 = setError("sid", /^S\d{4}$/.test(sid) && n >= 1001 && n <= 1100 ? "" : "Enter an ID from S1001 to S1100.");
    if (bad1 || bad2) return;
    const q = current(), queue = getQueue();
    const same = queue.filter(x => x.number.startsWith(q.prefix + "-"));
    const num = Math.max(numPart(q.last), ...same.map(x => numPart(x.number))) + 1;
    const number = `${q.prefix}-${String(num).padStart(3, "0")}`;
    queue.push({ number, service: key, advisor: s.advisors ? q.name : "", name });
    saveQueue(queue);
    localStorage.setItem("justwait-ticket", JSON.stringify({
      number, service: key, name, sid, advisor: s.advisors ? q.name : "", position: same.length + 1, wait: q.wait }));
    location.href = "ticket.html";
  });
}

// ---- Ticket page: confirmation ----
function initTicket() {
  const t = JSON.parse(localStorage.getItem("justwait-ticket") || "null"), box = $("#ticket");
  if (!t) { box.innerHTML = `<h1>No active ticket</h1><p class="lead">Join a queue to get your place in line.</p>
    <a class="btn" href="index.html">View services</a>`; return; }
  const s = SERVICES[t.service]; setTheme(document.body, s);
  box.innerHTML = `<p class="eyebrow">You're in line</p><div class="big">${t.number}</div>
    <h1>${s.name}${t.advisor ? " with " + t.advisor : ""}</h1>
    <p class="lead">Thanks, ${t.name}. Keep this page open; staff will call your number.</p>
    <dl class="summary"><div class="row"><span>Your position</span><b>${t.position}</b></div>
    <div class="row"><span>Estimated wait</span><b>${t.wait} min</b></div>
    <div class="row"><span>Student ID</span><b>${t.sid}</b></div></dl>
    <button class="btn ghost" id="leave">Leave queue</button>`;
  $("#leave").addEventListener("click", () => { localStorage.removeItem("justwait-ticket"); location.href = "index.html"; });
}

// ---- Staff login page (demo credentials only; a real system would check a server) ----
function initLogin() {
  $("#login-form").addEventListener("submit", e => {
    e.preventDefault();
    if ($("#email").value.trim() === "staff@justwait.edu" && $("#password").value === "staff123") {
      sessionStorage.setItem("justwait-staff", "1"); location.href = "dashboard.html";
    } else { $("#login-error").textContent = "Email or password is incorrect."; }
  });
}

// ---- Staff dashboard: view the waiting lists and call the next person ----
function initDashboard() {
  if (!sessionStorage.getItem("justwait-staff")) { location.href = "login.html"; return; }
  const draw = message => {
    const queue = getQueue();
    $("#called").textContent = message || "Select Call next to serve the person at the front of a line.";
    $("#lists").innerHTML = Object.entries(SERVICES).map(([key, s]) => {
      const rows = queue.filter(x => x.service === key);
      return `<section class="panel"><div class="panel-head"><h2>${s.name}</h2>
        <button class="btn call" data-service="${key}" ${rows.length ? "" : 'aria-disabled="true"'}>Call next</button></div>
        <table><thead><tr><th>Ticket</th><th>Name</th><th>Advisor</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${r.number}</td><td>${r.name}</td><td>${r.advisor || "–"}</td></tr>`).join("")
          || '<tr><td colspan="3">No one is waiting.</td></tr>'}</tbody></table></section>`;
    }).join("");
  };
  $("#lists").addEventListener("click", e => {
    const btn = e.target.closest(".call"); if (!btn || btn.getAttribute("aria-disabled")) return;
    const queue = getQueue(), i = queue.findIndex(x => x.service === btn.dataset.service);
    const [next] = queue.splice(i, 1); saveQueue(queue);
    draw(`Called ${next.number} – ${next.name}`);
  });
  $("#reset").addEventListener("click", () => {
    localStorage.removeItem("justwait-queue"); localStorage.removeItem("justwait-ticket"); draw("Demo data reset.");
  });
  $("#signout").addEventListener("click", () => { sessionStorage.removeItem("justwait-staff"); location.href = "index.html"; });
  draw();
}

({ login: initLogin, dashboard: initDashboard, home: initHome, join: initJoin, ticket: initTicket })[document.body.dataset.page]();
