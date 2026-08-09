type Operator = "+" | "-" | "*" | "/";
type Token = number | Operator;

const PRECEDENCE: Record<Operator, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2
};

export function calculateMoneyExpression(expression: string): number | null {
  const tokens = tokenize(expression);
  if (!tokens.length) return null;

  const output: Token[] = [];
  const operators: Operator[] = [];
  for (const token of tokens) {
    if (typeof token === "number") {
      output.push(token);
      continue;
    }
    while (operators.length > 0 && PRECEDENCE[operators[operators.length - 1]] >= PRECEDENCE[token]) {
      output.push(operators.pop() as Operator);
    }
    operators.push(token);
  }
  while (operators.length > 0) output.push(operators.pop() as Operator);

  const stack: number[] = [];
  for (const token of output) {
    if (typeof token === "number") {
      stack.push(token);
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) return null;
    if (token === "/" && right === 0) return null;
    stack.push(applyOperator(left, right, token));
  }

  const result = stack.length === 1 ? stack[0] : null;
  return result !== null && Number.isFinite(result) ? normalizeMoneyResult(result) : null;
}

export function formatCalculatorNumber(value: number) {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(normalizeMoneyResult(value));
}

function tokenize(expression: string): Token[] {
  const clean = expression.replace(/,/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s/g, "");
  const tokens: Token[] = [];
  let index = 0;

  while (index < clean.length) {
    const char = clean[index];
    const previous = tokens[tokens.length - 1];
    const unarySign = (char === "-" || char === "+") && (tokens.length === 0 || typeof previous !== "number");
    if (isDigit(char) || char === "." || unarySign) {
      const start = index;
      index += unarySign ? 1 : 0;
      let dotCount = 0;
      while (index < clean.length && (isDigit(clean[index]) || clean[index] === ".")) {
        if (clean[index] === ".") dotCount += 1;
        if (dotCount > 1) return [];
        index += 1;
      }
      const value = Number(clean.slice(start, index));
      if (!Number.isFinite(value)) return [];
      tokens.push(value);
      continue;
    }
    if (isOperator(char)) {
      if (typeof previous !== "number") return [];
      tokens.push(char);
      index += 1;
      continue;
    }
    return [];
  }

  return typeof tokens[tokens.length - 1] === "number" ? tokens : [];
}

function applyOperator(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "*") return left * right;
  return left / right;
}

function isDigit(char: string) {
  return char >= "0" && char <= "9";
}

function isOperator(char: string): char is Operator {
  return char === "+" || char === "-" || char === "*" || char === "/";
}

function normalizeMoneyResult(value: number) {
  return Number(value.toFixed(10));
}
