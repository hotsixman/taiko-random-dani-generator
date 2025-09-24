import { fetchMeasures } from "@taiko-wiki/taiko-rating";
import type { Measure } from "@taiko-wiki/taiko-rating/types";
import TaikowikiApi from "@taiko-wiki/taikowiki-api";
import type { Dan, DaniData } from "@taiko-wiki/taikowiki-api/types";

export const wiki = new TaikowikiApi();

export function getMeasures(bannedSongs: { songNo: string, diff: "oni" | "ura" }[], measures: Measure[]) {
    const measureDataMap = new Map<number, Measure[]>();
    const songNoMeasureMap = new Map<string, Partial<Record<Measure['diff'], Measure>>>();
    measures.forEach((measure) => {
        let banned = false;
        for (const bannedSong of bannedSongs) {
            if (bannedSong.songNo === measure.songno && bannedSong.diff === measure.diff) {
                banned = true;
                break;
            }
        }
        if (banned) return;

        let dataArray = measureDataMap.get(measure.measureValue);
        if (!dataArray) {
            dataArray = [];
            measureDataMap.set(measure.measureValue, dataArray);
        }
        dataArray.push(measure);

        let measureObject = songNoMeasureMap.get(measure.songno);
        if (!measureObject) {
            measureObject = {};
            songNoMeasureMap.set(measure.songno, measureObject);
        }
        measureObject[measure.diff] = measure;
    });

    return { measureDataMap, songNoMeasureMap };
}

export async function getRange(songNoMeasureMap: SongNoMeasureMap, availableDans: Dan[]): Promise<Range> {
    const daniDatas: DaniData[] = [];
    for (const version of ['25', '24', '23', '22', '21', '20', 'green']) {
        daniDatas.push(await wiki.dani(version))
    }

    const range = {
        recent5: {
            min: createZeroVectors(availableDans.length),
            max: createZeroVectors(availableDans.length),
            sum: createZeroVectors(availableDans.length),
            avg: createZeroVectors(availableDans.length)
        },
        recent7: {
            min: createZeroVectors(availableDans.length),
            max: createZeroVectors(availableDans.length),
            sum: createZeroVectors(availableDans.length),
            avg: createZeroVectors(availableDans.length)
        },
    }

    for (let i = 0; i < 5; i++) {
        const daniData = daniDatas[i];
        daniData.data.forEach((dani) => {
            const index = availableDans.indexOf(dani.dan);
            if (index === -1) return;

            const daniSongMeasureDatas = dani.songs.map(({ songNo, difficulty }) => (songNoMeasureMap.get(songNo) as any)[difficulty] as Measure).toSorted((a, b) => a.measureValue - b.measureValue);

            daniSongMeasureDatas.forEach((measureData, ii) => {
                for (const type of ['recent5', 'recent7'] as const) {
                    if (range[type].min[index][ii] === 0 || measureData.measureValue < range[type].min[index][ii]) {
                        range[type].min[index][ii] = measureData.measureValue;
                    }
                    if (measureData.measureValue > range[type].max[index][ii]) {
                        range[type].max[index][ii] = measureData.measureValue;
                    }
                    range[type].sum[index][ii] += measureData.measureValue;
                }
            });
        })
    }
    for (let i = 5; i < 7; i++) {
        const daniData = daniDatas[i];
        daniData.data.forEach((dani) => {
            const index = availableDans.indexOf(dani.dan);
            if (index === -1) return;

            const daniSongMeasureDatas = dani.songs.map(({ songNo, difficulty }) => (songNoMeasureMap.get(songNo) as any)[difficulty] as Measure).toSorted((a, b) => a.measureValue - b.measureValue);

            daniSongMeasureDatas.forEach((measureData, ii) => {
                if (range.recent7.min[index][ii] === 0 || measureData.measureValue < range.recent7.min[index][ii]) {
                    range.recent7.min[index][ii] = measureData.measureValue;
                }
                if (measureData.measureValue > range.recent7.max[index][ii]) {
                    range.recent7.max[index][ii] = measureData.measureValue;
                }
                range.recent7.sum[index][ii] += measureData.measureValue;
            });
        })
    }

    for (let i = 0; i < availableDans.length; i++) {
        for (let ii = 0; ii < 3; ii++) {
            range.recent5.avg[i][ii] = range.recent5.sum[i][ii] / 5;
            range.recent7.avg[i][ii] = range.recent7.sum[i][ii] / 7;
        }
    }

    return range;
}

