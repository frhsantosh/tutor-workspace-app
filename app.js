const STORAGE_KEY = "tutor-workspace-data-v1";

const defaultState = {
  students: [],
  selectedStudentId: null,
};

const state = loadState();

const studentForm = document.getElementById("student-form");
const studentName = document.getElementById("student-name");
const studentList = document.getElementById("student-list");
const workspacePanel = document.getElementById("workspace-panel");
const workspaceTitle = document.getElementById("workspace-title");
const deleteStudentButton = document.getElementById("delete-student");
const bookForm = document.getElementById("book-form");
const bookTitleInput = document.getElementById("book-title");
const bookList = document.getElementById("book-list");
const bookTemplate = document.getElementById("book-template");
const chapterTemplate = document.getElementById("chapter-template");

const recordConfigs = [
  { type: "notes", selectId: "notes-chapter", formId: "notes-form", inputId: "notes-content", listId: "notes-list" },
  { type: "answers", selectId: "answers-chapter", formId: "answers-form", inputId: "answers-content", listId: "answers-list" },
  { type: "custom", selectId: "custom-chapter", formId: "custom-form", inputId: "custom-content", listId: "custom-list" },
];

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = studentName.value.trim();
  if (!name) return;

  const student = {
    id: crypto.randomUUID(),
    name,
    books: [],
    records: {
      notes: [],
      answers: [],
      custom: [],
    },
  };

  state.students.push(student);
  state.selectedStudentId = student.id;
  saveAndRender();
  studentForm.reset();
});

deleteStudentButton.addEventListener("click", () => {
  const selected = getSelectedStudent();
  if (!selected) return;

  state.students = state.students.filter((student) => student.id !== selected.id);
  state.selectedStudentId = state.students[0]?.id ?? null;
  saveAndRender();
});

bookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = getSelectedStudent();
  if (!selected) return;

  const title = bookTitleInput.value.trim();
  if (!title) return;

  selected.books.push({ id: crypto.randomUUID(), title, chapters: [] });
  saveAndRender();
  bookForm.reset();
});

for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
}

for (const config of recordConfigs) {
  const form = document.getElementById(config.formId);
  const input = document.getElementById(config.inputId);
  const select = document.getElementById(config.selectId);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = getSelectedStudent();
    if (!selected) return;
    const chapterRef = select.value;
    const content = input.value.trim();
    if (!chapterRef || !content) return;

    selected.records[config.type].push({
      id: crypto.randomUUID(),
      chapterRef,
      content,
      savedAt: new Date().toISOString(),
    });

    saveAndRender();
    form.reset();
  });
}

render();

function render() {
  renderStudentList();
  renderWorkspace();
}

function renderStudentList() {
  studentList.innerHTML = "";
  if (state.students.length === 0) {
    studentList.innerHTML = `<p>No students yet. Add your first student to get started.</p>`;
    return;
  }

  for (const student of state.students) {
    const button = document.createElement("button");
    button.textContent = student.name;
    if (student.id === state.selectedStudentId) button.classList.add("active-student");
    button.addEventListener("click", () => {
      state.selectedStudentId = student.id;
      saveAndRender();
    });
    studentList.append(button);
  }
}

function renderWorkspace() {
  const selected = getSelectedStudent();
  if (!selected) {
    workspacePanel.classList.add("hidden");
    return;
  }

  workspacePanel.classList.remove("hidden");
  workspaceTitle.textContent = `${selected.name}'s Workspace`;
  renderBooks(selected);
  renderChapterOptions(selected);
  renderRecords(selected);
}

function renderBooks(student) {
  bookList.innerHTML = "";

  if (student.books.length === 0) {
    bookList.innerHTML = `<p>No books added yet.</p>`;
    return;
  }

  for (const book of student.books) {
    const fragment = bookTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".card");
    card.dataset.bookId = book.id;
    fragment.querySelector("h3").textContent = book.title;

    fragment.querySelector(".delete-book").addEventListener("click", () => {
      student.books = student.books.filter((item) => item.id !== book.id);
      cleanupOrphanChapterRecords(student);
      saveAndRender();
    });

    const chapterForm = fragment.querySelector(".chapter-form");
    chapterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = chapterForm.querySelector("input");
      const chapterName = input.value.trim();
      if (!chapterName) return;

      book.chapters.push({ id: crypto.randomUUID(), name: chapterName, imageLinks: [] });
      saveAndRender();
    });

    const chapterList = fragment.querySelector(".chapter-list");
    if (book.chapters.length === 0) {
      chapterList.innerHTML = "<p>No chapters yet.</p>";
    } else {
      for (const chapter of book.chapters) {
        chapterList.append(renderChapter(student, book, chapter));
      }
    }

    bookList.append(fragment);
  }
}

