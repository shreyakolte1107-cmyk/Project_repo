/* Exam Timetable - plain JavaScript, data stored in browser localStorage */

const ADMIN_CODE = "ADMIN123"; // needed to register as Admin (change if you like)
const $ = (id) => document.getElementById(id);

// ---------- storage helpers ----------
const load = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

async function hashPassword(text) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return btoa(text); // fallback if crypto.subtle is unavailable
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- demo data (first run only) ----------
async function seedData() {
  if (load("users").length) return;
  save("users", [
    { role: "admin", name: "Demo Admin", email: "admin@college.com", password: await hashPassword("admin123") },
    { role: "student", name: "Demo Student", email: "student@college.com", password: await hashPassword("student123"), year: "3", section: "A" },
  ]);
  save("exams", [
    { id: 1, subject: "Data Structures", year: "3", section: "A", date: "2026-11-10", start: "10:00", end: "13:00" },
    { id: 2, subject: "Database Systems", year: "3", section: "A", date: "2026-11-12", start: "10:00", end: "13:00" },
    { id: 3, subject: "Operating Systems", year: "3", section: "B", date: "2026-11-11", start: "14:00", end: "17:00" },
    { id: 4, subject: "Engineering Maths", year: "2", section: "A", date: "2026-11-13", start: "10:00", end: "13:00" },
  ]);
}

// ---------- session ----------
const getSession = () => JSON.parse(sessionStorage.getItem("session") || "null");
const setSession = (user) => sessionStorage.setItem("session", JSON.stringify({ email: user.email, role: user.role }));
function currentUser() {
  const s = getSession();
  if (!s) return null;
  return load("users").find((u) => u.email === s.email && u.role === s.role) || null;
}

// ---------- view switching ----------
function showView(name) {
  ["authView", "adminView", "studentView"].forEach((v) => $(v).classList.add("hidden"));
  $(name).classList.remove("hidden");
}

function route() {
  const user = currentUser();
  if (!user) {
    $("userBox").classList.add("hidden");
    showView("authView");
    return;
  }
  $("userBox").classList.remove("hidden");
  $("userLabel").textContent = `${user.name} (${user.role})`;
  if (user.role === "admin") {
    showView("adminView");
    renderAdminTable();
  } else {
    showView("studentView");
    renderStudentTable(user);
  }
}

// ---------- auth tabs ----------
function switchTab(tab) {
  const isLogin = tab === "login";
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("registerForm").classList.toggle("hidden", isLogin);
  $("tabLogin").classList.toggle("active", isLogin);
  $("tabRegister").classList.toggle("active", !isLogin);
}
$("tabLogin").onclick = () => switchTab("login");
$("tabRegister").onclick = () => switchTab("register");

$("regRole").onchange = () => {
  const isStudent = $("regRole").value === "student";
  $("studentFields").classList.toggle("hidden", !isStudent);
  $("adminCodeBox").classList.toggle("hidden", isStudent);
};

// ---------- register ----------
$("registerForm").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("registerError");
  err.textContent = "";

  const role = $("regRole").value;
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim().toLowerCase();
  const password = $("regPassword").value;
  const year = $("regYear").value;
  const section = $("regSection").value;

  if (!name || !email || !password) return (err.textContent = "Name, email and password are required.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = "Enter a valid email address.");
  if (password.length < 6) return (err.textContent = "Password must be at least 6 characters.");
  if (role === "student" && (!year || !section)) return (err.textContent = "Select your year and section.");
  if (role === "admin" && $("regAdminCode").value !== ADMIN_CODE) return (err.textContent = "Incorrect admin code.");

  const users = load("users");
  if (users.some((u) => u.email === email && u.role === role)) {
    return (err.textContent = `A ${role} account with this email already exists.`);
  }

  const user = { role, name, email, password: await hashPassword(password) };
  if (role === "student") Object.assign(user, { year, section });
  users.push(user);
  save("users", users);

  $("registerForm").reset();
  $("regRole").onchange();
  switchTab("login");
  $("loginEmail").value = email;
  $("loginRole").value = role;
  $("loginError").textContent = "";
  $("loginPassword").focus();
};

