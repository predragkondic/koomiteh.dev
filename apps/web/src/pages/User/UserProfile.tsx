import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useGetUserProfileQuery, type PublicUserProfile } from "@/api/usersApi";
import { RequireAuth } from "@/components/RequireAuth";
import DefaultPage from "../Layout/DefaultPage";

export function UserProfilePage() {
  return (
    <DefaultPage titleKey="nav.profile">
      <RequireAuth>
        <ProfileBody />
      </RequireAuth>
    </DefaultPage>
  );
}

function ProfileBody() {
  const { t } = useTranslation(["common"]);
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useGetUserProfileQuery(id ?? "", {
    skip: !id,
  });

  if (isLoading) return null;

  if (error && "status" in error && error.status === 410) {
    return (
      <Typography
        variant="body1"
        sx={{
          color: "text.secondary",
        }}
      >
        {t("common:profile.deleted")}
      </Typography>
    );
  }

  if (!data) return null;
  return <ProfileView profile={data} />;
}

function ProfileView({ profile }: { profile: PublicUserProfile }) {
  const { t, i18n } = useTranslation(["common"]);
  const memberSince = new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "long",
  }).format(new Date(profile.createdAt));

  return (
    <Stack
      direction="row"
      spacing={3}
      sx={{
        alignItems: "center",
      }}
    >
      <Avatar
        src={profile.avatarUrl ?? undefined}
        alt={profile.displayName}
        sx={{ width: 80, height: 80 }}
      />
      <Stack spacing={0.5}>
        <Typography variant="h5">{profile.displayName}</Typography>
        {profile.githubLogin && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            {profile.githubLogin}
          </Typography>
        )}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          {t("common:profile.memberSince", { date: memberSince })}
        </Typography>
      </Stack>
    </Stack>
  );
}
