export type AccountConfirmationMessage = {
  to: string;
  confirmUrl: string;
};

export type AccountExistsMessage = {
  to: string;
};

export interface EmailSender {
  sendAccountConfirmation(message: AccountConfirmationMessage): Promise<void>;
  sendAccountExistsNotice(message: AccountExistsMessage): Promise<void>;
}
