
/*
{
    "date": "2019-11-18T02:30:00.000Z",
    "game": 1,
    "player": "EthanW",
    "score": 123
},
*/

// state

const dataURL = 'https://jsonstorage.net/api/items/c6292139-209e-4b0c-93ad-51d40deec1b2';

let myDataPromise = loadData();
let players = myDataPromise.then(data=>{
    return [...new Set(data.map(row=>row.player))].sort();
});
let playerStats = Promise.all([myDataPromise, players]).then(calculateStats);

// Render

export async function getData(){
    return myDataPromise;
}

export async function getPlayers(){
    return players;
}

export async function getStats(){
    return playerStats;
}

// Transform

async function loadData(){
    return fetch(dataURL).then(r=>r.json()).then(data=>{
        // add the "gameIndex" field
        data.forEach(row=>{
            row.gameStamp = new Date(
                (new Date(row.date).toLocaleDateString('en-US', {timezone: 'America/New_York'}))
            ).toISOString().substring(0,10)+'-'+(""+row.game).padStart(2, '0');
        });

        let gameStamps = [...new Set(data.map(row=>row.gameStamp))].sort();

        data.forEach(row=>{
            row.gameStamp = gameStamps.indexOf(row.gameStamp);
        });

        return data;
    });
}

function calculateStats([data, players]){
    const stats = [
        // {player, avgAll, avg2wk, avg26wk, max, min}
    ];

    let twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);

    let sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate()-182);

    players.forEach(player=>{
        const playerData = data.filter(d=>d.player===player);
        const playerStats = {player};

        // 2 week stats
        let twoWeekData = playerData.filter(s=>new Date(s.date)>=twoWeeksAgo);
        playerStats.max2wk = twoWeekData.reduce((a,i)=>a>i.score?a:i.score, 0);
        playerStats.min2wk = twoWeekData.reduce((a,i)=>a<i.score?a:i.score, 300);
        playerStats.avg2wk = twoWeekData
            .reduce((a,i, _, s)=>a+i.score/s.length, 0);
        playerStats.stdDev2wk = Math.sqrt(twoWeekData
            .map(r=>(r.score-playerStats.avg2wk)**2)
            .reduce((a,i, _, s)=>a+i/s.length, 0));

        // 26 week stats
        let sixMonthData = playerData.filter(s=>new Date(s.date)>=sixMonthsAgo);
        playerStats.max26wk = sixMonthData.reduce((a,i)=>a>i.score?a:i.score, 0);
        playerStats.min26wk = sixMonthData.reduce((a,i)=>a<i.score?a:i.score, 300);
        playerStats.avg26wk = sixMonthData
            .reduce((a,i, _, s)=>a+i.score/s.length, 0);
        playerStats.stdDev26wk = Math.sqrt(sixMonthData
            .map(r=>(r.score-playerStats.avg26wk)**2)
            .reduce((a,i, _, s)=>a+i/s.length, 0));

        // All time stats
        playerStats.max = playerData.reduce((a,i)=>a>i.score?a:i.score, 0);
        playerStats.min = playerData.reduce((a,i)=>a<i.score?a:i.score, 300);
        playerStats.avgAll = playerData
            .reduce((a,i, _, s)=>a+i.score/s.length, 0);
        playerStats.stdDevAll = Math.sqrt(playerData
            .map(r=>(r.score-playerStats.avgAll)**2)
            .reduce((a,i, _, s)=>a+i/s.length, 0));

        // More? Average Scores by Game
        playerStats.avgGame1 = sixMonthData
            .filter(r=>r.game===1)
            .reduce((a,i, _, s)=>a+i.score/s.length, 0);
        playerStats.avgGame2 = sixMonthData
            .filter(r=>r.game===2)
            .reduce((a,i, _, s)=>a+i.score/s.length, 0);
        playerStats.avgGame3 = sixMonthData
            .filter(r=>r.game===3)
            .reduce((a,i, _, s)=>a+i.score/s.length, 0);

        // More? Deltas between games. This one is complex.
        const deltaLines = [];
        let deltaT = [];
        sixMonthData.sort((a,b)=>{
            return a.gameStamp - b.gameStamp;
        }).forEach(row=>{
            if(row.game===1 && deltaT.length!==0){
                deltaLines.push(deltaT);
                deltaT = [];
            }
            deltaT.push(row.score);
        });
        deltaLines.push(deltaT);
        deltaLines.forEach(sequence=>{
            for(let i=sequence.length-1; i>=0; i--){
                sequence[i]-=sequence[0];
            }
        });
        playerStats.gamexStories = deltaLines;

        // Store
        stats.push(playerStats);
    });

    return stats;
}
