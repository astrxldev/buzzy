<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="widget-root">
  {@render children()}
</div>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    min-width: 0;
    min-height: 100%;
    overflow: hidden;
    background: transparent !important;
  }

  :global(body) {
    color: white;
  }

  .widget-root {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: transparent;
  }
</style>
