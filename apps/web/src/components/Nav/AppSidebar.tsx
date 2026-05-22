import Drawer from "@mui/material/Drawer";
import { useLocation } from "react-router-dom";
import { useGetMeQuery } from "@/api/authApi";
import { buildNavItems, getAppNavMode } from "./appNavConfig";
import { NavListItems, SIDEBAR_WIDTH } from "./NavListItems";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { data } = useGetMeQuery();
  const mode = getAppNavMode(pathname);
  const items = buildNavItems(mode, data?.user);

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          position: "relative",
          borderRight: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          pl: 4,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <NavListItems items={items} />
    </Drawer>
  );
}
