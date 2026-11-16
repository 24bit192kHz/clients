// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { DatePipe } from "@angular/common";
import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { Subject, takeUntil } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "sm-expiration-options",
  templateUrl: "./expiration-options.component.html",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ExpirationOptionsComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: ExpirationOptionsComponent,
    },
  ],
  standalone: false,
})
export class ExpirationOptionsComponent
  implements ControlValueAccessor, Validator, OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();

  // FIXME(https://bitwarden.atlassian.net/browse/CL-903): Migrate to Signals
  // eslint-disable-next-line @angular-eslint/prefer-signals
  @Input() expirationDayOptions: number[];

  // FIXME(https://bitwarden.atlassian.net/browse/CL-903): Migrate to Signals
  // eslint-disable-next-line @angular-eslint/prefer-signals
  @Input() set touched(val: boolean) {
    if (val) {
      this.form.markAllAsTouched();
    }
  }

  currentDate = new Date();
  maxDate = new Date(9999, 11, 31, 23, 59);

  // True when the browser reports that what the user typed into the date input is not a
  // usable date, or falls outside the min/max range. See syncExpireDateTime.
  private nativeInputInvalid = false;

  protected form = new FormGroup({
    expires: new FormControl("never", [Validators.required]),
    expireDateTime: new FormControl("", [Validators.required, this.expiresInFutureValidator()]),
  });

  constructor(
    private datePipe: DatePipe,
    private i18nService: I18nService,
  ) {}

  async ngOnInit() {
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this._onChange(this.getExpiresDate());
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _onChange = (_value: Date | null): void => undefined;
  registerOnChange(fn: (value: Date | null) => void): void {
    this._onChange = fn;
  }

  onTouched = (): void => undefined;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  validate(control: AbstractControl<any, any>): ValidationErrors {
    if (
      (this.form.value.expires == "custom" && !this.form.invalid) ||
      this.form.value.expires !== "custom"
    ) {
      return null;
    }
    return {
      required: true,
    };
  }

  writeValue(value: Date | null): void {
    if (value == null) {
      this.form.setValue({ expires: "never", expireDateTime: null });
    }
    if (value) {
      this.form.setValue({
        expires: "custom",
        expireDateTime: this.datePipe.transform(value, "yyyy-MM-ddTHH:mm"),
      });
    }
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.form.disable() : this.form.enable();
  }

  private getExpiresDate(): Date | null {
    if (this.form.value.expires == "never") {
      return null;
    }
    if (this.form.value.expires == "custom") {
      // While the custom date is invalid there is no usable date to hand to the parent.
      // Without this guard a value such as "06152031" would become the year 61520.
      if (this.form.controls.expireDateTime.invalid) {
        return null;
      }
      return new Date(this.form.value.expireDateTime);
    }
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + Number(this.form.value.expires));
    return currentDate;
  }

  /**
   * Keeps the form control in step with what the date input actually holds.
   *
   * Safari only raises the `input` event for a datetime-local field once it considers the
   * whole value complete, so Angular's value accessor can leave the control holding an older,
   * valid value while the user is typing an oversized year. Reading the element directly on
   * every input, change, blur and Enter event means the validator always sees the current
   * value, and the browser's own validity flags catch anything it refused to turn into a value.
   * Enter is included because it submits the form without blurring the field first.
   */
  protected syncExpireDateTime(event: Event) {
    const input = event.target as HTMLInputElement;
    const validity = input.validity;
    this.nativeInputInvalid =
      validity.badInput || validity.rangeOverflow || validity.rangeUnderflow;

    // The view is the source here, so do not write the value back into the element. Doing so
    // can clear whatever the user is part way through typing.
    const control = this.form.controls.expireDateTime;
    if (control.value !== input.value) {
      control.setValue(input.value, { emitModelToViewChange: false });
    } else {
      control.updateValueAndValidity();
    }
    if (event.type === "blur") {
      control.markAsTouched();
    }
  }

  expiresInFutureValidator(): ValidatorFn {
    // Only accept a normal 4-digit year in the format YYYY-MM-DDTHH:MM, with optional
    // seconds and milliseconds since some browsers include them in the value.
    const dateTimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;
    const invalidResult: ValidationErrors = {
      ValidationError: { message: this.i18nService.t("expirationDateError") },
    };

    return (control: AbstractControl): ValidationErrors | null => {
      if (this.nativeInputInvalid) {
        return invalidResult;
      }

      const value = control.value;
      if (typeof value !== "string" || !dateTimeLocalPattern.test(value)) {
        return invalidResult;
      }

      const enteredDate = new Date(value);
      if (isNaN(enteredDate.getTime()) || enteredDate > this.maxDate) {
        return invalidResult;
      }

      return enteredDate > new Date() ? null : invalidResult;
    };
  }
}
