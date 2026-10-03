(() => {
  const byId = (id) => document.getElementById(id);
  const section = byId("birthday-race"); o
  const canvas = byId("race-canvas");
  const context = canvas?.getContext("2d");
  if (!section || !context || document.documentElement.dataset.raceGameReady) return;
  document.documentElement.dataset.raceGameReady = "true";

  const width = canvas.width;
  const height = canvas.height;
  const playerY = 365;
  const roadHalfWidth = 247;
  const ui = {
    picker: byId("race-vehicle-picker"),
    customization: byId("race-customization"),
    live: byId("race-live"),
    vehicleName: byId("race-car-name"),
    progress: byId("race-progress"),
    progressLabel: byId("race-progress-label"),
    zone: byId("race-zone"),
    speed: byId("race-speed"),
    coins: byId("race-coins"),
    clues: byId("race-clues"),
    upgrade: byId("race-upgrade"),
    answerForm: byId("race-answer-form"),
    answer: byId("race-answer"),
    answerFeedback: byId("race-answer-feedback"),
    challengeTitle: byId("race-challenge-name"),
    challengePrompt: byId("race-question"),
    routePanel: byId("race-route-panel"),
    codeForm: byId("race-code-form"),
    code: byId("race-code"),
    codePrompt: byId("race-code-prompt"),
    codeFeedback: byId("race-code-feedback"),
    finish: byId("race-finish"),
    confetti: byId("race-confetti"),
    mechanic: byId("race-mechanic-line"),
    duck: byId("race-duck-line"),
    vehicleStats: byId("race-vehicle-stats"),
    tires: byId("race-tires"),
    accessory: byId("race-accessory"),
  };
  const paintButtons = [...document.querySelectorAll("[data-race-paint]")];
  const vehicleButtons = [...document.querySelectorAll("[data-race-vehicle]")];
  const driveButtons = [...document.querySelectorAll("[data-race-control]")];
  const vehicleSpecs = {
    jeep: { name: "Jeep", maxSpeed: 158, acceleration: 100, steering: 3.4 },
    challenger: { name: "Dodge Challenger", maxSpeed: 218, acceleration: 145, steering: 2.25 },
  };
  const checkpoints = [
    { distance: 175, type: "math", clue: "PA", question: { title: "Barrera bloqueada", prompt: "8 + 7 = ?", answer: "15", hint: "Suma 8 + 5 y añade 2." } },
    { distance: 365, type: "route" },
    { distance: 570, type: "math", clue: "TO", question: { title: "Pieza perdida", prompt: "Completa: 4, 8, 12, __", answer: "16", hint: "Cada número aumenta de cuatro en cuatro." } },
    { distance: 780, type: "math", question: { title: "Combustible", prompt: "Había 24 litros y el coche gastó 9. ¿Cuántos quedan?", answer: "15", hint: "Calcula 24 − 10 y devuelve 1." } },
  ];
  const controls = { left: false, right: false, accelerate: false, brake: false };
  let selectedVehicle = null;
  let selectedPaint = "#6b844a";
  let animationFrame = 0;
  let previousFrame = 0;
  let running = false;
  let game = freshGame();

  function freshGame() {
    return {
      phase: "choose", distance: 0, totalDistance: 980, rivalDistance: -35,
      rivalLane: .4, lane: 0, speed: 0, coins: 0, clues: [], checkpointIndex: 0,
      route: "standard", routeOffset: 0, upgrades: 0, items: [], activeQuestion: null,
      elapsed: 0, lastRivalComment: 0, offRoad: false,
      paint: selectedPaint, tires: ui.tires.value, accessory: ui.accessory.value,
    };
  }

  function comment(mechanic, duck) {
    ui.mechanic.textContent = mechanic;
    ui.duck.textContent = duck;
  }

  function makeItems(route) {
    const items = [];
    const lanes = [-.58, .28, .68, -.25, .48];
    for (let i = 0; i < 22; i += 1) {
      items.push({ type: "coin", distance: 45 + i * 44, lane: lanes[i % lanes.length], collected: false, cleared: false });
    }
    [[110, -.48, "cone"], [235, .58, "oil"], [442, -.72, "rock"], [510, .57, "cone"], [690, .68, "barrier"], [850, -.55, "cone"]]
      .forEach(([distance, lane, type]) => items.push({ type, distance, lane, collected: false, cleared: false }));
    if (route === "long") {
      [425, 490, 550].forEach((distance, i) => items.push({ type: "coin", distance, lane: [-.6, .56, 0][i], collected: false, cleared: false }));
      items.push({ type: "rock", distance: 465, lane: .25, collected: false, cleared: false });
      items.push({ type: "cone", distance: 530, lane: -.68, collected: false, cleared: false });
    }
    return items;
  }

  function zoneAt(distance) {
    if (distance < 245) return { name: "Autopista", grass: "#9bc87d" };
    if (distance < 500) return { name: "Terracería", grass: "#c9ad72" };
    if (distance < 760) return { name: "Montaña", grass: "#8fb875" };
    return { name: "Ciudad", grass: "#a8c795" };
  }

  function roadCenter(distance) {
    return width / 2 + Math.sin(distance * .0032) * 82 + Math.sin(distance * .0011) * 42;
  }

  function roundRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawWheel(x, y, radius, time, offRoad) {
    context.save();
    context.translate(x, y);
    context.rotate(time * .012);
    context.fillStyle = "#25252b";
    roundRect(context, -radius, -radius * 1.2, radius * 2, radius * 2.4, radius * .42);
    context.fill();
    context.strokeStyle = offRoad ? "#d9d1c1" : "#bbbcb8";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, radius * .46, 0, Math.PI * 2);
    context.stroke();
    for (let spoke = 0; spoke < 4; spoke += 1) {
      context.rotate(Math.PI / 2);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(0, -radius * .42);
      context.stroke();
    }
    if (offRoad) {
      context.strokeStyle = "#ded7c7";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-radius, -2); context.lineTo(radius, -2);
      context.moveTo(-radius, 2); context.lineTo(radius, 2);
      context.stroke();
    }
    context.restore();
  }

  function drawCar(x, y, type, paint, player, time) {
    const isJeep = type === "jeep";
    const carWidth = isJeep ? 48 : 43;
    const carHeight = isJeep ? 78 : 86;
    const curve = Math.atan2(roadCenter(game.distance + 10) - roadCenter(game.distance - 10), 20) * .65;
    context.save();
    context.translate(x, y);
    context.rotate(curve);
    if (player) { context.shadowColor = "#fff1a6"; context.shadowBlur = 11; }
    const wheelY = carHeight * .28;
    const rugged = player && game.tires === "all-terrain";
    drawWheel(-carWidth * .48, -wheelY, 7, time, rugged);
    drawWheel(carWidth * .48, -wheelY, 7, time, rugged);
    drawWheel(-carWidth * .48, wheelY, 7, time, rugged);
    drawWheel(carWidth * .48, wheelY, 7, time, rugged);
    context.shadowBlur = 0;
    context.fillStyle = paint;
    roundRect(context, -carWidth / 2, -carHeight / 2, carWidth, carHeight, isJeep ? 7 : 12);
    context.fill();
    context.strokeStyle = isJeep ? "#263328" : "#401f27";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#29404b";
    if (isJeep) {
      roundRect(context, -carWidth * .34, -carHeight * .26, carWidth * .68, carHeight * .38, 4);
      context.fill();
      context.fillStyle = "#bdd6d5";
      roundRect(context, -carWidth * .28, -carHeight * .23, carWidth * .56, carHeight * .15, 3);
      context.fill();
      context.fillStyle = paint;
      roundRect(context, -carWidth * .4, -carHeight * .06, carWidth * .8, carHeight * .23, 3);
      context.fill();
    } else {
      roundRect(context, -carWidth * .36, -carHeight * .18, carWidth * .72, carHeight * .4, 9);
      context.fill();
      context.fillStyle = "#bdd6d5";
      roundRect(context, -carWidth * .28, -carHeight * .15, carWidth * .56, carHeight * .15, 6);
      context.fill();
      context.fillStyle = paint;
      roundRect(context, -carWidth * .4, carHeight * .12, carWidth * .8, 12, 5);
      context.fill();
    }
    context.fillStyle = "#ffe28a";
    context.fillRect(-carWidth * .37, -carHeight * .46, 8, 4);
    context.fillRect(carWidth * .18, -carHeight * .46, 8, 4);
    if (player && game.accessory === "roof") {
      context.strokeStyle = "#25252b";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-carWidth * .3, 0); context.lineTo(carWidth * .3, 0);
      context.moveTo(-carWidth * .3, 5); context.lineTo(carWidth * .3, 5);
      context.stroke();
    }
    if (player && game.accessory === "spoiler") {
      context.fillStyle = "#24242a";
      context.fillRect(-carWidth * .56, carHeight * .36, carWidth * 1.12, 4);
    }
    context.restore();
  }

  function drawTrees(zone) {
    const first = Math.floor(game.distance / 92) * 92;
    for (let mark = first; mark < game.distance + 650; mark += 92) {
      const y = playerY - (mark - game.distance) * 1.08;
      if (y < -35 || y > height + 30) continue;
      const center = roadCenter(mark);
      for (const side of [-1, 1]) {
        const x = center + side * (roadHalfWidth + 40);
        context.fillStyle = "#75563b";
        context.fillRect(x - 3, y - 1, 6, 22);
        context.fillStyle = zone.name === "Ciudad" ? "#507c49" : "#3f7345";
        context.beginPath();
        context.arc(x, y - 8, 13 + Math.sin(mark) * 2, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawRoad() {
    const left = [];
    const right = [];
    for (let y = -8; y <= height + 12; y += 13) {
      const center = roadCenter(game.distance + (playerY - y) * 1.08);
      left.push([center - roadHalfWidth, y]);
      right.push([center + roadHalfWidth, y]);
    }
    context.beginPath();
    left.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    [...right].reverse().forEach(([x, y]) => context.lineTo(x, y));
    context.closePath();
    context.fillStyle = "#494850";
    context.fill();
    context.strokeStyle = "#eadfbf";
    context.lineWidth = 9;
    context.stroke();
    context.strokeStyle = "rgba(255,255,255,.78)";
    context.lineWidth = 2;
    context.setLineDash([24, 27]);
    context.lineDashOffset = -(game.distance * 1.08) % 51;
    context.beginPath();
    for (let y = -5; y <= height + 6; y += 13) {
      const center = roadCenter(game.distance + (playerY - y) * 1.08);
      if (y === -5) context.moveTo(center, y); else context.lineTo(center, y);
    }
    context.stroke();
    context.setLineDash([]);
  }

  function drawCoin(x, y, time) {
    context.save();
    context.translate(x, y);
    context.scale(.78 + Math.abs(Math.sin(time * .006)) * .22, 1);
    context.fillStyle = "#ffdc48";
    context.strokeStyle = "#8c5a23";
    context.lineWidth = 3;
    context.beginPath(); context.arc(0, 0, 13, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = "#8c5a23";
    context.font = "bold 14px Trebuchet MS, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("$", 0, 1);
    context.restore();
  }

  function drawObstacle(item, x, y) {
    context.save();
    context.translate(x, y);
    if (item.type === "cone") {
      context.fillStyle = "#ef7843";
      context.strokeStyle = "#753b30";
      context.lineWidth = 3;
      context.beginPath(); context.moveTo(0, -19); context.lineTo(14, 16); context.lineTo(-14, 16); context.closePath(); context.fill(); context.stroke();
      context.fillStyle = "#fff1d1"; context.fillRect(-9, 2, 18, 4);
    } else if (item.type === "oil") {
      context.fillStyle = "#242831";
      context.beginPath(); context.ellipse(0, 0, 24, 10, -.18, 0, Math.PI * 2); context.fill();
      context.fillStyle = "rgba(189,213,215,.55)";
      context.beginPath(); context.ellipse(-6, -2, 8, 3, -.18, 0, Math.PI * 2); context.fill();
    } else if (item.type === "rock") {
      context.fillStyle = "#8d8277";
      context.strokeStyle = "#4b4544";
      context.lineWidth = 3;
      context.beginPath(); context.moveTo(-19, 11); context.lineTo(-14, -8); context.lineTo(-3, -18); context.lineTo(11, -14); context.lineTo(19, 8); context.closePath(); context.fill(); context.stroke();
    } else {
      context.fillStyle = "#d3b263";
      context.fillRect(-30, -8, 60, 16);
      context.strokeStyle = "#61472f";
      context.lineWidth = 3;
      context.strokeRect(-30, -8, 60, 16);
    }
    context.restore();
  }

  function drawSign() {
    const routeAt = 365;
    if (game.distance < routeAt - 200 || game.distance > routeAt + 45) return;
    const y = playerY - (routeAt - game.distance) * 1.08 - 35;
    if (y < 35 || y > height - 36) return;
    const signX = roadCenter(routeAt) + roadHalfWidth - 8;
    context.fillStyle = "#fff0ac";
    context.strokeStyle = "#3e3730";
    context.lineWidth = 3;
    roundRect(context, signX - 54, y - 16, 108, 32, 5);
    context.fill(); context.stroke();
    context.fillStyle = "#35313a";
    context.font = "bold 12px Trebuchet MS, sans-serif";
    context.textAlign = "center"; context.textBaseline = "middle";
    context.fillText(game.route === "short" ? "ATAJO" : game.route === "long" ? "RUTA LARGA" : "DOS RUTAS", signX, y);
  }

  function drawWorldItems(time) {
    game.items.forEach((item) => {
      if (item.collected || item.cleared) return;
      const y = playerY - (item.distance - game.distance) * 1.08;
      if (y < 12 || y > height - 8) return;
      const x = roadCenter(item.distance) + item.lane * 182;
      if (item.type === "coin") drawCoin(x, y, time); else drawObstacle(item, x, y);
    });
  }

  function drawRace(time = 0) {
    const zone = zoneAt(game.distance);
    context.clearRect(0, 0, width, height);
    context.fillStyle = zone.ground; context.fillRect(0, 0, width, height);
    drawTrees(zone); drawRoad(); drawWorldItems(time); drawSign();
    if (selectedVehicle) {
      const rival = selectedVehicle === "jeep" ? "challenger" : "jeep";
      const rivalPaint = rival === "jeep" ? "#6b844a" : "#c54c3c";
      const rivalY = playerY - (game.rivalDistance - game.distance) * 1.08;
      const rivalX = roadCenter(game.rivalDistance) + game.rivalLane * 182;
      if (rivalY > -70 && rivalY < height + 70) drawCar(rivalX, rivalY, rival, rivalPaint, false, time);
      drawCar(roadCenter(game.distance) + game.lane * 182, playerY, selectedVehicle, game.paint, true, time);
    }
    if (game.phase === "finished") {
      context.fillStyle = "#fff0a8"; context.strokeStyle = "#37323a"; context.lineWidth = 3;
      context.fillRect(width - 94, 52, 52, 30); context.strokeRect(width - 94, 52, 52, 30);
      context.fillStyle = "#36313a"; context.font = "bold 13px Trebuchet MS, sans-serif"; context.textAlign = "center"; context.fillText("META", width - 68, 71);
    }
  }

  function setComments(mechanicText, duckText) {
    mechanicLine.textContent = mechanicText;
    duckLine.textContent = duckText;
  }

  function updateStats() {
    if (!selectedVehicle) {
      vehicleStats.textContent = `Jeep: tracción fuerte · Challenger: más velocidad${ui.tires.value === "all-terrain" ? " · todoterreno equipado" : ""}`;
      return;
    }
    const spec = vehicleSpecs[selectedVehicle];
    const tireName = game.tires === "all-terrain" ? "ruedas todoterreno" : "ruedas deportivas";
    const accessory = game.accessory === "roof" ? " · parrilla" : game.accessory === "spoiler" ? " · alerón" : "";
    vehicleStats.textContent = `${spec.name}: ${spec.maxSpeed + game.upgrades * 18} km/h · ${selectedVehicle === "jeep" ? "tracción" : "velocidad"} · ${tireName}${accessory}`;
  }

  function updateHud() {
    const percent = Math.min(100, Math.floor(game.distance / game.totalDistance * 100));
    progress.value = percent;
    progressLabel.textContent = `${percent}% · ${percent >= 100 ? "META" : game.distance > 0 ? "EN CARRERA" : "SALIDA"}`;
    speed.textContent = `${Math.round(game.speed)} km/h`;
    coins.textContent = `🪙 ${game.coins}`;
    zone.textContent = `Zona: ${zoneAt(game.distance).name}`;
    upgrade.disabled = !selectedVehicle || game.coins < 5 || game.upgrades >= 3;
    upgrade.textContent = game.upgrades >= 3 ? "Turbo al máximo" : `Turbo · 5 monedas (${game.upgrades}/3)`;
  }

  function updateClues() { clues.textContent = game.clues.length ? `Pistas: ${game.clues.join(" · ")}` : "Pistas: —"; }
  function addClue(clue) { if (!game.clues.includes(clue)) game.clues.push(clue); updateClues(); }

  function updatePaintPreviews() {
    paintChoices.forEach((choice) => choice.setAttribute("aria-pressed", String(choice.dataset.racePaint === selectedPaint)));
    vehicleChoices.forEach((choice) => choice.style.setProperty("--race-paint", selectedPaint));
  }

  function createItems(route) {
    const items = [];
    const lanes = [-.58, .28, .68, -.25, .48];
    for (let index = 0; index < 22; index += 1) items.push({ type: "coin", distance: 45 + index * 44, lane: lanes[index % lanes.length], collected: false, cleared: false });
    [[105, 0, "cone"], [240, .58, "oil"], [447, -.72, "rock"], [515, .57, "cone"], [705, .68, "barrier"], [870, -.55, "cone"]]
      .forEach(([distance, lane, type]) => items.push({ type, distance, lane, collected: false, cleared: false }));
    if (route === "long") {
      [430, 492, 552].forEach((distance, index) => items.push({ type: "coin", distance, lane: [-.6, .56, 0][index], collected: false, cleared: false }));
      items.push({ type: "rock", distance: 468, lane: .25, collected: false, cleared: false }, { type: "cone", distance: 534, lane: -.68, collected: false, cleared: false });
    }
    return items;
  }

  function stopControls() {
    Object.keys(controls).forEach((key) => { controls[key] = false; });
    driveButtons.forEach((button) => button.classList.remove("is-pressed"));
  }

  function showQuestion(question, phase) {
    game.phase = phase; game.activeQuestion = question; game.speed = 0; stopControls();
    answerForm.hidden = false; answer.value = ""; answerFeedback.textContent = "";
    challengeTitle.textContent = question.title; challengePrompt.textContent = question.prompt;
    routePanel.hidden = true; codeForm.hidden = true; answer.focus();
    setComments(`Mecánico Panda: ${question.hint}`, "Comentarista Pato: ¡Resuelve el reto y seguimos!");
  }

  function startLoop() {
    if (running) return;
    running = true; previousFrame = 0;
    animationFrame = window.requestAnimationFrame(tick);
  }

  function stopLoop() {
    running = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0; previousFrame = 0; stopControls();
  }

  function resetRace() {
    stopLoop(); game = freshGame(); selectedVehicle = null;
    live.hidden = true; finish.hidden = true; picker.hidden = false; customize.hidden = false;
    routePanel.hidden = true; answerForm.hidden = false; codeForm.hidden = true;
    answer.value = ""; code.value = ""; answerFeedback.textContent = ""; codeFeedback.textContent = "";
    vehicleButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    updateHud(); updateStats(); updateClues(); comment("Tengo las herramientas listas. ¿Cuál coche revisamos?", "¡En la pista todo puede pasar!");
  }

  function startVehicle(vehicle) {
    selectedVehicle = vehicle; game = freshGame(); game.vehicle = vehicle; game.paint = selectedPaint;
    game.tires = tires.value; game.accessory = accessory.value; game.items = createItems("standard");
    const rivalName = vehicle === "jeep" ? "Dodge Challenger" : "Jeep";
    carName.textContent = `Tú: ${specs[vehicle].name} · Rival: ${rivalName}`;
    vehicleButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.raceVehicle === vehicle)));
    customize.hidden = true; picker.hidden = true; live.hidden = false; finish.hidden = true;
    updateHud(); updateStats(); updateClues();
    showQuestion({ title: "Encendido", prompt: "Para arrancar: 7 + 5 = ?", answer: "12", hint: "Suma 7 + 3 para llegar a 10." }, "ignition");
    drawRace(performance.now()); startLoop();
  }

  function selectRoute(route) {
    game.route = route; game.routeOffset = route === "long" ? 125 : 0;
    game.totalDistance = route === "long" ? 1125 : 930; game.items = createItems(route);
    const question = route === "short"
      ? { title: "Atajo corto", prompt: "Multiplica para abrirlo: 7 × 4 = ?", answer: "28", hint: "Suma 7 cuatro veces." }
      : { title: "Ruta panorámica", prompt: "Calcula el combustible extra: 18 − 9 = ?", answer: "9", hint: "9 + 9 = 18." };
    showQuestion(question, "route-question");
  }

  function openRoute() {
    game.phase = "route-choice"; game.speed = 0; stopControls();
    routePanel.hidden = false; answerForm.hidden = true; codeForm.hidden = true;
    comment("Mecánico Panda: ¡Bifurcación! La corta exige más cálculo.", "Comentarista Pato: ¿Atajo difícil o camino largo con más monedas?");
  }

  function finishRace() {
    game.phase = "finished"; game.distance = game.totalDistance; game.speed = 0;
    codeForm.hidden = true; finish.hidden = false; updateHud();
    confetti.replaceChildren();
    const colors = ["#f26475", "#ffd82f", "#5b9bd5", "#69a877", "#a779c5"];
    for (let index = 0; index < 48; index += 1) {
      const piece = document.createElement("span");
      piece.style.setProperty("--confetti-x", `${(index * 43) % 100}%`);
      piece.style.setProperty("--confetti-color", colors[index % colors.length]);
      piece.style.setProperty("--confetti-delay", `${(index % 11) * 75}ms`);
      piece.style.setProperty("--confetti-rotation", `${(index * 37) % 180}deg`);
      confetti.append(piece);
    }
    comment("Mecánico Panda: ¡Trabajo perfecto!", "Comentarista Pato: ¡Lo lograste bien patoooo! ¡Qué carrerón!");
  }

  function submitAnswer() {
    const question = game.activeQuestion;
    if (!question) return;
    if (answer.value.trim() !== question.answer) {
      answerFeedback.textContent = `${question.hint} Inténtalo otra vez.`;
      duck.textContent = "Comentarista Pato: ¡No te rindas! Puedes probar otra vez.";
      answer.select(); return;
    }
    if (game.phase === "ignition") {
      game.phase = "driving"; game.speed = 0; answerForm.hidden = true;
      comment("Mecánico Panda: ¡Motor encendido!", "Comentarista Pato: ¡Gas, patooo! ¡Arrancamos!"); return;
    }
    if (game.phase === "route-question") {
      if (game.route === "short") { game.distance += 45; comment("Mecánico Panda: ¡Atajo abierto!", "Comentarista Pato: ¡Ganamos terreno con ese atajo!"); }
      else comment("Mecánico Panda: Ruta segura, busca monedas.", "Comentarista Pato: ¡A disfrutar el paisaje y esquivar conos!");
      game.checkpointIndex = 2; game.phase = "driving"; game.activeQuestion = null; answerForm.hidden = true; updateHud(); return;
    }
    if (game.phase === "checkpoint") {
      if (question.clue) addClue(question.clue);
      game.checkpointIndex += 1; game.phase = "driving"; game.activeQuestion = null; answerForm.hidden = true;
      comment("Mecánico Panda: ¡Reparación lista!", "Comentarista Pato: ¡Obstáculo superado, cuac!"); return;
    }
    if (game.phase === "final-math") {
      addClue("17"); game.finishCode = game.clues.join("");
      answerForm.hidden = true; codeForm.hidden = false;
      codePrompt.textContent = `Tus pistas forman ${game.finishCode}. Escribe el código para abrir el garaje.`;
      code.value = ""; codeFeedback.textContent = ""; game.phase = "code"; code.focus();
    }
  }

  function tick(time) {
    if (!running) return;
    const dt = previousFrame ? Math.min(.05, (time - previousFrame) / 1000) : 0;
    previousFrame = time; game.elapsed += dt;
    if (game.phase === "driving") {
      const spec = specs[selectedVehicle];
      const zone = zoneAt(game.distance).name;
      const rough = zone === "Terracería" || zone === "Montaña";
      let surface = rough ? (selectedVehicle === "jeep" ? 1 : .67) : 1;
      if (rough && game.tires === "all-terrain") surface = Math.min(1.12, surface + .2);
      if (!rough && game.tires === "street") surface *= 1.04;
      const maxSpeed = (spec.maxSpeed + game.upgrades * 18) * surface;
      if (controls.accelerate) game.speed = Math.min(maxSpeed, game.speed + spec.acceleration * surface * dt);
      else game.speed = Math.max(0, game.speed - (controls.brake ? 210 : 34) * dt);
      if (controls.brake) game.speed = Math.max(0, game.speed - 130 * dt);
      const steering = Number(controls.right) - Number(controls.left);
      game.lane = Math.max(-1.12, Math.min(1.12, game.lane + steering * spec.handling * (rough && game.tires !== "all-terrain" ? .78 : 1) * dt));
      game.distance += game.speed * dt * .39;
      game.rivalDistance = Math.min(game.totalDistance + 20, game.rivalDistance + 48 * dt);
      game.rivalLane = Math.sin(time * .00065) * .43;
      checkCollisions(); checkCheckpoint(); updateHud(); updateStats();
    }
    drawRace(time);
    animationFrame = window.requestAnimationFrame(tick);
  }

  if (document.documentElement.dataset.raceGameReady) return;
  document.documentElement.dataset.raceGameReady = "true";
  get("launch-race").addEventListener("click", () => {
    section.hidden = false; section.scrollIntoView({ behavior: "smooth", block: "start" }); drawRace(performance.now());
  });
  vehicleButtons.forEach((button) => button.addEventListener("click", () => startVehicle(button.dataset.raceVehicle)));
  paintButtons.forEach((button) => button.addEventListener("click", () => {
    selectedPaint = button.dataset.racePaint;
    paintButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    vehicleButtons.forEach((item) => item.style.setProperty("--race-paint", selectedPaint));
    updateStats();
  }));
  tires.addEventListener("change", () => { game.tires = tires.value; updateStats(); });
  accessory.addEventListener("change", () => { game.accessory = accessory.value; updateStats(); });
  answerForm.addEventListener("submit", (event) => { event.preventDefault(); submitAnswer(); });
  codeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (code.value.trim().toUpperCase().replace(/\s+/g, "") === game.finishCode) finishRace();
    else { codeFeedback.textContent = "El garaje no abre. Pista: une las letras y números recogidos."; code.select(); duck.textContent = "Comentarista Pato: ¡Prueba otra vez, la meta está cerca!"; }
  });
  routePanel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-race-route]");
    if (button) selectRoute(button.dataset.raceRoute);
  });
  driveButtons.forEach((button) => {
    const name = button.dataset.raceControl;
    const control = name === "up" || name === "accelerate" ? "accelerate" : name === "down" || name === "brake" ? "brake" : name;
    const press = (event) => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); controls[control] = true; button.classList.add("is-pressed"); };
    const release = () => { controls[control] = false; button.classList.remove("is-pressed"); };
    button.addEventListener("pointerdown", press);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => button.addEventListener(type, release));
  });
  const keyMap = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "accelerate", w: "accelerate", W: "accelerate", " ": "accelerate", ArrowDown: "brake", s: "brake", S: "brake" };
  document.addEventListener("keydown", (event) => {
    const control = keyMap[event.key];
    if (!control || live.hidden || event.target.closest?.("input, select")) return;
    event.preventDefault(); controls[control] = true;
  });
  document.addEventListener("keyup", (event) => { if (keyMap[event.key]) controls[keyMap[event.key]] = false; });
  window.addEventListener("blur", clearControls);
  window.addEventListener("pointerup", clearControls);
  upgrade.addEventListener("click", () => {
    if (game.coins < 5 || game.upgrades >= 3) return;
    game.coins -= 5; game.upgrades += 1; updateHud(); updateStats();
    comment("Mecánico Panda: ¡Turbo instalado!", "Comentarista Pato: ¡Mejora comprada, pisa el gas!");
  });
  get("race-restart").addEventListener("click", () => {
    stopLoop(); game = freshGame(); selectedVehicle = null;
    live.hidden = true; finish.hidden = true; picker.hidden = false; customize.hidden = false;
    routePanel.hidden = true; answerForm.hidden = false; codeForm.hidden = true;
    answer.value = ""; code.value = ""; answerFeedback.textContent = ""; codeFeedback.textContent = "";
    vehicleButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    updateHud(); updateStats(); updateClues(); comment("Tengo las herramientas listas. ¿Cuál coche revisamos?", "¡En la pista todo puede pasar!");
  });
  paintPreviews(); updateHud(); updateStats(); updateClues(); drawRace(0);
})();
