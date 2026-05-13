import { useState, type MouseEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'react-i18next';
import type { AdminPostListItem } from '@koomiteh/shared';
import {
  useDeleteAdminPostMutation,
  useListAdminPostsQuery,
  useRestoreAdminPostMutation,
} from '@/api/adminApi';

export function AdminPostsListPage() {
  const { t, i18n } = useTranslation('admin');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data, isLoading, error, refetch } = useListAdminPostsQuery({
    includeDeleted,
    pageSize: 100,
  });
  const [deletePost, deleteState] = useDeleteAdminPostMutation();
  const [restorePost, restoreState] = useRestoreAdminPostMutation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const [menu, setMenu] = useState<{
    anchorEl: HTMLElement;
    postId: string;
  } | null>(null);
  const openMenu = (postId: string, el: HTMLElement) =>
    setMenu({ anchorEl: el, postId });
  const closeMenu = () => setMenu(null);

  const activePost = menu
    ? data?.items.find((p) => p.id === menu.postId)
    : undefined;

  async function handleDelete(id: string) {
    if (!window.confirm(t('confirmDelete'))) return;
    await deletePost(id)
      .unwrap()
      .catch(() => null);
  }

  async function handleRestore(id: string) {
    await restorePost(id)
      .unwrap()
      .catch(() => null);
  }

  if (isMobile) {
    return (
      <MobileView
        items={data?.items ?? null}
        isLoading={isLoading}
        error={Boolean(error)}
        onRetry={() => refetch()}
        includeDeleted={includeDeleted}
        onToggleDeleted={setIncludeDeleted}
        locale={locale}
        menu={menu}
        onOpenMenu={openMenu}
        onCloseMenu={closeMenu}
        activePost={activePost}
        onEdit={(id) => {
          closeMenu();
          navigate(`/admin/posts/${encodeURIComponent(id)}/edit`);
        }}
        onView={(post) => {
          closeMenu();
          navigate(`/interview/${post.language}/${post.slug}`);
        }}
        onDelete={async (id) => {
          closeMenu();
          await handleDelete(id);
        }}
        onRestore={async (id) => {
          closeMenu();
          await handleRestore(id);
        }}
      />
    );
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
        <Stack direction="row" spacing={1}>
          <IconButton
            component={RouterLink}
            to="/admin/posts/generate"
            aria-label={t('generate.entryButton')}
            sx={{
              width: 40,
              height: 40,
              p: 0,
              borderRadius: '999px',
              backgroundColor: 'secondary.main',
              color: 'secondary.contrastText',
              '&:hover': { backgroundColor: 'secondary.light' },
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            component={RouterLink}
            to="/admin/posts/new"
            aria-label={t('list.newButton')}
            sx={{
              width: 40,
              height: 40,
              p: 0,
              borderRadius: '999px',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { backgroundColor: 'primary.light' },
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
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
                          disabled={busy}
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

// ────────────────────────────────────────────────────────────────────────────
// Mobile branch — Variant B: compact list rows + per-row kebab menu.
// Activates at < md (see useMediaQuery above).
// ────────────────────────────────────────────────────────────────────────────

interface MobileViewProps {
  items: AdminPostListItem[] | null;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  includeDeleted: boolean;
  onToggleDeleted: (v: boolean) => void;
  locale: string;
  menu: { anchorEl: HTMLElement; postId: string } | null;
  onOpenMenu: (postId: string, el: HTMLElement) => void;
  onCloseMenu: () => void;
  activePost: AdminPostListItem | undefined;
  onEdit: (id: string) => void;
  onView: (post: AdminPostListItem) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

function MobileView({
  items,
  isLoading,
  error,
  onRetry,
  includeDeleted,
  onToggleDeleted,
  locale,
  menu,
  onOpenMenu,
  onCloseMenu,
  activePost,
  onEdit,
  onView,
  onDelete,
  onRestore,
}: MobileViewProps) {
  const { t } = useTranslation('admin');
  const total = items?.length ?? 0;
  const activeIsDeleted =
    activePost !== undefined && activePost.deletedAt !== null;

  return (
    // Break out of AppShell's <Container> horizontal padding so list rows
    // span the full mobile viewport. Container px is 16px at xs/sm, so
    // mx: -2 (=-16px) cancels it exactly.
    <Box sx={{ mx: { xs: -2, sm: -3 }, mt: -4 }}>
      <Stack
        direction="row"
        alignItems="baseline"
        spacing={1.25}
        sx={{ px: 2, pt: 2.5, pb: 1.5 }}
      >
        <Typography variant="h3" component="h1">
          {t('list.title')}
        </Typography>
        <Typography
          component="span"
          sx={{
            fontFamily: 'fontFamilyMono',
            fontSize: 12,
            color: 'text.disabled',
          }}
        >
          {total}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton
          component={RouterLink}
          to="/admin/posts/generate"
          aria-label={t('generate.entryButton')}
          sx={{
            width: 34,
            height: 34,
            p: 0,
            borderRadius: '999px',
            backgroundColor: 'secondary.main',
            color: 'secondary.contrastText',
            '&:hover': { backgroundColor: 'secondary.light' },
            mr: 1,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          component={RouterLink}
          to="/admin/posts/new"
          aria-label={t('list.newButton')}
          sx={{
            width: 34,
            height: 34,
            p: 0,
            borderRadius: '999px',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'primary.light' },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2, pb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            size="small"
            checked={includeDeleted}
            onChange={(_, v) => onToggleDeleted(v)}
            inputProps={{ 'aria-label': t('list.showDeleted') }}
            sx={{
              '& .MuiSwitch-track': {
                backgroundColor: 'surface.borderStrong',
                opacity: 1,
              },
              '& .MuiSwitch-thumb': {
                backgroundColor: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
              },
              '& .Mui-checked + .MuiSwitch-track': {
                backgroundColor: 'primary.main',
                opacity: 1,
              },
            }}
          />
          <Typography variant="body2" color="text.primary">
            {t('list.showDeleted')}
          </Typography>
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
        >
          {t('list.filter')}
        </Button>
      </Stack>

      {isLoading && (
        <Box
          sx={{ borderTop: 1, borderColor: 'divider' }}
          aria-busy
          aria-label={t('list.loading')}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                px: 2,
                py: '14px',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Skeleton
                variant="circular"
                width={8}
                height={8}
                sx={{ mt: '7px', flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="70%" height={18} />
                <Skeleton variant="text" width="40%" height={18} />
                <Skeleton variant="text" width="30%" height={14} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {error && (
        <Box sx={{ px: 2, py: 2 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                {t('common:actions.retry')}
              </Button>
            }
          >
            {t('list.loadError')}
          </Alert>
        </Box>
      )}

      {items && items.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 6,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('list.empty')}
          </Typography>
        </Box>
      )}

      {items && items.length > 0 && (
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          {items.map((post) => (
            <MobilePostRow
              key={post.id}
              post={post}
              locale={locale}
              menuOpen={menu?.postId === post.id}
              onOpenMenu={(el) => onOpenMenu(post.id, el)}
            />
          ))}
        </Box>
      )}

      <Menu
        anchorEl={menu?.anchorEl ?? null}
        open={Boolean(menu)}
        onClose={onCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => activePost && onEdit(activePost.id)}
          sx={{ gap: '10px' }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
          {t('list.actions.edit')}
        </MenuItem>
        <MenuItem
          onClick={() => activePost && onView(activePost)}
          disabled={activeIsDeleted}
          sx={{ gap: '10px' }}
        >
          <VisibilityIcon sx={{ fontSize: 16 }} />
          {t('list.actions.view')}
        </MenuItem>
        <Divider sx={{ my: '4px' }} />
        {activeIsDeleted ? (
          <MenuItem
            onClick={() => activePost && onRestore(activePost.id)}
            sx={{ gap: '10px', color: 'primary.main' }}
          >
            <RestoreIcon sx={{ fontSize: 16 }} />
            {t('list.actions.restore')}
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => activePost && onDelete(activePost.id)}
            sx={{ gap: '10px', color: 'error.main' }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
            {t('list.actions.delete')}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

interface MobilePostRowProps {
  post: AdminPostListItem;
  locale: string;
  menuOpen: boolean;
  onOpenMenu: (el: HTMLElement) => void;
}

function MobilePostRow({
  post,
  locale,
  menuOpen,
  onOpenMenu,
}: MobilePostRowProps) {
  const { t } = useTranslation('admin');
  const isDeleted = post.deletedAt !== null;
  const updated = new Intl.DateTimeFormat(locale).format(
    new Date(post.updatedAt),
  );

  const handleKebab = (e: MouseEvent<HTMLElement>) => {
    onOpenMenu(e.currentTarget);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        px: 2,
        py: '14px',
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: menuOpen ? 'action.hover' : 'transparent',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          mt: '7px',
          borderRadius: '50%',
          backgroundColor: isDeleted ? 'text.disabled' : 'success.main',
          flexShrink: 0,
        }}
      />
      <Box
        component={RouterLink}
        to={`/admin/posts/${encodeURIComponent(post.id)}/edit`}
        sx={{
          flex: 1,
          minWidth: 0,
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.35,
            color: 'text.primary',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
            textWrap: 'pretty',
          }}
        >
          {post.question}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            mt: '4px',
            fontFamily: 'fontFamilyMono',
            fontSize: '10.5px',
            color: 'text.disabled',
          }}
        >
          <Box component="span">{post.language}</Box>
          <Box component="span" sx={{ opacity: 0.5 }}>
            ·
          </Box>
          <Box
            component="span"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            {post.level}
          </Box>
          <Box component="span" sx={{ opacity: 0.5 }}>
            ·
          </Box>
          <Box component="span">{updated}</Box>
        </Stack>
      </Box>
      <IconButton
        onClick={handleKebab}
        aria-label={t('list.a11y.actions')}
        sx={{
          width: 28,
          height: 28,
          mt: '2px',
          p: 0,
          color: 'text.secondary',
          borderRadius: 1,
        }}
      >
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
}
