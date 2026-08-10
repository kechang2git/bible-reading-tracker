const STORAGE_KEY = "bible-reading-tracker-static-pwa-v1";
const BACKUP_DB_NAME = "bible-reading-tracker-backups";
const BACKUP_STORE_NAME = "handles";
const BACKUP_DIRECTORY_KEY = "backupDirectory";
const BACKUP_FILENAME = "bible-reading-tracker-backup.json";

const books = [
  ["創世記", "Genesis", "old", 50], ["出埃及記", "Exodus", "old", 40], ["利未記", "Leviticus", "old", 27],
  ["民數記", "Numbers", "old", 36], ["申命記", "Deuteronomy", "old", 34], ["約書亞記", "Joshua", "old", 24],
  ["士師記", "Judges", "old", 21], ["路得記", "Ruth", "old", 4], ["撒母耳記上", "1 Samuel", "old", 31],
  ["撒母耳記下", "2 Samuel", "old", 24], ["列王紀上", "1 Kings", "old", 22], ["列王紀下", "2 Kings", "old", 25],
  ["歷代志上", "1 Chronicles", "old", 29], ["歷代志下", "2 Chronicles", "old", 36], ["以斯拉記", "Ezra", "old", 10],
  ["尼希米記", "Nehemiah", "old", 13], ["以斯帖記", "Esther", "old", 10], ["約伯記", "Job", "old", 42],
  ["詩篇", "Psalms", "old", 150], ["箴言", "Proverbs", "old", 31], ["傳道書", "Ecclesiastes", "old", 12],
  ["雅歌", "Song of Songs", "old", 8], ["以賽亞書", "Isaiah", "old", 66], ["耶利米書", "Jeremiah", "old", 52],
  ["耶利米哀歌", "Lamentations", "old", 5], ["以西結書", "Ezekiel", "old", 48], ["但以理書", "Daniel", "old", 12],
  ["何西阿書", "Hosea", "old", 14], ["約珥書", "Joel", "old", 3], ["阿摩司書", "Amos", "old", 9],
  ["俄巴底亞書", "Obadiah", "old", 1], ["約拿書", "Jonah", "old", 4], ["彌迦書", "Micah", "old", 7],
  ["那鴻書", "Nahum", "old", 3], ["哈巴谷書", "Habakkuk", "old", 3], ["西番雅書", "Zephaniah", "old", 3],
  ["哈該書", "Haggai", "old", 2], ["撒迦利亞書", "Zechariah", "old", 14], ["瑪拉基書", "Malachi", "old", 4],
  ["馬太福音", "Matthew", "new", 28], ["馬可福音", "Mark", "new", 16], ["路加福音", "Luke", "new", 24],
  ["約翰福音", "John", "new", 21], ["使徒行傳", "Acts", "new", 28], ["羅馬書", "Romans", "new", 16],
  ["哥林多前書", "1 Corinthians", "new", 16], ["哥林多後書", "2 Corinthians", "new", 13], ["加拉太書", "Galatians", "new", 6],
  ["以弗所書", "Ephesians", "new", 6], ["腓立比書", "Philippians", "new", 4], ["歌羅西書", "Colossians", "new", 4],
  ["帖撒羅尼迦前書", "1 Thessalonians", "new", 5], ["帖撒羅尼迦後書", "2 Thessalonians", "new", 3],
  ["提摩太前書", "1 Timothy", "new", 6], ["提摩太後書", "2 Timothy", "new", 4], ["提多書", "Titus", "new", 3],
  ["腓利門書", "Philemon", "new", 1], ["希伯來書", "Hebrews", "new", 13], ["雅各書", "James", "new", 5],
  ["彼得前書", "1 Peter", "new", 5], ["彼得後書", "2 Peter", "new", 3], ["約翰一書", "1 John", "new", 5],
  ["約翰二書", "2 John", "new", 1], ["約翰三書", "3 John", "new", 1], ["猶大書", "Jude", "new", 1],
  ["啟示錄", "Revelation", "new", 22],
].map(([chineseName, englishName, testament, chapterCount], index) => ({
  id: index + 1, chineseName, englishName, testament, chapterCount
}));

