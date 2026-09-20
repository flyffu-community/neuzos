<script lang="ts">
  import {getContext, onMount} from "svelte";
  import type {MainWindowState} from "$lib/types";
  import * as Resizable from '$lib/components/ui/resizable'
  import {temporaryLayoutRendering} from '$lib/temporaryLayoutRendering.svelte';
  import NeuzClient from "../../Shared/NeuzClient.svelte";

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  let visibilityRefreshLease: ReturnType<typeof temporaryLayoutRendering.acquire> | null = null;
  let visibilityRefreshFrame: number | null = null;
  let visibilityReleaseFrame: number | null = null;

  const cancelVisibilityRefresh = () => {
    if (visibilityRefreshFrame !== null) cancelAnimationFrame(visibilityRefreshFrame);
    if (visibilityReleaseFrame !== null) cancelAnimationFrame(visibilityReleaseFrame);
    visibilityRefreshFrame = null;
    visibilityReleaseFrame = null;
    visibilityRefreshLease?.release();
    visibilityRefreshLease = null;
  };

  const refreshInactiveLayoutVisibility = () => {
    if (document.visibilityState === 'hidden') return;

    const inactiveLayoutIds = mainWindowState.tabs.layoutsIds.filter(
      (layoutId) => layoutId !== mainWindowState.tabs.activeLayoutId
    );
    if (inactiveLayoutIds.length === 0) return;

    cancelVisibilityRefresh();
    const lease = temporaryLayoutRendering.acquire(inactiveLayoutIds);
    visibilityRefreshLease = lease;
    visibilityRefreshFrame = requestAnimationFrame(() => {
      visibilityRefreshFrame = null;
      visibilityReleaseFrame = requestAnimationFrame(() => {
        visibilityReleaseFrame = null;
        if (visibilityRefreshLease !== lease) return;
        lease.release();
        visibilityRefreshLease = null;
      });
    });
  };

  onMount(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshInactiveLayoutVisibility();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshInactiveLayoutVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshInactiveLayoutVisibility);
      cancelVisibilityRefresh();
    };
  });
</script>

{#each mainWindowState.layouts as layout (layout.id)}
  {#if mainWindowState.tabs.layoutsIds.includes(layout.id)}
    {@const keepRenderedInBackground = temporaryLayoutRendering.layoutIds.includes(layout.id)}
    <div
      inert={layout.id !== mainWindowState.tabs.activeLayoutId}
      class="h-full w-full left-0 top-0 absolute bg-background select-none {layout.id === mainWindowState.tabs.activeLayoutId
          ? 'z-[39]'
          : keepRenderedInBackground
            ? 'z-[0] pointer-events-none'
            : 'z-[0] hidden'} overflow-hidden"
    >
      <Resizable.PaneGroup direction={layout.columnFirst ? "horizontal" : "vertical"} class="h-full w-full" autoSaveId={(layout.columnFirst ? 'cols_' : 'rows_') + layout.id}>
        {#each layout.rows as row, rowIndex}
          {@const existingSessionIds = row.sessionIds.filter((sid) => mainWindowState.sessions.some((s) => s.id === sid))}
          {#if existingSessionIds.length > 0}
            <Resizable.Pane>
              <Resizable.PaneGroup direction={layout.columnFirst ? "vertical" : "horizontal"} autoSaveId={(layout.columnFirst ? 'cells_' : 'cells_') + existingSessionIds[0]}>
                {#each existingSessionIds as sessionId, cellIndex}
                  {@const runtimeSession = mainWindowState.sessions.find((s) => s.id === sessionId)}
                  {@const session = mainWindowState.config.sessions.find((s) => s.id === sessionId) ?? runtimeSession}
                  {#if session}
                    {@const isLayoutFocused = mainWindowState.tabs.focusedLayoutSession?.layoutId === layout.id
                      && mainWindowState.tabs.focusedLayoutSession?.sessionId === session.id}
                    <Resizable.Pane>
                      <NeuzClient
                        layoutId={layout.id}
                        autofocusEnabled={layout.autoFocus ?? true}
                        session={session}
                        onUpdate={refreshInactiveLayoutVisibility}
                        onWebviewReady={refreshInactiveLayoutVisibility}
                        {isLayoutFocused}
                        onActivate={(sessionId) => {
                          mainWindowState.tabs.activeLayoutSession = {
                            layoutId: layout.id,
                            sessionId,
                          }
                        }}
                        src={session.srcOverwrite || 'https://universe.flyff.com/play'}
                        userAgent={mainWindowState.config.userAgent}
                      />
                    </Resizable.Pane>
                    {#if cellIndex < existingSessionIds.length - 1}
                      <Resizable.Handle disabled={layout.locked ?? false}/>
                    {/if}
                  {/if}
                {/each}
              </Resizable.PaneGroup>
            </Resizable.Pane>
            {#if rowIndex < layout.rows.length - 1}
              <Resizable.Handle disabled={layout.locked ?? false}/>
            {/if}
          {/if}
        {/each}
      </Resizable.PaneGroup>
    </div>
  {/if}
{/each}
