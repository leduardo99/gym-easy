export type AccountConfirmationMessage = {
  to: string;
  confirmUrl: string;
};

export type AccountExistsMessage = {
  to: string;
};

export type PasswordResetMessage = {
  to: string;
};

export type EmailDelivery = "sent" | "failed";

export interface EmailSender {
  sendAccountConfirmation(message: AccountConfirmationMessage): Promise<void>;
  sendAccountExistsNotice(message: AccountExistsMessage): Promise<void>;
  sendPasswordReset(message: PasswordResetMessage): Promise<void>;
  /** Fails when the transport cannot accept mail, without a recipient. */
  probe(): Promise<void>;
}
