/**
 * Tests for inferMeal timezone logic in log.ts (line 383-397).
 *
 * Fix: use client-provided utcOffset to determine local hour for meal
 * inference instead of relying on server UTC time.
 *
 * inferMeal is not exported so we replicate the exact function here and
 * test it with a controllable clock via vi.setSystemTime.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Replicated verbatim from log.ts line 383-397
function inferMeal(utcOffset?: number): "breakfast" | "lunch" | "dinner" | "snack" {
  let hour: number;
  if (utcOffset !== undefined && Math.abs(utcOffset) <= 840) {
    const now = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const localMinutes = ((utcMinutes + utcOffset) % 1440 + 1440) % 1440;
    hour = localMinutes / 60;
  } else {
    hour = new Date().getUTCHours();
  }
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

// Freeze the clock at a known UTC time for deterministic tests.
// We pick 06:00 UTC so that:
//   offset=0   → 06:00 local → breakfast
//   offset=+480 (UTC+8) → 14:00 local → lunch
//   offset=-300 (UTC-5) → 01:00 local → breakfast
//   offset=+900 (UTC+15, invalid) → falls back to 06:00 UTC → breakfast
const FROZEN_UTC_HOUR = 6; // 06:00 UTC
const FROZEN_DATE = new Date(Date.UTC(2026, 2, 21, FROZEN_UTC_HOUR, 30, 0)); // 06:30 UTC

describe("inferMeal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // offset = 0 (UTC)
  // -------------------------------------------------------------------------
  it("offset=0: 06:30 UTC → breakfast", () => {
    expect(inferMeal(0)).toBe("breakfast");
  });

  // -------------------------------------------------------------------------
  // offset = +480 (UTC+8, e.g. China Standard Time)
  // 06:30 UTC + 480 min = 14:30 local → lunch
  // -------------------------------------------------------------------------
  it("offset=+480: 06:30 UTC → 14:30 local → lunch", () => {
    expect(inferMeal(480)).toBe("lunch");
  });

  // -------------------------------------------------------------------------
  // offset = -300 (UTC-5, e.g. Eastern Standard Time)
  // 06:30 UTC - 300 min = 01:30 local → breakfast
  // -------------------------------------------------------------------------
  it("offset=-300: 06:30 UTC → 01:30 local → breakfast", () => {
    expect(inferMeal(-300)).toBe("breakfast");
  });

  // -------------------------------------------------------------------------
  // No offset provided → falls back to UTC hour (6) → breakfast
  // -------------------------------------------------------------------------
  it("offset=undefined: falls back to UTC hour → breakfast", () => {
    expect(inferMeal(undefined)).toBe("breakfast");
  });

  // -------------------------------------------------------------------------
  // Out-of-range offset (> 840) → falls back to UTC hour → breakfast
  // -------------------------------------------------------------------------
  it("offset=900 (out of range): falls back to UTC hour → breakfast", () => {
    expect(inferMeal(900)).toBe("breakfast");
  });

  it("offset=-841 (out of range): falls back to UTC hour → breakfast", () => {
    expect(inferMeal(-841)).toBe("breakfast");
  });

  // -------------------------------------------------------------------------
  // Boundary: exactly 840 is valid (UTC+14, Kiribati)
  // 06:30 UTC + 840 min = 20:30 local → dinner
  // -------------------------------------------------------------------------
  it("offset=840 (max valid): 06:30 UTC → 20:30 local → dinner", () => {
    expect(inferMeal(840)).toBe("dinner");
  });

  it("offset=-840 (min valid): 06:30 UTC → 18:30 prior day? → wrap correctly", () => {
    // 06:30 UTC = 390 utcMinutes
    // 390 - 840 = -450 → ((-450 % 1440) + 1440) % 1440 = (-450 + 1440) = 990 → 16.5 hours → dinner
    expect(inferMeal(-840)).toBe("dinner");
  });

  // -------------------------------------------------------------------------
  // Boundary at hour 11: right at transition breakfast → lunch
  // Set clock to 10:59 UTC, offset=0 → breakfast (just under 11)
  // -------------------------------------------------------------------------
  it("boundary hour 11: 10:59 UTC offset=0 → breakfast", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 10, 59, 0)));
    expect(inferMeal(0)).toBe("breakfast");
  });

  it("boundary hour 11: 11:00 UTC offset=0 → lunch", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 11, 0, 0)));
    expect(inferMeal(0)).toBe("lunch");
  });

  // -------------------------------------------------------------------------
  // Boundary at hour 15: lunch → dinner
  // -------------------------------------------------------------------------
  it("boundary hour 15: 14:59 UTC offset=0 → lunch", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 14, 59, 0)));
    expect(inferMeal(0)).toBe("lunch");
  });

  it("boundary hour 15: 15:00 UTC offset=0 → dinner", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 15, 0, 0)));
    expect(inferMeal(0)).toBe("dinner");
  });

  // -------------------------------------------------------------------------
  // Boundary at hour 21: dinner → snack
  // -------------------------------------------------------------------------
  it("boundary hour 21: 20:59 UTC offset=0 → dinner", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 20, 59, 0)));
    expect(inferMeal(0)).toBe("dinner");
  });

  it("boundary hour 21: 21:00 UTC offset=0 → snack", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 21, 0, 0)));
    expect(inferMeal(0)).toBe("snack");
  });

  // -------------------------------------------------------------------------
  // Midnight wrap: negative modular arithmetic must not produce negative hour
  // UTC 01:00, offset=-180 (UTC-3) → 22:00 local → snack
  // -------------------------------------------------------------------------
  it("midnight wrap: 01:00 UTC offset=-180 → 22:00 local → snack", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 1, 0, 0)));
    expect(inferMeal(-180)).toBe("snack");
  });

  // -------------------------------------------------------------------------
  // Positive offset crossing midnight forward
  // UTC 23:00, offset=+180 (UTC+3) → 02:00 local next day → breakfast
  // -------------------------------------------------------------------------
  it("forward midnight wrap: 23:00 UTC offset=+180 → 02:00 local → breakfast", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 2, 21, 23, 0, 0)));
    expect(inferMeal(180)).toBe("breakfast");
  });
});
