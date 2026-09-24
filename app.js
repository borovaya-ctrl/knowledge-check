(() => {
  "use strict";

  const bank = window.QUESTION_BANK || {};
  const categories = Object.keys(bank);
  const allowedCounts = [10, 20, 30, 50, 100, 150, 200, "all"];

  const state = {
    category: categories[0] || "Р1",
    count: 10,
    order: "sequential",
    questions: [],
    currentIndex: 0,
    answers: [],
    locked: false,
  };

  const els = {
    setupScreen: document.querySelector("#setup-screen"),
    testScreen: document.querySelector("#test-screen"),
    resultsScreen: document.querySelector("#results-screen"),
    setupForm: document.querySelector("#setup-form"),
    categoryGrid: document.querySelector("#category-grid"),
    countGrid: document.querySelector("#count-grid"),
    startSummary: document.querySelector("#start-summary"),
    testMeta: document.querySelector("#test-meta"),
    metaCategory: document.querySelector("#meta-category"),
    metaCorrect: document.querySelector("#meta-correct"),
    progressCopy: document.querySelector("#progress-copy"),
    progressPercent: document.querySelector("#progress-percent"),
    progressTrack: document.querySelector(".progress-track"),
    progressBar: document.querySelector("#progress-bar"),
    questionNumber: document.querySelector("#question-number"),
    questionTitle: document.querySelector("#question-title"),
    answers: document.querySelector("#answers"),
    feedback: document.querySelector("#question-feedback"),
    nextQuestion: document.querySelector("#next-question"),
    finishEarly: document.querySelector("#finish-early"),
    finishDialog: document.querySelector("#finish-dialog"),
    scoreRing: document.querySelector("#score-ring"),
    scorePercent: document.querySelector("#score-percent"),
    resultCategory: document.querySelector("#result-category"),
    resultMessage: document.querySelector("#result-message"),
    resultCorrect: document.querySelector("#result-correct"),
    resultWrong: document.querySelector("#result-wrong"),
    resultUnanswered: document.querySelector("#result-unanswered"),
    retryWrong: document.querySelector("#retry-wrong"),
    newTest: document.querySelector("#new-test"),
    brandButton: document.querySelector("#brand-button"),
  };

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function showScreen(name) {
    els.setupScreen.classList.toggle("is-hidden", name !== "setup");
    els.testScreen.classList.toggle("is-hidden", name !== "test");
    els.resultsScreen.classList.toggle("is-hidden", name !== "results");
    els.testMeta.classList.toggle("is-hidden", name !== "test");
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector("#app").focus({ preventScroll: true });
  }

  function renderCategories() {
    els.categoryGrid.innerHTML = categories.map((category, index) => `
      <label class="category-option">
        <input type="radio" name="category" value="${category}" ${index === 0 ? "checked" : ""} />
        <span><b>${category}</b><small>${bank[category].length} ${declineQuestion(bank[category].length)}</small></span>
      </label>
    `).join("");
  }

  function renderCounts() {
    const available = bank[state.category]?.length || 0;
    if (state.count !== "all" && state.count > available) state.count = "all";
    els.countGrid.innerHTML = allowedCounts.map((count) => {
      const disabled = count !== "all" && count > available;
      const label = count === "all" ? `Все · ${available}` : count;
      const checked = count === state.count;
      return `
        <label class="count-option">
          <input type="radio" name="count" value="${count}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
          <span>${label}</span>
        </label>
      `;
    }).join("");
    updateSummary();
  }

  function declineQuestion(value) {
    const n10 = value % 10;
    const n100 = value % 100;
    if (n10 === 1 && n100 !== 11) return "вопрос";
    if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return "вопроса";
    return "вопросов";
  }

  function updateSummary() {
    const amount = state.count === "all" ? `все ${bank[state.category].length}` : state.count;
    const order = state.order === "random" ? "случайно" : "по порядку";
    els.startSummary.textContent = `${state.category} · ${amount} ${declineQuestion(state.count === "all" ? bank[state.category].length : state.count)} · ${order}`;
  }

  function startTest(questionSet = null) {
    let source = questionSet || [...bank[state.category]];
    if (!questionSet && state.order === "random") source = shuffle(source);
    if (!questionSet && state.count !== "all") source = source.slice(0, Number(state.count));
    state.questions = source;
    state.currentIndex = 0;
    state.answers = [];
    state.locked = false;
    els.metaCategory.textContent = state.category;
    els.metaCorrect.textContent = "0";
    showScreen("test");
    renderQuestion();
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    const position = state.currentIndex + 1;
    const percent = Math.round((state.currentIndex / state.questions.length) * 100);
    state.locked = false;
    els.progressCopy.textContent = `Вопрос ${position} из ${state.questions.length}`;
    els.progressPercent.textContent = `${percent}%`;
    els.progressBar.style.width = `${percent}%`;
    els.progressTrack.setAttribute("aria-valuenow", String(percent));
    els.questionNumber.textContent = `Вопрос №${question.number}`;
    els.questionTitle.textContent = question.question;
    els.feedback.className = "question-feedback is-hidden";
    els.feedback.textContent = "";
    els.nextQuestion.classList.add("is-hidden");
    els.answers.innerHTML = question.answers.map((answer, index) => `
      <button class="answer-button" type="button" data-answer-index="${index}">
        <span class="answer-letter">${answer.label}</span>
        <span class="answer-text">${escapeHtml(answer.text)}</span>
        <span class="answer-state" aria-hidden="true"></span>
      </button>
    `).join("");
    els.answers.querySelectorAll(".answer-button").forEach((button) => {
      button.addEventListener("click", () => chooseAnswer(Number(button.dataset.answerIndex)));
    });
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function revealNextQuestionButton() {
    requestAnimationFrame(() => {
      const buttonRect = els.nextQuestion.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isOutsideViewport = buttonRect.bottom > viewportHeight - 16 || buttonRect.top < 16;

      if (!isOutsideViewport) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      els.nextQuestion.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    });
  }

  function chooseAnswer(selectedIndex) {
    if (state.locked) return;
    state.locked = true;
    const question = state.questions[state.currentIndex];
    const correctIndex = question.answers.findIndex((answer) => answer.correct);
    const isCorrect = selectedIndex === correctIndex;
    state.answers.push({ question, selectedIndex, correctIndex, isCorrect });

    const completedPercent = Math.round(((state.currentIndex + 1) / state.questions.length) * 100);
    els.progressPercent.textContent = `${completedPercent}%`;
    els.progressBar.style.width = `${completedPercent}%`;
    els.progressTrack.setAttribute("aria-valuenow", String(completedPercent));

    els.answers.querySelectorAll(".answer-button").forEach((button, index) => {
      button.disabled = true;
      if (index === correctIndex) {
        button.classList.add("is-correct");
        button.querySelector(".answer-state").textContent = "✓";
      }
      if (index === selectedIndex && !isCorrect) {
        button.classList.add("is-wrong");
        button.querySelector(".answer-state").textContent = "×";
      }
    });

    els.feedback.textContent = isCorrect ? "Верно" : "Неверно — правильный ответ отмечен зелёным";
    els.feedback.className = `question-feedback ${isCorrect ? "correct" : "wrong"}`;
    els.metaCorrect.textContent = String(state.answers.filter((answer) => answer.isCorrect).length);
    els.nextQuestion.textContent = state.currentIndex === state.questions.length - 1 ? "Показать результат" : "Следующий вопрос →";
    els.nextQuestion.classList.remove("is-hidden");
    els.nextQuestion.focus({ preventScroll: true });
    revealNextQuestionButton();
  }

  function advance() {
    if (!state.locked) return;
    if (state.currentIndex >= state.questions.length - 1) {
      finishTest();
      return;
    }
    state.currentIndex += 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishTest() {
    const correct = state.answers.filter((answer) => answer.isCorrect).length;
    const wrong = state.answers.filter((answer) => !answer.isCorrect).length;
    const unanswered = state.questions.length - state.answers.length;
    const percent = state.questions.length ? Math.round((correct / state.questions.length) * 100) : 0;
    els.scorePercent.textContent = `${percent}%`;
    els.scoreRing.style.setProperty("--score", `${percent}%`);
    els.scoreRing.setAttribute("aria-label", `${percent}% правильных ответов`);
    els.resultCategory.textContent = `Категория ${state.category}`;
    els.resultCorrect.textContent = String(correct);
    els.resultWrong.textContent = String(wrong);
    els.resultUnanswered.textContent = String(unanswered);
    els.resultMessage.textContent = resultMessage(percent, unanswered);
    els.retryWrong.classList.toggle("is-hidden", wrong === 0);
    showScreen("results");
  }

  function resultMessage(percent, unanswered) {
    if (unanswered > 0) return `Вы завершили тест досрочно. Результат рассчитан по всем ${state.questions.length} вопросам.`;
    if (percent === 100) return "Все ответы верны. Отличный результат.";
    if (percent >= 80) return "Хороший результат. Повторите вопросы с ошибками, чтобы закрепить материал.";
    if (percent >= 60) return "Основные темы усвоены. Повторение ошибок поможет улучшить результат.";
    return "Материал стоит повторить. Начните с вопросов, в которых были допущены ошибки.";
  }

  function resetToSetup() {
    state.questions = [];
    state.answers = [];
    showScreen("setup");
  }

  els.setupForm.addEventListener("change", (event) => {
    if (event.target.name === "category") {
      state.category = event.target.value;
      renderCounts();
    }
    if (event.target.name === "count") state.count = event.target.value === "all" ? "all" : Number(event.target.value);
    if (event.target.name === "order") state.order = event.target.value;
    updateSummary();
  });

  els.setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startTest();
  });

  els.nextQuestion.addEventListener("click", advance);
  els.finishEarly.addEventListener("click", () => els.finishDialog.showModal());
  els.finishDialog.addEventListener("close", () => {
    if (els.finishDialog.returnValue === "confirm") finishTest();
  });
  els.retryWrong.addEventListener("click", () => {
    const wrongQuestions = state.answers.filter((answer) => !answer.isCorrect).map((answer) => answer.question);
    startTest(wrongQuestions);
  });
  els.newTest.addEventListener("click", resetToSetup);
  els.brandButton.addEventListener("click", () => {
    if (els.testScreen.classList.contains("is-hidden")) resetToSetup();
    else els.finishDialog.showModal();
  });

  renderCategories();
  renderCounts();

  const offlineNote = document.querySelector("#offline-note");
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").then(() => navigator.serviceWorker.ready).then(() => {
      offlineNote.classList.add("is-ready");
      offlineNote.innerHTML = '<span aria-hidden="true">✓</span> Офлайн-режим готов на этом устройстве';
    }).catch(() => {
      offlineNote.textContent = "Офлайн-режим станет доступен после повторного открытия приложения";
    });
  }
})();
