import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

// Flexible parsing rules for different formats
export const PARSING_RULES = {
  // Excel parsing rules
  excel: {
    // Column mapping - flexible column names
    columns: {
      question: ['question', 'q', 'question_text', 'question text', 'text', 'content'],
      type: ['type', 'question_type', 'question type', 'qtype', 'format'],
      options: ['options', 'choices', 'answers', 'alternatives', 'option_a', 'option_b', 'option_c', 'option_d'],
      correctAnswer: ['correct', 'answer', 'correct_answer', 'correct answer', 'right_answer', 'solution'],
      explanation: ['explanation', 'explain', 'reason', 'rationale', 'why'],
      points: ['points', 'score', 'marks', 'weight', 'value'],
      difficulty: ['difficulty', 'level', 'complexity', 'hardness'],
      category: ['category', 'subject', 'topic', 'chapter', 'section'],
      rubricKeywords: ['rubric keywords', 'rubric', 'keywords'],
      minWords: ['minimum words', 'min words', 'min_words'],
      modelAnswer: ['model answer', 'model_answer', 'ideal answer']
    },
    
    // Question type mapping
    typeMapping: {
      'multiple choice': 'multiple-choice',
      'multiple-choice': 'multiple-choice',
      'mcq': 'multiple-choice',
      'choice': 'multiple-choice',
      'true/false': 'true-false',
      'true-false': 'true-false',
      't/f': 'true-false',
      'tf': 'true-false',
      'short answer': 'short-answer',
      'short-answer': 'short-answer',
      'sa': 'short-answer',
      'essay': 'essay',
      'long answer': 'essay',
      'written': 'essay'
    },
    
    // Difficulty mapping
    difficultyMapping: {
      'easy': 'easy',
      'e': 'easy',
      '1': 'easy',
      'simple': 'easy',
      'medium': 'medium',
      'm': 'medium',
      '2': 'medium',
      'moderate': 'medium',
      'hard': 'hard',
      'h': 'hard',
      '3': 'hard',
      'difficult': 'hard',
      'complex': 'hard'
    }
  },
  
  // Word document parsing rules
  word: {
    // Question patterns - flexible regex patterns
    patterns: {
      question: /^(?:Q\d*[\.\)\-\s]*|Question\s*\d*[\.\)\-\s]*|^\d+[\.\)\-\s]*)(.+?)(?=\n[A-Z]|\n\d+[\.\)]|\n[A-D][\.\)]|\n\([A-D]\)|\n[A-D]\s|\n\*|\n$)/im,
      options: /^([A-D])[\.\)\-\s]+(.+?)(?=\n[A-D][\.\)]|\n\*|\nAnswer|\n$)/gim,
      correctAnswer: /(?:Answer|Correct|Solution)[\s:]*([A-D])/i,
      explanation: /(?:Explanation|Explain|Reason|Rationale)[\s:]*([^\n]+)/i,
      points: /(?:Points|Score|Marks)[\s:]*(\d+)/i,
      difficulty: /(?:Difficulty|Level)[\s:]*([^\n]+)/i,
      type: /(?:Type|Format)[\s:]*([^\n]+)/i,
      rubricKeywords: /(?:Rubric Keywords|Keywords)[\s:]*([^\n]+)/i,
      minWords: /(?:Minimum Word Count|Min Words)[\s:]*(\d+)/i,
      modelAnswer: /(?:Model Answer)[\s:]*([\s\S]*?)(?=\n(?:Rubric Keywords|Minimum Word Count|Answer|Explanation|Points|Difficulty|Type):|$)/i
    },
    
    // Alternative patterns for different formats
    alternativePatterns: {
      question: [
        /^(\d+)[\.\)\-\s]+(.+?)(?=\n[A-D]|\n\*|\nAnswer)/im,
        /^Q[\.\)\-\s]+(.+?)(?=\n[A-D]|\n\*|\nAnswer)/im,
        /^Question[\.\)\-\s]+(.+?)(?=\n[A-D]|\n\*|\nAnswer)/im
      ],
      options: [
        /^([A-D])[\.\)\-\s]+(.+?)(?=\n[A-D]|\n\*|\nAnswer)/gim,
        /^([A-D])[\s]+(.+?)(?=\n[A-D]|\n\*|\nAnswer)/gim,
        /^([A-D])[\.\)](.+?)(?=\n[A-D]|\n\*|\nAnswer)/gim
      ]
    }
  }
};

