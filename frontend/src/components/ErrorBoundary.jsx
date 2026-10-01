import React from 'react';
import { Button, Result } from 'antd';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <Result
            status="error"
            title="Something Went Wrong"
            subTitle={
              this.state.error?.message ||
              "An unexpected error occurred while rendering this page."
            }
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload} className="bg-slate-900 rounded-xl font-bold">
                Reload Page
              </Button>,
              <Button key="home" onClick={this.handleGoHome} className="rounded-xl font-bold">
                Back to Dashboard
              </Button>
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
