// Simple heuristic essay scorer based on rubric keywords, length, and optional model answer overlap

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function keywordScore(answerTokens, keywordsCsv) {
  const keywords = String(keywordsCsv || '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);
  if (keywords.length === 0) return { score: 1, hits: 0, total: 0 }; // neutral if no keywords
  const answerSet = new Set(answerTokens);
  let hits = 0;
  for (const kw of keywords) {
    if (answerSet.has(kw)) hits += 1;
  }
  const score = hits / keywords.length; // 0..1
  return { score, hits, total: keywords.length };
}

function lengthScore(wordCount, minWords = 50) {
  if (!minWords || minWords <= 0) return 1;
  const ratio = wordCount / minWords;
  if (ratio >= 1) return 1;
  return Math.max(0, ratio * 0.8); // partial credit up to 80% if below min length
}

function overlapScore(answerTokens, modelTokens) {
  if (!modelTokens || modelTokens.length === 0) return 0.5; // neutral if no model
  const a = new Set(answerTokens);
  const m = new Set(modelTokens);
  let common = 0;
  for (const t of a) if (m.has(t)) common += 1;
  const score = common / Math.max(1, m.size);
  return Math.min(1, score * 1.2); // allow slight boost capped at 1
}

export function scoreEssayAnswer(answerText, rubricKeywords, minWords, modelAnswer) {
  const tokens = tokenize(answerText);
  const modelTokens = tokenize(modelAnswer || '');
  const kw = keywordScore(tokens, rubricKeywords);
  const len = lengthScore(tokens.length, Number(minWords) || 0);
  const ov = overlapScore(tokens, modelTokens);

  // Weighted blend
  const weighted = 0.5 * kw.score + 0.3 * len + 0.2 * ov; // 0..1
  const percent = Math.round(weighted * 100);

  // Confidence: more keywords, meets length, and some overlap increases confidence
  let confidence = 0.4;
  if (kw.total >= 3) confidence += 0.2;
  if (len >= 1) confidence += 0.2;
  if (ov >= 0.2) confidence += 0.2;
  confidence = Math.min(1, confidence);

  return { percent, confidence, details: { keywordsHit: kw.hits, keywordsTotal: kw.total, wordCount: tokens.length } };
}

export function aggregateEssayScores(perQuestionScores = []) {
  if (perQuestionScores.length === 0) return { percent: null, confidence: 0 };
  const avgPercent = Math.round(perQuestionScores.reduce((s, x) => s + x.percent, 0) / perQuestionScores.length);
  const avgConfidence = Math.round((perQuestionScores.reduce((s, x) => s + x.confidence, 0) / perQuestionScores.length) * 100) / 100;
  return { percent: avgPercent, confidence: avgConfidence };
}


