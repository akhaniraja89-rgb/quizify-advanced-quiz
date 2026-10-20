
"use strict";

// ========================================
// 1. LOAD QUESTIONS FROM SEPARATE FILES
// ========================================

const questions = [
    ...(window.HTML_QUESTIONS || []),
    ...(window.CSS_QUESTIONS || []),
    ...(window.JAVASCRIPT_QUESTIONS || []),
    ...(window.GENERAL_QUESTIONS || []),
    ...(window.MORE_QUESTIONS || [])
];

// ========================================
// 2. HTML ELEMENTS
// ========================================

const startScreen = document.querySelector("#startScreen");
const quizScreen = document.querySelector("#quizScreen");
const resultScreen = document.querySelector("#resultScreen");
const reviewScreen = document.querySelector("#reviewScreen");

const categorySelect = document.querySelector("#categorySelect");
const difficultySelect = document.querySelector("#difficultySelect");
const questionCountSelect = document.querySelector("#questionCountSelect");
const questionCountLabel = document.querySelector("#questionCount");

const startBtn = document.querySelector("#startBtn");
const nextBtn = document.querySelector("#nextBtn");
const restartBtn = document.querySelector("#restartBtn");
const reviewBtn = document.querySelector("#reviewBtn");
const backBtn = document.querySelector("#backBtn");
const reviewRestartBtn = document.querySelector("#reviewRestartBtn");

const currentCategory = document.querySelector("#currentCategory");
const questionNumber = document.querySelector("#questionNumber");
const progressPercent = document.querySelector("#progressPercent");
const progressBar = document.querySelector("#progressBar");
const questionTag = document.querySelector("#questionTag");
const questionText = document.querySelector("#questionText");
const optionsContainer = document.querySelector("#optionsContainer");
const timer = document.querySelector("#timer");
const timerBox = document.querySelector("#timerBox");
const answeredText = document.querySelector("#answeredText");

const resultTitle = document.querySelector("#resultTitle");
const resultMessage = document.querySelector("#resultMessage");
const scoreValue = document.querySelector("#scoreValue");
const scoreTotal = document.querySelector("#scoreTotal");
const scoreBar = document.querySelector("#scoreBar");
const scorePercent = document.querySelector("#scorePercent");
const correctCount = document.querySelector("#correctCount");
const wrongCount = document.querySelector("#wrongCount");
const timeTaken = document.querySelector("#timeTaken");
const reviewList = document.querySelector("#reviewList");

// ========================================
// 3. QUIZ STATE
// ========================================

let quizQuestions = [];
let selectedAnswers = [];
let currentIndex = 0;

let timeLeft = 60;
let timeElapsed = 0;
let questionStartedAt = 0;

let timerInterval = null;
let advanceTimeout = null;
let isAnswered = false;

// ========================================
// 4. FILTER QUESTIONS
// ========================================

function getFilteredQuestions() {
    const category = categorySelect.value;
    const difficulty = difficultySelect.value;

    return questions.filter((item) => {
        const categoryMatches =
            category === "All" || item.category === category;

        const difficultyMatches =
            difficulty === "All" || item.difficulty === difficulty;

        return categoryMatches && difficultyMatches;
    });
}

// ========================================
// 5. UPDATE AVAILABLE QUESTION COUNT
// ========================================

function updateQuestionCount() {
    const available = getFilteredQuestions().length;
    const requested = Number(questionCountSelect.value);
    const selected = Math.min(requested, available);

    questionCountLabel.textContent =
        `${available} available · ${selected} selected`;

    startBtn.disabled = available === 0;

    startBtn.innerHTML = available === 0
        ? "No Questions Available"
        : 'Start Quiz <i class="bi bi-arrow-right"></i>';
}

categorySelect.addEventListener("change", updateQuestionCount);
difficultySelect.addEventListener("change", updateQuestionCount);
questionCountSelect.addEventListener("change", updateQuestionCount);

// ========================================
// 6. TIMER CLEANUP & SCREEN CONTROL
// ========================================

function clearQuizTimers() {
    clearInterval(timerInterval);
    clearTimeout(advanceTimeout);

    timerInterval = null;
    advanceTimeout = null;
}

