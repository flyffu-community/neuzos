<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount, onDestroy, tick} from "svelte";
  import {initElectronApi, neuzosBridge} from "$lib/core";
  import type {NeuzSession, NeuzConfig, NeuzConfigPatch} from "$lib/types";
  import type {WebviewTag} from "electron";
  import {Button} from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { setElectronContext } from "$lib/contexts/electronContext";
  import { setNeuzosBridgeContext } from "$lib/contexts/neuzosBridgeContext";

  import {
    Fullscreen, Minus, Maximize, X, Play,
    Volume2,
    VolumeOff,
    Square,
    Minimize,
    Keyboard,
    KeyboardOff,
    Check,
    RadioTower,
    ChevronDown,
    Settings,
    RefreshCcw,
    ZoomIn,
    ZoomOut,
    RotateCcw,
  } from '@lucide/svelte'
  import {Separator} from "$lib/components/ui/separator";

  initElectronApi(window.electron.ipcRenderer);

  // Set up contexts for accessing electron and neuzosBridge
  setElectronContext(window.electron.ipcRenderer);
  setNeuzosBridgeContext(neuzosBridge);

  let sessionData: {
    mode: 'session' | 'focus' | 'focus_fullscreen';
    sessionId: string;
    sessionConfig: NeuzSession;
    started: boolean;
  } | null = $state(null);

  let webview: WebviewTag | HTMLDivElement | undefined = $state(undefined);
  let isFullscreen = $state(false);
  let shortcutsEnabled = $state(true);
  const electronApi = window.electron.ipcRenderer;
  const webviewPreloadPath: string = (window as any)._preloadPaths?.webview ?? '';
  let focusExitClickCount = 0;
  let focusExitClickTimer: ReturnType<typeof setTimeout> | null = null;
  let hoverFocusRequestPending = false;
  let showFocusExitHintToast = $state(false);
  let focusExitHintToastText = $state('');

  const applyConfig = (config: NeuzConfig) => {
    neuzosConfig = config;
    if (!sessionData) return;
    const updatedSession = config.sessions?.find((session) => session.id === sessionData?.sessionId);
    if (updatedSession) {
      sessionData.sessionConfig = updatedSession;
      muted = updatedSession.muted === true;
    }
  };

  const onFullscreenChanged = (_: any, fullscreen: boolean) => {
    isFullscreen = fullscreen;
  };

  const onConfigChanged = (_: any, config: string | NeuzConfig) => {
    try {
      applyConfig(typeof config === 'string' ? JSON.parse(config) : config);
    } catch (error) {
      console.error('Failed to apply updated config:', error);
    }
  };

  const onConfigPatch = (_: any, patch: NeuzConfigPatch) => {
    if (!neuzosConfig || patch.sessions === undefined) return;
    applyConfig({...neuzosConfig, sessions: patch.sessions});
  };

  const onShortcutsStateChanged = (_: any, enabled: boolean) => {
    shortcutsEnabled = enabled;
  };

  const onActiveKeybindProfileChanged = (_: any, profileId: string) => {
    if (neuzosConfig) neuzosConfig.activeKeyBindProfileId = profileId;
  };

  const onSyncReceiverChanged = (_: any, sessionId: string | null) => {
    if (neuzosConfig) neuzosConfig.syncReceiverSessionId = sessionId;
  };

  onMount(async () => {
    sessionData = await electronApi.invoke("session_window.get_data");

    // Load config to get userAgent setting
    try {
      applyConfig(await electronApi.invoke("config.load", false));
      const shortcutState = await electronApi.invoke("shortcuts.get_state");
      shortcutsEnabled = shortcutState.sessionWindow;
    } catch (e) {
      console.error("Failed to load config:", e);
    }

    if (sessionData) {
      started = sessionData.started;
      muted = sessionData.sessionConfig.muted === true

      if (sessionData.mode === 'focus' || sessionData.mode === 'focus_fullscreen') {
        showFocusExitHint(getSessionExitHint());
      }

    } else {
      console.error("Failed to load session data");
    }

    electronApi.on('event.fullscreen_changed', onFullscreenChanged);
    electronApi.on('event.config_changed', onConfigChanged);
    electronApi.on('event.config_patch', onConfigPatch);
    electronApi.on('event.shortcuts_state_changed', onShortcutsStateChanged);
    electronApi.on('event.active_keybind_profile_changed', onActiveKeybindProfileChanged);
    electronApi.on('event.sync_receiver_changed', onSyncReceiverChanged);
  });

  const swapProfile = async (profileId: string) => {
    const result = await electronApi.invoke('keybinds.swap_profile', profileId);
    if (result?.success && neuzosConfig) {
      neuzosConfig.activeKeyBindProfileId = profileId;
    }
  };

  const toggleShortcuts = () => {
    neuzosBridge.sessionWindow.toggleShortcuts(!shortcutsEnabled);
  };

  const openKeybindSettings = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    neuzosBridge.settingsWindow.open('keybinds');
  };

  const toggleActiveReceiver = async () => {
    if (!sessionData) return;
    await neuzosBridge.sessions.setSyncReceiver(isActiveReceiver ? null : sessionData.sessionId);
  };

  const isActiveReceiver = $derived(
    Boolean(sessionData && neuzosConfig?.syncReceiverSessionId === sessionData.sessionId)
  );

  function closeWindow() {
    electronApi.send("session_window.close");
  }

  function requestCloseWindow() {
    if (sessionData?.mode !== 'focus') {
      closeWindow();
      return;
    }

    showFocusExitHint(getFocusCloseHint());
    focusExitClickCount += 1;
    if (focusExitClickTimer) {
      clearTimeout(focusExitClickTimer);
    }

    if (focusExitClickCount >= 3) {
      focusExitClickCount = 0;
      closeWindow();
      return;
    }

    focusExitClickTimer = setTimeout(() => {
      focusExitClickCount = 0;
      focusExitClickTimer = null;
    }, 2000);
  }

  function requestFocusFullscreenFallbackClose() {
    if (sessionData?.mode !== 'focus_fullscreen') {
      return;
    }

    showFocusExitHint(getSessionExitHint());
    focusExitClickCount += 1;
    if (focusExitClickTimer) {
      clearTimeout(focusExitClickTimer);
    }

    if (focusExitClickCount >= 3) {
      focusExitClickCount = 0;
      closeWindow();
      return;
    }

    focusExitClickTimer = setTimeout(() => {
      focusExitClickCount = 0;
      focusExitClickTimer = null;
    }, 2000);
  }

  function minimizeWindow() {
    electronApi.send("session_window.minimize");
  }

  function maximizeWindow() {
    electronApi.send("session_window.maximize");
  }

  function toggleFullscreen() {
    electronApi.send("session_window.fullscreen_toggle");
  }

  function getIconPath(session: NeuzSession): string {
    return `icons/${session.icon.slug}.png`;
  }

  function getSrc(): string {
    if (!sessionData) return '';
    return sessionData.sessionConfig.srcOverwrite || 'https://universe.flyff.com/play';
  }

  function getPartition(): string {
    if (!sessionData) return '';
    return `persist:${sessionData.sessionId}`;
  }

  function getModeName(): string {
    if (!sessionData) return '';
    switch (sessionData.mode) {
      case 'focus_fullscreen':
        return '(Fullscreen Locked)';
      default:
        return '';
    }
  }

  function formatShortcutLabel(key: string): string {
    if (key.toLowerCase() === 'commandorcontrol+delete') {
      return 'CTRL + DELETE';
    }

    return key
      .split('+')
      .map((part) => part.trim().toUpperCase())
      .join(' + ');
  }

  function getCloseFocusSessionKeybindLabel(): string {
    const keyBind = neuzosConfig?.keyBinds?.find((bind) => bind.event === 'close_focus_session' && bind.key);
    return keyBind?.key ? formatShortcutLabel(keyBind.key) : '';
  }

  function getSessionExitHint(): string {
    if (sessionData?.mode !== 'focus' && sessionData?.mode !== 'focus_fullscreen') return '';
    const keyBindLabel = getCloseFocusSessionKeybindLabel();

    if (sessionData.mode === 'focus') {
      return `To Exit this Session Press 3x Close${keyBindLabel ? ` or ${keyBindLabel}` : ''}`;
    }

    return `To Exit This Session Press 3x Close${keyBindLabel ? ` or ${keyBindLabel}` : ''}`;
  }

  function getFocusCloseHint(): string {
    return getSessionExitHint();
  }

  function showFocusExitHint(text: string) {
    if (!text) return;
    focusExitHintToastText = text;
    showFocusExitHintToast = true;
    setTimeout(() => {
      showFocusExitHintToast = false;
    }, 3000);
  }

  let started: boolean = $state(false)
  let muted: boolean = $state(false)
  let forceStopped: boolean = $state(false)

  export const startClient = async () => {
    const result = await electronApi.invoke('session_window.start');
    if (!result?.success) return false;
    forceStopped = false
    started = true
    return true
  }

  export const stopClient = () => {
    if (started) electronApi.send('session_window.stop')
    started = false
  }

  const restartClient = async () => {
    started = false
    await tick()
    forceStopped = false
    started = true
  }

  export const isStarted = () => {
    return started
  }

  export const focus = () => {
    const webviewElement = getWebview()
    if (!webviewElement) return
    if (!webviewElement.shadowRoot) {
      webviewElement.focus()
      return
    }
    const cNodes = webviewElement.shadowRoot.getRootNode().childNodes
    const client = cNodes[cNodes.length - 1] as HTMLElement
    if (client) {
      setTimeout(() => client.focus(), 1)
    }
  }

  const focusSessionWindowOnHover = async () => {
    if (neuzosConfig?.globalAutoFocus === false || hoverFocusRequestPending) return
    hoverFocusRequestPending = true
    try {
      const focused = await electronApi.invoke('window.focus_on_hover')
      if (focused) focus()
    } finally {
      hoverFocusRequestPending = false
    }
  }

  export const setAudioMuted = (mu: boolean) => {
    muted = mu
    try {
      const webviewElement = getWebview()
      if (webviewElement) {
        webviewElement.setAudioMuted(mu)
        muted = webviewElement.isAudioMuted() ?? mu
      }
    } catch (e) {
      console.log('Cant mute, maybe client not started')
    }
  }

  export const isMuted = () => {
    return muted
  }

  const persistSessionMuted = async (mu: boolean) => {
    if (!neuzosConfig || !sessionData) return

    neuzosConfig.sessions = (neuzosConfig.sessions ?? []).map((session) => {
      if (session.id !== sessionData?.sessionId) return session
      const nextSession = {...session}
      if (mu) {
        nextSession.muted = true
      } else {
        delete nextSession.muted
      }
      return nextSession
    })

    sessionData.sessionConfig = {...sessionData.sessionConfig}
    if (mu) {
      sessionData.sessionConfig.muted = true
    } else {
      delete sessionData.sessionConfig.muted
    }

    await neuzosBridge.config.saveSilent(neuzosConfig)
    neuzosBridge.config.notifyPatch({sessions: neuzosConfig.sessions})
  }

  const toggleAudioMuted = async () => {
    const nextMuted = !muted
    setAudioMuted(nextMuted)
    await persistSessionMuted(nextMuted)
  }

  const clampZoom = (value: number) => Math.min(1.5, Math.max(0.5, Math.round(value * 20) / 20))

  const getSessionZoom = () => {
    return sessionData?.sessionConfig.zoom ?? 1.0
  }

  const setSessionZoom = async (value: number) => {
    if (!neuzosConfig || !sessionData) return
    const clamped = clampZoom(value)
    neuzosConfig.sessions = neuzosConfig.sessions.map((session) => {
      if (session.id !== sessionData?.sessionId) return session
      const updatedSession = {...session}
      if (clamped === 1.0) {
        delete updatedSession.zoom
      } else {
        updatedSession.zoom = clamped
      }
      return updatedSession
    })
    const updatedSession = neuzosConfig.sessions.find((session) => session.id === sessionData?.sessionId)
    if (updatedSession) sessionData.sessionConfig = updatedSession
    getWebview()?.setZoomFactor(clamped)
    await neuzosBridge.config.saveSilent(neuzosConfig)
    neuzosBridge.config.notifyPatch({sessions: neuzosConfig.sessions})
  }

  export const getWebview = () => {
    return webview?.tagName === 'WEBVIEW' ? (webview as WebviewTag) : null
  }

  const sendKeyToWebview = (key: string) => {
    const webviewElement = getWebview();
    if (!webviewElement) return;

    const normalizedKey = key
      .replace(/commandorcontrol/gi, 'Ctrl')
      .replace(/cmdorctrl/gi, 'Ctrl')
      .replace(/\bsuper\b/gi, 'Meta')
      .replace(/\boption\b/gi, 'Alt');
    const parts = normalizedKey.split('+').map((part) => part.trim());
    const mainKey = parts.at(-1) ?? '';
    const modifierParts = parts.slice(0, -1).map((modifier) => modifier.toLowerCase());
    const hasCtrl = modifierParts.some((modifier) => modifier === 'ctrl' || modifier === 'control');
    const hasAlt = modifierParts.some((modifier) => modifier === 'alt' || modifier === 'altgr');
    const hasShift = modifierParts.includes('shift');
    const hasMeta = modifierParts.includes('meta');
    const hasCmd = modifierParts.some((modifier) => modifier === 'cmd' || modifier === 'command');
    type Modifier = 'control' | 'alt' | 'shift' | 'meta' | 'cmd';
    const modifiers: Modifier[] = [];
    if (hasCtrl) modifiers.push('control');
    if (hasAlt) modifiers.push('alt');
    if (hasShift) modifiers.push('shift');
    if (hasMeta) modifiers.push('meta');
    if (hasCmd) modifiers.push('cmd');

    const keyCode = /^f([1-9]|1[0-2])$/i.test(mainKey) ? mainKey.toUpperCase() : mainKey;

    try {
      if (hasCtrl) webviewElement.sendInputEvent({type: 'keyDown', keyCode: 'Control', modifiers: ['control']});
      if (hasAlt) webviewElement.sendInputEvent({type: 'keyDown', keyCode: 'Alt', modifiers});
      if (hasShift) webviewElement.sendInputEvent({type: 'keyDown', keyCode: 'Shift', modifiers});
      if (hasMeta) webviewElement.sendInputEvent({type: 'keyDown', keyCode: 'Meta', modifiers});
      if (hasCmd) webviewElement.sendInputEvent({type: 'keyDown', keyCode: 'Command', modifiers});
      webviewElement.sendInputEvent({type: 'keyDown', keyCode, modifiers});

      setTimeout(() => {
        webviewElement.sendInputEvent({type: 'keyUp', keyCode, modifiers});
        if (hasCmd) webviewElement.sendInputEvent({type: 'keyUp', keyCode: 'Command', modifiers: modifiers.filter((modifier) => modifier !== 'cmd')});
        if (hasMeta) webviewElement.sendInputEvent({type: 'keyUp', keyCode: 'Meta', modifiers: modifiers.filter((modifier) => modifier !== 'meta' && modifier !== 'cmd')});
        if (hasShift) webviewElement.sendInputEvent({type: 'keyUp', keyCode: 'Shift', modifiers: modifiers.filter((modifier) => modifier !== 'shift' && modifier !== 'meta' && modifier !== 'cmd')});
        if (hasAlt) webviewElement.sendInputEvent({type: 'keyUp', keyCode: 'Alt', modifiers: modifiers.filter((modifier) => modifier !== 'alt' && modifier !== 'shift' && modifier !== 'meta' && modifier !== 'cmd')});
        if (hasCtrl) webviewElement.sendInputEvent({type: 'keyUp', keyCode: 'Control', modifiers: []});
      }, 50);
    } catch (error) {
      console.error('Failed to send key to session:', error);
    }
  };

  const onSendKey = (_: any, key: string) => sendKeyToWebview(key);

  $effect(() => {
    const webviewElement = getWebview()
    const zoom = getSessionZoom()
    if (!webviewElement) return

    const onIpcMessage = (event: Event) => {
      if ((event as any).channel === 'sessionhover') {
        void focusSessionWindowOnHover()
      }
    }

    const applySessionState = () => {
      if (getWebview() !== webviewElement) return
      try {
        webviewElement.setAudioMuted(muted)
        muted = webviewElement.isAudioMuted() ?? muted
        webviewElement.setZoomFactor(zoom)
      } catch {
        // Apply the persisted state again when the webview is ready.
      }
    }

    applySessionState()
    webviewElement.addEventListener('ipc-message', onIpcMessage)
    webviewElement.addEventListener('dom-ready', applySessionState)
    webviewElement.addEventListener('did-finish-load', applySessionState)

    return () => {
      webviewElement.removeEventListener('ipc-message', onIpcMessage)
      webviewElement.removeEventListener('dom-ready', applySessionState)
      webviewElement.removeEventListener('did-finish-load', applySessionState)
    }
  })

  let koreanLinkFixed = $state(false);
  const koreanLinkFix = () => {
    getWebview()?.executeJavaScript(`
document.querySelectorAll('[target="_blank"]').forEach((el) => {el.setAttribute('target', '_self');});
const oldWindowOpen = window.open;
window.open = function(...args) {
  if(args[0].startsWith('https://universe.flyff.com/sniegu/auth/wcnkr/callback')){
    location.href = args[0]
    window.open = oldWindowOpen
  } else {
    oldWindowOpen(...args)
  }
}
`)
    koreanLinkFixed = true;
  }

  let neuzosConfig: NeuzConfig | null = $state(null);
  let userAgent: string | undefined = $state(undefined);

  const onStopSession = async (_: any, stopSessionId: string) => {
    if (!sessionData || stopSessionId !== sessionData.sessionId) {
      return
    }
    // Force teardown regardless of launch mode (session/focus/focus_fullscreen).
    // Focus modes normally keep webview mounted, which can keep LevelDB handles open.
    forceStopped = true
    started = false
    await tick()
    electronApi.send('event.stop_session_ack', stopSessionId)
  }

  // Load config and compute userAgent
  $effect(() => {
    userAgent = neuzosConfig?.userAgent || undefined;
  });

  onMount(() => {
    electronApi.on('event.stop_session', onStopSession)
    electronApi.on('event.send_key', onSendKey)
  })

  onDestroy(() => {
    electronApi.removeListener?.('event.stop_session', onStopSession)
    electronApi.removeListener?.('event.send_key', onSendKey)
    electronApi.removeListener?.('event.fullscreen_changed', onFullscreenChanged)
    electronApi.removeListener?.('event.config_changed', onConfigChanged)
    electronApi.removeListener?.('event.config_patch', onConfigPatch)
    electronApi.removeListener?.('event.shortcuts_state_changed', onShortcutsStateChanged)
    electronApi.removeListener?.('event.active_keybind_profile_changed', onActiveKeybindProfileChanged)
    electronApi.removeListener?.('event.sync_receiver_changed', onSyncReceiverChanged)
    if (focusExitClickTimer) {
      clearTimeout(focusExitClickTimer)
    }
  })
