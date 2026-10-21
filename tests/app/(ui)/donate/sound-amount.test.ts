import { expect, test } from "bun:test";
import type { ChangeEvent } from "react";
import { donationAmountChangeHandler } from "@/app/(ui)/donate/sound-amount";

function changeEvent(value: string) {
  return { currentTarget: { value } } as ChangeEvent<HTMLInputElement>;
}

test("lowering the amount clears a saved sound in the same change event", () => {
  for (const amount of ["9.99", "9", "0", "", "invalid"]) {
    const attachment = new File(["sound"], "sound.wav", { type: "audio/wav" });
    const values: { amount: string; sound: File | null } = {
      amount: "11",
      sound: attachment,
    };
    const calls: string[] = [];
    const event = changeEvent(amount);
    const handler = donationAmountChangeHandler(
      (received) => {
        expect(received).toBe(event);
        calls.push("amount");
        values.amount = received.currentTarget.value;
      },
      () => {
        calls.push("sound");
        values.sound = null;
      },
    );
    handler(event);
    expect(calls).toEqual(["amount", "sound"]);
    expect(values).toEqual({ amount, sound: null });
  }
});

test("eligible amount changes forward once without clearing sound", () => {
  let forwarded = 0;
  let cleared = 0;
  const handler = donationAmountChangeHandler(
    () => {
      forwarded++;
    },
    () => {
      cleared++;
    },
  );
  handler(changeEvent("10"));
  handler(changeEvent("10.01"));
  handler(changeEvent("100"));
  expect(forwarded).toBe(3);
  expect(cleared).toBe(0);
});

test("sound clearing does not require an amount callback", () => {
  let cleared = false;
  donationAmountChangeHandler(undefined, () => {
    cleared = true;
  })(changeEvent("9.99"));
  expect(cleared).toBe(true);
});