function showScreen(screenToShow) {
    [
        startScreen,
        quizScreen,
        resultScreen,
        reviewScreen
    ].forEach((screen) => {
        screen.classList.add("hidden");
    });

    screenToShow.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ========================================
// 7. SHUFFLE QUESTIONS
// ========================================

function shuffleQuestions(questionArray) {
    const shuffled = [...questionArray];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

// ========================================
// 8. START / RESTART QUIZ
// ========================================

function startQuiz() {
    clearQuizTimers();

    const availableQuestions = getFilteredQuestions();
    const requestedCount = Number(questionCountSelect.value);

    if (availableQuestions.length === 0) {
        updateQuestionCount();
        return;
    }

    // Select the requested number of questions.
    // The selected filters must have enough questions available.
    const actualCount = Math.min(
        requestedCount,
        availableQuestions.length
    );

    quizQuestions = shuffleQuestions(availableQuestions)
        .slice(0, actualCount);

    currentIndex = 0;
    selectedAnswers = [];
    timeElapsed = 0;
    timeLeft = 60;
    isAnswered = false;

    showScreen(quizScreen);
    renderQuestion();
}

function restartQuiz() {
    startQuiz();
}

// ========================================
// 9. RENDER QUESTION
// ========================================

function renderQuestion() {
    clearQuizTimers();

    const currentQuestion = quizQuestions[currentIndex];

    if (!currentQuestion) {
        showResults();
        return;
    }

    isAnswered = false;
    timeLeft = 60;
    questionStartedAt = Date.now();

    currentCategory.textContent = currentQuestion.category;

    questionNumber.textContent =
        `Question ${currentIndex + 1} of ${quizQuestions.length}`;

    questionTag.textContent =
        `QUESTION ${String(currentIndex + 1).padStart(2, "0")}`;

    questionText.textContent = currentQuestion.question;

    const progress = Math.round(
        ((currentIndex + 1) / quizQuestions.length) * 100
    );

    progressBar.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;

    timer.textContent = timeLeft;
    timerBox.classList.remove("warning");

    answeredText.textContent = "Choose your answer";

    nextBtn.disabled = true;

    nextBtn.innerHTML =
        currentIndex === quizQuestions.length - 1
            ? 'See Results <i class="bi bi-trophy"></i>'
            : 'Next Question <i class="bi bi-arrow-right"></i>';

    optionsContainer.replaceChildren();

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option-btn";

        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = String.fromCharCode(65 + index);

        const optionText = document.createElement("span");
        optionText.className = "option-text";
        optionText.textContent = option;

        button.append(letter, optionText);

        button.addEventListener("click", () => {
            selectAnswer(index);
        });

        optionsContainer.appendChild(button);
    });

    startTimer();
}

// ========================================
// 10. COUNTDOWN TIMER — 60 SECONDS
// ========================================