</script>

<ModeWatcher/>

<div class="w-screen h-screen flex flex-col bg-background text-foreground relative">
  {#if showFocusExitHintToast}
    <div class="pointer-events-none absolute left-1/2 top-5 z-50 -translate-x-1/2 rounded-md border border-border bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg">
      {focusExitHintToastText}
    </div>
  {/if}

  {#if sessionData?.mode === 'focus_fullscreen'}
    <button
      type="button"
      class="absolute right-2 top-2 z-50 flex size-7 items-center justify-center rounded-md border border-border/40 bg-background/35 text-muted-foreground opacity-20 transition-all hover:border-border hover:bg-background/80 hover:text-foreground hover:opacity-100"
      title="Close"
      aria-label="Close"
      onclick={requestFocusFullscreenFallbackClose}
    >
      <X class="size-3.5"/>
    </button>
  {/if}

  <!-- Title Bar (hidden in focus_fullscreen mode or when fullscreen with hide setting enabled) -->
  {#if sessionData?.mode !== 'focus_fullscreen' && (!isFullscreen || !neuzosConfig?.fullscreen?.hideTitleBarInSessionLayouts)}
    <div class="flex items-center justify-between px-2 bg-card border-b border-border min-h-8">
      <div class="flex min-w-0 flex-1 items-center gap-1">
        <div
          class="flex items-center gap-2 select-none"
          style="-webkit-app-region: drag;"
        >
          {#if sessionData}
            <img src={getIconPath(sessionData.sessionConfig)} alt={sessionData.sessionConfig.label} class="w-4 h-4"/>
            <span class="text-sm font-semibold">{sessionData.sessionConfig.label}</span>
            {#if muted}
              <VolumeOff class="size-3.5 text-muted-foreground" aria-label="Muted"/>
            {/if}
            {#if isActiveReceiver}
              <RadioTower class="size-3.5 text-primary" aria-label="Active Receiver"/>
            {/if}
            <span class="text-xs text-muted-foreground">{getModeName()}</span>
          {:else}
            <span class="text-sm font-semibold">Loading...</span>
          {/if}
        </div>
        {#if sessionData}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button
                size="icon-xs"
                variant="outline"
                class="cursor-pointer"
                title="Session Controls"
                style="-webkit-app-region: no-drag;"
              >
                <ChevronDown class="size-3.5"/>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" class="w-48">
              <DropdownMenu.Item onclick={toggleAudioMuted} class="gap-2">
                {#if muted}
                  <Volume2 class="size-4"/>
                  Unmute
                {:else}
                  <VolumeOff class="size-4"/>
                  Mute
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Separator/>
              {#if started}
                <DropdownMenu.Item onclick={restartClient} class="gap-2">
                  <RefreshCcw class="size-4"/>
                  Restart
                </DropdownMenu.Item>
              {/if}
              <DropdownMenu.Item onclick={() => started ? stopClient() : startClient()} class="gap-2">
                {#if started}
                  <Square class="size-4"/>
                  Stop
                {:else}
                  <Play class="size-4"/>
                  Start
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Separator/>
              <DropdownMenu.Item
                onSelect={(event) => event.preventDefault()}
                onclick={() => setSessionZoom(getSessionZoom() + 0.05)}
                disabled={getSessionZoom() >= 1.5}
                class="gap-2"
              >
                <ZoomIn class="size-4"/>
                Zoom In
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={(event) => event.preventDefault()}
                onclick={() => setSessionZoom(getSessionZoom() - 0.05)}
                disabled={getSessionZoom() <= 0.5}
                class="gap-2"
              >
                <ZoomOut class="size-4"/>
                Zoom Out
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={(event) => event.preventDefault()}
                onclick={() => setSessionZoom(1.0)}
                disabled={getSessionZoom() === 1.0}
                class="gap-2"
              >
                <RotateCcw class="size-4"/>
                Reset Zoom ({(getSessionZoom() * 100).toFixed(0)}%)
              </DropdownMenu.Item>
              <DropdownMenu.Separator/>
              <DropdownMenu.Item onclick={toggleActiveReceiver}>
                <div class="flex w-full items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                    <RadioTower class="size-4"/>
                    Active Receiver
                  </div>
                  {#if isActiveReceiver}
                    <Check class="size-4"/>
                  {/if}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {/if}
        <div
          class="h-8 flex-1 select-none"
          style="-webkit-app-region: drag;"
        ></div>
      </div>
      <div class="flex gap-2 h-full items-center">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              size="icon-xs"
              variant="outline"
              class="cursor-pointer"
              title="Keybind Profiles"
              oncontextmenu={openKeybindSettings}
            >
              {#if shortcutsEnabled}
                <Keyboard class="size-3.5"/>
              {:else}
                <KeyboardOff class="size-3.5"/>
              {/if}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-48">
            <DropdownMenu.Item onclick={() => neuzosBridge.settingsWindow.open('keybinds')} class="gap-2">
              <Settings class="size-4"/>
              Open Settings
            </DropdownMenu.Item>
            <DropdownMenu.Separator/>
            <DropdownMenu.Item onclick={toggleShortcuts} class="gap-2">
              {#if shortcutsEnabled}
                <KeyboardOff class="size-4"/>
                Disable Keybinds
              {:else}
                <Keyboard class="size-4"/>
                Enable Keybinds
              {/if}
            </DropdownMenu.Item>
            {#if (neuzosConfig?.keyBindProfiles?.length ?? 0) > 0}
              <DropdownMenu.Separator/>
              {#each neuzosConfig?.keyBindProfiles ?? [] as profile (profile.id)}
                {@const isActive = neuzosConfig?.activeKeyBindProfileId === profile.id}
                <DropdownMenu.Item onclick={() => swapProfile(profile.id)} class="gap-2">
                  <Check class="size-4 {isActive ? 'opacity-100' : 'opacity-0'}"/>
                  {profile.name}
                </DropdownMenu.Item>
              {/each}
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Separator orientation="vertical" class="h-4"/>
        {#if sessionData?.mode === 'session'}
          <Button size="icon-xs" variant="outline" class="cursor-pointer" onclick={toggleFullscreen}>
            <Fullscreen class="size-3.5"/>
          </Button>
          <Separator orientation="vertical" class="h-4"/>
        {/if}
        <Button size="icon-xs" variant="outline" class="cursor-pointer" onclick={minimizeWindow}>
          <Minus class="size-3.5"/>
        </Button>
        <Button size="icon-xs" variant="outline" class="cursor-pointer" onclick={maximizeWindow}>
          <Maximize class="size-3.5"/>
        </Button>
        <Button size="icon-xs" variant="outline" class="cursor-pointer" onclick={requestCloseWindow}>
          <X class="size-3.5"/>
        </Button>
      </div>
    </div>
  {/if}

  <!-- Webview Content -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex-1 relative" onmouseenter={focusSessionWindowOnHover}>
    {#if sessionData}
      {#if !forceStopped && started}
        {#if getSrc().startsWith('https://flyff.wemadeconnect.com') && !koreanLinkFixed}
          <Button class="z-50 absolute bottom-2 right-2" size="xs" onclick={koreanLinkFix}>
            KR Fix - Once Logged & Page is Fully Loaded Press This Button
          </Button>
        {/if}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <webview
          bind:this={webview}
          src={getSrc()}
          partition={getPartition()}
          class="w-full h-full"
          webpreferences="nativeWindowOpen=no"
          useragent={userAgent}
          preload={webviewPreloadPath}
        ></webview>
      {:else}
        <div
          bind:this={webview}
          class="w-full h-full flex items-center flex-col gap-2 justify-center select-none"
        >
          <img src="flyffu-logo.png" alt="Flyff Universe Logo" class="w-1/2 max-w-32 pointer-events-none select-none"/>
          <Button variant="outline" onclick={() => startClient()}>Start Session
            - {sessionData.sessionConfig.label}</Button>
        </div>
      {/if}
    {:else}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading session...</p>
      </div>
    {/if}
  </div>

  <!-- Floating Exit Fullscreen Button -->
  {#if isFullscreen && neuzosConfig?.fullscreen?.hideTitleBarInSessionLayouts && sessionData?.mode === 'session'}
    <Button
      size="icon-sm"
      variant="secondary"
      class="absolute top-2 right-2 z-50 shadow-lg"
      onclick={toggleFullscreen}
    >
      <Minimize class="size-4"/>
    </Button>
  {/if}
</div>

<svelte:head>
  {#if sessionData}
    <title>NeuzOS - {sessionData.sessionConfig.label}</title>
  {:else}
    <title>NeuzOS - Loading Session...</title>
    {/if}
</svelte:head>
