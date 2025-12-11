<script>
  import { appState } from "$lib/state.svelte.js";
  import MainView from "$lib/components/MainView.svelte";
  import ConfigView from "$lib/components/ConfigView.svelte";

  $effect(() => {
    appState.initialize();
  });
</script>

<div class="container">
  {#if !appState.configVisible}
    <MainView />
  {/if}
  {#if appState.configVisible}
    <ConfigView />
  {/if}
</div>


