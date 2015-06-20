var Hapi = require('hapi')
var server = new Hapi.Server();
server.connection({ port: 3000 });
var io = require('socket.io')(server.listener);
var Deque = require('collections/deque');

// Setup basic index and static file server 

server.route({
	method: 'GET',
	path: '/',
	handler: function(request, reply) {
		reply.file(__dirname + '/index.html');
	}
});

server.route({
	method: 'GET',
	path: '/{param*}',
	handler: {
		directory: {
			path: __dirname
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

// World is a hash of objects indexed by socket.id (a unique identifier for each socket
// assigned by socket.io
// Each object in world is of the form
// {
//	'socket': {the socket object},
//	'connections': [] of socket ids
// }
var world = {};

// This is the socket the dragon is currently floating around in
var occupied = null;

// Boolean indicating the next person to connect will be the first, and we should initiate an 'entering' event to
// spawn the dragon on their screen
var isFirst = true;

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
	// Thanks Mozilla https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
  	return Math.floor(Math.random() * (max - min)) + min;
}

function randomElement(arr){
	if(arr.length === 0){
		return;
	}
	return arr[getRandomInt(0, arr.length)];
}

// Returns a random property from an object
// Thanks Dominic and David http://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object
function randomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
}

// Unregister the user, and reset any connctions to them
// Todo: Remove this object from queued 
function removeSocket(world, socket) {
	var leaf = world[socket.id];
	if(leaf){
		leaf.connections.forEach(function (el) {
			world[el].connections = world[el].connections.filter(function (el) {
				return el !== socket.id;
			});
		});

		deleteFromQueue(queue, socket.id);
		delete world[socket.id];
	}
}

// Insert a socket into the world object
// We insert it hashed by it's own id, a unique identifier generated by socket.io
var queue = new Deque();
var current = null;
function insert(world, socket) {
	if(!current){
		current = queue.shift();
		// Empty world
		if(!current){
			world[socket.id] = emptyLeaf(socket);
			current = world[socket.id]
			return;
		}
	}

	// If this leaf's connections are full, enqueue the next
	if(current.connections.length === 4) {
		for(el in connections){
			queue.push(connections[el]);
		}
		current = queue.shift();
	}

	var newLeaf = emptyLeaf(socket);
	world[socket.id] = newLeaf;
	newLeaf.connections.push(current.socket.id);
	current.connections.push(socket.id);
}

function deleteFromQueue(queue, value){
	queue = queue.filter(function(el) {
		return el !== value;
	});
}

// Create an empty leaf node for our world
// By default, all the edges of the object point back to
// the leaf's socket
function emptyLeaf(socket){
	var leaf = {
		'socket': socket,
		'connections': []
	};

	return leaf;
}

// On connction, add the user to our world graph and spawn the dragon if they are the first to connect
io.on('connection', function(socket) {
	// Create an object for the user's socket and add to the world, indexed by socket.id.
	// If the user is the first to connect, it will only have directions that point to itself.
	insert(world, socket);

	//	Someone connects, and no one else is connected
	//  The dragon should spawn on their machine, and whenever it reaches the edge of their canvas
	//  re-spawn at the opposite edge (left<->right, top<->bottom)
	if(isFirst){
		isFirst = false;

		dragonSocket = socket;

		dragonSocket.emit('entering', {'direction': randomElement(DIRS)});
	}

	// When the dragon reaches that edge of a user's screen, the dragon is removed and the new
	// owner receives an event notifying them that the dragon appeared, and on which side
	// This causes the new owner's browser to render the dragon and give the user control of it.
	// For example, if user A's left edge is connected to user B, we emit
	// an 'entering' event to B when the dragon exits the left side of A's screen,
	// with a direction of 'right'.
	socket.on('leaving', function(){
			var leaf = world[socket.id];
			if(leaf.connections.length === 0){
				occupied = leaf.socket;
			} else {
				var occupiedId = randomElement(leaf.connections);
				occupied = world[occupiedId].socket;
			}

			occupied.emit('entering', {'direction': randomElement(DIRS)});
	});

	// A user closes the tab, ending the session
	socket.on('disconnect', function() {
		// A user disconnects while they don't have the dragon
		// The user should is unregistered, and any user's connected
		// remove their connections to as well
		removeSocket(world, socket);

		console.log('Removed ' + socket.id);

		console.log(world);

		// A user disconnects while they have the dragon
		// The dragon should be re-assigned to a random user coming from the middle right
		// The user should be unregistered as described in Scenario C
		if(socket === occupied){

			var occupiedId = randomProperty(world)
			
			if(occupiedId){
				occupied = world[occupiedId].socket;

				occupied.emit('entering', {'direction': randomElement(DIRS)});
			} else {
				// There are no users left. The dragon dies and is reborn when someone new connects
				occupied = null;

				isFirst = true;
			}
		}
	});
});