const scopeLabels = { entireBible: "Entire Bible", oldTestament: "Old Testament", newTestament: "New Testament" };
const languageLabels = { englishOnly: "English only", traditionalChineseOnly: "Traditional Chinese only", both: "Traditional Chinese + English" };
const tabs = [["dashboard", "◴", "Dashboard"], ["bible", "☑", "Bible"], ["calendar", "▦", "Calendar"], ["settings", "⚙", "Settings"]];

let state = loadState();
let activeTab = "dashboard";
let expandedBooks = new Set();
let backupDirectoryHandle = null;

function loadState() {
  const fallback = { goal: null, languageMode: "both", progress: [], backupLocation: null };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayString(date = new Date()) {
  return localDateString(date);
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatDateWithWeekday(value) {
  return parseDate(value).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

function booksInScope(scope) {
  if (scope === "oldTestament") return books.filter((book) => book.testament === "old");
  if (scope === "newTestament") return books.filter((book) => book.testament === "new");
  return books;
}

function totalChapters(scope) {
  return booksInScope(scope).reduce((sum, book) => sum + book.chapterCount, 0);
}

function bookName(book) {
  if (state.languageMode === "englishOnly") return book.englishName;
  if (state.languageMode === "traditionalChineseOnly") return book.chineseName;
  return `${book.chineseName} ${book.englishName}`;
}

function chapterName(book, chapter) {
  if (state.languageMode === "englishOnly") return `${book.englishName} ${chapter}`;
  if (state.languageMode === "traditionalChineseOnly") return `${book.chineseName} ${chapter}章`;
  return `${book.chineseName} ${book.englishName} ${chapter}`;
}

function progressKey(bookId, chapterNumber) {
  return `${bookId}:${chapterNumber}`;
}

function daysElapsedInclusive(startDate) {
  const start = parseDate(startDate);
  const now = parseDate(todayString());
  if (now < start) return 0;
  return Math.floor((now - start) / 86400000) + 1;
}

function expectedFinishDate(goal) {
  return calculatedFinishDate(goal.startDate, goal.scope, goal.chaptersPerDay);
}

function calculatedFinishDate(startDate, scope, chaptersPerDay) {
  const days = Math.max(1, Math.ceil(totalChapters(scope) / Math.max(1, chaptersPerDay)));
  return localDateString(addDays(parseDate(startDate), days - 1));
}

function requiredPace(goal) {
  if (!goal.targetFinishDate) return null;
  const start = parseDate(goal.startDate);
  const target = parseDate(goal.targetFinishDate);
  if (target < start) return totalChapters(goal.scope);
  return Math.max(1, Math.ceil(totalChapters(goal.scope) / (Math.floor((target - start) / 86400000) + 1)));
}

function summary() {
  const goal = state.goal;
  const ids = new Set(booksInScope(goal.scope).map((book) => book.id));
  const completed = state.progress.filter((item) => item.isCompleted && ids.has(item.bookId));
  const total = totalChapters(goal.scope);
  const expected = Math.min(total, daysElapsedInclusive(goal.startDate) * Math.max(1, goal.chaptersPerDay));
  const actual = completed.length;
  return { completed, latest: latestCompleted(completed), total, actual, expected, remaining: total - actual, aheadBehind: actual - expected, percent: Math.round((actual / total) * 100), onTrack: actual >= expected };
}

function latestCompleted(completed) {
  return completed
    .filter((item) => item.completedTimestamp || item.completedDate)
    .sort((a, b) => completionTime(b) - completionTime(a))[0] || null;
}

function completionTime(item) {
  return new Date(item.completedTimestamp || `${item.completedDate}T00:00:00`).getTime();
}

function render() {
  if (!state.goal) {
    renderSetup();
    return;
  }
  document.querySelector("#app").innerHTML = `
    <div class="app-main">
      <header class="top"><div class="top-row"><h1>${tabTitle(activeTab)}</h1>${activeTab === "bible" ? `<button class="mini-action" id="quickBackup">Backup</button>` : ""}</div><p class="subtitle">Local-first offline PWA</p></header>
      <div id="content"></div>
    </div>
    <nav class="tabs">${tabs.map(([key, icon, label]) => `<button class="tab ${activeTab === key ? "active" : ""}" data-tab="${key}"><b>${icon}</b>${label}</button>`).join("")}</nav>
  `;
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = button.dataset.tab; render(); }));
  if (activeTab === "dashboard") renderDashboard();
  if (activeTab === "bible") renderBible();
  if (activeTab === "calendar") renderCalendar();
  if (activeTab === "settings") renderSettings();
  document.querySelector("#quickBackup")?.addEventListener("click", confirmQuickBackup);
}

