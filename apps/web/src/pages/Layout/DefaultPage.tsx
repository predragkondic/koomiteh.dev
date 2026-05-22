import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

interface DefaultPageProps {
  titleKey: string;
  titleNs?: "common" | "admin";
  children?: React.ReactNode;
}

export default function DefaultPage({
  titleKey,
  titleNs = "common",
  children,
}: DefaultPageProps) {
  const { t } = useTranslation();
  const title = titleNs === "admin" ? t(`admin:${titleKey}`) : t(titleKey);

  return (
    <Box
      sx={{
        mx: "auto",
        width: "100%",
        padding: {
          xs: 4,
        },
      }}
    >
      <Typography variant="h2" component="h1">
        {title}
      </Typography>
      <Box sx={{ mt: 4 }}>{children}</Box>
    </Box>
  );
}
