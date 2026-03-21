/**
 * Smart router: detect simple food descriptions that can bypass the LLM
 * and go directly to food search.
 */

/**
 * Simple patterns that indicate a direct food search:
 * - Short messages (1-5 words) without question marks
 * - Common food description patterns
 */
const COMMAND_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /^\/recent$/i, type: "recent" },
  { pattern: /^\/summary$/i, type: "summary" },
];

const QUESTION_INDICATORS = /\?|\bhow\b|\bwhat\b|\bwhy\b|\bwhen\b|\bwhich\b|\bshould\b|\bcan\b|\bdo\b|\bis\b|\bare\b|\bwill\b/i;

const MAX_SIMPLE_WORDS = 5;

export type SmartRouteResult =
  | { routed: false }
  | { routed: true; type: "search"; query: string }
  | { routed: true; type: "recent" }
  | { routed: true; type: "summary" };

export function smartRoute(message: string): SmartRouteResult {
  const trimmed = message.trim();

  // Check command patterns first
  for (const { pattern, type } of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { routed: true, type } as SmartRouteResult;
    }
  }

  // Skip if it looks like a question or complex request
  if (QUESTION_INDICATORS.test(trimmed)) {
    return { routed: false };
  }

  // Skip if too long — probably a natural language request
  const words = trimmed.split(/\s+/);
  if (words.length > MAX_SIMPLE_WORDS) {
    return { routed: false };
  }

  // Skip if it contains numbers with units (e.g., "200g chicken") — let LLM parse quantity
  if (/\d+\s*(g|oz|ml|lb|cup|tbsp|tsp)\b/i.test(trimmed)) {
    return { routed: false };
  }

  // Short, non-question message — treat as food search
  if (words.length >= 1 && words.length <= MAX_SIMPLE_WORDS) {
    return { routed: true, type: "search", query: trimmed };
  }

  return { routed: false };
}