// ---------- login / logout ----------
$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("loginError");
  err.textContent = "";

  const role = $("loginRole").value;
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;
  if (!email || !password) return (err.textContent = "Enter your email and password.");

  const hash = await hashPassword(password);
  const user = load("users").find((u) => u.email === email && u.role === role && u.password === hash);
  if (!user) return (err.textContent = "Wrong email, password or role.");

  setSession(user);
  $("loginForm").reset();
  route();
};

$("logoutBtn").onclick = () => {
  sessionStorage.removeItem("session");
  route();
};

// ---------- exam helpers ----------
const sortExams = (list) =>
  [...list].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

const formatDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const isPast = (exam) => new Date(`${exam.date}T${exam.end}`) < new Date();

// ---------- admin: add / delete exams ----------
$("examForm").onsubmit = (e) => {
  e.preventDefault();
  const subject = $("exSubject").value.trim();
  const year = $("exYear").value;
  const section = $("exSection").value;
  const date = $("exDate").value;
  const start = $("exStart").value;
  const end = $("exEnd").value;

  const errors = [];
  if (!subject) errors.push("Subject name is required.");
  if (!year) errors.push("Year is required.");
  if (!section) errors.push("Section is required.");
  if (!date) errors.push("Exam date is required.");
  if (!start) errors.push("Start time is required.");
  if (!end) errors.push("End time is required.");
  if (start && end && end <= start) errors.push("End time must be after the start time.");

  $("examErrors").innerHTML = errors.map((m) => `<li>${m}</li>`).join("");
  if (errors.length) return;

  const exams = load("exams");
  exams.push({ id: Date.now(), subject, year, section, date, start, end });
  save("exams", exams);

  $("examForm").reset();
  renderAdminTable();
};

function renderAdminTable() {
  const exams = sortExams(load("exams"));
  if (!exams.length) {
    $("adminTable").innerHTML = `<p class="empty">No exams added yet. Use the form above to add the first one.</p>`;
    return;
  }
  const rows = exams.map((x) => `
    <tr class="${isPast(x) ? "past" : ""}">
      <td>${escapeHtml(x.subject)}</td>
      <td>${x.year}</td>
      <td>${x.section}</td>
      <td>${formatDate(x.date)}</td>
      <td>${formatTime(x.start)} - ${formatTime(x.end)}</td>
      <td><button class="btn danger" data-id="${x.id}">Delete</button></td>
    </tr>`).join("");
  $("adminTable").innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Subject</th><th>Year</th><th>Section</th><th>Date</th><th>Time</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

$("adminTable").onclick = (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn || !confirm("Delete this exam?")) return;
  save("exams", load("exams").filter((x) => String(x.id) !== btn.dataset.id));
  renderAdminTable();
};

// ---------- student: filtered timetable ----------
function renderStudentTable(user) {
  $("studentClass").textContent = `Year ${user.year}, Section ${user.section}`;
  // Strict filter: only this student's own year AND section
  const mine = sortExams(load("exams").filter((x) => x.year === user.year && x.section === user.section));

  if (!mine.length) {
    $("studentTable").innerHTML = `<p class="empty">No exams are scheduled for Year ${user.year}, Section ${user.section} yet. Check back later.</p>`;
    return;
  }
  const rows = mine.map((x) => `
    <tr class="${isPast(x) ? "past" : ""}">
      <td>${escapeHtml(x.subject)}</td>
      <td>${formatDate(x.date)}</td>
      <td>${formatTime(x.start)} - ${formatTime(x.end)}</td>
      <td>${isPast(x) ? "Completed" : "Upcoming"}</td>
    </tr>`).join("");
  $("studentTable").innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

// ---------- start ----------
seedData().then(route);