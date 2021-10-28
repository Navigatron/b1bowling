import {html, render as litRender} from 'https://unpkg.com/lit-html@1.4.1?module';
import * as database from './database.js';

// state

const renderTargetID = 'target';

const state = {
    target: undefined,
    selectedPlayer: null,
    chart: undefined
};

// render

async function statsPage(){

    let stats = await database.getStats();
    let pstats = stats.find(r=>r.player===state.selectedPlayer);

    let rank = stats
        .sort((a,b)=>b.avg2wk-a.avg2wk)
        .findIndex(a=>a.player===state.selectedPlayer)
        +1;

    // Leaderboard Rank
    // Graffy goes here
    // 2-week stats (avg, stdDev, deltas)
    // 26-week stats (avg, stdDev, delta)
    let graphStrings = [
        "Graph:",
        "Graph goes here:",
        "//TODO: Render Graph",
        "Giraph",
        "Graphy-Taphy",
        "Chart",
        "Points and Lines and Such",
        "Crayon",
    ];

    let header = html`
        <h2 class="title is-2">Statistics for ${state.selectedPlayer}</h2>
        ${rank===1?html`
            <div class="notification block is-warning has-text-centered">
                <strong>${state.selectedPlayer.toUpperCase()} IS THE CEO OF BOWLING</strong>
            </div>
        `:``}
        ${pstats.avg2wk!==0 // little chunk of write-only code right here lol
            ? html`<p>${state.selectedPlayer} is in position <b>${rank}</b> on the leaderboard.</p>`
            : html`<p>${state.selectedPlayer} is not on the leaderboard.</p>`
        }
        <p>${graphStrings[Math.floor(Math.random()*graphStrings.length)]}</p>
        <canvas id='playerChart'></canvas>
    `;

    let bestGame = pstats.avgGame1 >= pstats.avgGame2
        ? pstats.avgGame1 >= pstats.avgGame3
            ? "1"
            : "3"
        : pstats.avgGame2 >= pstats.avgGame3
            ? "2"
            : "3";

    let gamex = html`
        <h3 class="title is-3">${state.selectedPlayer} is a game ${bestGame} player.</h3>
        <canvas id="gamexChart"></canvas>
    `;

    let twoWeek = html`
        <h3 class="title is-3">Two-Week Data</h3>
        <div class="table-container">
            <table class="table unfuck">
                <tbody>
                    <tr>
                        <td><b>Max</b></td>
                        <td>${pstats.max2wk}</td>
                    </tr>
                    <tr>
                        <td><b>Average</b></td>
                        <td>${pstats.avg2wk.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><b>Min</b></td>
                        <td>${pstats.min2wk}</td>
                    </tr>
                    <tr>
                        <td><b>Standard Deviation</b></td>
                        <td>${pstats.stdDev2wk.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><b>Delta from 6mo avg</b></td>
                        <td>
                            ${(()=>{
                                let delta = pstats.avg2wk-pstats.avg26wk;
                                let score = Math.abs(delta);
                                return delta >= 0
                                    ? "+ "+score.toFixed(2)
                                    : "- "+score.toFixed(2)
                            })()}
                        </td>
                    </tr>
                    <tr>
                        <td><b>Delta from all-time avg</b></td>
                        <td>
                            ${(()=>{
                                let delta = pstats.avg2wk-pstats.avgAll;
                                let score = Math.abs(delta);
                                return delta >= 0
                                    ? "+ "+score.toFixed(2)
                                    : "- "+score.toFixed(2)
                            })()}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    let sixMonth = html`
        <h3 class="title is-3">Six-Month Data</h3>
        <div class="table-container">
            <table class="table unfuck">
                <tbody>
                    <tr>
                        <td><b>Max</b></td>
                        <td>${pstats.max26wk}</td>
                    </tr>
                    <tr>
                        <td><b>Average</b></td>
                        <td>${pstats.avg26wk.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><b>Min</b></td>
                        <td>${pstats.min26wk}</td>
                    </tr>
                    <tr>
                        <td><b>Standard Deviation</b></td>
                        <td>${pstats.stdDev26wk.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><b>Delta from all-time avg</b></td>
                        <td>
                            ${(()=>{
                                let delta = pstats.avg26wk-pstats.avgAll;
                                let score = Math.abs(delta);
                                return delta >= 0
                                    ? "+ "+score.toFixed(2)
                                    : "- "+score.toFixed(2)
                            })()}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    let allTime = html`
        <h3 class="title is-3">All-Time Data</h3>
        <div class="table-container">
            <table class="table unfuck">
                <tbody>
                    <tr>
                        <td><b>Max</b></td>
                        <td>${pstats.max}</td>
                    </tr>
                    <tr>
                        <td><b>Average</b></td>
                        <td>${pstats.avgAll.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><b>Min</b></td>
                        <td>${pstats.min}</td>
                    </tr>
                    <tr>
                        <td><b>Standard Deviation</b></td>
                        <td>${pstats.stdDevAll.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    return html`
        ${header}
        ${gamex}
        ${twoWeek}
        ${sixMonth}
        ${allTime}
    `;
}

async function drawPlayerChart(){
    const data = await database.getData();

    if(state.chart){
        state.chart.destroy();
        state.chart = undefined;
    }

    let maData = data
        .filter(row=>row.player===state.selectedPlayer)
        .map(row=>({x:row.gameStamp,y:row.score}));

    state.chart = new Chart('playerChart', {
        type: 'line',
        data: {
            datasets: [{
                label: 'Scores',
                data: maData,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
            }]
        },
        options: {
            scales: {
                x: {
                    type: "linear"
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function drawGamexChart(){
    const stats = await database.getStats();
    const pstats = stats.find(r=>r.player===state.selectedPlayer);

    if(state.gamexChart){
        state.gamexChart.destroy();
        state.gamexChart = undefined;
    }

    let datasets = pstats.gamexStories.map(story=>{
        return {
            label: 'Change from Game 1',
            data: story.map((y,x)=>({x:x+1,y})),
            fill: false,
            //borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        };
    });

    datasets.push({
        label: 'Average Change from Game 1',
        data: [
            {x: 1, y:0},
            {x: 2, y:pstats.avgGame2-pstats.avgGame1},
            {x: 3, y:pstats.avgGame3-pstats.avgGame1},
        ],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
    });

    state.gamexChart = new Chart('gamexChart', {
        type: 'line',
        data: {
            datasets
        },
        options: {
            scales: {
                x: {
                    type: "linear"
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function render(){

    const players = await database.getPlayers();

    const page = html`
        <select class="select" @change=${selectPlayer}>
            <option disabled selected>-- select --</option>
            ${players.map(p=>html`
                <option>${p}</option>
            `)}
        </select>
        ${state.selectedPlayer!==null?await statsPage():``}
    `;

    litRender(page, state.target);

    if(state.selectedPlayer!==null){
        drawPlayerChart();
        drawGamexChart();
    }
}

// Transform

function selectPlayer(e){
    // console.log(e);
    state.selectedPlayer = e.srcElement.value;
    render();
}

document.addEventListener('DOMContentLoaded', ()=>{
    state.target = document.querySelector('#'+renderTargetID);
    render();
});