// Excel parser
export class ExcelQuestionParser {
  constructor(rules = PARSING_RULES.excel) {
    this.rules = rules;
  }

  async parseFile(file) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    return this.parseWorkbook(workbook);
  }

  parseWorkbook(workbook) {
    const questions = [];
    workbook.eachSheet(worksheet => {
      const rows = [];
      worksheet.eachRow({ includeEmpty: true }, row => {
        const values = [];
        for (let column = 1; column <= worksheet.columnCount; column++) {
          values.push(row.getCell(column).text || '');
        }
        rows.push(values);
      });
      if (rows.length) questions.push(...this.parseSheetData(rows));
      if (questions.length > 1000) throw new Error('Import at most 1,000 questions per batch.');
    });
    return questions;
  }

  parseSheetData(data) {
    if (data.length < 2) return [];
    
    const headers = data[0].map(h => h ? h.toString().toLowerCase().trim() : '');
    const questions = [];
    
    // Find column indices
    const columnMap = this.mapColumns(headers);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (this.isEmptyRow(row)) continue;
      
      const question = this.parseRow(row, columnMap);
      if (question && question.question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  mapColumns(headers) {
    const columnMap = {};
    Object.keys(this.rules.columns).forEach(key => {
      const possibleNames = this.rules.columns[key];
      for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name.toLowerCase()));
        if (index !== -1) {
          columnMap[key] = index;
          break;
        }
      }
    });

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('option') || lowerHeader.includes('choice') || lowerHeader.includes('answer')) {
        const optionMatch = lowerHeader.match(/option\s*([a-e])|choice\s*([a-e])|answer\s*([a-e])/);
        if (optionMatch) {
          const optionLetter = optionMatch[1] || optionMatch[2] || optionMatch[3];
          columnMap[`option_${optionLetter}`] = index;
        }
      }
    });
    return columnMap;
  }

  parseRow(row, columnMap) {
    const optionData = this.parseOptions(row, columnMap);
    const rawCorrectAnswer = this.getCellValue(row, columnMap.correctAnswer);
    let correctAnswer = rawCorrectAnswer;
    if (/^[A-E]$/i.test(rawCorrectAnswer)) {
      const answerIndex = rawCorrectAnswer.toUpperCase().charCodeAt(0) - 65;
      const optionPosition = optionData.labels.indexOf(answerIndex);
      if (optionPosition >= 0) correctAnswer = optionData.options[optionPosition];
    } else if (/^\d+$/.test(rawCorrectAnswer)) {
      const optionPosition = optionData.labels.indexOf(Number(rawCorrectAnswer));
      if (optionPosition >= 0) correctAnswer = optionData.options[optionPosition];
    }
    const question = {
      question: this.getCellValue(row, columnMap.question),
      type: this.parseQuestionType(this.getCellValue(row, columnMap.type)),
      options: optionData.options,
      correctAnswer,
      explanation: this.getCellValue(row, columnMap.explanation),
      points: this.parsePoints(this.getCellValue(row, columnMap.points)),
      difficulty: this.parseDifficulty(this.getCellValue(row, columnMap.difficulty)),
      category: this.getCellValue(row, columnMap.category),
      rubricKeywords: this.getCellValue(row, columnMap.rubricKeywords),
      minWords: Math.max(0, parseInt(this.getCellValue(row, columnMap.minWords), 10) || 50),
      modelAnswer: this.getCellValue(row, columnMap.modelAnswer)
    };
    
    return question;
  }

  parseOptions(row, columnMap) {
    const options = [];
    const labels = [];
    
    
    // Try to find options in separate columns (Option A, Option B, etc.)
    const optionColumns = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
    optionColumns.forEach((optionKey, label) => {
      if (columnMap[optionKey] !== undefined) {
        const value = this.getCellValue(row, columnMap[optionKey]);
        if (value && value.trim()) {
          options.push(value.trim());
          labels.push(label);
        }
      }
    });
    
    
    // If no separate option columns found, try to parse from options column
    if (options.length === 0 && columnMap.options !== undefined) {
      const optionsText = this.getCellValue(row, columnMap.options);
      if (optionsText) {
        return this.parseOptionsFromText(optionsText);
      }
    }
    
    // If still no options, try to find any column that might contain options
    if (options.length === 0) {
      for (let i = 0; i < row.length; i++) {
        const cellValue = this.getCellValue(row, i);
        if (cellValue && this.looksLikeOption(cellValue)) {
          const match = cellValue.trim().match(/^([A-E])[\.\)\-\s]+(.+)$/);
          options.push((match?.[2] || cellValue).trim());
          labels.push(match ? match[1].charCodeAt(0) - 65 : options.length - 1);
        }
      }
    }
    
    return { options, labels };
  }

  parseOptionsFromText(text) {
    // Flexible parsing of options from text
    const patterns = [
      /([A-E])[\.\)\-\s]+([^\n]+)/g,
      /([A-E])[\s]+([^\n]+)/g,
      /([A-E])[\.\)]([^\n]+)/g,
      /([A-E])[\s]*([^\n]+)/g
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)]
        .map(match => ({ label: match[1].toUpperCase().charCodeAt(0) - 65, option: match[2].trim() }))
        .filter(item => item.option.length > 0);
      if (matches.length > 0) {
        return { options: matches.map(item => item.option), labels: matches.map(item => item.label) };
      }
    }
    
    // Try to parse options separated by newlines or semicolons
    const lines = text.split(/[\n;]/).map(line => line.trim()).filter(line => line.length > 0);
    const options = [];
    const labels = [];

    for (const line of lines) {
      if (this.looksLikeOption(line)) {
        const match = line.match(/^([A-E])[\.\)\-\s]+(.+)$/);
        const optionText = (match?.[2] || line).trim();
        if (optionText) {
          options.push(optionText);
          labels.push(match ? match[1].charCodeAt(0) - 65 : options.length - 1);
        }
      }
    }

    if (options.length > 0) return { options, labels };

    // Final fallback: split by common separators
    const fallbackOptions = text.split(/[;\n]/).map(opt => opt.trim()).filter(opt => opt.length > 0);
    return { options: fallbackOptions, labels: fallbackOptions.map((_, index) => index) };
  }

  parseQuestionType(type) {
    if (!type) return 'multiple-choice';
    const normalizedType = type.toLowerCase().trim();
    return this.rules.typeMapping[normalizedType] || 'multiple-choice';
  }

  parseDifficulty(difficulty) {
    if (!difficulty) return 'medium';
    const normalizedDiff = difficulty.toLowerCase().trim();
    return this.rules.difficultyMapping[normalizedDiff] || 'medium';
  }

  parsePoints(points) {
    if (!points) return 1;
    const parsed = parseInt(points);
    return isNaN(parsed) ? 1 : Math.max(1, parsed);
  }

  getCellValue(row, columnIndex) {
    if (columnIndex === undefined || columnIndex >= row.length) return '';
    const value = row[columnIndex];
    return value ? value.toString().trim() : '';
  }

  isEmptyRow(row) {
    return !row.some(cell => cell && cell.toString().trim().length > 0);
  }

  looksLikeOption(text) {
    if (!text || text.length < 2) return false;
    
    // Check if it looks like an option (starts with A, B, C, D, E followed by punctuation)
    const optionPattern = /^[A-E][\.\)\-\s]+/;
    return optionPattern.test(text.trim());
  }
}

