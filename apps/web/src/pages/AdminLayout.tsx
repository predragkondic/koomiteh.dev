import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useGetMeQuery } from '@/api/authApi';
import { NotFoundPage } from './NotFoundPage';

export function AdminLayout() {
  const { data, isLoading, isFetching } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading || isFetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (data?.user?.role !== 'admin') {
    return <NotFoundPage />;
  }

  return <Outlet />;
}
