<script lang="ts">
    import type { Dan, SongData } from "@taiko-wiki/taikowiki-api/types";
    import { getMeasures, wiki } from "./module/randomDani";
    import RandomDaniGenerator from "./components/RandomDaniGenerator.svelte";
    import { fetchMeasures } from "@taiko-wiki/taiko-rating";

    const availableDans: Dan[] = [
        "10dan",
        "kuroto",
        "meijin",
        "chojin",
        "tatsujin",
    ];
    const bannedSongs: { songNo: string; diff: "oni" | "ura" }[] = [
        { songNo: "993", diff: "ura" },
        { songNo: "120", diff: "oni" },
        { songNo: "1278", diff: "oni" },
        { songNo: "518", diff: "oni" },
        { songNo: "1236", diff: "oni" },
        { songNo: "778", diff: "oni" },
        { songNo: "993", diff: "oni" },
        { songNo: "1201", diff: "ura" },
        { songNo: "402", diff: "ura" },
        { songNo: "84", diff: "ura" },
        { songNo: "831", diff: "ura" },
        { songNo: "266", diff: "ura" },
        { songNo: "811", diff: "ura" },
        { songNo: "433", diff: "ura" },
        { songNo: "1265", diff: "ura" },
    ];

    const songFetchPromise = wiki.songAll().then((songs) => {
        const songMap = new Map<string, SongData>();
        songs.forEach((song) => {
            songMap.set(song.songNo, song);
        })
        return songMap;
    })
</script>

<svelte:head>
    <title>태고의 달인 랜덤 단위 생성기</title>
</svelte:head>

{#await Promise.all([fetchMeasures(), songFetchPromise])}
    로딩중
{:then [measures, songs]}
    <RandomDaniGenerator {songs} {availableDans} {bannedSongs} {measures}/>
{/await}