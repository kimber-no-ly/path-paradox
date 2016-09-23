class Board {
  constructor() { 
  	this.board = []; 
  }

  drawBoard() {
  	for (let y = 0; y < 6; y++) {
      if (!this.board[y]) this.board[y] = [];
      for (let x = 0; x < 6; x++) {
          this.board[y].push(new Space(x, y, this.board));
      }
  	}
  	return this.board;
	}
}

class Space {
	constructor(x, y, board) {
    this.x = x;
    this.y = y;
    this.points = generatePoints(x,y,board);
  }
}

class Point{
	constructor(spaces) {
		if(spaces.length > 1) this.edge = false;
		else this.edge = true;
	  
	  this.spaceId = 'space' + spaces[0].y + spaces[0].x + spaces[0].i;
	  this.travelled = false;
	  this.spaces = spaces;
	}
}

function generatePoints(x,y,board){
	/* 
		When generating the points for a space we will do one of two actions:
		1. Create a reference to an existing point
		2. Create a new point
		We decide reference or new point based on the space's position in the board
	*/

	let array = new Array(8);

	for (let i = 0; i < 8; i++) {
    let sharedPoint;

    //TOP POINTS
    if (i < 2) { 
    	sharedPoint = (i === 0) ? 5 : 4; 
      if (y === 0) { array[i] = new Point([{ x: x,y: y, i: i }]); }
      else { array[i] = board[y - 1][x].points[sharedPoint]; }   
    } 
		
		//RIGHT SIDE POINTS
    else if (i < 4) { 
      sharedPoint = i === 2 ? 7 : 6; 
      if (x === 5) { array[i] = new Point([{ x: x, y: y, i: i }]); }
      else { array[i] = new Point([{ x: x, y: y, i: i }, { x: x + 1, y: y, i: sharedPoint}]); } 
    } 

    //BOTTOM POINTS
    else if (i < 6) {
      sharedPoint = i === 4 ? 1 : 0;
      if (y === 5) { array[i] = new Point([{ x: x, y: y, i: i }]); }
      else { array[i] = new Point([{ x: x, y: y, i: i }, { x: x, y: y + 1, i: sharedPoint }]); }
    } 

    //LEFT POINTS
    else {
      sharedPoint = i === 6 ? 3 : 2; 
      if (x === 0) { array[i] = new Point([{ x: x, y: y, i: i }]); }
      else { array[i] = board[y][x - 1].points[sharedPoint]; }
    }
  }

  return array;
}