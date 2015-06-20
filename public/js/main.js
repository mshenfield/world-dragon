/***CONSTANTS*****/

// We use this to handle keypresses. When a key is pressed
// we assign the speed (which controls where the dragon is re-painted
// in the draw method) the KEYSTOSPEED[charCode] pressed  
var KEYSTOSPEED = {
	// Left
	37: new Two.Vector(-2, 0),
	// Up
	38: new Two.Vector(0, -2),
	// Right
	39: new Two.Vector(2, 0),
	// Down
	40: new Two.Vector(0, 2)
};

var DIRSTOSPEED = {
	'right': KEYSTOSPEED[37],
	'bottom': KEYSTOSPEED[38],
	'left' : KEYSTOSPEED[39],
	'top' :  KEYSTOSPEED[40]
};

/***DRAWING*******/
// Initialize two.js and bind the dragon to it.

var two = new Two({
	fullscreen: true,
	autostart: true
}).appendTo(document.body);


var SPAWNS = {
	'top': new Two.Vector(two.width / 2, 0),
	'left': new Two.Vector(0, two.height / 2),
	'bottom': new Two.Vector(two.width / 2, two.height),
	'right': new Two.Vector(two.width, two.height / 2)
}

var background = two.makeRectangle(0, 0, two.width, two.height);
background.noStroke();
background.fill = '#f2d435';
background.name = 'background';

var container = two.makeGroup(background);

// Our dragon object
var dragon;

// The speed object. Used to determine direction to
// move dragon on re-paint.
var speed;

// Chrome doesn't fire 'keypress' for arrow keys, so have to use 'keydown' or 'keyup'
// Change the speed depending on the key pressed, this is used to re-paint
// the dragon on the draw call
document.onkeydown = function(e){
	e = e || window.event;
	if(KEYSTOSPEED[e.keyCode]) {
		speed = KEYSTOSPEED[e.keyCode];
	}
};

// Send a 'leaving' event and stop drawing the dragon if it is out
// of bounds.
// Otherwise redraw the dragon speed.x,speed.y units away from it's last location
function draw() {
	
	if(dragon.translation._x < 0){
		socket.emit('leaving', { direction: 'left' });
		kill(dragon);
		return;
	}

	if(dragon.translation._x > two.width) {
		socket.emit('leaving', { direction: 'right' });
		kill(dragon);
		return;
	}

	if(dragon.translation._y < 0) {
		socket.emit('leaving', { direction: 'top' });
		kill(dragon);
		return;
	}

	if(dragon.translation._y > two.height) {
		socket.emit('leaving', { direction: 'bottom' });
		kill(dragon);
		return;
	}

	dragon.translation.addSelf(speed);
}


// Create our dragon object at the {direction} edge of the screen.
// We set the speed initially to move away from the edge the dragon spawned at
// The dragon for now is a little white circle. 
// We hook the draw method, which repositions the dragon according the speed
// variable, into two.js's internal 'update' animation loop
function spawnDragon(direction) {
	// If it is a bogus direction we don't do anything
	if(SPAWNS[direction]){
		var spawnPoint = SPAWNS[direction];
		speed = DIRSTOSPEED[direction];
		var dragon = two.makeCircle(spawnPoint.x, spawnPoint.y, 25);
		dragon.noStroke();
		container.add(dragon);
		two.bind('update', draw);
		return dragon;
	} else {
		console.error("Invalid direction: " + direction
			+ '\nValid directions are "top", "bottom", "left", and "right"');
	}
}

// Unlink the dragon svg from it's container, and stop drawing to the page
function kill(dragon) {
	container.remove(dragon);
	two.unbind('update', draw);
}

//********SOCKET***********/
// Handle connecting, registering, and spawning
var socket = io();

// When we receive the 'entering' event, we 
// draw the dragon. Data is of the form
// {
//	'direction': ['top' | 'bottom' | 'left' | 'right']
// }
// The 'direction' attribute determines the edge of the
// screen the dragon will initially appear on.
socket.on('entering', function(data) {
	dragon = spawnDragon(data.direction);
});