import { useState, type MouseEvent } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetMeQuery,
  useLogoutMutation,
  loginUrl,
} from '@/api/authApi';
import { isStaffRole } from '@/lib/userRole';

export function AuthMenu() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (isLoading) return null;

  const user = data?.user;
  if (!user) {
    return (
      <Button
        variant="outlined"
        size="small"
        color="inherit"
        component="a"
        href={loginUrl()}
        sx={{ textTransform: 'none', borderColor: 'divider' }}
      >
        {t('auth.login')}
      </Button>
    );
  }

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);
  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          display: { xs: 'none', sm: 'block' },
          maxWidth: 160,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {user.displayName}
      </Typography>
      <IconButton
        size="small"
        onClick={handleOpen}
        aria-label={t('auth.menuLabel')}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
      >
        <Avatar
          src={user.avatarUrl ?? undefined}
          alt={user.displayName}
          sx={{ width: 28, height: 28 }}
        >
          {user.displayName.slice(0, 1).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          component={RouterLink}
          to="/me/favorites"
          onClick={handleClose}
        >
          <ListItemText>{t('favorites.navLabel')}</ListItemText>
        </MenuItem>
        {isStaffRole(user.role) && (
          <MenuItem
            component={RouterLink}
            to="/admin"
            onClick={handleClose}
          >
            <ListItemText>{t('admin:title')}</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem disabled={isLoggingOut} onClick={handleLogout}>
          <ListItemText>{t('auth.logout')}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
