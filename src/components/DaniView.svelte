<script lang="ts">
    import type { Dan, SongData } from "@taiko-wiki/taikowiki-api/types";
    import type { generateRandomDani } from "../module/randomDani";

    interface Props {
        dan: Dan;
        songs: Map<string, SongData>;
        result: ReturnType<typeof generateRandomDani>;
    }

    let { dan, songs, result }: Props = $props();

    export const difficultyColor = {
        easy: "#ff2703",
        normal: "#647e2f",
        hard: "#364938",
        oni: "#db1885",
        ura: "#7135db",
        oniura: "linear-gradient(rgb(219, 24, 133) 0%, rgb(219, 24, 133) 50%, rgb(113, 53, 219) 50%, rgb(113, 53, 219) 100% )",
    } as const;
</script>

<div class="result">
    <h2>
        {dan}
    </h2>
    <div class="song-container">
        {#each result.songs as selectedSong}
            {@const songData = songs.get(selectedSong.songNo)}
            {@const diff = selectedSong.diff}
            {#if songData}
                <a
                    class="song"
                    href={`https://taiko.wiki/song/${songData.songNo}?diff=${diff}`}
                    target="_blank"
                >
                    <div
                        class="song-diff"
                        style={`background-color:${difficultyColor[diff]};`}
                    >
                        ★{songData.courses[diff]?.level}
                    </div>
                    <div class="song-title">
                        <strong>{songData.title}</strong>
                        <span>({selectedSong.measure})</span>
                    </div>
                    <div class="song-notes">
                        {songData.courses[diff]?.maxCombo} notes
                    </div>
                </a>
            {/if}
        {/each}
    </div>
    <div class="others">
        <div class="avg">
            평균: {(result.songs.reduce((p, c) => p + c.measure, 0) / 3).toFixed(2)}
        </div>
    </div>
</div>

<style>
    .song-container{
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .song {
        width: 500px;
        max-width: 100%;

        margin: 5px 0;
        padding: 8px;
        color: inherit;
        text-decoration: none;

        display:flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        column-gap: 10px;
    }

    .song-diff{
        display:flex;
        justify-content: center;
        align-items: center;

        padding-inline: 8px;
        padding-top: 3px;
        padding-bottom: 5px;

        border-radius: 5px;
    }

    .others{
        font-size: 13px;
        color: rgb(190, 190, 190);
    }
</style>
