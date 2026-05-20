import { describe, it, expect } from "vitest";
import { isPhoneExchangeAllowed } from "@/lib/phonePrivacy";

describe("isPhoneExchangeAllowed", () => {
  it("allows phone on scheduled rides (planned)", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: "2026-06-01T10:00:00Z",
      })
    ).toBe(true);
  });

  it("blocks phone on immediate marketplace rides (guest)", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: null,
      })
    ).toBe(false);
  });

  it("blocks phone on immediate ride for a FREE client (non-exclusive)", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: null,
        clientIsExclusive: false,
        clientDriverId: null,
        currentDriverId: "driver-1",
      })
    ).toBe(false);
  });

  it("blocks phone on immediate ride if exclusive client belongs to ANOTHER driver", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: null,
        clientIsExclusive: true,
        clientDriverId: "driver-2",
        currentDriverId: "driver-1",
      })
    ).toBe(false);
  });

  it("allows phone on immediate ride when client is exclusive to THIS driver", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: null,
        clientIsExclusive: true,
        clientDriverId: "driver-1",
        currentDriverId: "driver-1",
      })
    ).toBe(true);
  });

  it("blocks phone if exclusive flag is true but no driver_id locked", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: null,
        clientIsExclusive: true,
        clientDriverId: null,
        currentDriverId: "driver-1",
      })
    ).toBe(false);
  });

  it("treats undefined scheduledDate as immediate (blocks)", () => {
    expect(
      isPhoneExchangeAllowed({
        scheduledDate: undefined,
        clientIsExclusive: false,
      })
    ).toBe(false);
  });
});
