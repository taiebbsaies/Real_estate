import { describe, expect, it } from "vitest";
import { getGovernorateCoordinates } from "@/lib/constants/technician";
import { parseTechnicianDetails } from "./technician";

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of [value].flat()) data.append(key, item);
  }
  return data;
}

const valid = { skills: ["plomberie", "electricite"], city: "Sfax", phone: "+216 29 111 333" };

describe("parseTechnicianDetails", () => {
  it("accepts minimal details and leaves blank numbers undefined", () => {
    const result = parseTechnicianDetails(form({ ...valid, yearsExperience: "", hourlyRateDT: "" }));
    expect(result.success).toBe(true);
    expect(result.data?.yearsExperience).toBeUndefined();
    expect(result.data?.hourlyRateDT).toBeUndefined();
    expect(result.data?.isAvailable).toBe(false);
  });

  it("converts numbers and the availability checkbox", () => {
    const result = parseTechnicianDetails(
      form({ ...valid, yearsExperience: "5", hourlyRateDT: "45.5", isAvailable: "on" }),
    );
    expect(result.data).toMatchObject({ yearsExperience: 5, hourlyRateDT: 45.5, isAvailable: true });
  });

  it("requires a specialty, a known city and a valid phone", () => {
    const result = parseTechnicianDetails(form({ city: "Paris", phone: "abc" }));
    expect(Object.keys(result.error?.flatten().fieldErrors ?? {}).sort()).toEqual([
      "city",
      "phone",
      "skills",
    ]);
  });

  it("rejects unknown specialties and invalid numbers", () => {
    expect(parseTechnicianDetails(form({ ...valid, skills: ["hack"] })).success).toBe(false);
    expect(parseTechnicianDetails(form({ ...valid, yearsExperience: "-1" })).success).toBe(false);
    expect(parseTechnicianDetails(form({ ...valid, hourlyRateDT: "abc" })).success).toBe(false);
  });
});

describe("getGovernorateCoordinates", () => {
  it("returns [lng, lat] for a known city and null otherwise", () => {
    expect(getGovernorateCoordinates("Tunis")).toEqual([10.1815, 36.8065]);
    expect(getGovernorateCoordinates("Paris")).toBeNull();
  });
});
