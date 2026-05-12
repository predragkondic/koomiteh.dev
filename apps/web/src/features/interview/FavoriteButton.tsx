import { useState, type MouseEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery, loginUrl } from '@/api/authApi';
import {
  useAddFavoriteMutation,
  useGetFavoriteIdsQuery,
  useRemoveFavoriteMutation,
} from '@/api/favoritesApi';

interface FavoriteButtonProps {
  postId: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export function FavoriteButton({
  postId,
  size = 'small',
  sx,
}: FavoriteButtonProps) {
  const { t } = useTranslation('common');
  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const isLoggedIn = Boolean(meData?.user);
  const { data: favIds } = useGetFavoriteIdsQuery(undefined, {
    skip: !isLoggedIn,
  });
  const favorited = isLoggedIn && (favIds?.ids ?? []).includes(postId);
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();
  const [snackOpen, setSnackOpen] = useState(false);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setSnackOpen(true);
      return;
    }
    if (favorited) {
      void removeFavorite(postId);
    } else {
      void addFavorite(postId);
    }
  };

  if (meLoading) return null;

  const label = favorited
    ? t('favorites.removeAria')
    : t('favorites.addAria');

  return (
    <>
      <IconButton
        aria-label={label}
        aria-pressed={favorited}
        size={size}
        onClick={handleClick}
        onMouseDown={(e) => e.stopPropagation()}
        sx={[
          {
            color: favorited ? 'warning.main' : 'text.secondary',
            fontSize: size === 'medium' ? '1.5rem' : '1.25rem',
            lineHeight: 1,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <span aria-hidden="true">{favorited ? '★' : '☆'}</span>
      </IconButton>
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        message={t('favorites.loginPrompt')}
        action={
          <Button
            color="inherit"
            size="small"
            component="a"
            href={loginUrl()}
            onClick={(e) => e.stopPropagation()}
          >
            {t('auth.login')}
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
