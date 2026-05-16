const sequence = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const state = {
  room: null,
  voterId: localStorage.getItem("scrumPokerVoterId") || "",
  name: localStorage.getItem("scrumPokerName") || "",
  code: new URLSearchParams(location.search).get("room") || localStorage.getItem("scrumPokerRoom") || "",
  lastUpdatedAt: 0,
  myVote: null,
  soundReady: false,
  audio: null,
};

const $ = (selector) => document.querySelector(selector);
const joinPanel = $("#joinPanel");
const roomPanel = $("#roomPanel");
const nameInput = $("#nameInput");
const roomInput = $("#roomInput");
const joinBtn = $("#joinBtn");
const roomCode = $("#roomCode");
const storyTitle = $("#storyTitle");
const roundNumber = $("#roundNumber");
const voters = $("#voters");
const cards = $("#cards");
const resultOrb = $("#resultOrb");
const resultLabel = $("#resultLabel");
const resultValue = $("#resultValue");
const revealBtn = $("#revealBtn");
const newRoundBtn = $("#newRoundBtn");
const storyInput = $("#storyInput");
const confetti = $("#confetti");
const shareBtn = $("#shareBtn");

nameInput.value = state.name;
roomInput.value = state.code;

function api(path, body) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((response) => {
    if (!response.ok) {
      throw new Error("No se pudo completar la accion");
    }
    return response.json();
  });
}

function normalizeCode(value) {
  return value.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 24) || "SALA";
}

function roomUrl() {
  const url = new URL(location.href);
  url.searchParams.set("room", state.code);
  return url.toString();
}

function ensureAudio() {
  if (!state.audio) {
    state.audio = new AudioContext();
  }
  state.soundReady = true;
}

function beep(type = "tap") {
  if (!state.soundReady || !state.audio) return;
  const audio = state.audio;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const notes = {
    tap: [420, 0.04],
    reveal: [640, 0.12],
    round: [280, 0.09],
  };
  const [frequency, duration] = notes[type] || notes.tap;
  osc.type = type === "reveal" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(frequency, audio.currentTime);
  gain.gain.setValueAtTime(0.001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration + 0.02);
}

function popConfetti() {
  confetti.innerHTML = "";
  for (let index = 0; index < 38; index += 1) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${Math.random() * 220 - 110}px`);
    piece.style.setProperty("--y", `${Math.random() * -170 - 40}px`);
    piece.style.setProperty("--r", `${Math.random() * 260 - 130}deg`);
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    confetti.append(piece);
  }
  setTimeout(() => (confetti.innerHTML = ""), 1200);
}

function renderCards(room) {
  cards.innerHTML = "";
  sequence.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-button";
    button.textContent = value;
    if (state.myVote === value) button.classList.add("selected");
    if (room.revealed) button.disabled = true;
    button.addEventListener("click", async () => {
      ensureAudio();
      beep("tap");
      state.myVote = value;
      const nextRoom = await api("/api/vote", { code: state.code, id: state.voterId, vote: value });
      render(nextRoom);
    });
    cards.append(button);
  });
}

function renderVoters(room) {
  voters.innerHTML = "";
  room.voters.forEach((voter) => {
    const card = document.createElement("article");
    card.className = `voter-card ${voter.hasVoted ? "done" : ""}`;
    if (voter.id === state.voterId) card.classList.add("me");

    const name = document.createElement("strong");
    name.textContent = voter.name;
    const vote = document.createElement("span");
    vote.textContent = room.revealed ? voter.vote ?? "-" : voter.hasVoted ? "Listo" : "Pensando";
    card.append(name, vote);
    voters.append(card);
  });
}

function renderResult(room) {
  resultOrb.classList.toggle("revealed", room.revealed);
  resultOrb.classList.toggle("waiting", !room.revealed);
  if (room.revealed && room.rounded !== null) {
    resultLabel.textContent = `Promedio ${room.average}`;
    resultValue.textContent = room.rounded;
  } else if (room.revealed) {
    resultLabel.textContent = "Sin votos";
    resultValue.textContent = "-";
  } else {
    const ready = room.voters.filter((voter) => voter.hasVoted).length;
    resultLabel.textContent = `${ready}/${room.voters.length} votos`;
    resultValue.textContent = "?";
  }
}

function render(room) {
  const wasHidden = !state.room || !state.room.revealed;
  const isNewReveal = wasHidden && room.revealed && room.updatedAt !== state.lastUpdatedAt;
  state.room = room;
  state.lastUpdatedAt = room.updatedAt;
  roomCode.textContent = room.code;
  storyTitle.textContent = room.story || "Ronda sin historia";
  roundNumber.textContent = room.round;
  revealBtn.disabled = room.revealed;
  renderCards(room);
  renderVoters(room);
  renderResult(room);
  if (isNewReveal) {
    beep("reveal");
    popConfetti();
  }
}

async function joinRoom() {
  ensureAudio();
  state.name = nameInput.value.trim() || "Sin nombre";
  state.code = normalizeCode(roomInput.value);
  localStorage.setItem("scrumPokerName", state.name);
  localStorage.setItem("scrumPokerRoom", state.code);
  history.replaceState(null, "", `?room=${encodeURIComponent(state.code)}`);
  const response = await api("/api/join", { code: state.code, name: state.name, id: state.voterId });
  state.voterId = response.id;
  localStorage.setItem("scrumPokerVoterId", state.voterId);
  joinPanel.classList.add("hidden");
  roomPanel.classList.remove("hidden");
  render(response.room);
}

async function poll() {
  if (!state.code || roomPanel.classList.contains("hidden")) return;
  const response = await fetch(`/api/room?code=${encodeURIComponent(state.code)}`, { cache: "no-store" });
  if (response.ok) render(await response.json());
}

joinBtn.addEventListener("click", joinRoom);
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});
roomInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});

revealBtn.addEventListener("click", async () => {
  ensureAudio();
  render(await api("/api/reveal", { code: state.code }));
});

newRoundBtn.addEventListener("click", async () => {
  ensureAudio();
  beep("round");
  state.myVote = null;
  render(await api("/api/reset", { code: state.code, story: storyInput.value }));
  storyInput.value = "";
});

shareBtn.addEventListener("click", async () => {
  const url = roomUrl();
  try {
    if (navigator.share) {
      await navigator.share({ title: "Scrum Poker", text: `Unete a la sala ${state.code}`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
    shareBtn.textContent = "Link copiado";
  } catch (error) {
    shareBtn.textContent = "Copia manual";
  }
  setTimeout(() => {
    shareBtn.textContent = "Compartir sala";
  }, 1800);
});

if (state.name && state.code) {
  joinRoom().catch(() => {});
}

setInterval(() => {
  poll().catch(() => {});
}, 900);
