import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/RequireAuth";
import DefaultPage from "./Layout/DefaultPage";

export function MySettingsPage() {
  const { t } = useTranslation(["common"]);
  return (
    <DefaultPage titleKey="nav.settings">
      <RequireAuth>
        <Typography variant="body2" color="text.secondary">
          {t("common:settings.comingSoon")}
        </Typography>
      </RequireAuth>
    </DefaultPage>
  );
}