// Word document parser
export class WordQuestionParser {
  constructor(rules = PARSING_RULES.word) {
    this.rules = rules;
  }

  async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
          .then(result => {
            const questions = this.parseText(result.value);
            resolve(questions);
          })
          .catch(reject);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  parseText(text) {
    const questions = [];
    const sections = this.splitIntoSections(text);
    
    sections.forEach(section => {
      const question = this.parseSection(section);
      if (question && question.question) {
        questions.push(question);
      }
    });
    
    return questions;
  }

  splitIntoSections(text) {
    // Split by question patterns
    const patterns = [
      /(?=Q\d+[\.\)\-\s])/gi,
      /(?=Question\s*\d+[\.\)\-\s])/gi,
      /(?=^\d+[\.\)\-\s])/gm
    ];
    
    let sections = [text];
    
    for (const pattern of patterns) {
      const newSections = [];
      sections.forEach(section => {
        const splits = section.split(pattern);
        newSections.push(...splits.filter(s => s.trim().length > 0));
      });
      sections = newSections;
    }
    
    return sections;
  }

  parseSection(section) {
    const question = {
      question: '',
      type: 'multiple-choice',
      options: [],
      correctAnswer: '',
      explanation: '',
      points: 1,
      difficulty: 'medium',
      category: '',
      rubricKeywords: '',
      minWords: 50,
      modelAnswer: ''
    };
    
    // Parse question text
    question.question = this.extractQuestion(section);
    
    // Parse options
    const optionData = this.extractOptionDetails(section);
    question.options = optionData.map(item => item.option);

    // Parse other fields
    const rawCorrectAnswer = this.extractField(section, 'correctAnswer');
    const answerIndex = /^[A-E]$/i.test(rawCorrectAnswer) ? rawCorrectAnswer.toUpperCase().charCodeAt(0) - 65 : null;
    const matchingOption = answerIndex === null ? null : optionData.find(item => item.label === answerIndex);
    question.correctAnswer = matchingOption?.option || rawCorrectAnswer;
    question.explanation = this.extractField(section, 'explanation');
    question.points = this.parsePoints(this.extractField(section, 'points'));
    question.difficulty = this.parseDifficulty(this.extractField(section, 'difficulty'));
    question.type = this.parseQuestionType(this.extractField(section, 'type'));
    question.rubricKeywords = this.extractField(section, 'rubricKeywords');
    question.minWords = Math.max(0, parseInt(this.extractField(section, 'minWords'), 10) || 50);
    question.modelAnswer = this.extractField(section, 'modelAnswer');
    
    return question;
  }

  extractQuestion(text) {
    const patterns = this.rules.patterns.question;
    const match = text.match(patterns);
    return match ? match[1].trim() : '';
  }

  extractOptionDetails(text) {
    const options = [];
    const pattern = this.rules.patterns.options;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const option = match[2].trim();
      if (option) options.push({ label: match[1].toUpperCase().charCodeAt(0) - 65, option });
    }

    return options;
  }

  extractField(text, fieldName) {
    const pattern = this.rules.patterns[fieldName];
    if (!pattern) return '';
    
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  }

  parseQuestionType(type) {
    if (!type) return 'multiple-choice';
    const normalizedType = type.toLowerCase().trim();
    return PARSING_RULES.excel.typeMapping[normalizedType] || 'multiple-choice';
  }

  parseDifficulty(difficulty) {
    if (!difficulty) return 'medium';
    const normalizedDiff = difficulty.toLowerCase().trim();
    return PARSING_RULES.excel.difficultyMapping[normalizedDiff] || 'medium';
  }

  parsePoints(points) {
    if (!points) return 1;
    const parsed = parseInt(points);
    return isNaN(parsed) ? 1 : Math.max(1, parsed);
  }
}