function renderSetup() {
  const start = todayString();
  const target = calculatedFinishDate(start, "entireBible", 10);
  document.querySelector("#app").innerHTML = `
    <div class="app-main">
      <header class="top"><h1>Bible Reading Tracker</h1><p class="subtitle">Set your first local reading goal.</p></header>
      <section class="card padded">
        <div class="field-grid">
          ${field("Start date", `<input id="startDate" type="date" value="${start}">`)}
          ${field("Chapters per day", `<input id="chaptersPerDay" type="number" min="1" max="150" value="10">`)}
          ${field("Scope", scopeSelect("entireBible"))}
          ${field("Target finish date", `<input id="targetFinishDate" type="date" value="${target}" readonly>`)}
        </div>
        <button class="primary" id="startButton">Start Tracking</button>
      </section>
    </div>`;
  document.querySelector("#startButton").addEventListener("click", () => {
    state.goal = {
      startDate: value("#startDate"),
      chaptersPerDay: Math.max(1, Number(value("#chaptersPerDay"))),
      targetFinishDate: calculatedFinishDate(value("#startDate"), value("#scope"), Math.max(1, Number(value("#chaptersPerDay")))),
      scope: value("#scope"),
    };
    saveState();
    render();
  });
  ["startDate", "chaptersPerDay", "scope"].forEach((id) => document.querySelector(`#${id}`).addEventListener("change", updateTargetFinishDateField));
}

function renderDashboard() {
  const s = summary();
  const goal = state.goal;
  const latest = s.latest ? chapterName(books[s.latest.bookId - 1], s.latest.chapterNumber) : "No chapters completed yet";
  document.querySelector("#content").innerHTML = `
    <section class="card hero">
      <div class="ring" style="--progress:${s.percent * 3.6}deg"><strong>${s.percent}%</strong></div>
      <div class="status ${s.onTrack ? "on" : "off"}">${s.onTrack ? "✓ On Track" : "⚠ Off Track"}</div>
    </section>
    <h2 class="section-title">Progress</h2>
    <section class="card">${row("Completed", `${s.actual} / ${s.total}`)}${row("Last completed", latest)}${row("Remaining", s.remaining)}${row("Expected by today", s.expected)}${row(s.aheadBehind >= 0 ? "Ahead" : "Behind", Math.abs(s.aheadBehind))}</section>
    <h2 class="section-title">Goal</h2>
    <section class="card">${row("Scope", scopeLabels[goal.scope])}${row("Start date", formatDate(goal.startDate))}${row("Expected finish", formatDate(expectedFinishDate(goal)))}${row("Chapters/day", goal.chaptersPerDay)}</section>
  `;
}

