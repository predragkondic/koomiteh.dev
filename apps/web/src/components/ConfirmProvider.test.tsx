import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppThemeProvider } from "@/theme/ThemeContext";
import { ConfirmProvider, useConfirm } from "./ConfirmProvider";

type HarnessOptions = {
  cancelLabel?: string;
  subtitle?: string;
};

function TestHarness({
  onResult,
  cancelLabel,
  subtitle,
}: { onResult: (v: boolean) => void } & HarnessOptions) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        const result = await confirm({
          title: "Beitrag löschen?",
          subtitle,
          content: "Der Beitrag wird in den Papierkorb verschoben.",
          confirmLabel: "Löschen",
          cancelLabel,
          variant: "destructive",
        });
        onResult(result);
      }}
    >
      trigger
    </button>
  );
}

function renderHarness(
  onResult: (v: boolean) => void,
  options: HarnessOptions = {},
) {
  return render(
    <AppThemeProvider>
      <ConfirmProvider>
        <TestHarness
          onResult={onResult}
          cancelLabel={options.cancelLabel}
          subtitle={options.subtitle}
        />
      </ConfirmProvider>
    </AppThemeProvider>,
  );
}

describe("useConfirm", () => {
  it("resolves true and closes when the confirm button is clicked", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));

    expect(await screen.findByText("Beitrag löschen?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    await waitFor(() =>
      expect(screen.queryByText("Beitrag löschen?")).toBeNull(),
    );
  });

  it("rejects a second concurrent confirm() immediately with false", async () => {
    const firstResult = vi.fn();
    const secondResult = vi.fn();

    function Concurrent() {
      const confirm = useConfirm();
      return (
        <>
          <button
            onClick={async () => {
              firstResult(
                await confirm({
                  title: "Erster Dialog",
                  content: "X",
                  confirmLabel: "OK",
                  variant: "default",
                }),
              );
            }}
          >
            first
          </button>
          <button
            onClick={async () => {
              secondResult(
                await confirm({
                  title: "Zweiter Dialog",
                  content: "Y",
                  confirmLabel: "OK",
                  variant: "default",
                }),
              );
            }}
          >
            second
          </button>
        </>
      );
    }

    render(
      <AppThemeProvider>
        <ConfirmProvider>
          <Concurrent />
        </ConfirmProvider>
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByText("first"));
    expect(await screen.findByText("Erster Dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("second"));

    await waitFor(() => expect(secondResult).toHaveBeenCalledWith(false));
    expect(screen.queryByText("Zweiter Dialog")).toBeNull();
    expect(screen.getByText("Erster Dialog")).toBeInTheDocument();
    expect(firstResult).not.toHaveBeenCalled();
  });

  it("renders the subtitle when provided", async () => {
    const onResult = vi.fn();
    renderHarness(onResult, { subtitle: "Wird wieder zum Entwurf." });

    fireEvent.click(screen.getByText("trigger"));

    expect(
      await screen.findByText("Wird wieder zum Entwurf."),
    ).toBeInTheDocument();
  });

  it("omits the subtitle when not provided", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));
    await screen.findByText("Beitrag löschen?");

    expect(screen.queryByText("Wird wieder zum Entwurf.")).toBeNull();
  });

  it("uses filled error styling for the destructive variant", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));

    const button = await screen.findByRole("button", { name: "Löschen" });
    expect(button.className).toMatch(/MuiButton-contained/);
    expect(button.className).toMatch(/MuiButton-colorError/);
  });

  it("uses outlined styling for the discard variant", async () => {
    function DiscardHarness() {
      const confirm = useConfirm();
      return (
        <button
          onClick={() => {
            void confirm({
              title: "Verwerfen?",
              content: "Du verlierst alles.",
              confirmLabel: "Verwerfen",
              variant: "discard",
            });
          }}
        >
          trigger
        </button>
      );
    }

    render(
      <AppThemeProvider>
        <ConfirmProvider>
          <DiscardHarness />
        </ConfirmProvider>
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByText("trigger"));

    const button = await screen.findByRole("button", { name: "Verwerfen" });
    expect(button.className).toMatch(/MuiButton-outlined/);
  });

  it('renders the i18n default "Abbrechen" when no cancelLabel is given', async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));

    expect(await screen.findByText("Beitrag löschen?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Abbrechen" }),
    ).toBeInTheDocument();
  });

  it("resolves false when the backdrop is clicked", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));
    expect(await screen.findByText("Beitrag löschen?")).toBeInTheDocument();

    const backdrop = document.querySelector(".MuiBackdrop-root");
    if (!backdrop) throw new Error("Backdrop not found");
    fireEvent.click(backdrop);

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() =>
      expect(screen.queryByText("Beitrag löschen?")).toBeNull(),
    );
  });

  it("resolves false when the close icon is clicked", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));
    expect(await screen.findByText("Beitrag löschen?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Schließen/i }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() =>
      expect(screen.queryByText("Beitrag löschen?")).toBeNull(),
    );
  });

  it("resolves false when Escape is pressed", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    fireEvent.click(screen.getByText("trigger"));
    expect(await screen.findByText("Beitrag löschen?")).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() =>
      expect(screen.queryByText("Beitrag löschen?")).toBeNull(),
    );
  });

  it("resolves false and closes when the cancel button is clicked", async () => {
    const onResult = vi.fn();
    renderHarness(onResult, { cancelLabel: "Abbrechen" });

    fireEvent.click(screen.getByText("trigger"));

    expect(await screen.findByText("Beitrag löschen?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() =>
      expect(screen.queryByText("Beitrag löschen?")).toBeNull(),
    );
  });
});
