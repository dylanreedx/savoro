import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./system-prompt";

describe("buildSystemPrompt", () => {
  it("includes user goals when set", () => {
    const prompt = buildSystemPrompt({
      goals: { calories: 2000, protein: 150, carb: 200, fat: 70 },
      todayMacros: { calories: 500, protein: 40, carb: 60, fat: 20 },
      recentFoods: ["chicken breast", "rice"],
    });

    expect(prompt).toContain("2000 cal");
    expect(prompt).toContain("150g protein");
    expect(prompt).toContain("500 cal");
    expect(prompt).toContain("chicken breast");
  });

  it("handles no goals", () => {
    const prompt = buildSystemPrompt({
      goals: null,
      todayMacros: { calories: 0, protein: 0, carb: 0, fat: 0 },
      recentFoods: [],
    });

    expect(prompt).toContain("hasn't set macro goals");
    expect(prompt).toContain("Nothing logged today");
  });

  it("includes agent personality", () => {
    const prompt = buildSystemPrompt({
      goals: null,
      todayMacros: { calories: 0, protein: 0, carb: 0, fat: 0 },
      recentFoods: [],
    });

    expect(prompt).toContain("concise");
    expect(prompt).toContain("Never lecture");
  });

  it("includes date context and get_date_log instructions", () => {
    const prompt = buildSystemPrompt({
      goals: null,
      todayMacros: { calories: 0, protein: 0, carb: 0, fat: 0 },
      recentFoods: [],
    });

    expect(prompt).toContain("Today is");
    expect(prompt).toContain("Yesterday was");
    expect(prompt).toContain("get_date_log");
    expect(prompt).toContain("same as yesterday");
  });
});
