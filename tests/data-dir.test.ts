import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDataDirectory } from "@/lib/data-dir";

describe("data directory", () => {
  it("keeps development data next to the project", () => {
    expect(resolveDataDirectory(undefined, "D:\\app")).toBe(path.join("D:\\app", "data"));
    expect(resolveDataDirectory("  ", "D:\\app")).toBe(path.join("D:\\app", "data"));
  });

  it("uses the folder the Windows package sets", () => {
    expect(resolveDataDirectory("D:\\Users\\Ana\\AppData\\Local\\ValorantStoreTracker", "D:\\zip\\app")).toBe(
      path.resolve("D:\\Users\\Ana\\AppData\\Local\\ValorantStoreTracker"),
    );
  });
});
