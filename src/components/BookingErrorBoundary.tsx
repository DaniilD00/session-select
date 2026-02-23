import React from "react";

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary that wraps the booking modal.
 * If anything inside the booking flow throws (e.g. WebSocket CSP error
 * on iOS Safari), this catches it and shows a recovery UI instead of
 * crashing the entire page to a blank white screen.
 */
export class BookingErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("BookingErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-xl p-8 max-w-md mx-4 text-center shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Något gick fel</h2>
            <p className="text-muted-foreground mb-6">
              Bokningen kunde inte laddas. Försök igen.
            </p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Försök igen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
