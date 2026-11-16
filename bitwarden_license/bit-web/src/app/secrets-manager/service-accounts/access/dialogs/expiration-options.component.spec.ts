import { DatePipe } from "@angular/common";
import { FormControl } from "@angular/forms";
import { mock } from "jest-mock-extended";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { ExpirationOptionsComponent } from "./expiration-options.component";

describe("ExpirationOptionsComponent", () => {
  let component: ExpirationOptionsComponent;

  const i18nService = mock<I18nService>();
  i18nService.t.mockImplementation((id: string) => id);

  const nextYear = new Date().getFullYear() + 1;
  const futureDate = `${nextYear}-06-15T10:30`;

  beforeEach(() => {
    component = new ExpirationOptionsComponent(new DatePipe("en-US"), i18nService);
  });

  const validate = (value: unknown) => component.expiresInFutureValidator()(new FormControl(value));

  describe("expiresInFutureValidator", () => {
    it("accepts a future date with a 4-digit year", () => {
      expect(validate(futureDate)).toBeNull();
    });

    it("accepts a value that includes seconds", () => {
      expect(validate(`${futureDate}:45`)).toBeNull();
    });

    it("rejects a year with more than 4 digits", () => {
      expect(validate(`1${futureDate}`)).toEqual({
        ValidationError: { message: "expirationDateError" },
      });
    });

    it("rejects a year with fewer than 4 digits", () => {
      expect(validate("999-06-15T10:30")).not.toBeNull();
    });

    it("rejects a date in the past", () => {
      expect(validate("2000-01-01T00:00")).not.toBeNull();
    });

    it("rejects an empty or non-string value", () => {
      expect(validate("")).not.toBeNull();
      expect(validate(null)).not.toBeNull();
      expect(validate(new Date())).not.toBeNull();
    });
  });

  describe("syncExpireDateTime", () => {
    const control = () => component["form"].controls.expireDateTime;

    const fakeInput = (value: string, validity: Partial<ValidityState> = {}) =>
      ({
        value,
        validity: { badInput: false, rangeOverflow: false, rangeUnderflow: false, ...validity },
      }) as unknown as HTMLInputElement;

    const fire = (type: string, target: HTMLInputElement) =>
      component["syncExpireDateTime"]({ type, target } as unknown as Event);

    it("pushes the element's current value into the control", () => {
      fire("input", fakeInput(futureDate));

      expect(control().value).toBe(futureDate);
      expect(control().valid).toBe(true);
    });

    it("marks the control invalid when the browser reports bad input", () => {
      // Safari keeps the last good value while the user types an unusable one, so the value
      // alone looks fine; the validity flag is what tells us it is not.
      fire("input", fakeInput(futureDate, { badInput: true }));

      expect(control().valid).toBe(false);
    });

    it("marks the control invalid when the browser reports the value is above max", () => {
      fire("change", fakeInput(futureDate, { rangeOverflow: true }));

      expect(control().valid).toBe(false);
    });

    it("recovers once the browser reports a usable value again", () => {
      fire("input", fakeInput(futureDate, { badInput: true }));
      fire("input", fakeInput(futureDate));

      expect(control().valid).toBe(true);
    });

    it("marks the control touched on blur only", () => {
      fire("input", fakeInput(futureDate));
      expect(control().touched).toBe(false);

      fire("blur", fakeInput(futureDate));
      expect(control().touched).toBe(true);
    });
  });
});
