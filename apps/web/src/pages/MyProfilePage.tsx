import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useGetMyProfileQuery, type MyProfile } from "@/api/authApi";
import { RequireAuth } from "@/components/RequireAuth";
import DefaultPage from "./Layout/DefaultPage";

export function MyProfilePage() {
  return (
    <DefaultPage titleKey="nav.profile">
      <RequireAuth>
        <ProfileBody />
      </RequireAuth>
    </DefaultPage>
  );
}

function ProfileBody() {
  const { data, isLoading } = useGetMyProfileQuery();
  if (isLoading || !data) return null;
  return <ProfileView profile={data} />;
}

function ProfileView({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation(["common"]);
  const memberSince = new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "long",
  }).format(new Date(profile.createdAt));

  return (
    <Stack direction="row" spacing={3} alignItems="center">
      <Avatar
        src={profile.avatarUrl ?? undefined}
        alt={profile.displayName}
        sx={{ width: 80, height: 80 }}
      />
      <Stack spacing={0.5}>
        <Typography variant="h5">{profile.displayName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {profile.githubLogin}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("common:profile.memberSince", { date: memberSince })}
        </Typography>
      </Stack>
    </Stack>
  );
}
