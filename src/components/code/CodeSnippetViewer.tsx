"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";

interface CodeSnippetViewerProps {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
}

export default function CodeSnippetViewer({
  code,
  language = "typescript",
  title,
  maxHeight = "300px",
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="glass-strong rounded-xl overflow-hidden border border-border neon-card-border group">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-black/30">
        <div className="flex items-center gap-3">
          {/* Language badge */}
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-md">
            {language}
          </span>
          {/* Title */}
          {title && (
            <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[200px]">
              {title}
            </span>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono text-muted-foreground/60 hover:text-cyan-400 hover:bg-cyan-400/10 border border-transparent hover:border-cyan-400/20 transition-all duration-200"
          aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-emerald-400"
              >
                <Check size={13} />
                <span className="text-[10px]">Copied!</span>
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Copy size={13} />
                <span className="text-[10px] hidden sm:inline">Copy</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Code area */}
      <div
        className="relative overflow-auto scan-overlay"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={index}
                className="hover:bg-white/[0.02] transition-colors duration-100"
              >
                {/* Line number */}
                <td className="px-3 py-0 text-right select-none align-top w-12 shrink-0">
                  <span className="text-[11px] font-mono text-muted-foreground/25 leading-6">
                    {index + 1}
                  </span>
                </td>
                {/* Code content */}
                <td className="px-3 py-0 align-top">
                  <code className="text-[13px] font-mono leading-6 text-foreground/85 whitespace-pre">
                    {highlightSyntax(line)}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Scan line overlay (CSS handles the effect via scan-overlay class) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-400/[0.02] to-transparent" />
      </div>

      {/* Bottom info bar */}
      <div className="px-4 py-1.5 border-t border-border bg-black/20 flex items-center justify-between">
        <span className="text-[9px] font-mono text-muted-foreground/30">
          {lines.length} lines
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/30">
          UTF-8
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple keyword-based syntax highlighting                            */
/*  Produces JSX spans with cyberpunk-matching colors.                 */
/* ------------------------------------------------------------------ */

function highlightSyntax(line: string): React.ReactNode {
  // Keywords that should be colored
  const keywords =
    /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|throw|finally|typeof|instanceof|in|of|void|null|undefined|true|false|interface|type|enum|implements|readonly|private|public|protected|static|yield|super|as|is|keyof|infer|never)\b/g;

  // Types and built-ins
  const types =
    /\b(string|number|boolean|object|any|unknown|never|void|Array|Promise|Record|Map|Set|Date|RegExp|Error|console|window|document|Math|JSON|Number|String|Boolean|Object)\b/g;

  // Strings (single, double, backtick)
  const stringRegex =
    /(&quot;[^&]*&quot;|&#39;[^&]*&#39;|`[^`]*`|"[^"]*"|'[^']*')/g;

  // Comments
  const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;

  // Numbers
  const numberRegex = /\b(\d+\.?\d*)\b/g;

  // We process line by matching tokens left to right
  const tokens: { start: number; end: number; type: string }[] = [];

  let match;
  const addMatch = (regex: RegExp, type: string) => {
    const re = new RegExp(regex.source, regex.flags);
    while ((match = re.exec(line)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
      });
    }
  };

  addMatch(commentRegex, "comment");
  addMatch(stringRegex, "string");
  addMatch(keywords, "keyword");
  addMatch(types, "type");
  addMatch(numberRegex, "number");

  // Sort by start position and merge overlapping
  tokens.sort((a, b) => a.start - b.start);

  // Remove overlapping (later types take precedence)
  const merged: typeof tokens = [];
  for (const token of tokens) {
    if (merged.length > 0 && token.start < merged[merged.length - 1].end) {
      // Keep the later one if it starts at the same position
      if (token.start === merged[merged.length - 1].start) {
        merged[merged.length - 1] = token;
      }
      // Otherwise skip overlapping
    } else {
      merged.push(token);
    }
  }

  // If no tokens, return plain text
  if (merged.length === 0) return line;

  // Build JSX with colored spans
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  const colorMap: Record<string, string> = {
    comment: "text-muted-foreground/40 italic",
    string: "text-[#00ff88]",
    keyword: "text-[#7b61ff]",
    type: "text-cyan-400",
    number: "text-[#ffab00]",
  };

  for (const token of merged) {
    // Text before this token
    if (token.start > lastIndex) {
      result.push(line.slice(lastIndex, token.start));
    }

    // Colored token
    result.push(
      <span key={`${token.start}-${token.end}`} className={colorMap[token.type]}>
        {line.slice(token.start, token.end)}
      </span>,
    );

    lastIndex = token.end;
  }

  // Remaining text after last token
  if (lastIndex < line.length) {
    result.push(line.slice(lastIndex));
  }

  return result;
}
