export type LayoutFocus = {
  layoutId: string;
  sessionId: string;
};

export function shouldRevealLayoutFocusTitlebar(
  hasFocusedLayoutSession: boolean,
  pointerY: number,
): boolean {
  return hasFocusedLayoutSession && pointerY <= 40;
}

export function toggleLayoutFocus(
  currentFocus: LayoutFocus | null,
  activeSession: LayoutFocus | null,
  activeLayoutId: string | null,
): LayoutFocus | null {
  if (
    currentFocus ||
    !activeSession ||
    activeSession.layoutId !== activeLayoutId
  ) {
    return null;
  }

  return activeSession;
}

export function toggleLayoutFullscreen(
  currentFocus: LayoutFocus | null,
  activeSession: LayoutFocus | null,
  activeLayoutId: string | null,
  toggleNativeFullscreen: () => void,
): LayoutFocus | null {
  const nextFocus = toggleLayoutFocus(
    currentFocus,
    activeSession,
    activeLayoutId,
  );

  toggleNativeFullscreen();

  return currentFocus || nextFocus ? nextFocus : currentFocus;
}

export function handleLayoutFocusInput(
  channel: string,
  activateSession: () => void,
): boolean {
  if (channel !== "sessionfocus") {
    return false;
  }

  activateSession();
  return true;
}