export function generateRandomDani(index: number, range: Range, measureDataMap: MeasureDataMap) {
    const border = getCulmulativeBorder(index, range);

    const songs: { title: string, songNo: string, diff: 'oni' | 'ura', measure: number }[] = [];
    for (let i = 0; i < 3; i++) {
        while (true) {
            let rnd = Math.random();
            let measure: number = border[i][border.length - 1][0];
            for (const [measure_, borderValue] of border[i]) {
                if (rnd < borderValue) {
                    measure = measure_;
                    break;
                }
            }

            const measureDatas = measureDataMap.get(measure);
            if (!measureDatas) continue;

            const measureData = measureDatas[Math.floor(Math.random() * measureDatas.length)];

            let includes = false;
            for (const song of songs) {
                if (song.songNo === measureData.songno && song.diff === measureData.diff) {
                    includes = true;
                    break;
                }
            }

            if (!includes) {
                songs.push({
                    title: measureData.title,
                    songNo: measureData.songno,
                    diff: measureData.diff,
                    measure: measureData.measureValue
                });
                break;
            }
        }
    }

    songs.sort((a, b) => a.measure - b.measure);

    return songs;
}

function getCulmulativeBorder(danIndex: number, range: Range) {
    return ([0, 1, 2] as const).map((i) => {
        // 최근 5버전 최대/최소
        const min = clamp(Math.ceil(range.recent5.min[danIndex][i] * 10) / 10);
        const max = clamp(Math.floor(range.recent5.max[danIndex][i] * 10) / 10);

        const avg = clamp(Math.round(range.recent5.avg[danIndex][i] * 10) / 10);

        const distribution = gaussianDistribution(min, max, avg, 2 / ((max - min) * 16));

        let culmulative = 0;
        const culmulativeBorder: [measureValue: number, border: number][] = [];
        for (let ii = 0; ii < distribution.length - 1; ii++) {
            culmulative += distribution[ii][1];
            culmulativeBorder.push([distribution[ii][0], culmulative]);
        }
        culmulativeBorder.push(([distribution[distribution.length - 1][0], 1]));

        return culmulativeBorder;
    })
}

function createZeroVectors(length: number): [number, number, number][] {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < length; i++) {
        arr.push([0, 0, 0]);
    }
    return arr;
}

function clamp(value: number) {
    return Math.max(Math.min(12, value), 1);
}

function gaussianDistribution(xMin: number, xMax: number, mu: number, k = 0.1) {
    const xs = [];
    for (let x = xMin; x <= xMax + 1e-9; x = Math.round((x + 0.1) * 10) / 10) {
        xs.push(parseFloat(x.toFixed(1)));
    }

    const sigma = k * (xMax - xMin);
    const weights = xs.map(x => Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)));
    const sum = weights.reduce((a, b) => a + b, 0);

    const dist = new Map<number, number>();
    xs.forEach((x, i) => dist.set(x, weights[i] / sum));

    return Array.from(dist.entries()).toSorted((a, b) => a[0] - b[0]);
}


type MeasureDataMap = Map<number, Measure[]>;
type SongNoMeasureMap = Map<string, Partial<Record<Measure['diff'], Measure>>>;
type Range = {
    recent5: {
        min: [number, number, number][];
        max: [number, number, number][];
        sum: [number, number, number][];
        avg: [number, number, number][];
    };
    recent7: {
        min: [number, number, number][];
        max: [number, number, number][];
        sum: [number, number, number][];
        avg: [number, number, number][];
    };
}