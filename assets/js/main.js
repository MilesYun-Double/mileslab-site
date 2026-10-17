/* ============================================================
   MILES — 剪辑师
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const STATIC_MODE = new URLSearchParams(location.search).has("static");

  /* ---------- 1. 载入 ---------- */
  const loader = $("#loader");
  const loaderBar = $("#loaderBar");
  const loaderPct = $("#loaderPct");
  let progress = 0;
  let loaded = false;

  const tickLoader = () => {
    const target = loaded ? 100 : 82;
    progress += (target - progress) * 0.08 + 0.4;
    if (progress > target) progress = target;
    if (loaderBar) loaderBar.style.width = progress.toFixed(1) + "%";
    if (loaderPct) loaderPct.textContent = String(Math.floor(progress)).padStart(2, "0");
    if (progress < 99.2) requestAnimationFrame(tickLoader);
    else finishLoader();
  };

  let loaderDone = false;
  const finishLoader = () => {
    if (loaderDone) return;
    loaderDone = true;
    if (loaderBar) loaderBar.style.width = "100%";
    if (loaderPct) loaderPct.textContent = "100";
    setTimeout(() => {
      loader?.classList.add("is-done");
      document.body.classList.add("is-loaded");
      initReveal();
    }, 260);
  };

  window.addEventListener("load", () => { loaded = true; });
  // 兜底：即便图片加载慢，也不让访客盯太久
  setTimeout(() => { loaded = true; }, 1800);
  setTimeout(finishLoader, 3200);
  if (STATIC_MODE) {
    loader?.remove();
    document.body.classList.add("is-loaded");
  } else {
    requestAnimationFrame(tickLoader);
  }

  /* ---------- 2. 时间码 ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const tcEls = [$("#timecode"), $("#footerTimecode")].filter(Boolean);
  const updateTimecode = () => {
    const d = new Date();
    const frames = Math.floor((d.getMilliseconds() / 1000) * 24);
    const str = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(frames)}`;
    tcEls.forEach((el) => { el.textContent = str; });
  };
  updateTimecode();
  setInterval(updateTimecode, 83);

  /* ---------- 3. 滚动揭示 ---------- */
  let revealObserver;
  const initReveal = () => {
    if (reduceMotion || STATIC_MODE) {
      $$(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    $$(".reveal").forEach((el) => revealObserver.observe(el));
  };

  /* ---------- 4. 导航 ---------- */
  const nav = $("#nav");
  const navLinks = $("#navLinks");
  const menuBtn = $("#menuBtn");
  let scrollTicking = false;

  const onScroll = () => {
    nav?.classList.toggle("is-solid", window.scrollY > 48);
    heroParallax();
    scrollTicking = false;
  };
  window.addEventListener("scroll", () => {
    if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  // 当前章节高亮
  const sectionIds = ["prologue", "slices", "method", "contact"];
  const sectionEls = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  const navMap = new Map($$("[data-nav]").map((a) => [a.dataset.nav, a]));
  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navMap.forEach((a) => a.classList.remove("is-active"));
        navMap.get(entry.target.id)?.classList.add("is-active");
      });
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });
    sectionEls.forEach((el) => navObserver.observe(el));
  }

  // 移动端菜单
  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    menuBtn?.setAttribute("aria-expanded", "false");
    menuBtn?.setAttribute("aria-label", "打开菜单");
  };
  menuBtn?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });
  navLinks?.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  /* ---------- 5. Hero 视差 ---------- */
  const heroMedia = $("#heroMedia");
  const heroParallax = () => {
    if (reduceMotion || !heroMedia || window.innerWidth < 860) return;
    const y = window.scrollY;
    if (y > window.innerHeight * 1.2) return;
    heroMedia.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
  };

  /* ---------- 6. 自定义光标 ---------- */
  const cursor = $("#cursor");
  if (cursor && finePointer && !reduceMotion && !STATIC_MODE) {
    document.documentElement.classList.add("has-cursor");
    const dot = $(".cursor-dot", cursor);
    const ring = $(".cursor-ring", cursor);
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let cursorStarted = false;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!cursorStarted) { cursorStarted = true; rx = mx; ry = my; cursor.style.opacity = "1"; }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }, { passive: true });

    const ringLoop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(ringLoop);
    };
    requestAnimationFrame(ringLoop);

    const HOVER = 'a, button, [data-cursor], .work-row';
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(HOVER)) cursor.classList.add("is-link");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(HOVER)) cursor.classList.remove("is-link");
    });
    document.addEventListener("mouseleave", () => { cursor.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { cursor.style.opacity = "1"; });
  }

  /* ---------- 7. 渲染切片 ---------- */
  const works = Array.isArray(window.MILES_WORKS) ? window.MILES_WORKS : [];
  const worksEl = $("#works");

  const renderWorks = () => {
    if (!worksEl) return;
    worksEl.innerHTML = works.map((w, i) => `
      <article class="work-row reveal" role="listitem" tabindex="0" data-index="${i}" data-cursor="放映" aria-label="${w.song}，${w.artist}，${w.work}">
        <span class="work-index">${w.no}</span>
        <div class="work-main">
          <h3 class="work-song">${w.song}</h3>
          <p class="work-artist">${w.artist}</p>
        </div>
        <span class="work-type">${w.type}</span>
        <span class="work-dur">${w.duration}</span>
        <span class="work-thumb-wrap"><img class="work-thumb" src="${w.image.replace('.webp', '-thumb.webp')}" alt="" loading="lazy" decoding="async" width="640" height="400" /></span>
        <span class="work-arrow" aria-hidden="true">→</span>
      </article>
    `).join("");

    const rows = $$(".work-row", worksEl);
    rows.forEach((row) => {
      row.addEventListener("click", () => openModal(Number(row.dataset.index)));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(Number(row.dataset.index));
        }
      });
      bindPreview(row);
    });
    if (revealObserver) rows.forEach((r) => revealObserver.observe(r));
  };

  /* ---------- 8. 悬停预览 ---------- */
  const preview = $("#workPreview");
  const previewImg = $("#workPreviewImg");
  let previewOn = false;
  let px = 0, py = 0, tx = 0, ty = 0;

  const bindPreview = (row) => {
    if (!preview || !previewImg || !finePointer || reduceMotion) return;
    const work = works[Number(row.dataset.index)];
    row.addEventListener("mouseenter", () => {
      if (!work) return;
      previewImg.src = work.image;
      previewOn = true;
      preview.classList.add("on");
    });
    row.addEventListener("mouseleave", () => {
      previewOn = false;
      preview.classList.remove("on");
    });
  };

  if (preview && previewImg && finePointer && !reduceMotion) {
    const previewLoop = () => {
      px += (tx - px) * 0.14;
      py += (ty - py) * 0.14;
      if (previewOn) {
        const w = preview.offsetWidth, h = preview.offsetHeight;
        const left = Math.min(Math.max(px, w / 2 + 16), window.innerWidth - w / 2 - 16);
        const top = Math.min(Math.max(py, h / 2 + 16), window.innerHeight - h / 2 - 16);
        preview.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%) scale(1)`;
      }
      requestAnimationFrame(previewLoop);
    };
    requestAnimationFrame(previewLoop);
    let previewStarted = false;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!previewStarted) { previewStarted = true; px = tx; py = ty; }
    }, { passive: true });
  }

  /* ---------- 9. 放映弹层 ---------- */
  const modal = $("#workModal");
  const modalImg = $("#modalImg");
  const modalNo = $("#modalNo");
  const modalType = $("#modalType");
  const modalYear = $("#modalYear");
  const modalTitle = $("#modalTitle");
  const modalArtist = $("#modalArtist");
  const modalWork = $("#modalWork");
  const modalEssay = $("#modalEssay");
  const modalQuote = $("#modalQuote");
  const modalCount = $("#modalCount");
  const modalClose = $("#modalClose");
  const modalPrev = $("#modalPrev");
  const modalNext = $("#modalNext");
  let current = 0;
  let lastFocus = null;

  const renderModal = (index) => {
    const w = works[index];
    if (!w || !modal) return;
    current = index;
    modalImg.src = w.image;
    modalImg.alt = `${w.song} — ${w.work}`;
    modalNo.textContent = w.no;
    modalType.textContent = w.type;
    modalYear.textContent = w.year;
    modalTitle.textContent = w.song;
    modalArtist.textContent = w.artist;
    modalWork.textContent = w.work;
    modalEssay.innerHTML = w.essay.map((p) => `<p>${p}</p>`).join("");
    modalQuote.textContent = w.quote;
    modalCount.textContent = `${w.no} / ${String(works.length).padStart(2, "0")}`;
  };

  const openModal = (index) => {
    if (!modal || !works.length) return;
    lastFocus = document.activeElement;
    renderModal(index);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    setTimeout(() => modalClose?.focus(), 60);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  const stepModal = (dir) => {
    if (!works.length) return;
    const next = (current + dir + works.length) % works.length;
    renderModal(next);
  };

  modalClose?.addEventListener("click", closeModal);
  $$("[data-close]", modal || document).forEach((el) => el.addEventListener("click", closeModal));
  modalPrev?.addEventListener("click", () => stepModal(-1));
  modalNext?.addEventListener("click", () => stepModal(1));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal?.classList.contains("open")) closeModal();
      closeMenu();
    }
    if (modal?.classList.contains("open")) {
      if (e.key === "ArrowLeft") { e.preventDefault(); stepModal(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepModal(1); }
      if (e.key === "Tab") {
        const focusables = $$('button, [href], [tabindex]:not([tabindex="-1"])', modal)
          .filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  });

  renderWorks();
  if (STATIC_MODE) initReveal();

  /* ---------- 10. 环境声（程序化黑胶底噪） ---------- */
  const soundBtn = $("#soundBtn");
  let audioCtx = null, master = null, noiseSrc = null, droneA = null, droneB = null;
  let soundOn = false;

  const buildAudio = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    // 3.2s 黑胶底噪 + 稀疏爆点
    const dur = 3.2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // 一阶低通，偏粉噪
      let v = last * 0.9 + white * 0.12;
      // 稀疏散落的针尖声
      if (Math.random() < 0.000075) {
        const len = 40 + Math.floor(Math.random() * 120);
        const amp = 0.25 + Math.random() * 0.5;
        for (let j = 0; j < len && i + j < data.length; j++) {
          data[i + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 26);
        }
      }
      data[i] = v * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 240;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.32;

    noise.connect(hp).connect(lp).connect(noiseGain).connect(masterGain);
    noise.start();

    // 极低的房间嗡鸣
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.035;
    droneGain.connect(masterGain);
    const oA = ctx.createOscillator();
    oA.type = "sine"; oA.frequency.value = 55;
    const oB = ctx.createOscillator();
    oB.type = "sine"; oB.frequency.value = 82.5;
    oA.connect(droneGain); oB.connect(droneGain);
    oA.start(); oB.start();

    return { ctx, masterGain, noise, oA, oB };
  };

  const setSound = (on) => {
    if (!audioCtx) {
      const built = buildAudio();
      if (!built) return;
      audioCtx = built.ctx;
      master = built.masterGain;
      noiseSrc = built.noise;
      droneA = built.oA;
      droneB = built.oB;
    }
    soundOn = on;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(on ? 0.55 : 0, t + (on ? 1.6 : 0.7));
    soundBtn?.setAttribute("aria-pressed", String(on));
    soundBtn?.setAttribute("aria-label", on ? "关闭环境声" : "打开环境声");
  };

  soundBtn?.addEventListener("click", () => setSound(!soundOn));

  document.addEventListener("visibilitychange", () => {
    if (!audioCtx) return;
    if (document.hidden && soundOn && audioCtx.state === "running") audioCtx.suspend();
    else if (!document.hidden && soundOn && audioCtx.state === "suspended") audioCtx.resume();
  });
})();
