import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { MarkdownBody } from "@/features/interview/MarkdownBody";

type BodyViewMode = "split" | "editor" | "preview";

interface Props {
  value: string;
  onChange: (next: string) => void;
  initialViewMode?: BodyViewMode;
}

export function MdBodyEditor({
  value,
  onChange,
  initialViewMode = "split",
}: Props) {
  const { t } = useTranslation("admin");
  const [viewMode, setViewMode] = useState<BodyViewMode>(initialViewMode);

  return (
    <Card variant="outlined">
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          px: 3.5,
          py: 2.5,
          gap: 2
        }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {t("editor.body")}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_event, next: BodyViewMode | null) => {
            if (next) setViewMode(next);
          }}
          aria-label="Body view mode"
        >
          <ToggleButton value="split">{t("editor.bodyModeSplit")}</ToggleButton>
          <ToggleButton value="editor">
            {t("editor.bodyModeEditor")}
          </ToggleButton>
          <ToggleButton value="preview">
            {t("editor.bodyModePreview")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Divider />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: viewMode === "split" ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
          },
          minHeight: 200,
        }}
      >
        {viewMode !== "preview" ? (
          <Box
            sx={{
              borderRight: {
                xs: 0,
                md: viewMode === "split" ? 1 : 0,
              },
              borderColor: {
                xs: "transparent",
                md:
                  viewMode === "split" ? "surface.borderSubtle" : "transparent",
              },
              backgroundColor: "palette.paper.default",
            }}
          >
            <Box
              component="textarea"
              id="bodyMd-textarea"
              aria-label={t("editor.fields.bodyMd")}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              sx={{
                width: "100%",
                height: "100%",
                resize: "vertical",
                border: 0,
                outline: 0,
                p: 4,
                backgroundColor: "input.background",
                color: "text.primary",
                fontFamily: (theme) => theme.typography.fontFamilyMono,
                fontSize: "0.75rem",
                lineHeight: 1.55,
              }}
            />
          </Box>
        ) : null}
        {viewMode !== "editor" ? (
          <Box sx={{ p: 4, minWidth: 0, overflowX: "auto" }}>
            <MarkdownBody bodyMd={value} />
          </Box>
        ) : null}
      </Box>
    </Card>
  );
}
