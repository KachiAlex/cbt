import ExcelJS from 'exceljs';
import QuestionImportParser from './questionImportParser';

describe('question import parser', () => {
  test('generates and parses the Excel template', async () => {
    const parser = new QuestionImportParser();
    const buffer = await parser.generateExcelTemplate();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const questions = parser.excelParser.parseWorkbook(workbook);

    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      question: 'What is the capital of France?',
      type: 'multiple-choice',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'Paris',
    });
  });

  test('keeps the correct option text when an option column is blank', () => {
    const parser = new QuestionImportParser();
    const questions = parser.excelParser.parseSheetData([
      ['Question', 'Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'],
      ['Which city is the capital?', 'Multiple Choice', '', 'Berlin', 'Paris', '', 'C'],
    ]);

    expect(questions[0].options).toEqual(['Berlin', 'Paris']);
    expect(questions[0].correctAnswer).toBe('Paris');
  });

  test('parses the downloadable text template', () => {
    const parser = new QuestionImportParser();
    const questions = parser.wordParser.parseText(parser.generateWordTemplate());
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].question).toContain('capital of France');
    expect(questions[0].correctAnswer).toBe('Paris');
  });
});
