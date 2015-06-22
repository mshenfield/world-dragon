var Hapi = require('hapi')
var server = new Hapi.Server();
server.connection({ port: 3000 });
var io = require('socket.io')(server.listener);
// lodash helpers
var _ = require('lodash');

// Setup basic index and static file server 

server.route({
	method: 'GET',
	path: '/',
	handler: function(request, reply) {
		reply.file(__dirname + '/public/index.html');
	}
});

server.route({
	method: 'GET',
	path: '/{param*}',
	handler: {
		directory: {
			path: __dirname + '/public'
		}
	}
});

server.start(function() {
	console.log('Listening at: ', server.info.uri);
});

// Valid directions to enter on a screen
var DIRS = [
	'left',
	'top',
	'right',
	'bottom'
];

// Create an empty node for our world with a tag marking the date and time
// it was created
function emptyNode(id, connectedOn){
	var node = {
		'id': id,
		'hasDragon': false,
		'born': connectedOn,
		'adjacentNodes': []
	};

	return node;
}

// TODO: Use socket's object lookup to reduce memory overhead?
function spawnDragon(socket){
	socket.emit('entering', {'direction': _.sample(DIRS)});
}

function moveDragon(node1, node2){
	node1.hasDragon = false;
	node2.hasDragon = true;
	spawnDragon(io.sockets.connected[node2.id]);
}

var graph = {};

// On connction, add the user to our world graph and spawn the dragon if they are the first to connect
io.on('connection', function(socket) {

	// Get elibible connections (limit to 3 so we never make a fully connected graph and exlude the next joiner)
	var newAdjacentNodes = _.chain(graph)
		.sortBy(['born'])	// Oldest first
		.filter(function(node) {	// No fully connected nodes
			return node.adjacentNodes.length !== 4
		})
		.take(3)
		.pluck('id')
		.value();

	// Create a new node indexed by socket's id
	graph[socket.id] = emptyNode(socket.id, new Date());
	graph[socket.id].adjacentNodes = newAdjacentNodes;
	newAdjacentNodes.forEach(function(id) {
		graph[id].adjacentNodes.push(socket.id);
	});

	console.log("Added " + socket.id);

	console.log(graph);

	//	Someone connects, and no one else is connected
	//  The dragon should spawn on their machine, and whenever it reaches the edge of their canvas
	//  re-spawn at the opposite edge (left<->right, top<->bottom)
	if(Object.keys(graph).length === 1){
		spawnDragon(socket);
	}

	// When the dragon reaches that edge of a user's screen, the dragon is removed and the new
	// owner receives an event notifying them that the dragon appeared, and on which side
	// This causes the new owner's browser to render the dragon and give the user control of it.
	socket.on('leaving', function(){
		var node = graph[socket.id];
		// Respawn to self if there are no adjacent nodes
		if(node.adjacentNodes.length === 0){
			spawnDragon(socket);
		} else {
			var newNode = graph[_.sample(node.adjacentNodes)];
			moveDragon(node, newNode);
		}
	});

	// A user closes the tab, ending the session
	socket.on('disconnect', function() {
		var node = graph[socket.id];

		// Remove the node from its adjacent nodes
		node.adjacentNodes.forEach(function(id) {
			_.pull(graph[id].adjacentNodes, node.id);
		});

		// We respawn the dragon on a new node unless this is the last one
		if(node.hasDragon && node.adjacentNodes.length !== 0){
			var newNode = graph[_.sample(node.adjacentNodes)];
			moveDragon(node, newNode);
		}

		// Delete entry in graph
		delete graph[socket.id];

		console.log("Removed " + socket.id);

		console.log(graph);
	});
});
