import { Component, type ErrorInfo, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 720, mx: 'auto' }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={this.reset}>
                Retry
              </Button>
            }
          >
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error.message}
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
