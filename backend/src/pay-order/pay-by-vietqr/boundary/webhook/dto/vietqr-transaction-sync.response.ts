// ===== Lớp model cho object trả về trong success response =====
export class TransactionResponseObject {
  reftransactionid: string;

  constructor(reftransactionid: string) {
    this.reftransactionid = reftransactionid;
  }
}

// ===== Lớp model cho success response =====
export class SuccessResponse {
  error: boolean;
  errorReason: string | null;
  toastMessage: string;
  object: TransactionResponseObject;

  constructor(
    error: boolean,
    errorReason: string | null,
    toastMessage: string,
    object: TransactionResponseObject,
  ) {
    this.error = error;
    this.errorReason = errorReason;
    this.toastMessage = toastMessage;
    this.object = object;
  }
}

// ===== Lớp model cho error response =====
export class ErrorResponse {
  error: boolean;
  errorReason: string;
  toastMessage: string;
  object: null;

  constructor(
    error: boolean,
    errorReason: string,
    toastMessage: string,
    object: null,
  ) {
    this.error = error;
    this.errorReason = errorReason;
    this.toastMessage = toastMessage;
    this.object = object;
  }
}
