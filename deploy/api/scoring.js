// Server-side exam scoring — mirrors the old client-side logic so results
// can't be tampered with in the browser.

function resolveCorrectAnswer(question) {
  let correctAnswerText = null;
  let correctOptionIndex = null;

  if (question.correctIndex !== undefined && question.correctIndex !== null) {
    correctOptionIndex = Number(question.correctIndex);
    if (question.options && question.options[correctOptionIndex]) {
      correctAnswerText = question.options[correctOptionIndex];
    }
  } else if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
    if (typeof question.correctAnswer === 'number' || !isNaN(Number(question.correctAnswer))) {
      correctOptionIndex = Number(question.correctAnswer);
      if (question.options && question.options[correctOptionIndex]) {
        correctAnswerText = question.options[correctOptionIndex];
      }
    } else {
      const s = String(question.correctAnswer).trim();
      if (/^[A-D]$/i.test(s)) {
        correctOptionIndex = s.toUpperCase().charCodeAt(0) - 65;
        if (question.options && question.options[correctOptionIndex]) {
          correctAnswerText = question.options[correctOptionIndex];
        }
      } else {
        correctAnswerText = s;
      }
    }
  }
  return correctAnswerText;
}

function tokenize(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function keywordScore(answerTokens, keywordsCsv) {
  const keywords = String(keywordsCsv || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  if (!keywords.length) return { score: 1, hits: 0, total: 0 };
  const set = new Set(answerTokens);
  const hits = keywords.filter(k => set.has(k)).length;
  return { score: hits / keywords.length, hits, total: keywords.length };
}

function lengthScore(wordCount, minWords = 50) {
  if (!minWords || minWords <= 0) return 1;
  const ratio = wordCount / minWords;
  return ratio >= 1 ? 1 : Math.max(0, ratio * 0.8);
}

function overlapScore(answerTokens, modelTokens) {
  if (!modelTokens.length) return 0.5;
  const a = new Set(answerTokens), m = new Set(modelTokens);
  let common = 0;
  for (const t of a) if (m.has(t)) common++;
  return Math.min(1, (common / Math.max(1, m.size)) * 1.2);
}

function scoreEssayAnswer(answerText, rubricKeywords, minWords, modelAnswer) {
  const tokens = tokenize(answerText);
  const modelTokens = tokenize(modelAnswer || '');
  const kw = keywordScore(tokens, rubricKeywords);
  const len = lengthScore(tokens.length, Number(minWords) || 0);
  const ov = overlapScore(tokens, modelTokens);
  const percent = Math.round((0.5 * kw.score + 0.3 * len + 0.2 * ov) * 100);
  let confidence = 0.4;
  if (kw.total >= 3) confidence += 0.2;
  if (len >= 1) confidence += 0.2;
  if (ov >= 0.2) confidence += 0.2;
  return { percent, confidence: Math.min(1, confidence) };
}

// Returns fields to merge into the result record
function scoreSubmission(questions, answers, examType) {
  const isEssay = String(examType || '').toLowerCase() === 'essay';

  if (isEssay) {
    const per = questions.map(q =>
      scoreEssayAnswer(answers[q.id] || '', q.rubricKeywords || '', q.minWords || 50, q.modelAnswer || ''));
    const n = per.length;
    const percent = n ? Math.round(per.reduce((s, x) => s + x.percent, 0) / n) : null;
    const confidence = n ? Math.round((per.reduce((s, x) => s + x.confidence, 0) / n) * 100) / 100 : 0;
    return {
      score: percent,
      maxScore: null,
      percentage: percent,
      totalQuestions: n,
      correctAnswers: 0,
      status: confidence >= 0.7 ? 'provisional' : 'pending_review',
      provisional: { percent, confidence },
    };
  }

  let correctAnswers = 0, totalScore = 0, maxScore = 0;
  for (const question of questions) {
    const points = Number(question.points) || 1;
    maxScore += points;
    const correct = resolveCorrectAnswer(question);
    const student = answers[question.id];
    if (student && correct && String(student).trim() === String(correct).trim()) {
      correctAnswers++;
      totalScore += points;
    }
  }
  const percentage = maxScore > 0
    ? Math.round((totalScore / maxScore) * 100)
    : (questions.length ? Math.round((correctAnswers / questions.length) * 100) : 0);

  return {
    score: totalScore,
    maxScore,
    percentage,
    totalQuestions: questions.length,
    correctAnswers,
    status: 'completed',
  };
}

module.exports = { scoreSubmission };
