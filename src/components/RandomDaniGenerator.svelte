<script lang="ts">
    import type { Measure } from "@taiko-wiki/taiko-rating/types";
    import type { Dan, SongData } from "@taiko-wiki/taikowiki-api/types";
    import { generateRandomDani, getMeasures, getRange } from "../module/randomDani";
    import DaniView from "./DaniView.svelte";

    interface Props {
        songs: Map<string, SongData>;
        availableDans: Dan[];
        bannedSongs: { songNo: string; diff: "oni" | "ura" }[];
        measures: Measure[];
    }

    let { songs, availableDans, bannedSongs, measures }: Props = $props();
    let { measureDataMap, songNoMeasureMap } = $derived(
        getMeasures(bannedSongs, measures),
    );
    let range = $derived(getRange(songNoMeasureMap, availableDans));
    let targetDan = $state<Dan>("10dan");
    // svelte-ignore state_referenced_locally
    let dan = $state<Dan>($state.snapshot(targetDan));
    let selectedSongs = $state<ReturnType<typeof generateRandomDani> | null>(null);
    
    async function generate(){
        selectedSongs = generateRandomDani(availableDans.indexOf(targetDan), await range, measureDataMap);
        dan = targetDan;
    }
</script>

<h1>🥁 태고의 달인 랜덤 단위 생성기 🎶</h1>

<div>
    <select bind:value={targetDan}>
        {#each availableDans as dan}
            <option value={dan}>{dan}</option>
        {/each}
    </select>
</div>
<div>
    <button onclick={generate}>단위 생성</button>
</div>

{#if selectedSongs}
    <DaniView {dan} {songs} {selectedSongs}/>
{/if}

<style>
    select,
    button {
        padding: 10px 15px;
        font-size: 16px;
        margin: 10px;
        border: none;
        border-radius: 5px;
        outline: none;
    }
    select {
        background-color: #1e1e1e;
        color: #f5f5f5;
    }
    button {
        background-color: #0074d9;
        color: white;
        cursor: pointer;
        padding-bottom: 9px;
    }
    button:hover {
        background-color: #005fa3;
    }
</style>
