import * as XLSX from 'xlsx';
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
      category: ['category', 'subject', 'topic', 'chapter', 'section']
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
      type: /(?:Type|Format)[\s:]*([^\n]+)/i
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const questions = this.parseWorkbook(workbook);
          resolve(questions);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  parseWorkbook(workbook) {
    const questions = [];
    const sheetNames = workbook.SheetNames;
    
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length > 0) {
        const parsedQuestions = this.parseSheetData(jsonData);
        questions.push(...parsedQuestions);
      }
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
    
    return columnMap;
  }

  parseRow(row, columnMap) {
    const question = {
      question: this.getCellValue(row, columnMap.question),
      type: this.parseQuestionType(this.getCellValue(row, columnMap.type)),
      options: this.parseOptions(row, columnMap),
      correctAnswer: this.getCellValue(row, columnMap.correctAnswer),
      explanation: this.getCellValue(row, columnMap.explanation),
      points: this.parsePoints(this.getCellValue(row, columnMap.points)),
      difficulty: this.parseDifficulty(this.getCellValue(row, columnMap.difficulty)),
      category: this.getCellValue(row, columnMap.category)
    };
    
    return question;
  }

  parseOptions(row, columnMap) {
    const options = [];
    
    // Try to find options in separate columns
    for (let i = 0; i < 10; i++) {
      const optionKey = `option_${String.fromCharCode(97 + i)}`; // a, b, c, d, etc.
      const value = this.getCellValue(row, columnMap[optionKey]);
      if (value) {
        options.push(value);
      }
    }
    
    // If no separate option columns, try to parse from options column
    if (options.length === 0 && columnMap.options !== undefined) {
      const optionsText = this.getCellValue(row, columnMap.options);
      if (optionsText) {
        return this.parseOptionsFromText(optionsText);
      }
    }
    
    return options;
  }

  parseOptionsFromText(text) {
    // Flexible parsing of options from text
    const patterns = [
      /([A-D])[\.\)\-\s]+([^\n]+)/g,
      /([A-D])[\s]+([^\n]+)/g,
      /([A-D])[\.\)]([^\n]+)/g
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        return matches.map(match => match[2].trim());
      }
    }
    
    // Fallback: split by common separators
    return text.split(/[;\n]/).map(opt => opt.trim()).filter(opt => opt.length > 0);
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
      category: ''
    };
    
    // Parse question text
    question.question = this.extractQuestion(section);
    
    // Parse options
    question.options = this.extractOptions(section);
    
    // Parse other fields
    question.correctAnswer = this.extractField(section, 'correctAnswer');
    question.explanation = this.extractField(section, 'explanation');
    question.points = this.parsePoints(this.extractField(section, 'points'));
    question.difficulty = this.parseDifficulty(this.extractField(section, 'difficulty'));
    question.type = this.parseQuestionType(this.extractField(section, 'type'));
    
    return question;
  }

  extractQuestion(text) {
    const patterns = this.rules.patterns.question;
    const match = text.match(patterns);
    return match ? match[1].trim() : '';
  }

  extractOptions(text) {
    const options = [];
    const pattern = this.rules.patterns.options;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      options.push(match[2].trim());
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
    
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return await this.excelParser.parseFile(file);
      case 'docx':
      case 'doc':
        return await this.wordParser.parseFile(file);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  // Generate template files
  generateExcelTemplate() {
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

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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
