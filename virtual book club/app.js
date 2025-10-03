// Virtual Book Club — minimal, power-efficient client logic
// Features: Recommendations (with search + tags), Reviews, Discussions, Eco Mode

(function () {
  "use strict";

  // Util: localStorage helpers with safe JSON
  function loadFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // ignore quota errors silently to keep perf/energy low
    }
  }

  // Eco Mode: reduces effects and animations
  const ecoToggle = document.getElementById("ecoToggle");
  const ECO_KEY = "vbc_eco";
  if (ecoToggle) {
    const savedEco = loadFromStorage(ECO_KEY, false);
    if (savedEco) document.documentElement.classList.add("eco");
    ecoToggle.setAttribute("aria-pressed", String(Boolean(savedEco)));
    ecoToggle.addEventListener("click", function () {
      const isOn = document.documentElement.classList.toggle("eco");
      ecoToggle.setAttribute("aria-pressed", String(isOn));
      saveToStorage(ECO_KEY, isOn);
    });
  }

  // Data: 12 categories, 3 books each
  const CATEGORIES = [
    {
      name: "Fantasy",
      books: [
        { title: "The Night Circus", author: "Erin Morgenstern", tags: ["fantasy", "magic", "romance"] },
        { title: "The Hobbit", author: "J.R.R. Tolkien", tags: ["fantasy", "adventure", "classic"] },
        { title: "A Darker Shade of Magic", author: "V.E. Schwab", tags: ["fantasy", "portal", "series"] }
      ]
    },
    {
      name: "Science Fiction",
      books: [
        { title: "Dune", author: "Frank Herbert", tags: ["scifi", "epic", "desert"] },
        { title: "Project Hail Mary", author: "Andy Weir", tags: ["scifi", "space", "survival"] },
        { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", tags: ["scifi", "classic", "social"] }
      ]
    },
    {
      name: "Mystery",
      books: [
        { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", tags: ["mystery", "thriller", "crime"] },
        { title: "Big Little Lies", author: "Liane Moriarty", tags: ["mystery", "domestic", "drama"] },
        { title: "The Thursday Murder Club", author: "Richard Osman", tags: ["mystery", "cozy", "humor"] }
      ]
    },
    {
      name: "Romance",
      books: [
        { title: "The Hating Game", author: "Sally Thorne", tags: ["romance", "enemies-to-lovers", "contemporary"] },
        { title: "The Kiss Quotient", author: "Helen Hoang", tags: ["romance", "feel-good", "diverse"] },
        { title: "Pride and Prejudice", author: "Jane Austen", tags: ["romance", "classic", "regency"] }
      ]
    },
    {
      name: "Historical",
      books: [
        { title: "The Book Thief", author: "Markus Zusak", tags: ["historical", "wwii", "ya"] },
        { title: "Wolf Hall", author: "Hilary Mantel", tags: ["historical", "tudor", "literary"] },
        { title: "All the Light We Cannot See", author: "Anthony Doerr", tags: ["historical", "wwii", "dual-timeline"] }
      ]
    },
    {
      name: "Non-Fiction",
      books: [
        { title: "Sapiens", author: "Yuval Noah Harari", tags: ["nonfiction", "history", "humanity"] },
        { title: "Educated", author: "Tara Westover", tags: ["nonfiction", "memoir", "resilience"] },
        { title: "Atomic Habits", author: "James Clear", tags: ["nonfiction", "self-help", "productivity"] }
      ]
    },
    {
      name: "Biography",
      books: [
        { title: "Becoming", author: "Michelle Obama", tags: ["biography", "memoir", "inspirational"] },
        { title: "Steve Jobs", author: "Walter Isaacson", tags: ["biography", "tech", "innovation"] },
        { title: "The Diary of a Young Girl", author: "Anne Frank", tags: ["biography", "historical", "wwii"] }
      ]
    },
    {
      name: "Young Adult",
      books: [
        { title: "The Hate U Give", author: "Angie Thomas", tags: ["ya", "contemporary", "social"] },
        { title: "Six of Crows", author: "Leigh Bardugo", tags: ["ya", "fantasy", "heist"] },
        { title: "The Fault in Our Stars", author: "John Green", tags: ["ya", "romance", "tearjerker"] }
      ]
    },
    {
      name: "Thriller",
      books: [
        { title: "Gone Girl", author: "Gillian Flynn", tags: ["thriller", "twist", "psychological"] },
        { title: "The Silent Patient", author: "Alex Michaelides", tags: ["thriller", "psychological", "mystery"] },
        { title: "The Woman in the Window", author: "A.J. Finn", tags: ["thriller", "domestic", "suspense"] }
      ]
    },
    {
      name: "Horror",
      books: [
        { title: "Mexican Gothic", author: "Silvia Moreno-Garcia", tags: ["horror", "gothic", "atmospheric"] },
        { title: "The Shining", author: "Stephen King", tags: ["horror", "classic", "supernatural"] },
        { title: "Bird Box", author: "Josh Malerman", tags: ["horror", "apocalyptic", "suspense"] }
      ]
    },
    {
      name: "Classics",
      books: [
        { title: "1984", author: "George Orwell", tags: ["classic", "dystopia", "political"] },
        { title: "To Kill a Mockingbird", author: "Harper Lee", tags: ["classic", "justice", "coming-of-age"] },
        { title: "Jane Eyre", author: "Charlotte Brontë", tags: ["classic", "gothic", "romance"] }
      ]
    },
    {
      name: "Self-Help",
      books: [
        { title: "Deep Work", author: "Cal Newport", tags: ["self-help", "focus", "work"] },
        { title: "The Subtle Art of Not Giving a F*ck", author: "Mark Manson", tags: ["self-help", "mindset", "minimalism"] },
        { title: "Man's Search for Meaning", author: "Viktor E. Frankl", tags: ["self-help", "psychology", "meaning"] }
      ]
    }
  ];

  // Recommendations rendering
  const recommendationList = document.getElementById("recommendationList");
  const tagsContainer = document.getElementById("tags");
  const categoryList = document.getElementById("categoryList");
  const navCategories = document.getElementById("navCategories");
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");

  // Build tag set: categories + book tags
  const TAGS = new Set();
  CATEGORIES.forEach(function (cat) {
    TAGS.add(cat.name.toLowerCase());
    cat.books.forEach(function (b) { b.tags.forEach(function (t) { TAGS.add(t.toLowerCase()); }); });
  });

  let activeTag = null;

  function createTagElement(label) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "tag";
    el.textContent = label;
    el.setAttribute("role", "listitem");
    el.addEventListener("click", function () {
      activeTag = activeTag === label.toLowerCase() ? null : label.toLowerCase();
      updateTagActiveStates();
      renderRecommendations();
    });
    return el;
  }

  function updateTagActiveStates() {
    if (!tagsContainer) return;
    const children = tagsContainer.querySelectorAll(".tag");
    children.forEach(function (node) {
      if (activeTag && node.textContent.toLowerCase() === activeTag) node.classList.add("active");
      else node.classList.remove("active");
    });
  }

  function renderTags() {
    if (!tagsContainer) return;
    tagsContainer.textContent = "";
    // Prioritize category names first
    const categoryNames = CATEGORIES.map(function (c) { return c.name.toLowerCase(); });
    const ordered = Array.from(TAGS).sort(function (a, b) {
      const aCat = categoryNames.indexOf(a);
      const bCat = categoryNames.indexOf(b);
      if (aCat !== -1 && bCat !== -1) return aCat - bCat;
      if (aCat !== -1) return -1;
      if (bCat !== -1) return 1;
      return a.localeCompare(b);
    });
    ordered.forEach(function (t) { tagsContainer.appendChild(createTagElement(capitalize(t))); });
    updateTagActiveStates();
  }

  function renderCategoriesSidebar() {
    if (!categoryList) return;
    categoryList.textContent = "";
    CATEGORIES.forEach(function (cat) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag";
      btn.textContent = cat.name;
      btn.addEventListener("click", function () {
        activeTag = cat.name.toLowerCase();
        updateTagActiveStates();
        renderRecommendations();
      });
      categoryList.appendChild(btn);
    });
  }

  function renderCategoriesNav() {
    if (!navCategories) return;
    navCategories.textContent = "";
    CATEGORIES.forEach(function (cat) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag";
      btn.textContent = cat.name;
      btn.addEventListener("click", function () {
        activeTag = cat.name.toLowerCase();
        updateTagActiveStates();
        renderRecommendations();
        const recs = document.getElementById("recommendations");
        if (recs) recs.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      navCategories.appendChild(btn);
    });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function renderRecommendations() {
    if (!recommendationList) return;
    const q = (searchInput && searchInput.value || "").trim().toLowerCase();
    recommendationList.textContent = "";

    CATEGORIES.forEach(function (category) {
      // Filter category visibility by query/tag match of any book
      const books = category.books.filter(function (book) {
        const hay = (book.title + " " + book.author + " " + book.tags.join(" ") + " " + category.name).toLowerCase();
        const matchesQuery = !q || hay.indexOf(q) !== -1;
        const matchesTag = !activeTag || hay.indexOf(activeTag) !== -1;
        return matchesQuery && matchesTag;
      });
      if (books.length === 0) return;

      // Category header
      const header = document.createElement("h4");
      header.textContent = category.name;
      header.style.margin = "10px 4px";
      header.style.opacity = "0.9";
      recommendationList.appendChild(header);

      books.forEach(function (book) {
        const card = document.createElement("article");
        card.className = "card book";
        const title = document.createElement("h4");
        title.textContent = book.title;
        const by = document.createElement("div");
        by.className = "by";
        by.textContent = "by " + book.author;
        const tags = document.createElement("div");
        tags.className = "tags";
        book.tags.concat([category.name.toLowerCase()]).forEach(function (t) {
          const ct = document.createElement("span");
          ct.className = "tag";
          ct.textContent = capitalize(t);
          ct.addEventListener("click", function () {
            activeTag = t.toLowerCase();
            updateTagActiveStates();
            renderRecommendations();
          });
          tags.appendChild(ct);
        });
        card.appendChild(title);
        card.appendChild(by);
        card.appendChild(tags);
        recommendationList.appendChild(card);
      });
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      renderRecommendations();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", debounce(renderRecommendations, 120));
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      window.clearTimeout(t);
      var args = arguments; // keep allocation minimal
      t = window.setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  // Reviews
  const reviewForm = document.getElementById("reviewForm");
  const reviewList = document.getElementById("reviewList");
  const REVIEWS_KEY = "vbc_reviews";
  let reviews = loadFromStorage(REVIEWS_KEY, []);

  function renderReviews() {
    if (!reviewList) return;
    reviewList.textContent = "";
    reviews.forEach(function (r) {
      const item = document.createElement("article");
      item.className = "card review";
      const title = document.createElement("div");
      title.innerHTML = "<strong>" + escapeHtml(r.title) + "</strong> by " + escapeHtml(r.author);
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = '<span class="stars">' + "★".repeat(r.rating) + "☆".repeat(5 - r.rating) + "</span> • " + new Date(r.createdAt).toLocaleString();
      const body = document.createElement("p");
      body.textContent = r.text;
      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(body);
      reviewList.appendChild(item);
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener("submit", function (e) {
      e.preventDefault();
      /** @type {HTMLInputElement} */
      const t = document.getElementById("reviewTitle");
      /** @type {HTMLInputElement} */
      const a = document.getElementById("reviewAuthor");
      /** @type {HTMLSelectElement} */
      const r = document.getElementById("reviewRating");
      /** @type {HTMLTextAreaElement} */
      const tx = document.getElementById("reviewText");
      const rating = parseInt(r.value, 10);
      if (!t.value || !a.value || !tx.value || !(rating >= 1 && rating <= 5)) return;
      const entry = {
        id: Date.now(),
        title: t.value.trim(),
        author: a.value.trim(),
        rating: rating,
        text: tx.value.trim(),
        createdAt: Date.now()
      };
      reviews.unshift(entry);
      saveToStorage(REVIEWS_KEY, reviews);
      t.value = ""; a.value = ""; r.value = ""; tx.value = "";
      renderReviews();
    });
  }

  // Discussions
  const threadForm = document.getElementById("threadForm");
  const threadList = document.getElementById("threadList");
  const THREADS_KEY = "vbc_threads";
  let threads = loadFromStorage(THREADS_KEY, []);

  function renderThreads() {
    if (!threadList) return;
    threadList.textContent = "";
    threads.forEach(function (th) {
      const item = document.createElement("article");
      item.className = "card thread";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = th.title;
      const body = document.createElement("div");
      body.className = "body";
      body.textContent = th.body;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = new Date(th.createdAt).toLocaleString();

      const repliesContainer = document.createElement("div");
      (th.replies || []).forEach(function (rp) {
        const reply = document.createElement("div");
        reply.className = "reply";
        const rmeta = document.createElement("div");
        rmeta.className = "meta";
        rmeta.textContent = new Date(rp.createdAt).toLocaleString();
        const rbody = document.createElement("div");
        rbody.textContent = rp.body;
        reply.appendChild(rmeta);
        reply.appendChild(rbody);
        repliesContainer.appendChild(reply);
      });

      const replyForm = document.createElement("form");
      replyForm.className = "reply-form";
      replyForm.setAttribute("autocomplete", "off");
      const replyInput = document.createElement("textarea");
      replyInput.rows = 2;
      replyInput.placeholder = "Write a reply";
      const replyBtn = document.createElement("button");
      replyBtn.type = "submit";
      replyBtn.textContent = "Reply";
      replyForm.appendChild(replyInput);
      replyForm.appendChild(replyBtn);
      replyForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const txt = replyInput.value.trim();
        if (!txt) return;
        th.replies = th.replies || [];
        th.replies.push({ id: Date.now(), body: txt, createdAt: Date.now() });
        saveToStorage(THREADS_KEY, threads);
        replyInput.value = "";
        renderThreads();
      });

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(body);
      if (repliesContainer.childNodes.length) item.appendChild(repliesContainer);
      item.appendChild(replyForm);
      threadList.appendChild(item);
    });
  }

  if (threadForm) {
    threadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      /** @type {HTMLInputElement} */
      const tt = document.getElementById("threadTitle");
      /** @type {HTMLTextAreaElement} */
      const tb = document.getElementById("threadBody");
      if (!tt.value.trim() || !tb.value.trim()) return;
      const th = { id: Date.now(), title: tt.value.trim(), body: tb.value.trim(), createdAt: Date.now(), replies: [] };
      threads.unshift(th);
      saveToStorage(THREADS_KEY, threads);
      tt.value = ""; tb.value = "";
      renderThreads();
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]+/g, function (ch) {
      switch (ch) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        default: return ch;
      }
    });
  }

  // Initial renders
  renderTags();
  renderCategoriesSidebar();
  renderCategoriesNav();
  renderRecommendations();
  renderReviews();
  renderThreads();
})();