function renderBible() {
  const completed = new Set(state.progress.filter((item) => item.isCompleted).map((item) => progressKey(item.bookId, item.chapterNumber)));
  document.querySelector("#content").innerHTML = `<section class="card">${booksInScope(state.goal.scope).map((book) => {
    const count = Array.from({ length: book.chapterCount }, (_, i) => i + 1).filter((chapter) => completed.has(progressKey(book.id, chapter))).length;
    const open = expandedBooks.has(book.id);
    return `<div><button class="book-header" data-book="${book.id}"><span><strong>${bookName(book)}</strong><span>${count} of ${book.chapterCount} chapters</span></span><strong>${open ? "⌄" : "›"}</strong></button>${open ? `<div class="chapters">${Array.from({ length: book.chapterCount }, (_, i) => {
      const chapter = i + 1;
      const done = completed.has(progressKey(book.id, chapter));
      return `<button class="chapter ${done ? "completed" : ""}" data-chapter="${book.id}:${chapter}"><span class="check">${done ? "✓" : ""}</span>${chapterName(book, chapter)}</button>`;
    }).join("")}</div>` : ""}</div>`;
  }).join("")}</section>`;
  document.querySelectorAll("[data-book]").forEach((button) => button.addEventListener("click", () => {
    const id = Number(button.dataset.book);
    expandedBooks.has(id) ? expandedBooks.delete(id) : expandedBooks.add(id);
    renderBible();
  }));
  document.querySelectorAll("[data-chapter]").forEach((button) => button.addEventListener("click", () => {
    const [bookId, chapterNumber] = button.dataset.chapter.split(":").map(Number);
    toggleChapter(bookId, chapterNumber);
  }));
}

function renderCalendar() {
  const grouped = {};
  summary().completed.forEach((item) => {
    if (!item.completedDate) return;
    grouped[item.completedDate] = [...(grouped[item.completedDate] || []), item];
  });
  const dates = Object.keys(grouped).sort().reverse();
  document.querySelector("#content").innerHTML = dates.length ? `<section class="card">${dates.map((date) => `<div class="calendar-day"><h3>${formatDateWithWeekday(date)}</h3><p>${grouped[date].length} chapters completed</p><ul>${grouped[date].sort((a, b) => a.bookId === b.bookId ? a.chapterNumber - b.chapterNumber : a.bookId - b.bookId).map((item) => `<li>${chapterName(books[item.bookId - 1], item.chapterNumber)}</li>`).join("")}</ul></div>`).join("")}</section>` : `<section class="card empty">Checked chapters will appear here by completion date.</section>`;
}

function renderSettings() {
  const goal = state.goal;
  document.querySelector("#content").innerHTML = `
    <section class="card padded"><div class="field-grid">
      ${field("Start date", `<input id="startDate" type="date" value="${goal.startDate}">`)}
      ${field("Chapters per day", `<input id="chaptersPerDay" type="number" min="1" max="150" value="${goal.chaptersPerDay}">`)}
      ${field("Scope", scopeSelect(goal.scope))}
      ${field("Target finish date", `<input id="targetFinishDate" type="date" value="${expectedFinishDate(goal)}" readonly>`)}
      ${field("Language display", `<select id="languageMode">${Object.entries(languageLabels).map(([key, label]) => `<option value="${key}" ${state.languageMode === key ? "selected" : ""}>${label}</option>`).join("")}</select>`)}
    </div></section>
    <h2 class="section-title">Backup</h2><section class="card padded actions">
      <p class="backup-note">${backupStatusText()}</p>
      <button class="secondary" id="selectBackupFolder">Select Backup Folder</button>
      <div class="backup-row"><button class="secondary" id="exportBackup">${exportButtonLabel()}</button><button class="secondary" id="importBackup">Import Backup</button></div>
      <input class="hidden" id="backupFile" type="file" accept="application/json">
    </section>
    <h2 class="section-title">Reset</h2><section class="card padded actions"><button class="danger" id="resetProgress">Reset All Progress</button><button class="danger" id="resetGoal">Reset Goal Only</button></section>`;
  ["startDate", "chaptersPerDay", "scope", "targetFinishDate", "languageMode"].forEach((id) => document.querySelector(`#${id}`).addEventListener("change", saveSettings));
  document.querySelector("#resetProgress").addEventListener("click", () => { if (confirm("Reset all progress?")) { state.progress = []; saveState(); render(); } });
  document.querySelector("#resetGoal").addEventListener("click", () => { if (confirm("Reset goal only? Progress stays saved.")) { state.goal = null; saveState(); render(); } });
  document.querySelector("#exportBackup").addEventListener("click", exportBackup);
  document.querySelector("#importBackup").addEventListener("click", chooseImportBackup);
  document.querySelector("#selectBackupFolder").addEventListener("click", selectBackupFolder);
  document.querySelector("#backupFile").addEventListener("change", importBackup);
}

