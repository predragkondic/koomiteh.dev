import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";

export function LevelChip({ level }: { level: "junior" | "senior" }) {
  const { t } = useTranslation("admin");
  return (
    <Chip
      variant="level"
      color={level}
      size="small"
      label={
        <>
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "currentColor",
              display: "inline-block",
            }}
          />
          <span>{t(`list.levels.${level}`)}</span>
        </>
      }
    />
  );
}