// Main parser class
export class QuestionImportParser {
  constructor() {
    this.excelParser = new ExcelQuestionParser();
    this.wordParser = new WordQuestionParser();
  }

  async parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    let questions;
    switch (extension) {
      case 'xlsx':
        questions = await this.excelParser.parseFile(file);
        break;
      case 'docx':
        questions = await this.wordParser.parseFile(file);
        break;
      case 'txt':
        questions = this.wordParser.parseText(await file.text());
        break;
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
    
    return questions;
  }

  // Generate template files
  async generateExcelTemplate() {
    const templateData = [
      ['Question', 'Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Explanation', 'Points', 'Difficulty', 'Category'],
      [
        'What is the capital of France?',
        'Multiple Choice',
        'London',
        'Berlin',
        'Paris',
        'Madrid',
        'C',
        'Paris is the capital and largest city of France.',
        '1',
        'Easy',
        'Geography'
      ],
      [
        'The Earth is flat.',
        'True/False',
        'True',
        'False',
        '',
        '',
        'B',
        'The Earth is approximately spherical.',
        '1',
        'Easy',
        'Science'
      ]
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Questions').addRows(templateData);
    return workbook.xlsx.writeBuffer();
  }

  generateWordTemplate() {
    return `
Q1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid
Answer: C
Explanation: Paris is the capital and largest city of France.
Points: 1
Difficulty: Easy
Type: Multiple Choice
Category: Geography

Q2. The Earth is flat.
A) True
B) False
Answer: B
Explanation: The Earth is approximately spherical.
Points: 1
Difficulty: Easy
Type: True/False
Category: Science
    `.trim();
  }
}

export default QuestionImportParser;
