// Spreadsheet Formula Evaluator Engine
// Supports Excel-like expressions: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, ROUND, ABS, IF, arithmetic operators, and cell references.

export function colIndexToLetter(col: number): string {
  let temp = col;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function letterToColIndex(letter: string): number {
  const upper = letter.toUpperCase();
  let col = 0;
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

export function parseCellId(cellId: string): { col: number; row: number; colLetter: string } | null {
  const match = cellId.trim().toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const colLetter = match[1];
  const row = parseInt(match[2], 10);
  const col = letterToColIndex(colLetter);
  return { col, row, colLetter };
}

export function formatCellId(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row}`;
}

export function expandCellRange(rangeStr: string): string[] {
  const parts = rangeStr.trim().toUpperCase().split(':');
  if (parts.length === 1) {
    const single = parseCellId(parts[0]);
    return single ? [formatCellId(single.col, single.row)] : [];
  }
  if (parts.length !== 2) return [];

  const start = parseCellId(parts[0]);
  const end = parseCellId(parts[1]);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const result: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      result.push(formatCellId(c, r));
    }
  }
  return result;
}

export interface FormulaContext {
  getCellValue: (cellId: string) => string | number;
  availableCash?: number;
  maxDepth?: number;
}

/**
 * Evaluates an Excel formula or raw text.
 * If rawValue starts with '=', evaluates as formula.
 * Otherwise returns parsed number or string.
 */
export function evaluateCell(
  rawValue: string,
  context: FormulaContext,
  visited: Set<string> = new Set()
): { value: number | string; isNumeric: boolean; error?: string } {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return { value: '', isNumeric: false };
  }

  const str = String(rawValue).trim();
  if (!str.startsWith('=')) {
    // Check if numeric
    const cleanNum = str.replace(/[Rp\s\.]/g, '').replace(',', '.');
    const parsed = Number(cleanNum);
    if (!isNaN(parsed) && str !== '' && !isNaN(Number(str))) {
      return { value: Number(str), isNumeric: true };
    }
    return { value: rawValue, isNumeric: false };
  }

  // Formula evaluation
  const formula = str.substring(1).trim();

  try {
    const result = evaluateExpression(formula, context, visited);
    return {
      value: result,
      isNumeric: typeof result === 'number' && !isNaN(result),
    };
  } catch (err: any) {
    return {
      value: err?.message || '#ERROR!',
      isNumeric: false,
      error: err?.message || '#ERROR!',
    };
  }
}

/**
 * Internal expression evaluator supporting standard functions and basic math
 */
function evaluateExpression(
  expr: string,
  context: FormulaContext,
  visited: Set<string>
): number | string {
  let e = expr.trim();
  if (!e) return 0;

  // Handle String Literals e.g. "Text"
  if (e.startsWith('"') && e.endsWith('"') && e.length >= 2) {
    return e.substring(1, e.length - 1);
  }

  // System aliases
  if (e.toUpperCase() === 'TOTAL_KAS' || e.toUpperCase() === 'KAS_NERACA' || e.toUpperCase() === 'KAS') {
    return context.availableCash ?? 0;
  }

  // Check for Excel Functions e.g. SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, ROUND, ABS
  const funcMatch = e.match(/^([A-Z_]+)\s*\((.*)\)$/i);
  if (funcMatch) {
    const funcName = funcMatch[1].toUpperCase();
    const argsString = funcMatch[2];
    const args = splitArgs(argsString);

    switch (funcName) {
      case 'SUM': {
        const numbers = extractNumbersFromArgs(args, context, visited);
        return numbers.reduce((acc, val) => acc + val, 0);
      }
      case 'AVERAGE':
      case 'RATA': {
        const numbers = extractNumbersFromArgs(args, context, visited);
        if (numbers.length === 0) return 0;
        return numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
      }
      case 'MIN': {
        const numbers = extractNumbersFromArgs(args, context, visited);
        return numbers.length === 0 ? 0 : Math.min(...numbers);
      }
      case 'MAX': {
        const numbers = extractNumbersFromArgs(args, context, visited);
        return numbers.length === 0 ? 0 : Math.max(...numbers);
      }
      case 'COUNT': {
        const numbers = extractNumbersFromArgs(args, context, visited);
        return numbers.length;
      }
      case 'COUNTA': {
        const items = extractAllItemsFromArgs(args, context, visited);
        return items.filter(it => it !== '' && it !== null && it !== undefined).length;
      }
      case 'ROUND': {
        if (args.length === 0) return 0;
        const val = toNumeric(evaluateExpression(args[0], context, visited));
        const dec = args[1] ? toNumeric(evaluateExpression(args[1], context, visited)) : 0;
        const factor = Math.pow(10, dec);
        return Math.round(val * factor) / factor;
      }
      case 'ABS': {
        if (args.length === 0) return 0;
        const val = toNumeric(evaluateExpression(args[0], context, visited));
        return Math.abs(val);
      }
      case 'SQRT': {
        if (args.length === 0) return 0;
        const val = toNumeric(evaluateExpression(args[0], context, visited));
        if (val < 0) return '#NUM!';
        return Math.sqrt(val);
      }
      case 'PRODUCT': {
        const numbers = extractNumbersFromArgs(args, context, visited);
        if (numbers.length === 0) return 0;
        return numbers.reduce((acc, val) => acc * val, 1);
      }
      case 'IF': {
        // IF(condition, trueVal, falseVal)
        if (args.length < 2) return '#VALUE!';
        const conditionStr = args[0];
        const isTrue = evaluateCondition(conditionStr, context, visited);
        if (isTrue) {
          return evaluateExpression(args[1], context, visited);
        } else {
          return args[2] ? evaluateExpression(args[2], context, visited) : '';
        }
      }
      default:
        break;
    }
  }

  // Single Cell Reference check e.g. "B3"
  const cellMatch = parseCellId(e);
  if (cellMatch) {
    const upperId = formatCellId(cellMatch.col, cellMatch.row);
    if (visited.has(upperId)) {
      throw new Error('#CYCLE!');
    }
    const nextVisited = new Set(visited);
    nextVisited.add(upperId);
    if (nextVisited.size > (context.maxDepth || 20)) {
      throw new Error('#CYCLE!');
    }
    const rawTarget = context.getCellValue(upperId);
    const evaluated = evaluateCell(String(rawTarget), context, nextVisited);
    return evaluated.value;
  }

  // Try parsing arithmetic expressions e.g. "B3-B2", "B2*0.1", "A1+B1/2", "(B2+B3)*2"
  return parseArithmetic(e, context, visited);
}

/**
 * Splits comma-separated arguments at top level (not inside parentheses or quotes)
 */
function splitArgs(argStr: string): string[] {
  const results: string[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < argStr.length; i++) {
    const char = argStr[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && char === '(') {
      depth++;
      current += char;
    } else if (!inQuotes && char === ')') {
      depth--;
      current += char;
    } else if (!inQuotes && (char === ',' || char === ';') && depth === 0) {
      results.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    results.push(current.trim());
  }
  return results;
}

function extractAllItemsFromArgs(args: string[], context: FormulaContext, visited: Set<string>): (string | number)[] {
  const items: (string | number)[] = [];
  for (const arg of args) {
    if (arg.includes(':')) {
      const cellIds = expandCellRange(arg);
      for (const id of cellIds) {
        if (!visited.has(id)) {
          const nextVisited = new Set(visited);
          nextVisited.add(id);
          const val = evaluateCell(String(context.getCellValue(id)), context, nextVisited).value;
          items.push(val);
        }
      }
    } else {
      const val = evaluateExpression(arg, context, visited);
      items.push(val);
    }
  }
  return items;
}

function extractNumbersFromArgs(args: string[], context: FormulaContext, visited: Set<string>): number[] {
  const allItems = extractAllItemsFromArgs(args, context, visited);
  const numbers: number[] = [];
  for (const item of allItems) {
    const num = toNumeric(item);
    if (!isNaN(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

export function toNumeric(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  if (typeof val === 'string') {
    // If it is an error string like #VALUE! or #REF!
    if (val.startsWith('#')) return NaN;
    const clean = val.replace(/[Rp\s\.]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function evaluateCondition(condStr: string, context: FormulaContext, visited: Set<string>): boolean {
  const ops = ['<=', '>=', '<>', '!=', '=', '<', '>'];
  for (const op of ops) {
    const idx = condStr.indexOf(op);
    if (idx !== -1) {
      const leftExpr = condStr.substring(0, idx).trim();
      const rightExpr = condStr.substring(idx + op.length).trim();
      const leftVal = evaluateExpression(leftExpr, context, visited);
      const rightVal = evaluateExpression(rightExpr, context, visited);

      const leftNum = toNumeric(leftVal);
      const rightNum = toNumeric(rightVal);
      const bothNumeric = !isNaN(leftNum) && !isNaN(rightNum) && typeof leftVal !== 'string' && typeof rightVal !== 'string';

      switch (op) {
        case '=':
          return bothNumeric ? leftNum === rightNum : String(leftVal).toLowerCase() === String(rightVal).toLowerCase();
        case '<>':
        case '!=':
          return bothNumeric ? leftNum !== rightNum : String(leftVal).toLowerCase() !== String(rightVal).toLowerCase();
        case '<':
          return bothNumeric ? leftNum < rightNum : String(leftVal) < String(rightVal);
        case '<=':
          return bothNumeric ? leftNum <= rightNum : String(leftVal) <= String(rightVal);
        case '>':
          return bothNumeric ? leftNum > rightNum : String(leftVal) > String(rightVal);
        case '>=':
          return bothNumeric ? leftNum >= rightNum : String(leftVal) >= String(rightVal);
      }
    }
  }

  // Boolean or truthy number
  const val = evaluateExpression(condStr, context, visited);
  return Boolean(val && val !== 0 && val !== '0' && val !== 'FALSE');
}

/**
 * Safe parser for mathematical expressions with cell references
 */
function parseArithmetic(expr: string, context: FormulaContext, visited: Set<string>): number | string {
  // Replace recognized cell identifiers e.g. B3, A1, AA10, TOTAL_KAS with their evaluated numeric values
  // We use word boundaries and avoid replacing letters inside quotes
  let prepared = expr;

  // Replace system keywords first
  prepared = prepared.replace(/\b(TOTAL_KAS|KAS_NERACA|KAS)\b/gi, () => {
    return String(context.availableCash ?? 0);
  });

  // Match cell references e.g. B2, C10, A1
  prepared = prepared.replace(/\b([A-Z]+[0-9]+)\b/gi, (match) => {
    const cellId = match.toUpperCase();
    if (visited.has(cellId)) {
      throw new Error('#CYCLE!');
    }
    const nextVisited = new Set(visited);
    nextVisited.add(cellId);
    const raw = context.getCellValue(cellId);
    const evalRes = evaluateCell(String(raw), context, nextVisited);
    const num = toNumeric(evalRes.value);
    if (isNaN(num)) {
      return '0';
    }
    return String(num);
  });

  // Calculate percentage: e.g. "10%" -> "0.10"
  prepared = prepared.replace(/([0-9.]+)\s*%/g, '($1/100)');

  // Evaluate arithmetic using token-based shunting-yard or safe recursive descent
  try {
    const result = evaluateMathString(prepared);
    return isNaN(result) ? '#VALUE!' : result;
  } catch (err: any) {
    return err?.message || '#ERROR!';
  }
}

/**
 * Safe arithmetic evaluator without using eval()
 */
function evaluateMathString(expr: string): number {
  const tokens = tokenizeMath(expr);
  let pos = 0;

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === '+' || op === '-') {
        pos++;
        const nextTerm = parseTerm();
        result = op === '+' ? result + nextTerm : result - nextTerm;
      } else {
        break;
      }
    }
    return result;
  }

  function parseTerm(): number {
    let result = parsePower();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === '*' || op === '/') {
        pos++;
        const nextFactor = parsePower();
        if (op === '/') {
          if (nextFactor === 0) throw new Error('#DIV/0!');
          result = result / nextFactor;
        } else {
          result = result * nextFactor;
        }
      } else {
        break;
      }
    }
    return result;
  }

  function parsePower(): number {
    let result = parseFactor();
    if (pos < tokens.length && tokens[pos] === '^') {
      pos++;
      const nextExp = parsePower();
      result = Math.pow(result, nextExp);
    }
    return result;
  }

  function parseFactor(): number {
    if (pos >= tokens.length) return 0;
    const token = tokens[pos];

    if (token === '+') {
      pos++;
      return parseFactor();
    }
    if (token === '-') {
      pos++;
      return -parseFactor();
    }
    if (token === '(') {
      pos++;
      const val = parseExpression();
      if (pos < tokens.length && tokens[pos] === ')') {
        pos++;
      }
      return val;
    }

    const num = parseFloat(token);
    pos++;
    return isNaN(num) ? 0 : num;
  }

  return parseExpression();
}

function tokenizeMath(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else if (['+', '-', '*', '/', '^', '(', ')'].includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}