function toggleChapter(bookId, chapterNumber) {
  const key = progressKey(bookId, chapterNumber);
  const now = new Date();
  const existing = state.progress.find((item) => progressKey(item.bookId, item.chapterNumber) === key);
  if (existing && existing.isCompleted) {
    existing.isCompleted = false;
    existing.completedDate = null;
    existing.completedTimestamp = null;
  } else if (existing) {
    existing.isCompleted = true;
    existing.completedDate = todayString(now);
    existing.completedTimestamp = now.toISOString();
  } else {
    state.progress.push({ bookId, chapterNumber, isCompleted: true, completedDate: todayString(now), completedTimestamp: now.toISOString() });
  }
  saveState();
  renderBible();
}

function saveSettings() {
  const chaptersPerDay = Math.max(1, Number(value("#chaptersPerDay")));
  state.goal = {
    startDate: value("#startDate"),
    chaptersPerDay,
    targetFinishDate: calculatedFinishDate(value("#startDate"), value("#scope"), chaptersPerDay),
    scope: value("#scope"),
  };
  state.languageMode = value("#languageMode");
  saveState();
  renderSettings();
}

function updateTargetFinishDateField() {
  const target = document.querySelector("#targetFinishDate");
  if (!target) return;
  target.value = calculatedFinishDate(value("#startDate"), value("#scope"), Math.max(1, Number(value("#chaptersPerDay"))));
}

async function exportBackup() {
  await writeBackup();
}

async function writeBackup() {
  const text = backupText();
  if (backupDirectoryHandle) {
    try {
      await verifyPermission(backupDirectoryHandle, true);
      const fileHandle = await backupDirectoryHandle.getFileHandle(BACKUP_FILENAME, { create: true });
      await writeToHandle(fileHandle, text);
      alert(`Backup saved to ${backupLocationName()}/${BACKUP_FILENAME}`);
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;
      backupDirectoryHandle = null;
      state.backupLocation = { type: "prompt", name: backupLocationName() };
      saveState();
    }
  }

  if (!state.backupLocation) {
    const proceed = confirm("No backup folder has been selected. Continue with the browser Save to Files/download flow?");
    if (!proceed) return false;
  }

  if (navigator.canShare && navigator.share) {
    const file = new File([text], BACKUP_FILENAME, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return true;
      } catch (error) {
        if (error.name === "AbortError") return false;
      }
    }
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = BACKUP_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

async function chooseImportBackup() {
  if (backupDirectoryHandle) {
    try {
      await verifyPermission(backupDirectoryHandle, false);
      const fileHandle = await backupDirectoryHandle.getFileHandle(BACKUP_FILENAME);
      await importBackupText(await (await fileHandle.getFile()).text());
      alert(`Backup imported from ${backupLocationName()}/${BACKUP_FILENAME}`);
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
      alert(`Could not read ${BACKUP_FILENAME} from the selected backup folder. Choose a backup file manually.`);
    }
  }

  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: "JSON backup", accept: { "application/json": [".json"] } }],
      });
      const file = await handle.getFile();
      await importBackupText(await file.text());
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  document.querySelector("#backupFile").click();
}

async function selectBackupFolder() {
  if ("showDirectoryPicker" in window) {
    try {
      backupDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await verifyPermission(backupDirectoryHandle, true);
      await saveBackupDirectoryHandle(backupDirectoryHandle);
      state.backupLocation = { type: "directory", name: backupDirectoryHandle.name || "Selected folder" };
      saveState();
      renderSettings();
      alert(`Backup folder selected: ${backupLocationName()}`);
      return;
    } catch (error) {
      if (error.name !== "AbortError") alert("Could not select that backup folder.");
      return;
    }
  }

  const name = prompt("This browser cannot remember a writable folder. Enter a label for where you will save backups, such as iCloud Drive/Bible Backup.", backupLocationName());
  if (!name) return;
  state.backupLocation = { type: "prompt", name };
  saveState();
  renderSettings();
}

