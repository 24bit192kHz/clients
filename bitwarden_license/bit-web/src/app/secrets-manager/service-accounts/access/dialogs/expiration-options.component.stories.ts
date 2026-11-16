import { DatePipe, NgFor, NgIf } from "@angular/common";
import { importProvidersFrom } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { applicationConfig, Meta, moduleMetadata, StoryObj } from "@storybook/angular";
import { action } from "storybook/actions";

import { ButtonModule, FormFieldModule } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";
import { PreloadedEnglishI18nModule } from "@bitwarden/web-vault/app/core/tests";

import { ExpirationOptionsComponent } from "./expiration-options.component";

/**
 * Hosts the component inside a parent form the way the access token dialog does, so the
 * story exercises the ControlValueAccessor and Validator wiring rather than the inner form
 * on its own. The status line and submit action make the parent form's state visible to
 * browser-driven tests.
 */
export default {
  title: "Web/Secrets Manager/Expiration Options",
  component: ExpirationOptionsComponent,
  decorators: [
    applicationConfig({
      providers: [importProvidersFrom(PreloadedEnglishI18nModule), provideNoopAnimations()],
    }),
    moduleMetadata({
      declarations: [ExpirationOptionsComponent],
      imports: [ReactiveFormsModule, FormFieldModule, ButtonModule, I18nPipe, NgFor, NgIf],
      providers: [DatePipe],
    }),
  ],
  render: () => {
    // Storybook copies every prop onto the component instance, so none of these names may
    // collide with a field on ExpirationOptionsComponent (its inner form is called `form`).
    const hostForm = new FormGroup({
      expirationDateControl: new FormControl<Date | null>(null),
    });
    return {
      props: {
        hostForm,
        expirationDayOptions: [7, 30, 60],
        submitHost: () => {
          hostForm.markAllAsTouched();
          if (hostForm.valid) {
            action("submit")(hostForm.value.expirationDateControl?.toISOString() ?? null);
          }
        },
      },
      template: `
        <form [formGroup]="hostForm" (ngSubmit)="submitHost()" class="tw-max-w-md">
          <sm-expiration-options
            formControlName="expirationDateControl"
            [expirationDayOptions]="expirationDayOptions"
            [touched]="hostForm.controls.expirationDateControl.touched"
          ></sm-expiration-options>
          <p data-testid="form-status">{{ hostForm.status }}</p>
          <p data-testid="form-value">{{ hostForm.value.expirationDateControl?.toISOString() }}</p>
          <button type="submit" bitButton buttonType="primary">Submit</button>
        </form>
      `,
    };
  },
} as Meta<ExpirationOptionsComponent>;

type Story = StoryObj<ExpirationOptionsComponent>;

export const Default: Story = {};