function renderChapter(student, book, chapter) {
  const fragment = chapterTemplate.content.cloneNode(true);
  fragment.querySelector("h4").textContent = chapter.name;

  fragment.querySelector(".delete-chapter").addEventListener("click", () => {
    book.chapters = book.chapters.filter((item) => item.id !== chapter.id);
    cleanupOrphanChapterRecords(student);
    saveAndRender();
  });

  const imageForm = fragment.querySelector(".image-form");
  const imageTextarea = imageForm.querySelector("textarea");
  imageTextarea.value = chapter.imageLinks.join("\n");

  imageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    chapter.imageLinks = imageTextarea.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    saveAndRender();
  });

  const imageLinksElement = fragment.querySelector(".image-links");
  if (chapter.imageLinks.length === 0) {
    imageLinksElement.innerHTML = "<li>No page links yet.</li>";
  } else {
    for (const link of chapter.imageLinks) {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.textContent = link;
      anchor.target = "_blank";
      anchor.rel = "noreferrer noopener";
      item.append(anchor);
      imageLinksElement.append(item);
    }
  }

  return fragment;
}

function renderChapterOptions(student) {
  const chapters = [];
  for (const book of student.books) {
    for (const chapter of book.chapters) {
      chapters.push({
        value: `${book.id}::${chapter.id}`,
        label: `${book.title} → ${chapter.name}`,
      });
    }
  }

  for (const config of recordConfigs) {
    const select = document.getElementById(config.selectId);
    select.innerHTML = chapters.length
      ? chapters.map((chapter) => `<option value="${chapter.value}">${chapter.label}</option>`).join("")
      : `<option value="">Add books and chapters first</option>`;
    select.disabled = chapters.length === 0;
  }
}

function renderRecords(student) {
  for (const config of recordConfigs) {
    const list = document.getElementById(config.listId);
    list.innerHTML = "";

    const records = [...student.records[config.type]].reverse();
    if (records.length === 0) {
      list.innerHTML = `<p>No saved ${config.type} yet.</p>`;
      continue;
    }

    for (const record of records) {
      const card = document.createElement("article");
      card.className = "record";
      const chapterName = resolveChapterName(student, record.chapterRef);
      card.innerHTML = `
        <strong>${chapterName}</strong>
        <small>${new Date(record.savedAt).toLocaleString()}</small>
        <p>${escapeHtml(record.content).replaceAll("\n", "<br>")}</p>
      `;
      list.append(card);
    }
  }
}

function resolveChapterName(student, chapterRef) {
  const [bookId, chapterId] = chapterRef.split("::");
  const book = student.books.find((entry) => entry.id === bookId);
  const chapter = book?.chapters.find((entry) => entry.id === chapterId);
  return chapter ? `${book.title} → ${chapter.name}` : "Removed chapter";
}

function cleanupOrphanChapterRecords(student) {
  const validRefs = new Set(
    student.books.flatMap((book) => book.chapters.map((chapter) => `${book.id}::${chapter.id}`)),
  );

  for (const type of Object.keys(student.records)) {
    student.records[type] = student.records[type].filter((record) => validRefs.has(record.chapterRef));
  }
}

function getSelectedStudent() {
  if (!state.selectedStudentId) return null;
  return state.students.find((student) => student.id === state.selectedStudentId) ?? null;
}

function setActiveTab(tabName) {
  for (const tabButton of document.querySelectorAll(".tab")) {
    tabButton.classList.toggle("active", tabButton.dataset.tab === tabName);
  }

  for (const panel of document.querySelectorAll(".tab-panel")) {
    panel.classList.toggle("hidden", !panel.id.startsWith(tabName));
  }
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.students)) return structuredClone(defaultState);
    return {
      students: parsed.students,
      selectedStudentId: parsed.selectedStudentId,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
