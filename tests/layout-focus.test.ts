import { describe, expect, test } from "bun:test";
import {
  handleLayoutFocusInput,
  shouldRevealLayoutFocusTitlebar,
  toggleLayoutFocus,
  toggleLayoutFullscreen,
} from "../src/renderer/src/lib/layout-focus";

describe("toggleLayoutFocus", () => {
  test("reveals the focus titlebar only while the pointer is at the top edge", () => {
    expect(shouldRevealLayoutFocusTitlebar(false, 0)).toBe(false);
    expect(shouldRevealLayoutFocusTitlebar(true, 40)).toBe(true);
    expect(shouldRevealLayoutFocusTitlebar(true, 41)).toBe(false);
  });

  test("focuses the active session in the active layout", () => {
    expect(
      toggleLayoutFocus(
        null,
        {
          layoutId: "quattro",
          sessionId: "main-dps",
        },
        "quattro",
      ),
    ).toEqual({
      layoutId: "quattro",
      sessionId: "main-dps",
    });
  });

  test("restores the layout when a session is already focused", () => {
    expect(
      toggleLayoutFocus(
        { layoutId: "quattro", sessionId: "main-dps" },
        { layoutId: "quattro", sessionId: "main-dps" },
        "quattro",
      ),
    ).toBeNull();
  });

  test("does nothing when no layout session has been activated", () => {
    expect(toggleLayoutFocus(null, null, "quattro")).toBeNull();
  });

  test("does not focus a session selected in another layout", () => {
    expect(
      toggleLayoutFocus(
        null,
        {
          layoutId: "quattro",
          sessionId: "main-dps",
        },
        "single-client",
      ),
    ).toBeNull();
  });

  test("requests native fullscreen while focusing the active layout session", () => {
    let nativeFullscreenRequests = 0;

    const focus = toggleLayoutFullscreen(
      null,
      {
        layoutId: "quattro",
        sessionId: "main-dps",
      },
      "quattro",
      () => {
        nativeFullscreenRequests += 1;
      },
    );

    expect(focus).toEqual({ layoutId: "quattro", sessionId: "main-dps" });
    expect(nativeFullscreenRequests).toBe(1);
  });

  test("marks a session active only for an explicit webview focus signal", () => {
    let activations = 0;

    expect(
      handleLayoutFocusInput("sessionfocus", () => (activations += 1)),
    ).toBe(true);
    expect(handleLayoutFocusInput("keydown", () => (activations += 1))).toBe(
      false,
    );
    expect(activations).toBe(1);
  });
});
