import { AppIcon } from "../domain/category";

export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  confirmIcon?: AppIcon;
  destructive?: boolean;
  onConfirm: () => void;
};
