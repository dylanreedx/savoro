import { describe, it, expect } from "vitest";
import { smartRoute } from "./smart-router";

describe("smartRoute", () => {
  it("routes simple food names to search", () => {
    const r = smartRoute("chicken breast");
    expect(r).toEqual({ routed: true, type: "search", query: "chicken breast" });
  });

  it("routes single-word foods to search", () => {
    const r = smartRoute("banana");
    expect(r).toEqual({ routed: true, type: "search", query: "banana" });
  });

  it("routes /recent command", () => {
    expect(smartRoute("/recent")).toEqual({ routed: true, type: "recent" });
  });

  it("routes /summary command", () => {
    expect(smartRoute("/summary")).toEqual({ routed: true, type: "summary" });
  });

  it("does NOT route questions", () => {
    expect(smartRoute("how many calories in an apple?")).toEqual({ routed: false });
  });

  it("does NOT route complex requests", () => {
    expect(smartRoute("what should I eat for lunch today given my remaining macros")).toEqual({
      routed: false,
    });
  });

  it("does NOT route messages with unit quantities", () => {
    expect(smartRoute("200g chicken")).toEqual({ routed: false });
  });

  it("does NOT route long messages", () => {
    expect(smartRoute("I had a large bowl of rice with chicken and vegetables")).toEqual({
      routed: false,
    });
  });

  it("routes 3-word food descriptions", () => {
    const r = smartRoute("greek yogurt plain");
    expect(r).toEqual({ routed: true, type: "search", query: "greek yogurt plain" });
  });

  it("handles whitespace", () => {
    const r = smartRoute("  rice  ");
    expect(r).toEqual({ routed: true, type: "search", query: "rice" });
  });

  it("routes donut to search (regression: 'do' substring)", () => {
    expect(smartRoute("donut")).toEqual({ routed: true, type: "search", query: "donut" });
  });

  it("routes canola oil to search (regression: 'can' substring)", () => {
    expect(smartRoute("canola oil")).toEqual({ routed: true, type: "search", query: "canola oil" });
  });

  it("routes 2 eggs to search (simple food entry)", () => {
    expect(smartRoute("2 eggs")).toEqual({ routed: true, type: "search", query: "2 eggs" });
  });

  it("routes island mango to search (regression: 'is' substring)", () => {
    expect(smartRoute("island mango")).toEqual({ routed: true, type: "search", query: "island mango" });
  });

  it("does NOT route long question about protein", () => {
    expect(smartRoute("what has more protein eggs or chicken")).toEqual({ routed: false });
  });

  // Edge cases from design spec
  it("routes arugula to search (regression: 'are' substring)", () => {
    expect(smartRoute("arugula")).toEqual({ routed: true, type: "search", query: "arugula" });
  });

  it("does NOT route standalone 'how'", () => {
    expect(smartRoute("how")).toEqual({ routed: false });
  });

  it("does NOT route standalone 'what'", () => {
    expect(smartRoute("what")).toEqual({ routed: false });
  });

  it("does NOT route 'is this healthy'", () => {
    expect(smartRoute("is this healthy")).toEqual({ routed: false });
  });

  it("does NOT route 'can I eat this'", () => {
    expect(smartRoute("can I eat this")).toEqual({ routed: false });
  });

  it("does NOT route 'do I have enough protein'", () => {
    expect(smartRoute("do I have enough protein")).toEqual({ routed: false });
  });

  it("routes 5-word food at exactly the word limit", () => {
    expect(smartRoute("whole grain brown rice bowl")).toEqual({
      routed: true,
      type: "search",
      query: "whole grain brown rice bowl",
    });
  });

  it("does NOT route 6-word message (over limit)", () => {
    expect(smartRoute("a b c d e f")).toEqual({ routed: false });
  });

  it("routes /recent with extra whitespace trimmed", () => {
    expect(smartRoute("  /recent  ")).toEqual({ routed: true, type: "recent" });
  });

  it("routes /summary with extra whitespace trimmed", () => {
    expect(smartRoute("  /summary  ")).toEqual({ routed: true, type: "summary" });
  });

  it("does NOT route message with oz units", () => {
    expect(smartRoute("6oz steak")).toEqual({ routed: false });
  });

  it("does NOT route message with cup units", () => {
    expect(smartRoute("1 cup oats")).toEqual({ routed: false });
  });
});
