import type { ChangeEventHandler } from "react";
import { isSoundEligible } from "./sound-audio";

export function donationAmountChangeHandler(
  onChange: ChangeEventHandler<HTMLInputElement> | undefined,
  clearSound: () => void,
): ChangeEventHandler<HTMLInputElement> {
  return (event) => {
    const amount = event.currentTarget.value;
    onChange?.(event);
    if (!isSoundEligible(amount)) clearSound();
  };
}
