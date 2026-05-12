import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  useDeleteAdminPostMutation,
  useListAdminPostsQuery,
  useRestoreAdminPostMutation,
} from '@/api/adminApi';

export function AdminPostsListPage() {
  const { t, i18n } = useTranslation('admin');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data, isLoading, error, refetch } = useListAdminPostsQuery({
    includeDeleted,
    pageSize: 100,
  });
  const [deletePost, deleteState] = useDeleteAdminPostMutation();
  const [restorePost, restoreState] = useRestoreAdminPostMutation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  async function handleDelete(id: string) {
    if (!window.confirm(t('confirmDelete'))) return;
    await deletePost(id).unwrap().catch(() => null);
  }

  async function handleRestore(id: string) {
    await restorePost(id).unwrap().catch(() => null);
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4" component="h1">
          {t('list.title')}
        </Typography>
        <Button
          component={RouterLink}
          to="/admin/posts/new"
          variant="contained"
        >
          {t('list.newButton')}
        </Button>
      </Stack>

      <FormControlLabel
        control={
          <Switch
            checked={includeDeleted}
            onChange={(_, v) => setIncludeDeleted(v)}
          />
        }
        label={t('list.showDeleted')}
        sx={{ mb: 2 }}
      />

      {isLoading && (
        <Stack spacing={1} aria-busy aria-label={t('list.loading')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      )}

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              {t('common:actions.retry')}
            </Button>
          }
        >
          {t('list.loadError')}
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Typography color="text.secondary">{t('list.empty')}</Typography>
      )}

      {data && data.items.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('list.columns.question')}</TableCell>
                <TableCell>{t('list.columns.language')}</TableCell>
                <TableCell>{t('list.columns.level')}</TableCell>
                <TableCell>{t('list.columns.status')}</TableCell>
                <TableCell>{t('list.columns.updated')}</TableCell>
                <TableCell align="right">
                  {t('list.columns.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => {
                const isDeleted = row.deletedAt !== null;
                const busy =
                  (deleteState.isLoading &&
                    deleteState.originalArgs === row.id) ||
                  (restoreState.isLoading &&
                    restoreState.originalArgs === row.id);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2">{row.question}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {row.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.language}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          isDeleted
                            ? t('list.statusDeleted')
                            : t('list.statusActive')
                        }
                        color={isDeleted ? 'default' : 'success'}
                        variant={isDeleted ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(row.updatedAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          component={RouterLink}
                          to={`/admin/posts/${encodeURIComponent(row.id)}/edit`}
                          disabled={busy}
                        >
                          {t('list.actions.edit')}
                        </Button>
                        <Button
                          size="small"
                          component={RouterLink}
                          to={`/interview/${row.language}/${row.slug}`}
                          disabled={busy || isDeleted}
                        >
                          {t('list.actions.view')}
                        </Button>
                        {isDeleted ? (
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => handleRestore(row.id)}
                            disabled={busy}
                          >
                            {t('list.actions.restore')}
                          </Button>
                        ) : (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(row.id)}
                            disabled={busy}
                            aria-label={t('list.actions.delete')}
                          >
                            <Typography component="span" fontSize={18}>
                              ×
                            </Typography>
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
