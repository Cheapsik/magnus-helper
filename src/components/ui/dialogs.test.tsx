import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DialogHost, confirmDialog, promptDialog } from "./dialogs";

describe("confirmDialog / promptDialog", () => {
  it("resolves true on confirm and false on cancel", async () => {
    render(<DialogHost />);
    let answer: Promise<boolean>;
    act(() => void (answer = confirmDialog("Usunąć mapę?", { confirmLabel: "Usuń", destructive: true })));
    fireEvent.click(await screen.findByRole("button", { name: "Usuń" }));
    await expect(answer!).resolves.toBe(true);

    act(() => void (answer = confirmDialog("Usunąć mapę?")));
    fireEvent.click(await screen.findByRole("button", { name: "Anuluj" }));
    await expect(answer!).resolves.toBe(false);
  });

  it("returns the typed text, and a newer dialog cancels the open one", async () => {
    render(<DialogHost />);
    let first: Promise<string | null>;
    let second: Promise<string | null>;
    act(() => void (first = promptDialog("Nazwa", { defaultValue: "Stara" })));
    act(() => void (second = promptDialog("Nazwa", { defaultValue: "Stara" })));
    await expect(first!).resolves.toBeNull();

    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Nowa" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await expect(second!).resolves.toBe("Nowa");
  });
});
