<script lang="ts">
  type Character = {
    name: string;
    image: string;
    stars?: number | null;
  };

  let {
    char,
    scale = 1,
    selected = true,
  }: { char: Character; scale?: number; selected?: boolean | 0 } = $props();
  const starPath =
    "M381.2 150.3l143.7 21.2c11.9 1.7 21.9 10.1 25.7 21.6 3.8 11.6.7 24.2-7.9 32.8L438.5 328.1l24.6 146.6c2 12-2.9 24.2-12.9 31.3-9.9 7.1-23 8-33.7 2.3l-128.4-68.5-128.3 68.5c-10.8 5.7-23.9 4.8-33.8-2.3-9.9-7.1-14.9-19.3-12.8-31.3l24.6-146.6L33.58 225.9c-8.61-8.6-11.67-21.2-7.89-32.8 3.77-11.5 13.74-19.9 25.73-21.6L195 150.3l64.4-132.33C264.7 6.954 275.9-.04 288.1-.04c12.3 0 23.5 6.994 28.8 18.01l64.3 132.33z";
  let imageBackground = $derived(
    char.stars === 5
      ? "rgb(200,124,36)"
      : char.stars === 4
        ? "rgb(148,112,187)"
        : "rgb(100,100,100)",
  );
</script>

<div
  class="transition-opacity hover:opacity-80"
  class:opacity-40={typeof selected === "boolean" && !selected}
  style={`width: ${128 * scale}px; height: ${168 * scale}px;`}
>
  <div
    class="relative flex w-[128px] flex-col overflow-hidden rounded-lg bg-[#e9e5dc]"
    style={`transform: scale(${scale}); transform-origin: 0 0;`}
  >
    <img
      class="h-[128px] w-[128px] rounded-br-3xl object-cover"
      style={`background: ${imageBackground} linear-gradient(136deg, rgba(49,43,71,.5294117647058824), transparent); filter: ${char.stars ? "" : "grayscale(100%) opacity(10%) blur(2px)"}`}
      src={`/cdn/${char.image}`}
      alt={char.name}
    />
    <div class="flex h-10 items-center justify-center overflow-hidden px-2 text-center font-bold text-[#4a5366]">
      <span class="truncate">{char.name}</span>
    </div>
    <div class="absolute top-28 flex w-full justify-center">
        {#each { length: char.stars || 0 } as _, index (index)}
        <svg
          class="size-5"
          style="fill: rgba(255,204,50); filter: drop-shadow(#e3721b 0px 0px 1px);"
          viewBox="0 0 576 512"
          aria-label={`${index + 1} star`}
        >
          <title>Star</title>
          <path d={starPath}></path>
        </svg>
      {/each}
    </div>
  </div>
</div>
