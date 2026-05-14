import { type ButtonProps } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";

export type ConfirmVariant = "destructive" | "default" | "discard";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  content: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

const confirmButtonPropsByVariant: Record<
  ConfirmVariant,
  Pick<ButtonProps, "color" | "variant" | "sx">
> = {
  destructive: { color: "error", variant: "contained" },
  default: { color: "primary", variant: "contained" },
  discard: {
    color: "inherit",
    variant: "outlined",
    sx: {
      borderColor: "surface.borderStrong",
      color: "text.primary",
      "&:hover": { borderColor: "text.secondary" },
    },
  },
};

export function ConfirmDialog({
  open,
  title,
  subtitle,
  content,
  confirmLabel,
  cancelLabel,
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");
  const titleColor = variant === "destructive" ? "error.main" : undefined;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      titleColor={titleColor}
      subtitle={subtitle}
      content={content}
      buttons={[
        {
          children: cancelLabel ?? t("cancel"),
          onClick: onCancel,
          variant: "text",
        },
        {
          children: confirmLabel,
          onClick: onConfirm,
          ...confirmButtonPropsByVariant[variant],
        },
      ]}
    />
  );
}
