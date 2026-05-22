import { Outlet, useMatch, useNavigate } from "react-router-dom";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useGetManifestQuery } from "@/api/postApi";
import DefaultPage from "../Layout/DefaultPage";

export function PostLayout() {
  const { data } = useGetManifestQuery();
  const navigate = useNavigate();
  const match = useMatch("/post/:language/*");
  const activeLang = match?.params.language ?? false;

  const showTabs = !!data && data.languages.length >= 2;

  return (
    <DefaultPage titleKey="">
      {showTabs && (
        <Tabs
          value={activeLang ?? false}
          onChange={(_, value: string) => navigate(`/post/${value}`)}
          sx={{ mb: 2 }}
        >
          {data.languages.map((lang) => (
            <Tab key={lang.id} value={lang.id} label={lang.displayName} />
          ))}
        </Tabs>
      )}
      <Outlet />
    </DefaultPage>
  );
}
