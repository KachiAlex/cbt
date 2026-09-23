const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreSubmission } = require('./scoring');

test('scores objective answers from authoritative question data and ignores unknown IDs', () => {
  const questions = [
    { id: 'q1', type: 'multiple-choice', options: ['A', 'B'], correctIndex: 1, points: 2 },
    { id: 'q2', type: 'short-answer', correctAnswer: '  Ottawa  ', points: 1 },
    { id: 'q3', type: 'short-answer', correctAnswer: '42', points: 1 },
    { id: 'q4', type: 'multiple-choice', options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'E', points: 1 },
  ];
  const result = scoreSubmission(questions, { q1: 'B', q2: 'ottawa', q3: '42', q4: 'E', forged: 'B' }, 'Objective');
  assert.equal(result.score, 5);
  assert.equal(result.maxScore, 5);
  assert.equal(result.percentage, 100);
  assert.equal(result.correctAnswers, 4);
});

test('blank essay answers receive zero and point weights affect essay percentage', () => {
  const questions = [
    { id: 'q1', type: 'essay', points: 3, rubricKeywords: 'analysis,evidence', minWords: 1 },
    { id: 'q2', type: 'essay', points: 1, rubricKeywords: 'conclusion', minWords: 1 },
  ];
  const empty = scoreSubmission(questions, {}, 'Essay');
  const partial = scoreSubmission(questions, { q1: 'analysis evidence', q2: '' }, 'Essay');
  assert.equal(empty.percentage, 0);
  assert.equal(partial.percentage, 68);
  assert.equal(partial.status, 'pending_review');
});
