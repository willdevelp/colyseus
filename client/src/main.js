import { Client } from "colyseus.js";

const BOARD_SIZE = 740;
const TRACK_LENGTH = 52;
const FINAL_PATH_LENGTH = 6;
const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const START_BY_COLOR = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

const FINAL_CENTER = [
  { x: 50, y: 50 },
  { x: 50, y: 50 },
  { x: 50, y: 50 },
  { x: 50, y: 50 },
];

const HOME_SLOTS = {
  red: [
    { x: 19, y: 19 },
    { x: 31, y: 19 },
    { x: 19, y: 31 },
    { x: 31, y: 31 },
  ],
  blue: [
    { x: 69, y: 19 },
    { x: 81, y: 19 },
    { x: 69, y: 31 },
    { x: 81, y: 31 },
  ],
  green: [
    { x: 19, y: 69 },
    { x: 31, y: 69 },
    { x: 19, y: 81 },
    { x: 31, y: 81 },
  ],
  yellow: [
    { x: 69, y: 69 },
    { x: 81, y: 69 },
    { x: 69, y: 81 },
    { x: 81, y: 81 },
  ],
};

const TRACK_POINTS = Array.from({ length: TRACK_LENGTH }, (_, index) => {
  const angle = ((index / TRACK_LENGTH) * Math.PI * 2) - Math.PI / 2;
  const radiusX = 38;
  const radiusY = 38;
  const x = 50 + Math.cos(angle) * radiusX;
  const y = 50 + Math.sin(angle) * radiusY;
  return { x, y };
});

const FINAL_LANE_BY_COLOR = {
  red: [
    { x: 50, y: 12 },
    { x: 50, y: 22 },
    { x: 50, y: 32 },
    { x: 50, y: 42 },
    { x: 50, y: 52 },
    { x: 50, y: 62 },
  ],
  blue: [
    { x: 12, y: 50 },
    { x: 22, y: 50 },
    { x: 32, y: 50 },
    { x: 42, y: 50 },
    { x: 52, y: 50 },
    { x: 62, y: 50 },
  ],
  green: [
    { x: 50, y: 88 },
    { x: 50, y: 78 },
    { x: 50, y: 68 },
    { x: 50, y: 58 },
    { x: 50, y: 48 },
    { x: 50, y: 38 },
  ],
  yellow: [
    { x: 88, y: 50 },
    { x: 78, y: 50 },
    { x: 68, y: 50 },
    { x: 58, y: 50 },
    { x: 48, y: 50 },
    { x: 38, y: 50 },
  ],
};

const playerNameInput = document.getElementById("playerName");
const joinBtn = document.getElementById("joinBtn");
const readyBtn = document.getElementById("readyBtn");
const rollBtn = document.getElementById("rollBtn");
const boardEl = document.getElementById("board");
const statusText = document.getElementById("statusText");
const turnText = document.getElementById("turnText");
const diceText = document.getElementById("diceText");
const messageText = document.getElementById("messageText");
const playersList = document.getElementById("playersList");

let room = null;
let localSessionId = null;
let selectedPieceId = null;
let myPlayer = null;

function setMessage(message) {
  messageText.textContent = message;
}

function getPointForPiece(playerColor, piecePosition, pieceIndex) {
  if (piecePosition === -1) {
    const slot = HOME_SLOTS[playerColor][pieceIndex % 4];
    return { x: slot.x, y: slot.y };
  }

  if (piecePosition >= 0 && piecePosition < TRACK_LENGTH) {
    const global = (START_BY_COLOR[playerColor] + piecePosition) % TRACK_LENGTH;
    return TRACK_POINTS[global];
  }

  if (piecePosition >= TRACK_LENGTH && piecePosition < TRACK_LENGTH + FINAL_PATH_LENGTH) {
    const offset = piecePosition - TRACK_LENGTH;
    return FINAL_LANE_BY_COLOR[playerColor][offset];
  }

  return FINAL_CENTER[0];
}

