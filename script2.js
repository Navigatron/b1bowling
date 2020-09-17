'use strict';

// ----- Constants -----

// where to download the json from
// const databaseUrl = 'https://api.myjson.com/bins/7n5cw';
const databaseUrl = 'https://jsonstorage.net/api/items/c6292139-209e-4b0c-93ad-51d40deec1b2';

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


/*
name: calcGamesList
desc: Makes a list of unique games
takes: the database
returns:
[
	{
		date: 'YYYY-MM-DD' (Local Time),
		game: X
	}
]
*/
const calcGamesList = database => {
	// store deduped game info here
	let games = [];

	// convert to just game info
	// add to results if unique
	database.map(record=>{
		return {
			date: record.displayDate,
			game: record.game
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
// TODO - database dates are in UTC, but, that shouldn't change the order I guess
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
	// To make a graph, we need datasets.
	// datasets: lines
	// line: {label, data, borderColor, fill, spanGaps}
	// data: {x,y}
	let dataset = [];
	// Each player gets a line
	players.forEach((player,index)=>{
		// convert name to color, using index as hue. Max saturation and brightness.
		let rgb = HSVtoRGB(index/players.length, 1, 1);
		let color = "#";
		color = color + rgb.r.toString(16).padStart(2, '0');
		color = color + rgb.g.toString(16).padStart(2, '0');
		color = color + rgb.b.toString(16).padStart(2, '0');
		// create a new "dataset" (line)
		dataset.push({
			label: player,
			data: [],
			borderColor: color,
			fill: false,
			spanGaps: true
		});
	});
	// Each record in the data becomes a point on a line
	database.forEach(record=>{
		// Determine which line to put this on (player name)
		let dataArray = dataset.find(l=>l.label===record.player).data;
		// x-value: The index of the game
		let x = games.findIndex(g=>g.date===record.displayDate&&g.game===record.game);
		// put!
		dataArray.push({
			x,
			y: record.score
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
	if(data.length===0){
		console.log('No data for table '+tableID);
		return;
	}
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
	// we need this to calculate two-week averages
	let twoWeeksAgo = new Date();
	twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);
	console.log('Calculating twk avgs from '+twoWeeksAgo.toLocaleString());
	// part 1: assemble stats by player
	players.forEach(player=>{
		let row = {};
		row.name = player;
		let playerScores = database.filter(s=>s.player===player);
		let twoWeekScores = playerScores.filter(s=>s.date>=twoWeeksAgo).map(s=>s.score);
		playerScores = playerScores.map(s=>s.score);
		if(twoWeekScores.length===0){
			console.log('No two-week scores for '+player);
			return; // exclude from leaderboard
		}else{
			console.log('Found '+twoWeekScores.length+' scores for '+player);
		}
		// 2wk avg
		row.avg2wk = twoWeekScores.reduce((a,i, _, s)=>a+i/s.length, 0);
		// all time avg
		row.avgAll = playerScores.reduce((a,i, _, s)=>a+=i/s.length, 0);
		// max
		row.max = playerScores.reduce((a,i)=>a>i?a:i, 0);
		// min
		row.min = playerScores.reduce((a,i)=>a<i?a:i, 300);
		rows.push(row);
	});
	// sort rows by 2wk avg
	rows.sort((r1,r2)=>{
		return r2.avg2wk-r1.avg2wk;
	});
	// Add rank
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

// Takes a DATE object, and returns a nice string.
function dateToISOLikeButLocal(date, length) {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, length);
    return isoLocal;
}

// x-axis map, idk if anyone cares about this but like why not
let makeXMap = (games) => {
	let data = games.map((g,i)=>{
		return {
			Index: i,
			Date: dateToISOLikeButLocal(new Date(g.date), 10),
			Game: g.game
		};
	});
	putTable('xmaptable',data);
};

const unpack = (db)=>{
	// Make sure the DB we acquired is an array
	if(!Array.isArray(db)){
		throw 'Acquired database is not an array.';
	}
	// Make sure that each record (r) has the required components
	db.forEach((r,i)=>{
		if(!r.date){
			throw 'DB record '+i+' does not have a date'
		}
		if(!r.game){
			throw 'DB record '+i+' does not have a game number'
		}
		if(!r.player){
			throw 'DB record '+i+' does not have a player'
		}
		if(!r.score){
			throw 'DB record '+i+' does not have a score'
		}
		// convert date
		r.date = new Date(r.date);
		// setup displayDate
		r.displayDate = dateToISOLikeButLocal(r.date, 10);
	});
	return db;
};

// ----- main, yo. -----

// kickoff this shitshow
const main = async () => {
	let database = await getDatabase();
	database = unpack(database);
	let games = calcGamesList(database);
	games = sortGamesList(games);
	console.log('Games');
	console.log(games);
	let players = getPlayersList(database);
	console.log('Players');
	console.log(players);
	makeGraph(players, games, database);
	// get the database on the page
	putTable('datatable', database.map(r=>({
		Date: dateToISOLikeButLocal(r.date, 16).replace('T', ' '),
		Game: r.game,
		Player: r.player,
		Score: r.score
	})));
	// Let's get that leaderboard table in there
	makeLeaderboardTable(players, database);
	// x axis map is last i guess
	makeXMap(games);
};

// call main
window.addEventListener('load', ()=>{main()});
