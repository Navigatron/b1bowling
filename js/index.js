import {html, render as litRender} from 'https://unpkg.com/lit-html?module';
import * as database from './database.js';

// State

const leaderboardTarget = 'leaderboard-container';
const graphTarget = 'graph-container';
const consistentTarget = 'consistent-container';

const state = {
    leaderboardTarget: undefined,
    graph: {
        start: undefined,
        end: undefined,
        selectedPlayers: []
    }
};

// Render

async function renderConsistent(){
    let playerStats = await database.getStats();

    playerStats = playerStats
        .filter(r=>r.avg2wk!==0)
        .sort((a,b)=>a.stdDev2wk-b.stdDev2wk);

    let table = html`
        <table class="table is-striped unfuck">
            <thead>
                <th>Rank</th>
                <th>Player</th>
                <th>StdDev(2wk)</th>
            </thead>
            <tbody>
                ${playerStats.map((data, index)=>html`
                    <tr>
                        <td>${index+1}</td>
                        <td>${data.player}</td>
                        <td>${data.stdDev2wk.toFixed(2)}</td>
                    </tr>
                `)}
            </tbody>
        </table>
    `;
    litRender(table, state.consistentTarget);
}

async function renderLeaderboard(){
    let playerStats = await database.getStats();

    playerStats = playerStats
        .filter(r=>r.avg2wk!==0)
        .sort((a,b)=>b.avg2wk-a.avg2wk);

    let table = html`
        <table class="table is-striped">
            <thead>
                <th>Rank</th>
                <th>Player</th>
                <th>Avg(2wk)</th>
                <th>Avg(26wk)</th>
                <th>Delta</th>
                <th>Max</th>
                <th>Min</th>
            </thead>
            <tbody>
                ${playerStats.map((data, index)=>html`
                    <tr>
                        <td>${index+1}</td>
                        <td>${data.player}</td>
                        <td>${data.avg2wk.toFixed(2)}</td>
                        <td>${data.avg26wk.toFixed(2)}</td>
                        <td>
                            ${(()=>{
                                let delta = data.avg2wk-data.avg26wk;
                                let display = Math.abs(delta).toFixed(2)
                                return delta >= 0
                                    ? "+ "+display
                                    : "- "+display
                            })()}
                        </td>
                        <td>${data.max}</td>
                        <td>${data.min}</td>
                    </tr>
                `)}
            </tbody>
        </table>
    `;
    litRender(table, state.leaderboardTarget);
}

async function renderGraphComponent(){
    const players = await database.getPlayers();
    const graph = html`
        <!-- Time Selection -->
        <p>Select the graph time range</p>
        <div class="field is-grouped">
            <div class="control">
                <label>
                    <span>Start</span>
                    <input type="date" value="${state.graph.start}" @change=${setStart}>
                </label>
            </div>
            <div class="control">
                <label>
                    <span>End<span>
                    <input type="date" value="${state.graph.end}" @change=${setEnd}>
                </label>
            </div>
        </div>
        <!-- Player Selection -->
        <p>Select players to show</p>
        <div class="buttons">
            ${
                players.map(player=>state.graph.selectedPlayers.includes(player)
                    ? html`<button class="button is-info" @click=${()=>{deselect(player)}}>${player}</button>`
                    : html`<button class="button" @click=${()=>{select(player)}}>${player}</button>`
                )
            }
        </div>
        <button class="button is-success" @click=${drawTheChart}>Rebuild Graph</button>
        <canvas id='theChart' class="block"></canvas>
    `;
    litRender(graph, state.graphTarget);
}

function renderGraph(){
    renderGraphComponent().then(drawTheChart);
}

/// unused
function render(){
    renderLeaderboard();
    renderGraph();
}


async function drawTheChart(){
    let data = await database.getData();

    if(state.chart){
        state.chart.destroy();
        state.chart = undefined;
    }

    // filter by selected time range
    data = data.filter(row=>{
        let d = new Date(new Date(row.date).toLocaleDateString('en-US', {timezone: 'America/New_York'}).substring(0,10));
        return d >= new Date(state.graph.start) &&
            d <= new Date(state.graph.end);
    }).sort((a,b)=>a.gameStamp-b.gameStamp);

    const datasets = state.graph.selectedPlayers.map((player, index)=>{

        let rgb = HSVtoRGB(index/state.graph.selectedPlayers.length, 1, 1);
        let color = "#";
        color = color + rgb.r.toString(16).padStart(2, '0');
        color = color + rgb.g.toString(16).padStart(2, '0');
        color = color + rgb.b.toString(16).padStart(2, '0');

        return {
            label: player,
            data: data
                .filter(row=>row.player===player)
                .map(row=>({x:row.gameStamp,y:row.score})),
            fill: false,
            borderColor: color,
            tension: 0.1,
        };
    });

    state.chart = new Chart('theChart', {
        type: 'line',
        data: {
            datasets
        },
        options: {
            scales: {
                x: {
                    type: "linear"
                }
            }
        }
    });
}



// Transforms

function deselect(player){
    state.graph.selectedPlayers.splice(state.graph.selectedPlayers.indexOf(player), 1);
    renderGraphComponent();
}

function select(player){
    state.graph.selectedPlayers.push(player);
    renderGraphComponent();
}

function setStart(e){
    state.graph.start = e.target.value;
    console.log(e);
}

function setEnd(e){
    state.graph.end = e.target.value;
}

/// All the bullshit setup for the graph sector
async function initGraph(){
    const data = await database.getData();
    const pstats = await database.getStats();
    let twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);
    state.graph.start = twoWeeksAgo.toISOString().substring(0,10);
    console.log('graph start init to '+state.graph.start);
    state.graph.end = (new Date()).toISOString().substring(0,10);
    console.log('graph end init to '+state.graph.end);
    state.graph.selectedPlayers = pstats
        .filter(r=>r.avg2wk!==0)
        .map(r=>r.player);
    console.log('Selected Players', state.graph.selectedPlayers);
}

document.addEventListener('DOMContentLoaded', ()=>{
    state.leaderboardTarget = document.querySelector(`#${leaderboardTarget}`);
    state.graphTarget = document.querySelector(`#${graphTarget}`);
    state.consistentTarget = document.querySelector(`#${consistentTarget}`);

    initGraph().then(renderGraph).then(drawTheChart);

    renderLeaderboard();
    renderConsistent();
})

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR
 * h, s, v
*/
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
