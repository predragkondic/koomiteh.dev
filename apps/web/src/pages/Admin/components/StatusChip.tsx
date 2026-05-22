import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";

export type StatusChipVariant = "active" | "suspended" | "deleted";
export function StatusChip({
  variant,
  labelKey,
}: {
  variant: StatusChipVariant;
  labelKey: string;
}) {
  const { t } = useTranslation("admin");
  switch (variant) {
    case "suspended":
    case "deleted":
      return (
        <Chip
          variant="outlined"
          size="small"
          label={t(labelKey)}
          sx={{
            borderStyle: "dashed",
            height: 22,
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "text.disabled",
          }}
        />
      );
    case "active":
      return (
        <Chip
          variant="status"
          color="active"
          size="small"
          label={t(labelKey)}
        />
      );
  }
}
