import { Dan } from "@taiko-wiki/taikowiki-api/types";
import readline from 'node:readline';
import { generateRandomDani, getMeasures, getRange } from '../src/module/randomDani.js';
import { fetchMeasures } from "@taiko-wiki/taiko-rating";

async function main() {
    const availableDans: Dan[] = ["10dan", "kuroto", "meijin", "chojin", "tatsujin"];
    const bannedSongs: { songNo: string, diff: "oni" | "ura" }[] = [
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

    console.log('보면 상수를 가져오는 중입니다...');
    const { measureDataMap, songNoMeasureMap } = getMeasures(bannedSongs, await fetchMeasures());

    console.log('단위도장 데이터를 가져오는 중입니다...');
    const range = await getRange(songNoMeasureMap, availableDans);

    while (true) {
        try {
            const index = await getIndex(availableDans);
            const {songs} = generateRandomDani(index - 1, range, measureDataMap);
            console.log('\n추첨된 곡: \n' + songs.map((song) => `${song.title}(${song.songNo}) ${song.diff}`).join('\n') + '\n');
        }
        catch (err) {
            console.error(err);
        }
    }
}
main();

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

async function getIndex(availableDans: Dan[]) {
    const answer = await readLine("\n단위를 선택해주세요\n" + availableDans.map((dan, i) => `${i + 1}. ${dan}`).join('\n') + '\n0. 종료\n');

    const index = Number(answer);
    if (Number.isNaN(index) || !Number.isInteger(index) || index < 0 || index > availableDans.length) {
        throw ('올바르지 않은 값입니다.');
    }

    if (index === 0) {
        process.exit();
    }

    return index;
}