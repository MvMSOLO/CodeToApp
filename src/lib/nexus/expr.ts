/** Tiny expression language for JSON schemas. No eval, no function calls. */

export function truthy(v: unknown): boolean {
  return !(v === false || v === 0 || v === "" || v == null);
}

export function lookup(path: string, scope: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let cur: unknown = scope[parts[0] ?? ""];
  for (let i = 1; i < parts.length; i += 1) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[parts[i] ?? ""];
  }
  return cur;
}

export function interpolate(input: string, scope: Record<string, unknown>): string {
  return input.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path: string) => {
    const v = lookup(path.trim(), scope);
    return v == null ? "" : String(v);
  });
}

export function evalExpr(input: string, scope: Record<string, unknown>): unknown {
  try {
    const p = new Parser(input, scope);
    const value = p.parseOr();
    return value;
  } catch {
    return undefined;
  }
}

class Parser {
  private i = 0;

  constructor(
    private readonly s: string,
    private readonly scope: Record<string, unknown>,
  ) {}

  private skip() {
    while (this.s[this.i] === " " || this.s[this.i] === "\n" || this.s[this.i] === "\t") this.i += 1;
  }

  private eat(op: string): boolean {
    this.skip();
    if (this.s.startsWith(op, this.i)) {
      this.i += op.length;
      return true;
    }
    return false;
  }

  parseOr(): unknown {
    let left = this.parseAnd();
    while (this.eat("||")) {
      const right = this.parseAnd();
      left = truthy(left) || truthy(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseCmp();
    while (this.eat("&&")) {
      const right = this.parseCmp();
      left = truthy(left) && truthy(right);
    }
    return left;
  }

  private parseCmp(): unknown {
    let left = this.parseAdd();
    for (;;) {
      this.skip();
      const op = ["==", "!=", "<=", ">=", "<", ">"].find((item) => this.s.startsWith(item, this.i));
      if (!op) break;
      this.i += op.length;
      const right = this.parseAdd();
      left = compare(op, left, right);
    }
    return left;
  }

  private parseAdd(): unknown {
    let left = this.parseMul();
    for (;;) {
      if (this.eat("+")) left = num(left) + num(this.parseMul());
      else if (this.eat("-")) left = num(left) - num(this.parseMul());
      else break;
    }
    return left;
  }

  private parseMul(): unknown {
    let left = this.parseUnary();
    for (;;) {
      if (this.eat("*")) left = num(left) * num(this.parseUnary());
      else if (this.eat("/")) {
        const d = num(this.parseUnary());
        left = d === 0 ? 0 : num(left) / d;
      } else if (this.eat("%")) {
        const d = num(this.parseUnary());
        left = d === 0 ? 0 : num(left) % d;
      } else break;
    }
    return left;
  }

  private parseUnary(): unknown {
    this.skip();
    if (this.eat("!")) return !truthy(this.parseUnary());
    if (this.eat("-")) return -num(this.parseUnary());
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    this.skip();
    const c = this.s[this.i] ?? "";
    if (c === "(") {
      this.i += 1;
      const v = this.parseOr();
      this.eat(")");
      return v;
    }
    if (c === "'" || c === '"') return this.parseString(c);
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+(?:\.[0-9]+)?/.exec(this.s.slice(this.i));
      if (!m) return undefined;
      this.i += m[0].length;
      return Number(m[0]);
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/.exec(this.s.slice(this.i));
    if (id) {
      this.i += id[0].length;
      if (id[0] === "true") return true;
      if (id[0] === "false") return false;
      if (id[0] === "null") return null;
      return lookup(id[0], this.scope);
    }
    return undefined;
  }

  private parseString(q: string): string {
    this.i += 1;
    let out = "";
    while (this.i < this.s.length && this.s[this.i] !== q) {
      if (this.s[this.i] === "\\" && this.i + 1 < this.s.length) {
        out += this.s[this.i + 1];
        this.i += 2;
        continue;
      }
      out += this.s[this.i];
      this.i += 1;
    }
    this.i += 1;
    return out;
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function compare(op: string, left: unknown, right: unknown): boolean {
  if (op === "==" || op === "!=") {
    const same =
      typeof left === "number" || typeof right === "number"
        ? Number(left) === Number(right)
        : String(left ?? "") === String(right ?? "");
    return op === "==" ? same : !same;
  }
  const l = num(left);
  const r = num(right);
  if (op === "<") return l < r;
  if (op === ">") return l > r;
  if (op === "<=") return l <= r;
  return l >= r;
}
