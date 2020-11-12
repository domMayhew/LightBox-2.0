/* ------------
  Some global variables. Undo/redo buttons are necessary here because updateButtons uses them and is called from the GameBoard constructor when the page loads.
-------------*/

const onFilePath = "./images/light-box-on.png";
const offFilePath = "./images/light-box-off.png";
let undoButton = document.getElementById("undo");
let redoButton = document.getElementById("redo");


/* ------------
    This section defines the GameBoard class: an object whose constructor recreates the tbody HTML element.
    Properties: size, memory, diabled (a boolean used to disable other listeners when showing history or celebrating.)
    Methods: isInbounds, toggleLight.
-------------*/

class GameBoard {
  
  constructor(size) {
    this.size = size;
    this.memory = {past: [], future: []};
    this.disabled = false;
    
    
    const tbody = document.getElementsByTagName("tbody")[0];
    let trArray = [];
    this.nodes = [];
    for (let row=0; row<size; row++) {
      let tr = document.createElement("tr");
      for (let column=0; column<size; column++) {
        let td = document.createElement("td");
        let img = document.createElement("img");
        img.src = onFilePath;
        img.id = JSON.stringify({row, column});
        img.alt = "on";
        img.onclick = lightClickHandler;
        td.appendChild(img);
        tr.appendChild(td);
      }
    trArray.push(tr);
    this.nodes.push(tr.getElementsByTagName("img"));
    }
    tbody.replaceChildren(...trArray);
    
    updateButtons(this.memory);
    document.getElementsByTagName("table")[0].style.borderColor = "";
    document.getElementById("history").innerHTML = "Show History";
    document.getElementById("history").style.backgroundColor = "";
  }
  
  isInbounds(row, column) {
    if (row>=this.size || column>=this.size) return false;
    if (row<0 || column<0) return false;
    return true;
  }
  
  toggleLight(row, column) {
    if (!this.isInbounds(row, column)) {
      console.log(`Tried to toggle an out-of-bounds light. Row: ${row}. Column: ${column}.`);
      return;
    }
    if (this.nodes[row][column].alt == "on") {
      this.nodes[row][column].src = offFilePath;
      this.nodes[row][column].alt = "off";
    } else {
      this.nodes[row][column].src = onFilePath;
      this.nodes[row][column].alt = "on";
    }
  }
}

let gameBoard = new GameBoard(document.getElementById("sizeButton").value);


/* ------------
    This section defines the lightClickHandler function.
    processMove toggles each of the required lights and checks to see if you've won. lightClickHandler calls process move and updates gameBoard.memory.
-------------*/

function lightClickHandler({target}) {
  if (gameBoard.disabled) return;
  let {row, column} = JSON.parse(target.id);
  processMove(row, column);
  gameBoard.memory.past.push({row, column});
  gameBoard.memory.future = [];
  updateButtons(gameBoard.memory);
}

function processMove(row, column) {
  gameBoard.toggleLight(row, column);
  if (gameBoard.isInbounds(row, column+1)) gameBoard.toggleLight(row, column+1);
  if (gameBoard.isInbounds(row, column-1)) gameBoard.toggleLight(row, column-1);
  if (gameBoard.isInbounds(row+1, column)) gameBoard.toggleLight(row+1, column);
  if (gameBoard.isInbounds(row-1, column)) gameBoard.toggleLight(row-1, column);
  if (document.getElementsByTagName("tbody")[0].querySelector("img[alt='on']") === null) celebrate();
}

/* ------------
    This section sets handlers for undo, redo, history, reset, and size buttons. updateButtons gets called on lightClickHandler, undo, and redo.
-------------*/

undoButton.onclick = undo;
redoButton.onclick = redo;
document.getElementById("history").onclick = historyHandler;
document.getElementById("reset").onclick = reset;
document.getElementById("sizeButton").oninput = ({target}) => gameBoard = new GameBoard(target.value);

function reset() {
  if (gameBoard.disabled) return;
  gameBoard = new GameBoard(gameBoard.size);
}

function undo() {
  if (gameBoard.disabled || gameBoard.memory.past.length === 0) return;
  let {row, column} = gameBoard.memory.past.pop();
  gameBoard.memory.future.push({row, column});
  processMove(row, column);
  updateButtons(gameBoard.memory);
}

function redo() {
  if (gameBoard.disabled || gameBoard.memory.future.length === 0) return;
  let {row, column} = gameBoard.memory.future.pop();
  gameBoard.memory.past.push({row, column});
  processMove(row, column);
  updateButtons(gameBoard.memory);
}

