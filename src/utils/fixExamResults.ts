/**
 * Utility function to fix incorrectly scored exam results
 * This can be run in the browser console to recalculate scores for existing results
 */

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

interface Exam {
  id: string;
  title: string;
  questions: Question[];
}

interface Result {
  examId: string;
  studentId: string;
  studentName: string;
  examTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  maxScore: number;
  answers: { [questionId: string]: number };
  submittedAt: string;
  timeSpent: number;
}

/**
 * Recalculate score for a single result
 */
function recalculateScore(result: Result, exam: Exam): Result {
  let totalScore = 0;
  let correctAnswers = 0;

  exam.questions.forEach(question => {
    if (!question.id || question.correctAnswer === undefined || question.correctAnswer === null) {
      return;
    }

    const userAnswer = result.answers[question.id];
    const userAnswerNum = userAnswer !== undefined && userAnswer !== null ? Number(userAnswer) : null;
    const correctAnswerNum = Number(question.correctAnswer);
    
    const isCorrect = userAnswerNum !== null && userAnswerNum === correctAnswerNum;
    
    if (isCorrect) {
      const points = Number(question.points) || 1;
      totalScore += points;
      correctAnswers++;
    }
  });

  const maxScore = exam.questions.reduce((sum, q) => {
    const points = Number(q.points) || 1;
    return sum + points;
  }, 0);

  return {
    ...result,
    correctAnswers,
    totalScore,
    maxScore,
    totalQuestions: exam.questions.length
  };
}

/**
 * Fix all exam results in localStorage
 * This function recalculates scores for all results that may have been incorrectly scored
 */
export function fixAllExamResults(): { fixed: number; total: number; details: string[] } {
  const details: string[] = [];
  let fixed = 0;
  let total = 0;

  try {
    // Load exams
    const savedExams = localStorage.getItem('cbt_exams');
    if (!savedExams) {
      details.push('No exams found in localStorage');
      return { fixed, total, details };
    }

    const exams: Exam[] = JSON.parse(savedExams);
    
    // Normalize exams
    const normalizedExams = exams.map(exam => ({
      ...exam,
      questions: exam.questions.map(q => ({
        ...q,
        correctAnswer: Number(q.correctAnswer) || 0,
        points: Number(q.points) || 1,
        options: Array.isArray(q.options) ? q.options : []
      })).filter(q => q.id && q.text && q.options.length > 0)
    }));

    // Load results
    const savedResults = localStorage.getItem('cbt_results');
    if (!savedResults) {
      details.push('No results found in localStorage');
      return { fixed, total, details };
    }

    const results: Result[] = JSON.parse(savedResults);
    const updatedResults: Result[] = [];

    results.forEach(result => {
      total++;
      const exam = normalizedExams.find(e => e.id === result.examId);
      
      if (!exam) {
        details.push(`⚠️  Result for "${result.examTitle}" - Exam not found, skipping`);
        updatedResults.push(result);
        return;
      }

      if (exam.questions.length === 0) {
        details.push(`⚠️  Result for "${result.examTitle}" - Exam has no questions, skipping`);
        updatedResults.push(result);
        return;
      }

      // Recalculate score
      const recalculated = recalculateScore(result, exam);
      
      // Check if score changed
      if (recalculated.correctAnswers !== result.correctAnswers || 
          recalculated.totalScore !== result.totalScore) {
        fixed++;
        const oldScore = `${result.correctAnswers}/${result.totalQuestions} (${result.totalScore} pts)`;
        const newScore = `${recalculated.correctAnswers}/${recalculated.totalQuestions} (${recalculated.totalScore} pts)`;
        details.push(`✅ Fixed: "${result.examTitle}" - ${result.studentName} - ${oldScore} → ${newScore}`);
        updatedResults.push(recalculated);
      } else {
        details.push(`✓  OK: "${result.examTitle}" - ${result.studentName} - Score was correct`);
        updatedResults.push(result);
      }
    });

    // Save updated results
    localStorage.setItem('cbt_results', JSON.stringify(updatedResults));
    details.push(`\n📊 Summary: Fixed ${fixed} out of ${total} results`);

  } catch (error) {
    details.push(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { fixed, total, details };
}

/**
 * Make the function available globally for console use
 */
if (typeof window !== 'undefined') {
  (window as any).fixExamResults = fixAllExamResults;
}

