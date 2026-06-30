import { ValidatorFn, Validators } from '@angular/forms';

export const PHONE_PATTERN = /^[6-9]\d{9}$/;
export const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const STATUS_CODE_PATTERN = /^[A-Z0-9_]+$/;
export const BARCODE_PATTERN = /^\d{8,14}$/;

export const phoneValidators: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(PHONE_PATTERN),
];

export const optionalPhoneValidators: ValidatorFn[] = [
  Validators.pattern(PHONE_PATTERN),
];

export const emailValidators: ValidatorFn[] = [
  Validators.required,
  Validators.email,
];

export const optionalGstValidators: ValidatorFn[] = [
  Validators.pattern(GST_PATTERN),
];