function historyHandler({target}) {
  if (target.innerHTML == "Show History") {
    if (gameBoard.disabled) return;
    for (let row of gameBoard.nodes) {
      for (let img of row) {
        img.src = offFilePath;
        img.alt = "off";
      }
    }
    document.getElementsByTagName("table")[0].style.borderColor = "yellow";
    target.innerHTML = "Hide History";
    target.style.backgroundColor = "yellow";
    gameBoard.disabled = true;
    updateButtons({past: [], future: []});
    gameBoard.memory.past.forEach(({row, column}) => gameBoard.toggleLight(row, column));
  }
  else {
    for (let row of gameBoard.nodes) {
      for (let img of row) {
        img.src = onFilePath;
        img.alt = "on";
      }
    }
    document.getElementsByTagName("table")[0].style.borderColor = "";
    target.innerHTML = "Show History";
    target.style.backgroundColor = "";
    gameBoard.disabled = false;
    updateButtons(gameBoard.memory);
    gameBoard.memory.past.forEach(({row, column}) => processMove(row, column));
  }
}

function updateButtons(memory) {
  if (memory.past.length !== 0) undoButton.style.backgroundColor="white";
  else undoButton.style.backgroundColor="";
  if (memory.future.length !== 0) redoButton.style.backgroundColor="white";
  else redoButton.style.backgroundColor="";
}

/* ------------
    This section deals with the celebrate function. Called from lightClickHandler when all imgs are alt="off" and when the celebrate button is clicked.
    animateBeam uses setTimeout to toggle lights one by one from a start point with a rowIncrement and columnIncrement.
    animateExplosion uses setTimeout to toggle rings expanding from the centre outward.
-------------*/


function celebrate(){
  gameBoard.disabled = true;
  let middle = Math.floor(gameBoard.size/2);
  animateBeam(middle, middle, -1, 0)
    .then(value => animateBeam(middle,middle,0,1))
    .then(value => animateBeam(middle,middle,1,0))
    .then(value => animateBeam(middle,middle,0,-1))
    .then(value => animateBeam(middle,middle,-1,1))
    .then(value => animateBeam(middle,middle,1,1))
    .then(value => animateBeam(middle,middle,1,-1))
    .then(value => animateBeam(middle,middle,-1,-1))
    .then(() => animateExplosion())
    .then(() => winMessage());
}

function animateBeam(startRow, startColumn, rowIncrement, columnIncrement) {
  return new Promise((resolve, reject) => {
    function nextLight(row, column, count=0) {
      setTimeout(() => {
        if (!gameBoard.isInbounds(row, column)) {
          !count ? nextLight(startRow, startColumn, 1) : resolve('Done');
        }
        else {
          gameBoard.toggleLight(row, column);
          nextLight(row+rowIncrement, column+columnIncrement, count);
        }
      }, 75);
    }
    nextLight(startRow, startColumn);
  });
}

function animateExplosion() {
  
  function toggleLine({row, column}, radius, rowIncrement, columnIncrement) {
    return new Promise((resolve, reject) => {
      for (let toggleCount=0; toggleCount<radius*2; toggleCount++) {
        gameBoard.toggleLight(row, column);
        row+=rowIncrement;
        column+=columnIncrement;
      }
      resolve({row, column});
    });
  }
  
  return new Promise((resolve, reject) => {
    let middle=Math.floor(gameBoard.size/2);
    let nextRing = (radius, count=0) => {
      setTimeout(() => {
        if (!gameBoard.isInbounds(middle+radius, middle+radius)) {
          //If size is even, "middle" will be offset and there will be a leftover column and row along the left and top.
          if (gameBoard.size%2 === 0) {
            toggleLine({row: middle+radius-1, column: middle-radius}, radius-0.5, -1, 0)
              .then(start => toggleLine(start, radius, 0, 1));
          }
          !count ? nextRing(0, 1) : resolve('Done');
        } else {
          //Without this statement the middle light gets toggled 4 times and remains off.
          if (radius === 0) {
            gameBoard.toggleLight(middle, middle);
          } else {
          //Uses the resolved value of the toggleLine promise as the start pont for the next toggleLine.
          toggleLine({row: middle-radius, column: middle-radius}, radius, 0, 1)
            .then(start => toggleLine(start, radius, 1, 0))
            .then(start => toggleLine(start, radius, 0, -1))
            .then(start => toggleLine(start, radius, -1, 0));
          }
        nextRing(radius+1, count);
        }
      },125);
    };
    nextRing(0);
  });
}

//When the celebrate button is clicked, the handler first turns all the lights off.
document.getElementById('celebrate').onclick = function () {
  if (gameBoard.disabled) return;
  for (let row=0; row<gameBoard.size; row++) {
    for (let column=0; column<gameBoard.size; column++) {
      gameBoard.nodes[row][column].src = offFilePath;
      gameBoard.nodes[row][column].alt = "off";
    }
  }
  celebrate();
};

//Gets called at the end of "celebrate"
function winMessage() {
  document.getElementById("win-message").style.display = "block";
}
//The handler for the "ok" button on the win message div.
document.getElementById("dismiss-win-message").onclick = function() {
  document.getElementById("win-message").style.display = "none";
  gameBoard.disabled = false;
}