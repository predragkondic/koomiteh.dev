import {
  Button,
  type ButtonProps,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleColor?: string;
  subtitle?: string;
  content: string;
  buttons: ButtonProps[];
};

export function Dialog({
  open,
  onClose,
  title,
  titleColor,
  subtitle,
  content,
  buttons,
}: DialogProps) {
  const { t } = useTranslation("common");

  return (
    <MuiDialog open={open} onClose={onClose}>
      <DialogTitle sx={titleColor ? { color: titleColor } : undefined}>
        {title}
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 0.5
            }}>
            {subtitle}
          </Typography>
        )}
      </DialogTitle>
      <IconButton
        aria-label={t("close")}
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          color: "text.secondary",
          "&:hover": {
            color: "text.primary",
            backgroundColor: "transparent",
          },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent>{content}</DialogContent>
      <DialogActions>
        {buttons.map((props, index) => (
          <Button key={index} {...props} />
        ))}
      </DialogActions>
    </MuiDialog>
  );
}
