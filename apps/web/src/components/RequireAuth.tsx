import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { loginUrl, useGetMeQuery } from "@/api/authApi";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { data, isLoading } = useGetMeQuery();

  if (isLoading) return null;

  if (!data?.user) {
    return <LoginPrompt />;
  }

  return <>{children}</>;
}

function LoginPrompt() {
  const { t } = useTranslation(["common"]);
  return (
    <Stack spacing={2} sx={{
      alignItems: "flex-start"
    }}>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {t("common:auth.loginPrompt")}
      </Typography>
      <Button variant="contained" component="a" href={loginUrl()}>
        {t("common:auth.login")}
      </Button>
    </Stack>
  );
}
