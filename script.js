'use strict';

// The location to create the graph
var ctx = document.getElementById('myChart');

// The data is provided by a different script
let dataSource = dataset;

// Create a listing of all the date/game combinations.
// {date: "2019-11-17", game: 2}
let allEvents = [];
dataSource.forEach(d=>{
	d.games.forEach(g=>{
		// Only record a new combo if it doesn't already exist
		if(allEvents.findIndex(e=>e.date===d.date&&e.game===g.game)===-1){
			allEvents.push({
				date: d.date,
				game: g.game
			});
		}
	});
});

// Sort the events in chronological order
allEvents.sort((a,b)=>{
	let datediff = Date.parse(a.date) - Date.parse(b.date);
	if(datediff===0){
		return a.game-b.game;
	}else{
		return datediff;
	}
});

// Get a list of all the scores
// insert X-value based off when the score happened.
let scores = [];
dataSource.forEach(d=>{
	d.games.forEach(g=>{
		g.scores.forEach(s=>{
			let date = d.date;
			let game = g.game;
			let x = allEvents.findIndex(e=>{
				return e.date===date&&e.game===game;
			});
			s.x = x;
			scores.push(s);
		});
	});
})

// scores now has {name, score, x}

// Get a list of all names
let names = [];
scores.forEach(s=>{
	names.push(s.name);
});
// deduplicate
names = [...new Set(names)];

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

// Create a new "line" for each name
let lines = [];
names.forEach((n,i)=>{
	// Calculate all the date/score pairs for this name
	let points = [];
	scores.filter(s=>s.name===n).forEach(s=>{
		points.push({
			x: s.x,
			y: s.score
		});
	});

	// convert name to color
	let rgb = HSVtoRGB(i/names.length, 1, 1);
	let color = "#";
	color = color + rgb.r.toString(16).padStart(2, '0');
	color = color + rgb.g.toString(16).padStart(2, '0');
	color = color + rgb.b.toString(16).padStart(2, '0');

	// record this line
	lines.push({
		label: n,
		data: points,
		borderColor: color,
		fill: false,
		spanGaps: true
	});
});

// Put the lines onto the chart
var myChart = new Chart(ctx, {
	type: 'line',
    data: {
        datasets: lines
    },
	options:{
		scales: {
			xAxes: [{
				type: 'linear'
			}]
		}
	}
});

// establish the X-axis key map
let xtab = document.getElementById('xmaptable');
allEvents.forEach((e,i)=>{
	let row = document.createElement('tr');
	let index = document.createElement('td');
	index.appendChild(document.createTextNode(i));
	let date = document.createElement('td');
	date.appendChild(document.createTextNode(e.date));
	let game = document.createElement('td');
	game.appendChild(document.createTextNode(e.game));
	row.appendChild(index);
	row.appendChild(date);
	row.appendChild(game);
	xtab.appendChild(row);
});

// Let's build the dataset table
let dtab = document.getElementById('datatable');
dataSource.forEach(d=>{
	d.games.forEach(g=>{
		g.scores.forEach(s=>{
			let row = document.createElement('tr');
			let date = document.createElement('td');
			date.appendChild(document.createTextNode(""+d.date));
			let game = document.createElement('td');
			game.appendChild(document.createTextNode(""+g.game));
			let player = document.createElement('td');
			player.appendChild(document.createTextNode(""+s.name));
			let score = document.createElement('td');
			score.appendChild(document.createTextNode(""+s.score));
			row.appendChild(date);
			row.appendChild(game);
			row.appendChild(player);
			row.appendChild(score);
			dtab.appendChild(row)
		});
	});
});
