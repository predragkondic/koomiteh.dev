import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useGetManifestQuery } from '@/api/interviewApi';

export function InterviewLayout() {
  const { data } = useGetManifestQuery();
  const navigate = useNavigate();
  const match = useMatch('/interview/:language/*');
  const activeLang = match?.params.language ?? false;

  const showTabs = !!data && data.languages.length >= 2;

  return (
    <Box>
      {showTabs && (
        <Tabs
          value={activeLang ?? false}
          onChange={(_, value: string) => navigate(`/interview/${value}`)}
          sx={{ mb: 2 }}
        >
          {data.languages.map((lang) => (
            <Tab key={lang.id} value={lang.id} label={lang.displayName} />
          ))}
        </Tabs>
      )}
      <Outlet />
    </Box>
  );
}
