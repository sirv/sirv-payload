/** Any non-2xx response from the Sirv REST API. */
export class SirvApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'SirvApiError';
    this.status = status;
    this.body = body;
  }
}

/** The account has MFA enabled and the connect call must be retried with an OTP token. */
export class OtpRequiredError extends Error {
  constructor(message = 'OTP required') {
    super(message);
    this.name = 'OtpRequiredError';
  }
}

/** Email/password (or OTP) rejected by Sirv. */
export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}
