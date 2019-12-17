'use strict';

// ----- Constants -----

// where to download the json from
const databaseUrl = 'https://api.myjson.com/bins/7n5cw';

// where to build the graph
const canvasID = 'myChart';

// ----- Global State -----

// where we shall store the chart
let myChart;

// ----- functions -----

// Get the json database from the database URL
const getDatabase = async () => {
	let response = await fetch(databaseUrl);
	return response.json();
};

// Given the entire database, map it to a list of unique games.
const calcGamesList = database => {
	// store deduped game info here
	let games = [];

	// convert to just game info
	// add to results if unique
	database.map(score=>{
		return {
			date: score.date, // what the actual fuck is happening on this line
			game: score.game
		};
	}).forEach(possibleGame=>{
		// only add if doesn't exist
		if(games.findIndex(existingGame=>
			possibleGame.date===existingGame.date && possibleGame.game === existingGame.game
		)===-1){
			games.push(possibleGame);
		}
	});

	// that's all.
	return games;
};

// Take a list of games {date, game} and sort it.
const sortGamesList = games => {
	return games.sort((g1,g2)=>{
		let d1 = new Date(g1.date);
		let d2 = new Date(g2.date);
		// compare by date first, then game number.
		if((d1-d2)!==0) return (d1-d2);
		return g1.game - g2.game;
	});
};

// take the whole database and return a list of players
const getPlayersList = database => {
	return [...new Set(database.map(s=>s.player))].sort();
};

// here's a function to make colors
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

// Take info and make the graph
const makeGraph = (players, games, database)=>{
	// we need like, a dataset var???
	// datasets: lines
	// lines: {label, data, borderColor, fill, spanGaps}
	// data: {x,y}
	let dataset = [];
	players.forEach((p,i)=>{
		// convert name to color
		let rgb = HSVtoRGB(i/players.length, 1, 1);
		let color = "#";
		color = color + rgb.r.toString(16).padStart(2, '0');
		color = color + rgb.g.toString(16).padStart(2, '0');
		color = color + rgb.b.toString(16).padStart(2, '0');
		// create a new dataset
		dataset.push({
			label: p,
			data: [],
			borderColor: color,
			fill: false,
			spanGaps: true
		});
	});
	// Iterate over scores, add point to correct place.
	database.forEach(score=>{
		// where to put this
		let dataArray = dataset.find(l=>l.label===score.player).data;
		// x-value
		let x = games.findIndex(g=>g.date===score.date&&g.game===score.game);
		// put!
		dataArray.push({
			x,
			y: score.score
		});
	})
	// now get it on the page, yo.
	let ctx = document.getElementById(canvasID);
	myChart = new Chart(ctx, {
		type: 'line',
	    data: {
	        datasets: dataset
	    },
		options:{
			scales: {
				xAxes: [{
					type: 'linear'
				}]
			}
		}
	});
};

// Put some shit in a table
const putTable = (tableID, data) => {
	let tableBody = document.getElementById(tableID);
	// use keys to append header row
	let headerRow = document.createElement('tr');
	Object.keys(data[0]).forEach(k=>{
		let header = document.createElement('th');
		header.appendChild(document.createTextNode(k));
		headerRow.appendChild(header);
	});
	tableBody.appendChild(headerRow);
	data.forEach(d=>{
		let dataRow = document.createElement('tr');
		Object.keys(d).forEach(k=>{
			let cell = document.createElement('td');
			cell.appendChild(document.createTextNode(d[k]));
			dataRow.appendChild(cell);
		});
		tableBody.appendChild(dataRow);
	});
};

// Get the leaderboard table up there.
const makeLeaderboardTable = (players, database)=>{
	let rows = [];
	// we need this
	let twoWeeksAgo = new Date();
	twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);
	console.log('Calculating twk avgs from '+twoWeeksAgo.toLocaleString());
	// part 1: assemble stats
	players.forEach(player=>{
		let row = {};
		row.name = player;
		let playerScores = database.filter(s=>s.player===player);
		let twoWeekScores = playerScores.filter(s=>new Date(s.date)>=twoWeeksAgo);
		if(twoWeekScores.length===0){
			return; // exclude from leaderboard
		}
		// 2wk avg
		row.avg2wk = twoWeekScores
			.map(s=>s.score)
			.reduce((a,i, _, s)=>a+i/s.length, 0);
		// all time avg
		row.avgAll = playerScores
			.map(s=>s.score)
			.reduce((a,i, _, s)=>a+=i/s.length, 0);
		// max
		row.max = playerScores
			.map(s=>s.score)
			.reduce((a,i)=>a>i?a:i, 0);
		// min
		row.min = playerScores
			.map(s=>s.score)
			.reduce((a,i)=>a<i?a:i, 300);
		rows.push(row);
	});
	// sort by 2wk and add rank
	rows.sort((r1,r2)=>{
		return r2.avg2wk-r1.avg2wk;
	});
	rows.forEach((r,i)=>r.rank=i+1);
	// part 2: sort keys for display
	rows = rows.map(row=>{
		return {
			Rank: row.rank,
			Player: row.name,
			TwoWeekAvg: row.avg2wk.toFixed(2),
			AllTimeAvg: row.avgAll.toFixed(2),
			Delta: (row.avg2wk-row.avgAll).toFixed(2),
			Max: row.max,
			Min: row.min
		};
	});
	// Put a plus on positive trends
	rows.forEach(row=>{
		if(row.Delta>=0){
			row.Delta = "+"+row.Delta;
		}
	})
	// part 3: get it in there
	putTable('leaderboard',rows);
};

// x-axis map, idk if anyone cares about this but like why not
let makeXMap = (games) => {
	let data = games.map((g,i)=>{
		return {
			Index: i,
			Date: g.date,
			Game: g.game
		};
	});
	putTable('xmaptable',data);
};

// ----- main, yo. -----

// kickoff this shitshow
const main = async () => {
	let database = await getDatabase();
	let games = calcGamesList(database);
	games = sortGamesList(games);
	let players = getPlayersList(database);
	makeGraph(players, games, database);
	// get the database on the page
	putTable('datatable', database);
	// Let's get that leaderboard table in there
	makeLeaderboardTable(players, database);
	// x axis map is last i guess
	makeXMap(games);
};

// call main
window.addEventListener('load', ()=>{main()});
