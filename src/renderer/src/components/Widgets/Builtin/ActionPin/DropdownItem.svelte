<script lang="ts">
  import {onMount} from 'svelte';
  import {Check, Eye, Settings, Swords} from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import {
    ACTION_PINS_VISIBILITY_CHANGED_EVENT,
    readActionPinsVisible,
    writeActionPinsVisible
  } from '$lib/localStorageStores';

  type Props = {
    onManagePins?: () => void;
  };

  let {onManagePins}: Props = $props();

  let showActionPins = $state(true);

  function toggleActionPinsVisibility() {
    showActionPins = !showActionPins;
    writeActionPinsVisible(showActionPins);
  }

  onMount(() => {
    const refreshVisibility = () => {
      showActionPins = readActionPinsVisible();
    };

    refreshVisibility();
    window.addEventListener(ACTION_PINS_VISIBILITY_CHANGED_EVENT, refreshVisibility);
    window.addEventListener('storage', refreshVisibility);

    return () => {
      window.removeEventListener(ACTION_PINS_VISIBILITY_CHANGED_EVENT, refreshVisibility);
      window.removeEventListener('storage', refreshVisibility);
    };
  });
</script>

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger>
    <Swords class="mr-2 size-4" />
    <span>Action Pins</span>
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent side="right" class="min-w-44">
    <DropdownMenu.Item onclick={() => onManagePins?.()}>
      <Settings class="mr-2 size-4" />
      <span>Manage Pins</span>
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item
      onSelect={(event) => event.preventDefault()}
      onclick={toggleActionPinsVisibility}
    >
      <Eye class="mr-2 size-4" />
      <span>Show Pins</span>
      {#if showActionPins}
        <Check class="ml-auto size-4" />
      {/if}
    </DropdownMenu.Item>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>