function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (isAnswered) return;

        timeLeft -= 1;
        timer.textContent = timeLeft;

        if (timeLeft <= 10) {
            timerBox.classList.add("warning");
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

// ========================================
// 11. HANDLE TIMEOUT
// ========================================

function handleTimeout() {
    if (isAnswered) return;

    isAnswered = true;

    selectedAnswers[currentIndex] = {
        selected: null,
        time: 60
    };

    answeredText.textContent = "Time is up!";

    showCorrectOption();

    nextBtn.disabled = false;

    // Automatically move to the next question after timeout.
    advanceTimeout = setTimeout(() => {
        goToNextQuestion();
    }, 1200);
}

// ========================================
// 12. SELECT ANSWER
// ========================================

function selectAnswer(selectedIndex) {
    if (isAnswered) return;

    isAnswered = true;
    clearInterval(timerInterval);

    const currentQuestion = quizQuestions[currentIndex];

    const elapsedSeconds = Math.ceil(
        (Date.now() - questionStartedAt) / 1000
    );

    selectedAnswers[currentIndex] = {
        selected: selectedIndex,
        time: Math.min(60, elapsedSeconds)
    };

    const buttons =
        optionsContainer.querySelectorAll(".option-btn");

    buttons.forEach((button, index) => {
        button.disabled = true;

        if (index === currentQuestion.answer) {
            button.classList.add("correct");
            button.querySelector(".option-letter").textContent = "✓";
        } else if (index === selectedIndex) {
            button.classList.add("wrong");
            button.querySelector(".option-letter").textContent = "✕";
        }
    });

    if (selectedIndex === currentQuestion.answer) {
        answeredText.textContent = "Correct answer!";
    } else {
        answeredText.textContent =
            "Incorrect — review the answer later.";
    }

    nextBtn.disabled = false;
}

// ========================================
// 13. SHOW CORRECT ANSWER ON TIMEOUT
// ========================================

function showCorrectOption() {
    const currentQuestion = quizQuestions[currentIndex];

    const buttons =
        optionsContainer.querySelectorAll(".option-btn");

    buttons.forEach((button, index) => {
        button.disabled = true;

        if (index === currentQuestion.answer) {
            button.classList.add("correct");
            button.querySelector(".option-letter").textContent = "✓";
        }
    });
}

// ========================================
// 14. NEXT QUESTION
// ========================================

function goToNextQuestion() {
    if (!isAnswered) return;

    clearQuizTimers();

    timeElapsed += selectedAnswers[currentIndex]?.time ?? 60;

    currentIndex += 1;

    if (currentIndex < quizQuestions.length) {
        renderQuestion();
    } else {
        showResults();
    }
}

// ========================================
// 15. CALCULATE RESULTS
// ========================================

function showResults() {
    clearQuizTimers();

    const total = quizQuestions.length;

    const correct = quizQuestions.reduce((count, question, index) => {
        return count + (
            selectedAnswers[index]?.selected === question.answer ? 1 : 0
        );
    }, 0);

    const incorrect = total - correct;

    const percentage = total === 0
        ? 0
        : Math.round((correct / total) * 100);

    scoreValue.textContent = correct;
    scoreTotal.textContent = `/${total}`;

    scoreBar.style.width = `${percentage}%`;
    scorePercent.textContent = `${percentage}% accuracy`;

    correctCount.textContent = correct;
    wrongCount.textContent = incorrect;
    timeTaken.textContent = `${timeElapsed}s`;

    if (percentage >= 80) {
        resultTitle.textContent = "Outstanding!";
        resultMessage.textContent =
            "Excellent work! Your knowledge is looking strong.";
    } else if (percentage >= 50) {
        resultTitle.textContent = "Good effort!";
        resultMessage.textContent =
            "You're making progress. Review your mistakes and try again.";
    } else {
        resultTitle.textContent = "Keep learning!";
        resultMessage.textContent =
            "Every attempt helps you improve. Review the answers and practice again.";
    }

    showScreen(resultScreen);
}

// ========================================
// 16. ANSWER REVIEW
// ========================================

function renderReview() {
    reviewList.replaceChildren();

    quizQuestions.forEach((question, index) => {
        const userAnswer =
            selectedAnswers[index]?.selected ?? null;

        const isCorrect = userAnswer === question.answer;

        const item = document.createElement("article");
        item.className = "review-item";

        const title = document.createElement("h3");
        title.textContent =
            `${index + 1}. ${question.question}`;

        const status = document.createElement("p");
        status.className =
            `review-status ${isCorrect ? "good" : "bad"}`;

        status.textContent = isCorrect
            ? "✓ Correct"
            : "✕ Incorrect / Unanswered";

        const yourAnswer = document.createElement("p");
        yourAnswer.textContent =
            `Your answer: ${
                userAnswer === null
                    ? "Not answered"
                    : question.options[userAnswer]
            }`;

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${question.options[question.answer]}`;

        const explanation = document.createElement("p");
        explanation.textContent =
            `Explanation: ${question.explanation || "No explanation available."}`;

        item.append(
            title,
            status,
            yourAnswer,
            correctAnswer,
            explanation
        );

        reviewList.appendChild(item);
    });
}

// ========================================
// 17. EVENT LISTENERS
// ========================================

startBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", goToNextQuestion);

restartBtn.addEventListener("click", restartQuiz);
reviewRestartBtn.addEventListener("click", restartQuiz);

reviewBtn.addEventListener("click", () => {
    renderReview();
    showScreen(reviewScreen);
});

backBtn.addEventListener("click", () => {
    showScreen(resultScreen);
});

// ========================================
// 18. INITIAL SETUP
// ========================================

document.querySelector("#year").textContent =
    new Date().getFullYear();

updateQuestionCount();
backBtn.addEventListener("click", () => {
    clearQuizTimers();
    updateQuestionCount();
    showScreen(startScreen);
});