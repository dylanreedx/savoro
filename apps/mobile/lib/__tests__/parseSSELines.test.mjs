/**
 * Unit tests for parseSSELines helper.
 * Runs via Node's built-in test runner (Node 18+):
 *   node --test lib/__tests__/parseSSELines.test.mjs
 *
 * The function is extracted inline here to avoid all RN/Expo imports.
 *
 * lastCompleteIdx is only advanced on blank-line terminators so that
 * partial events at chunk boundaries are correctly returned as remainder.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Inline copy of implementation (source of truth: chat.ts parseSSELines)
// ---------------------------------------------------------------------------
function parseSSELines(raw) {
  const events = [];
  const lines = raw.split("\n");
  let currentEvent;
  let currentData = [];
  let lastCompleteIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      currentData.push(line.slice(5).trim());
    } else if (line === "") {
      if (currentData.length > 0) {
        events.push({ event: currentEvent, data: currentData.join("\n") });
        currentEvent = undefined;
        currentData = [];
      }
      lastCompleteIdx = i;
    }
  }

  const remainder =
    lastCompleteIdx < lines.length - 1
      ? lines.slice(lastCompleteIdx + 1).join("\n")
      : "";

  return { events, remainder };
}

// ---------------------------------------------------------------------------
// Passing tests — correct behaviour
// ---------------------------------------------------------------------------

test("single text event with trailing blank line", () => {
  const raw = "event: text\ndata: hello\n\n";
  const { events, remainder } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "text");
  assert.equal(events[0].data, "hello");
  assert.equal(remainder, "");
});

test("single data-only event (no event: line)", () => {
  const raw = "data: hello world\n\n";
  const { events, remainder } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, undefined);
  assert.equal(events[0].data, "hello world");
  assert.equal(remainder, "");
});

test("multiple complete events in one chunk", () => {
  const raw =
    "event: text\ndata: first\n\nevent: text\ndata: second\n\nevent: done\ndata: {}\n\n";
  const { events, remainder } = parseSSELines(raw);
  assert.equal(events.length, 3);
  assert.equal(events[0].data, "first");
  assert.equal(events[1].data, "second");
  assert.equal(events[2].event, "done");
  assert.equal(events[2].data, "{}");
  assert.equal(remainder, "");
});

test("done event detected", () => {
  const raw = "event: done\ndata: {}\n\n";
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "done");
});

test("ui event with JSON data", () => {
  const payload = JSON.stringify({ type: "food_card", props: { name: "Chicken" } });
  const raw = `event: ui\ndata: ${payload}\n\n`;
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "ui");
  const parsed = JSON.parse(events[0].data);
  assert.equal(parsed.type, "food_card");
  assert.equal(parsed.props.name, "Chicken");
});

test("empty string input returns no events and empty remainder", () => {
  const { events, remainder } = parseSSELines("");
  assert.equal(events.length, 0);
  assert.equal(remainder, "");
});

test("blank lines only (no data) produce no events", () => {
  const { events, remainder } = parseSSELines("\n\n\n");
  assert.equal(events.length, 0);
  assert.equal(remainder, "");
});

test("data: value is trimmed of leading whitespace", () => {
  const raw = "data:  trimmed value\n\n";
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].data, "trimmed value");
});

test("event: value is trimmed of leading whitespace", () => {
  const raw = "event:  text\ndata: hi\n\n";
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "text");
});

test("multi-line data (multiple data: lines in one event)", () => {
  const raw = "event: text\ndata: line1\ndata: line2\n\n";
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].data, "line1\nline2");
});

test("[DONE] sentinel in data field is returned as-is", () => {
  const raw = "data: [DONE]\n\n";
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].data, "[DONE]");
});

test("CRLF line endings: trim() strips trailing \\r from event and data values", () => {
  const raw = "event: text\r\ndata: hello\r\n\r\n";
  const { events } = parseSSELines(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "text");
  assert.equal(events[0].data, "hello");
});

test("partial chunk — only an event: line with no following data", () => {
  // "event: text" is one line; lastCompleteIdx stays at -1 (no blank-line terminator),
  // so the entire line is returned as remainder for the next chunk to complete.
  const raw = "event: text";
  const { events, remainder } = parseSSELines(raw);
  assert.equal(events.length, 0);
  assert.equal(remainder, "event: text");
});

test("chunk boundary: first chunk ends with complete event, second chunk is separate", () => {
  const chunk1 = "event: text\ndata: first\n\n";
  const chunk2 = "event: text\ndata: second\n\n";

  const r1 = parseSSELines(chunk1);
  assert.equal(r1.events.length, 1);
  assert.equal(r1.events[0].data, "first");
  assert.equal(r1.remainder, "");

  const r2 = parseSSELines(r1.remainder + chunk2);
  assert.equal(r2.events.length, 1);
  assert.equal(r2.events[0].data, "second");
  assert.equal(r2.remainder, "");
});

// ---------------------------------------------------------------------------
// Tests for partial-event remainder logic
// ---------------------------------------------------------------------------

test("partial data: line at end of chunk is returned as remainder", () => {
  // Input: "event: text\ndata: partia"
  // No blank-line terminator, so lastCompleteIdx stays at -1 and the entire
  // chunk is returned as remainder for the next chunk to complete.
  const raw = "event: text\ndata: partia";
  const { events, remainder } = parseSSELines(raw);
  assert.equal(events.length, 0);
  assert.equal(remainder, "event: text\ndata: partia");
});

test("partial chunk split across data value — remainder preserves partial event", () => {
  // After first chunk, remainder contains the incomplete event lines.
  // Prepending remainder to chunk2 reconstructs the full SSE event.
  const chunk1 = "event: text\ndata: hel";
  const chunk2 = "lo world\n\n";

  const r1 = parseSSELines(chunk1);
  assert.equal(r1.events.length, 0);
  assert.equal(r1.remainder, "event: text\ndata: hel");

  // Concatenating remainder + chunk2 gives "event: text\ndata: hello world\n\n"
  const r2 = parseSSELines(r1.remainder + chunk2);
  assert.equal(r2.events.length, 1);
  assert.equal(r2.events[0].data, "hello world");
});

test("incomplete event at end of multi-event chunk is returned as remainder", () => {
  // Two complete events + one partial (no blank line terminator)
  const raw =
    "event: text\ndata: a\n\nevent: text\ndata: b\n\nevent: text\ndata: incompl";
  const { events, remainder } = parseSSELines(raw);
  // Completed events are correct
  assert.equal(events.length, 2);
  assert.equal(events[0].data, "a");
  assert.equal(events[1].data, "b");
  // Partial event is preserved as remainder
  assert.equal(remainder, "event: text\ndata: incompl");
});
