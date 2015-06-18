var Hapi = require('hapi')
var server = new Hapi.Server();
server.connection({ port: 3000 });
var io = require('socket.io')(server.listener);

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


// Each person exists in a grid. They have connections to their left, right, bottom, top,
// which default to themselves.
// When someone connects, we search for people connected to themselves, with
// the most connections already available.

// Scenario A:
//	Someone connects, and no one else is connected
//  The dragon should spawn on their machine, and whenever it reaches the edge of their canvas
//  re-spawn at the opposite edge (left<->right, top<->bottom)

// Scenario B:
// Someone connects, and there is one other person connected
// The register to one of the edges of the other person. When the dragon reaches that edge
// of the other person's screen, the current owner is disabled and the new
// owner receives an event notifying them that the dragon appeared with a side and y coordinate
// This causes the new owner's browser to render the dragon and give the user control.

// Scenario C:
// A user disconnects while they don't have the dragon
// The user should be unregistered, and any edges that are connected to other people should
// be removed from the other person's edge as well 

// Scenario D:
// A user disconnects while they have the dragon
// The dragon should be re-assigned to a random user coming from the middle right
// The user should be unregistered as described in Scenario C

// Scenario E:
// Someone connects, and many other people are connected
// We need an algorithm that finds where the user can insert themselves to make
// the most connections possible. For example, if we have the registry like so:
//  	1 2	
//	1	x x
//	2	x
//	3	x
// We would want the next user to register at (2, 2), because they can form 2
// connections. If there is no single best place to register, choose randomly
// from locations with the highest amount of connections.

// Scenario F:
// A user disconnects and there are no other users are connected
// The dragon dies, and is reborn when then next user connects to the screen.


var sockets = {};
io.on('connection', function(socket) {
});

server.start(function() {
	console.log('Listening at: ', server.info.uri);
});