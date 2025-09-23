import { fetchMeasures } from "@taiko-wiki/taiko-rating";
import { Measure } from "@taiko-wiki/taiko-rating/types";
import TaikowikiApi from "@taiko-wiki/taikowiki-api";
import { Dan, DaniData } from "@taiko-wiki/taikowiki-api/types";
import readline from 'node:readline';

async function main() {
    const targetDans: Dan[] = ["10dan", "kuroto", "meijin", "chojin", "tatsujin"];
    const wiki = new TaikowikiApi();

    console.log('보면 상수를 가져오는 중입니다...');
    const { measureDataMap, songNoMeasureMap } = await getMeasures();

    console.log('단위도장 데이터를 가져오는 중입니다...');
    const range = await getRange(wiki, songNoMeasureMap, targetDans);

    while (true) {
        await generateRandomDani(targetDans, range, measureDataMap);
    }
}
main();

async function getMeasures() {
    const measures = await fetchMeasures();

    const measureDataMap = new Map<number, Measure[]>();
    const songNoMeasureMap = new Map<string, Partial<Record<Measure['diff'], Measure>>>();
    measures.forEach((measure) => {
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

async function getRange(wiki: TaikowikiApi, songNoMeasureMap: SongNoMeasureMap, targetDans: Dan[]): Promise<Range> {
    const daniDatas: DaniData[] = [];
    for (const version of ['25', '24', '23', '22', '21', '20', 'green']) {
        daniDatas.push(await wiki.dani(version))
    }

    const range = {
        recent5: {
            min: createZeroVector(targetDans.length),
            max: createZeroVector(targetDans.length),
            sum: createZeroVector(targetDans.length),
            avg: createZeroVector(targetDans.length)
        },
        recent7: {
            min: createZeroVector(targetDans.length),
            max: createZeroVector(targetDans.length),
            sum: createZeroVector(targetDans.length),
            avg: createZeroVector(targetDans.length)
        },
    }

    for (let i = 0; i < 5; i++) {
        const daniData = daniDatas[i];
        daniData.data.forEach((dani) => {
            const index = targetDans.indexOf(dani.dan);
            if (index === -1) return;

            for (const song of dani.songs) {
                const measure: Measure = (songNoMeasureMap.get(song.songNo) as any)?.[song.difficulty];
                if (!measure) continue;

                for (const type of ['recent5', 'recent7'] as const) {
                    if (range[type].min[index] === 0 || measure.measureValue < range[type].min[index]) {
                        range[type].min[index] = measure.measureValue;
                    }
                    if (measure.measureValue > range[type].max[index]) {
                        range[type].max[index] = measure.measureValue;
                    }
                    range[type].sum[index] += measure.measureValue;
                }
            }
        })
    }
    for (let i = 5; i < 7; i++) {
        const daniData = daniDatas[i];
        daniData.data.forEach((dani) => {
            const index = targetDans.indexOf(dani.dan);
            if (index === -1) return;

            for (const song of dani.songs) {
                const measure: Measure = (songNoMeasureMap.get(song.songNo) as any)?.[song.difficulty];
                if (!measure) continue;

                if (range.recent7.min[index] === 0 || measure.measureValue < range.recent7.min[index]) {
                    range.recent7.min[index] = measure.measureValue;
                }
                if (measure.measureValue > range.recent7.max[index]) {
                    range.recent7.max[index] = measure.measureValue;
                }
                range.recent7.sum[index] += measure.measureValue;
            }
        })
    }

    for (let i = 0; i < targetDans.length; i++) {
        range.recent5.avg[i] = range.recent5.sum[i] / (5 * 3);
        range.recent7.avg[i] = range.recent7.sum[i] / (7 * 3);
    }

    return range;
}

async function generateRandomDani(targetDans: Dan[], range: Range, measureDataMap: MeasureDataMap) {
    const answer = await readLine("\n단위를 선택해주세요\n" + targetDans.map((dan, i) => `${i + 1}. ${dan}`).join('\n') + '\n0. 종료\n');

    const index = Number(answer);
    if (Number.isNaN(index) || !Number.isInteger(index) || index < 0 || index > targetDans.length) {
        return console.log('올바르지 않은 값입니다.');
    }

    if(index === 0){
        return process.exit();
    }

    const border = getWeightBorder(index - 1, range, measureDataMap);
    
    const songs: {title: string, songNo: string, diff: 'oni' | 'ura', measure: number}[] = [];
    for(let i = 0; i < 3; i++){
        while(true){
            let rnd = Math.random();
            let measure: number = border[border.length - 1][0];
            for(const [measure_, borderValue] of border){
                if(rnd < borderValue){
                    measure = measure_;
                    break;
                }
            }

            const measureDatas = measureDataMap.get(measure);
            if(!measureDatas) continue;

            const measureData = measureDatas[Math.floor(Math.random() * measureDatas.length)];
            
            let includes = false;
            for(const song of songs){
                if(song.songNo === measureData.songno && song.diff === measureData.diff){
                    includes = true;
                    break;
                }
            }

            if(!includes){
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

    console.log('\n추첨된 곡: \n' + songs.map((song) => `${song.title}(${song.songNo}) ${song.diff}`).join('\n') + '\n');
}

let rl: readline.Interface
function readLine(question: string) {
    if (!rl) {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    return new Promise((res) => {
        rl.question(question, (answer) => res(answer));
    })
}

function getWeightBorder(danIndex: number, range: Range, measureDataMap: MeasureDataMap) {
    const weightMap = new Map<number, number>();
    
    // 최근 5버전 최대/최소
    const recent5Min = clamp(Math.ceil(range.recent5.min[danIndex] * 10) / 10);
    const recent5Max = clamp(Math.floor(range.recent5.max[danIndex] * 10) / 10);
    for(let i = recent5Min * 10; i <= recent5Max * 10; i++){
        weightMap.set(i / 10, 4);
    }

    // 최근 7버전 최대 최소
    const recent7Min = clamp(Math.ceil(range.recent7.min[danIndex] * 10) / 10);
    const recent7Max = clamp(Math.floor(range.recent7.max[danIndex] * 10) / 10);
    for(let i = recent7Min * 10; i <= recent7Max * 10; i++){
        const measure = i / 10;
        weightMap.set(measure, Math.max(weightMap.get(measure) ?? 0, 3));
    }

    // 최근 5버전 확장 최대 최소
    const recent5ExpandedMin = clamp(Math.ceil((range.recent5.min[danIndex] + range.recent5.avg[danIndex]) * 5) / 10);
    const recent5ExpandedMax = clamp(Math.floor((range.recent5.max[danIndex] + range.recent5.avg[danIndex]) * 5) / 10);
    for(let i = recent5ExpandedMin * 10; i <= recent5ExpandedMax * 10; i++){
        const measure = i / 10;
        weightMap.set(measure, Math.max(weightMap.get(measure) ?? 0, 2));
    }

    // 최근 7버전 확장 최대 최소
    const recent7ExpandedMin = clamp(Math.ceil((range.recent7.min[danIndex] + range.recent7.avg[danIndex]) * 5) / 10);
    const recent7ExpandedMax = clamp(Math.floor((range.recent7.max[danIndex] + range.recent7.avg[danIndex]) * 5) / 10);
    for(let i = recent7ExpandedMin * 10; i <= recent7ExpandedMax * 10; i++){
        const measure = i / 10;
        weightMap.set(measure, Math.max(weightMap.get(measure) ?? 0, 1));
    }

    let formerBorder = 0;
    const weightBorderMap = new Map<number, number>();
    const weightEntries = Array.from(weightMap.entries());
    for(let i = 0; i < weightEntries.length; i++){
        const [measure, weight] = weightEntries[i];

        const measureData = measureDataMap.get(measure);
        if(!measureData) continue;

        formerBorder += (weight * measureData.length);
        weightBorderMap.set(measure, formerBorder);
    };

    weightBorderMap.forEach((c, measure) => {
        weightBorderMap.set(measure, c / formerBorder);
    });

    return Array.from(weightBorderMap).toSorted((a, b) => a[1] - b[1]);
}

function createZeroVector(length: number) {
    const arr = [];
    for (let i = 0; i < length; i++) {
        arr.push(0);
    }
    return arr;
}

function clamp(value: number){
    return Math.max(Math.min(12, value), 1);
}

type MeasureDataMap = Map<number, Measure[]>;
type SongNoMeasureMap = Map<string, Partial<Record<Measure['diff'], Measure>>>;
type Range = {
    recent5: {
        min: number[];
        max: number[];
        sum: number[];
        avg: number[];
    };
    recent7: {
        min: number[];
        max: number[];
        sum: number[];
        avg: number[];
    };
}