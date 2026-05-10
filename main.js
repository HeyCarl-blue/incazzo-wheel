let entries = [
    { name: 'Francesca', color: getRandomColor(), ignored: false, slices: 5 },
    { name: 'Brave',     color: getRandomColor(), ignored: false, slices: 1 },
];

let editingIndex = null;
let canvas = null;
let context = null;
let rotationOffset = 0;
let angularVelocity = 0;
let spinning = false;
let pointerAngle = 0;
let pointerAngleVel = 0;
let prevRotOffset = 0;

// ── Audio ─────────────────────────────────────────────────
let audioCtx = null;
function ac() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

function playSpinStart() {
    const ctx = ac(), now = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.32);
}

function playTick(velocity) {
    const ctx = ac(), now = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200 + velocity * 400;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.45, 0.08 + velocity * 0.06), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(now); src.stop(now + 0.04);
}

function playWinner() {
    const ctx = ac(), now = ctx.currentTime;
    [261, 329, 392, 523].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        const t = now + i * 0.11;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.35);
    });
}
// ─────────────────────────────────────────────────────────

function getRandomColor(){
    return `hsla(${~~(360 * Math.random())}, 70%,  72%, 0.8)`
}

function renderMenu() {
    const list = document.getElementById('entries-list');
    list.innerHTML = '';

    entries.forEach((entry, i) => {
        const li = document.createElement('li');
        li.className = 'entry-item' + (entry.ignored ? ' ignored' : '');

        const swatch = document.createElement('label');
        swatch.className = 'color-swatch';
        swatch.style.background = entry.ignored ? '#444' : entry.color;
        swatch.title = 'Change color';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = entry.color;
        colorInput.addEventListener('input', e => {
            entries[i].color = e.target.value;
            swatch.style.background = entry.ignored ? '#444' : e.target.value;
            renderWheel();
        });

        swatch.appendChild(colorInput);

        let nameEl;
        if (editingIndex === i) {
            nameEl = document.createElement('input');
            nameEl.type = 'text';
            nameEl.className = 'entry-edit-input';
            nameEl.value = entry.name;
            nameEl.maxLength = 30;
            nameEl.addEventListener('keydown', e => {
                if (e.key === 'Enter') commitEdit(i, nameEl.value);
                if (e.key === 'Escape') { editingIndex = null; renderMenu(); }
            });
            nameEl.addEventListener('blur', () => commitEdit(i, nameEl.value));
            requestAnimationFrame(() => { nameEl.focus(); nameEl.select(); });
        } else {
            nameEl = document.createElement('span');
            nameEl.className = 'entry-name';
            nameEl.textContent = entry.name;
            nameEl.title = entry.name;
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon' + (editingIndex === i ? ' btn-save' : '');
        editBtn.title = editingIndex === i ? 'Save' : 'Edit name';
        editBtn.textContent = editingIndex === i ? '✓' : '✎';
        editBtn.addEventListener('mousedown', e => {
            e.preventDefault();
            if (editingIndex === i) {
                commitEdit(i, nameEl.value ?? entry.name);
            } else {
                editingIndex = i;
                renderMenu();
                renderWheel();
            }
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'entry-toggle';
        checkbox.checked = !entry.ignored;
        checkbox.title = entry.ignored ? 'Enable' : 'Disable';
        checkbox.addEventListener('change', () => {
            entries[i].ignored = !checkbox.checked;
            if (editingIndex === i) editingIndex = null;
            renderMenu();
            renderWheel();
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-icon btn-remove';
        removeBtn.title = 'Remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => {
            entries.splice(i, 1);
            if (editingIndex === i) editingIndex = null;
            else if (editingIndex !== null && editingIndex > i) editingIndex--;
            renderMenu();
            renderWheel();
        });

        const slicesWrap = document.createElement('div');
        slicesWrap.className = 'slices-wrap';

        const slicesDec = document.createElement('button');
        slicesDec.className = 'btn-slices';
        slicesDec.textContent = '−';

        const slicesInput = document.createElement('input');
        slicesInput.type = 'number';
        slicesInput.className = 'slices-input';
        slicesInput.min = 1;
        slicesInput.value = entry.slices ?? 1;
        slicesInput.title = 'Slices';

        const slicesInc = document.createElement('button');
        slicesInc.className = 'btn-slices';
        slicesInc.textContent = '+';

        const setSlices = (val) => {
            entries[i].slices = Math.max(1, val);
            slicesInput.value = entries[i].slices;
            slicesDec.disabled = entries[i].slices <= 1;
            renderWheel();
        };

        slicesInput.addEventListener('change', () => setSlices(parseInt(slicesInput.value) || 1));
        slicesDec.addEventListener('click', () => setSlices(entries[i].slices - 1));
        slicesInc.addEventListener('click', () => setSlices(entries[i].slices + 1));
        slicesDec.disabled = (entry.slices ?? 1) <= 1;

        slicesWrap.append(slicesDec, slicesInput, slicesInc);
        li.append(checkbox, swatch, nameEl, editBtn, slicesWrap, removeBtn);
        list.appendChild(li);
    });
}

function commitEdit(i, value) {
    const trimmed = value.trim();
    if (trimmed) entries[i].name = trimmed;
    editingIndex = null;
    renderMenu();
    renderWheel();
}

// CANVAS
function resizeCanvas() {
    if (!canvas) canvas = document.getElementById('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getActiveEntries() {
    return entries.filter(e => !e.ignored);
}

// WHEEL
function renderWheel() {
    if (!canvas || !context) return;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const active = getActiveEntries();
    if (active.length === 0) return;

    const w = window.innerWidth, h = window.innerHeight;
    const center = { x: w / 2, y: h / 2 };
    const divisor = w < 600 ? 2.6 : 3.5;
    const radius = Math.min(w, h) / divisor;
    const totalSlices = active.reduce((s, e) => s + (e.slices ?? 1), 0);

    let a = rotationOffset;
    for (const entry of active) {
        const angleInc = (entry.slices ?? 1) / totalSlices * 2 * Math.PI;

        context.beginPath();
        context.moveTo(center.x, center.y);
        context.arc(center.x, center.y, radius, a, a + angleInc);
        context.closePath();
        context.fillStyle = entry.color;
        context.fill();
        context.strokeStyle = 'rgba(0,0,0,0.15)';
        context.lineWidth = 1;
        context.stroke();

        // Label
        const totalWeight = active.reduce((s, e) => s + (e.slices ?? 1), 0);
        const fontSize = Math.max(11, Math.min(18, Math.floor(220 / totalWeight)));
        context.save();
        context.translate(center.x, center.y);
        context.rotate(a + angleInc / 2);
        context.textAlign = 'center';
        context.fillStyle = 'rgba(0,0,0,0.7)';
        context.font = `bold ${fontSize}px Arial`;
        context.fillText(entry.name, radius * 0.65, fontSize * 0.35, radius * 0.55);
        context.restore();

        a += angleInc;
    }

    // Separator circles
    const sepRadius = radius / 50;
    a = rotationOffset;
    for (const entry of active) {
        const sepX = center.x + radius * Math.cos(a);
        const sepY = center.y + radius * Math.sin(a);
        a += (entry.slices ?? 1) / totalSlices * 2 * Math.PI;
        context.beginPath();
        context.arc(sepX, sepY, sepRadius, 0, 2 * Math.PI);
        context.closePath();
        context.fillStyle = 'white';
        context.fill();
        context.strokeStyle = 'rgba(0,0,0,0.15)';
        context.lineWidth = 1;
        context.stroke();
    }

    // Water droplet pointer (upside-down)
    const tipX = center.x;
    const tipY = center.y - radius + 7;
    const r = 12;
    const circleY = tipY - r * 2.5;

    context.save();
    context.translate(tipX, circleY);
    context.rotate(pointerAngle);
    context.translate(-tipX, -circleY);

    context.beginPath();
    context.moveTo(tipX, tipY);
    // Left side: cubic bezier from tip up to left of circle
    // cp2 is directly below the arc endpoint so the join is tangentially smooth
    context.bezierCurveTo(
        tipX - r * 0.4, tipY - r * 0.7,
        tipX - r,       circleY + r * 0.8,
        tipX - r,       circleY
    );
    // Round body: arc over the top (anticlockwise = over the top)
    context.arc(tipX, circleY, r, 2*Math.PI, 0);
    // Right side: cubic bezier from right of circle back down to tip
    context.bezierCurveTo(
        tipX + r,       circleY + r * 0.8,
        tipX + r * 0.4, tipY - r * 0.7,
        tipX,           tipY
    );
    context.closePath();
    context.fillStyle = 'white';
    context.fill();
    context.strokeStyle = 'rgba(0,0,0,0.2)';
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
}

function updatePointer() {
    const active = getActiveEntries();
    if (active.length === 0) return;

    const total = active.reduce((s, e) => s + (e.slices ?? 1), 0);
    let cumAngle = 0;
    for (const entry of active) {
        // Boundary is at the pointer (-π/2) when rotationOffset = -π/2 - cumAngle + k*2π
        const target = -Math.PI / 2 - cumAngle;
        if (Math.floor((rotationOffset - target) / (2 * Math.PI)) >
            Math.floor((prevRotOffset  - target) / (2 * Math.PI))) {
            pointerAngleVel -= Math.min(angularVelocity * 1.2, 0.25);
            playTick(angularVelocity);
        }
        cumAngle += (entry.slices ?? 1) / total * 2 * Math.PI;
    }
    prevRotOffset = rotationOffset;

    // Spring back to 0
    pointerAngleVel -= pointerAngle * 0.3;
    pointerAngleVel *= 0.6;
    pointerAngle += pointerAngleVel;
}

function spin() {
    return new Promise(resolve => {
        playSpinStart();
        angularVelocity = Math.random() * 4.0 + 0.25;
        animate(resolve);
    });
}

function animate(resolve) {
    angularVelocity *= 0.97;
    rotationOffset += angularVelocity;
    updatePointer();
    renderWheel();

    if (angularVelocity > 0.003) {
        requestAnimationFrame(() => animate(resolve));
    } else {
        spinning = false;
        resolve(getWinner());
        
    }
}

function getWinner() {
    const active = getActiveEntries();
    if (active.length === 0) return null;
    const total = active.reduce((s, e) => s + (e.slices ?? 1), 0);
    const rel = ((-Math.PI / 2 - rotationOffset) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    let cumAngle = 0;
    for (const entry of active) {
        cumAngle += (entry.slices ?? 1) / total * 2 * Math.PI;
        if (rel < cumAngle) return entry;
    }
    return active[active.length - 1];
}

window.addEventListener('resize', () => { resizeCanvas(); renderWheel(); });

window.addEventListener('load', (e) => {
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeCanvas();

    // Toggle collapse
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('menu-panel').classList.toggle('open');
    });

    // Add entry
    document.getElementById('add-btn').addEventListener('click', () => {
        const input = document.getElementById('add-input');
        const name = input.value.trim();
        if (!name) return;
        const color = getRandomColor();
        entries.push({ name, color, ignored: false, slices: 1 });
        input.value = '';
        renderMenu();
        renderWheel();
    });

    document.getElementById('add-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('add-btn').click();
    });

    const spinBtn = document.getElementById('spin-btn');
    const winnerLabel = document.getElementById('winner-label');

    spinBtn.addEventListener('click', async () => {
        spinBtn.disabled = true;
        winnerLabel.classList.remove('visible');
        const winner = await spin();
        winnerLabel.innerHTML = `😡 Oggi mi incazzo con <span style="color: ${winner.color}">${winner.name}</span> 😡`;
        winnerLabel.classList.add('visible');
        playWinner();
        spinBtn.disabled = false;
    });

    renderWheel();
    renderMenu();
})