async function confirmQuickBackup() {
  if (!confirm(`Save backup to ${backupLocationName()}/${BACKUP_FILENAME}?`)) return;
  await writeBackup();
}

async function importBackupText(text) {
  const currentBackupLocation = state.backupLocation || null;
  state = { goal: null, languageMode: "both", progress: [], ...JSON.parse(text), backupLocation: currentBackupLocation };
  saveState();
  render();
}

function backupText() {
  return JSON.stringify(state, null, 2);
}

async function initBackupLocation() {
  backupDirectoryHandle = await loadBackupDirectoryHandle();
  if (backupDirectoryHandle && !state.backupLocation) {
    state.backupLocation = { type: "directory", name: backupDirectoryHandle.name || "Selected folder" };
    saveState();
  }
}

function openBackupDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(BACKUP_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(BACKUP_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadBackupDirectoryHandle() {
  try {
    const db = await openBackupDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const request = db.transaction(BACKUP_STORE_NAME, "readonly").objectStore(BACKUP_STORE_NAME).get(BACKUP_DIRECTORY_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function saveBackupDirectoryHandle(handle) {
  const db = await openBackupDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const request = db.transaction(BACKUP_STORE_NAME, "readwrite").objectStore(BACKUP_STORE_NAME).put(handle, BACKUP_DIRECTORY_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function verifyPermission(handle, readwrite) {
  const options = readwrite ? { mode: "readwrite" } : { mode: "read" };
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if ((await handle.queryPermission(options)) === "granted") return true;
  if ((await handle.requestPermission(options)) === "granted") return true;
  throw new DOMException("Permission denied", "NotAllowedError");
}

function backupLocationName() {
  return state.backupLocation?.name || (isIOSDevice() ? "Files/iCloud Drive" : "selected backup location");
}

async function writeAutomaticBackup() {
  if (!backupDirectoryHandle) return;
  try {
    await verifyPermission(backupDirectoryHandle, true);
    const fileHandle = await backupDirectoryHandle.getFileHandle(BACKUP_FILENAME, { create: true });
    await writeToHandle(fileHandle, backupText());
  } catch {
    backupDirectoryHandle = null;
  }
}

async function writeToHandle(handle, text) {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

function backupStatusText() {
  if (backupDirectoryHandle) {
    return `Backup folder: ${backupLocationName()}. Exports and Bible-tab Backup write ${BACKUP_FILENAME} there when permission is available.`;
  }
  if (state.backupLocation) {
    return `Backup location: ${backupLocationName()}. This browser cannot auto-write there, so exports use the iOS/browser save flow for ${BACKUP_FILENAME}.`;
  }
  if (isIOSDevice()) {
    return `No backup location selected. On iPhone, the app can remember a label, but each export still uses Save to Files for ${BACKUP_FILENAME}.`;
  }
  if (!("showDirectoryPicker" in window)) {
    return "This browser cannot remember a writable folder. Select Backup Folder stores a label and export/import use browser file flows.";
  }
  return `Select a backup folder to save and import ${BACKUP_FILENAME}.`;
}

function exportButtonLabel() {
  return backupDirectoryHandle ? "Export Backup" : "Export Backup to Files";
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  file.text().then(importBackupText);
  event.target.value = "";
}

function value(selector) {
  return document.querySelector(selector).value;
}

function field(label, control) {
  return `<label class="field"><span>${label}</span>${control}</label>`;
}

function scopeSelect(selected) {
  return `<select id="scope">${Object.entries(scopeLabels).map(([key, label]) => `<option value="${key}" ${selected === key ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function row(label, value) {
  return `<div class="row"><strong>${label}</strong><span>${value}</span></div>`;
}

function tabTitle(tab) {
  return tabs.find(([key]) => key === tab)[2];
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

initBackupLocation().finally(render);
