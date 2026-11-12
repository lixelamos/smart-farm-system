/** Split a MySQL data-only dump without breaking quoted semicolons. */
export function splitStatements(sql: string) {
  const result: string[] = [];
  let text = "";
  let quote = "";
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i],
      next = sql[i + 1];
    if (lineComment) {
      if (c === "\n") {
        lineComment = false;
        text += "\n";
      }
      continue;
    }
    if (blockComment) {
      if (c === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      text += c;
      if (c === "\\" && next) {
        text += next;
        i++;
      } else if (c === quote) {
        if (next === quote) {
          text += next;
          i++;
        } else quote = "";
      }
      continue;
    }
    if (
      (c === "-" && next === "-" && /\s/.test(sql[i + 2] ?? "")) ||
      c === "#"
    ) {
      lineComment = true;
      if (c === "-") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      text += c;
      continue;
    }
    if (c === ";") {
      if (text.trim()) result.push(text.trim());
      text = "";
    } else text += c;
  }
  if (quote || blockComment)
    throw new Error("The SQL dump ends inside a quoted value or comment.");
  if (text.trim()) result.push(text.trim());
  return result;
}