function renderBoard() {
  if (!boardEl) return;

  boardEl.innerHTML = "";

  for (let i = 0; i < TRACK_LENGTH; i += 1) {
    const dot = document.createElement("div");
    dot.className = "track-dot" + (SAFE_POSITIONS.has(i) ? " safe" : "");
    const point = TRACK_POINTS[i];
    dot.style.left = `${point.x}%`;
    dot.style.top = `${point.y}%`;
    boardEl.appendChild(dot);
  }

  const center = document.createElement("div");
  center.className = "center";
  boardEl.appendChild(center);

  const players = room && room.state ? Array.from(room.state.players.values()) : [];

  players.forEach((player) => {
    const pieces = Array.from(player.pieces.values());
    pieces.forEach((piece, index) => {
      const pieceEl = document.createElement("button");
      pieceEl.type = "button";
      pieceEl.className = `piece ${player.color}`;
      if (piece.position === 58 || piece.position === 59 || piece.position === 60) {
        pieceEl.classList.add("finished");
      }
      if (selectedPieceId === piece.id) {
        pieceEl.classList.add("is-selected");
      }

      const point = getPointForPiece(player.color, piece.position, index);
      pieceEl.style.left = `${point.x}%`;
      pieceEl.style.top = `${point.y}%`;
      pieceEl.title = `${player.name} - ${piece.id}`;

      pieceEl.addEventListener("click", () => {
        if (!room || room.state.status !== "playing") return;
        if (room.state.currentPlayerId !== localSessionId) return;
        if (!room.state.diceRolled) return;
        if (!room.state.moveMade) {
          selectedPieceId = piece.id;
          setMessage(`Pièce sélectionnée : ${piece.id}`);
          renderBoard();
          room.send("movePiece", { pieceId: piece.id });
        }
      });

      boardEl.appendChild(pieceEl);
    });
  });
}

function renderPlayers() {
  if (!room || !room.state) {
    playersList.innerHTML = "";
    return;
  }

  const players = Array.from(room.state.players.values());
  playersList.innerHTML = players
    .map((player) => {
      const isCurrent = room.state.currentPlayerId === player.sessionId;
      const ready = player.ready ? "Prêt" : "Pas prêt";
      const label = isCurrent ? "Tour" : "";
      return `<li><span>${player.name}</span><span>${ready}${label ? ` • ${label}` : ""}</span></li>`;
    })
    .join("");
}

function renderStatus() {
  if (!room || !room.state) {
    statusText.textContent = "hors ligne";
    turnText.textContent = "-";
    diceText.textContent = "-";
    return;
  }

  statusText.textContent = room.state.status;
  const current = room.state.players.get(room.state.currentPlayerId);
  turnText.textContent = current ? current.name : "-";
  diceText.textContent = room.state.diceValue || "-";

  if (room.state.status === "playing") {
    readyBtn.disabled = false;
    rollBtn.disabled = room.state.currentPlayerId !== localSessionId || room.state.diceRolled;
  } else {
    readyBtn.disabled = false;
    rollBtn.disabled = true;
  }
}

async function connectToRoom() {
  const name = playerNameInput.value.trim() || "Joueur";

  if (!room) {
    const client = new Client("ws://localhost:2567");
    room = await client.joinOrCreate("ludo", { name });
    localSessionId = room.sessionId;
    myPlayer = room.state.players.get(localSessionId);

    room.onStateChange(() => {
      myPlayer = room.state.players.get(localSessionId);
      renderPlayers();
      renderStatus();
      renderBoard();
    });

    room.onMessage("rollDiceResult", (result) => {
      if (!result) return;
      setMessage(result.turnPassed ? "Passe ton tour." : `Tu as lancé ${result.value}.`);
      renderStatus();
      renderBoard();
    });

    room.onMessage("movePieceResult", (result) => {
      if (!result) return;
      if (result.winner) {
        setMessage("Victoire !");
      } else if (result.success) {
        setMessage(`Mouvement validé sur ${result.position}`);
      } else {
        setMessage(`Erreur : ${result.reason}`);
      }
      selectedPieceId = null;
      renderStatus();
      renderBoard();
    });
  }

  setMessage("Connecté à la room.");
  renderPlayers();
  renderStatus();
  renderBoard();
}

joinBtn.addEventListener("click", connectToRoom);

readyBtn.addEventListener("click", () => {
  if (!room) return;
  room.send("ready");
  setMessage("En attente des autres joueurs...");
});

rollBtn.addEventListener("click", () => {
  if (!room) return;
  room.send("rollDice");
  setMessage("Lancement du dé...");
});

renderPlayers();
renderStatus();
renderBoard();
