// --- INITIALIZATION & PERSISTENCE ---
document.addEventListener('DOMContentLoaded', () => {
  renderAll();
});

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save trip state to localStorage:', err);
  }
}

function resetTripData() {
  const confirmed = confirm('Reset all gear claims, expenses, and detours back to the default demo trip?');
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  state = JSON.parse(JSON.stringify(INITIAL_STATE));
  renderAll();
}

function renderAll() {
  saveState();
  renderSummaryStrip();
  renderGearPanel();
  renderCostsPanel();
  renderRoutePanel();
  renderAlertsPanel();
  renderCrewPanel();
  lucide.createIcons();
}

// --- NAVIGATION & MODALS ---
function switchTab(tabName) {
  state.activeTab = tabName;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('border-amber-400', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('border-transparent', !isActive);
    btn.classList.toggle('text-emerald-200', !isActive);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  document.getElementById(`panel-${tabName}`).classList.remove('hidden');
  lucide.createIcons();
}

function toggleOfflineMode() {
  state.offlineSimulated = !state.offlineSimulated;
  const dot = document.getElementById('offlineDot');
  const label = document.getElementById('offlineLabel');

  if (state.offlineSimulated) {
    dot.className = 'w-2 h-2 rounded-full bg-amber-400 offline-pulse';
    label.textContent = 'Offline Mode (Local Cache)';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    label.textContent = 'Synced Live';
  }
}

function openShareModal() {
  const modal = document.getElementById('shareModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function copyShareLink() {
  const input = document.getElementById('shareUrlInput');
  input.select();
  navigator.clipboard.writeText(input.value);
  const btn = document.getElementById('copyBtn');
  btn.textContent = 'Copied!';
  setTimeout(() => (btn.textContent = 'Copy Link'), 2000);
}

function exportTripJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', 'sherpagrid-offline-packet.json');
  dlAnchor.click();
}

// --- SUMMARY STRIP ---
function renderSummaryStrip() {
  const claimedCount = state.gear.filter(g => g.status !== 'unclaimed').length;
  const totalTripCost = calculateTotalExpenses();
  const perPersonCost = (totalTripCost / state.crew.length).toFixed(2);
  const activeDetours = state.itinerary.reduce((acc, d) => acc + d.detours.filter(x => x.selected).length, 0);

  document.getElementById('summaryStrip').innerHTML = `
    <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
      <div class="text-xs font-medium text-stone-500">Shared Gear Covered</div>
      <div class="mt-1 flex items-baseline justify-between">
        <span class="text-xl font-bold text-stone-900">${claimedCount} / ${state.gear.length} Items</span>
        <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">0 Duplicates</span>
      </div>
    </div>
    <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
      <div class="text-xs font-medium text-stone-500">Est. Cost Per Hiker</div>
      <div class="mt-1 flex items-baseline justify-between">
        <span class="text-xl font-bold text-stone-900">$${perPersonCost}</span>
        <span class="text-xs text-stone-500">Incl. Fuel & Permits</span>
      </div>
    </div>
    <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
      <div class="text-xs font-medium text-stone-500">Planned Scenic Detours</div>
      <div class="mt-1 flex items-baseline justify-between">
        <span class="text-xl font-bold text-stone-900">${activeDetours} Stops</span>
        <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">7 Vistas Mapped</span>
      </div>
    </div>
    <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
      <div class="text-xs font-medium text-stone-500">Trail & Weather Alerts</div>
      <div class="mt-1 flex items-baseline justify-between">
        <span class="text-xl font-bold text-rose-700">${state.alerts.length} Active</span>
        <span class="text-xs text-emerald-700 font-medium">Cached Offline</span>
      </div>
    </div>
  `;
}

// --- 1. SHARED GEAR MATRIX ---
function formatWeight(kg) {
  return state.weightUnit === 'kg' ? `${kg.toFixed(2)} kg` : `${(kg * 2.20462).toFixed(2)} lbs`;
}

function toggleWeightUnit() {
  state.weightUnit = state.weightUnit === 'kg' ? 'lbs' : 'kg';
  renderGearPanel();
  lucide.createIcons();
}

function cycleGearStatus(id) {
  const item = state.gear.find(g => g.id === id);
  if (!item) return;

  if (item.status === 'unclaimed') {
    item.status = 'claimed';
    item.assignedTo = state.crew[0].id;
  } else if (item.status === 'claimed') {
    item.status = 'packed';
  } else {
    item.status = 'unclaimed';
    item.assignedTo = null;
  }
  renderAll();
}

function assignGearMember(gearId, userId) {
  const item = state.gear.find(g => g.id === gearId);
  if (!item) return;
  item.assignedTo = userId || null;
  item.status = userId ? 'claimed' : 'unclaimed';
  renderAll();
}

function addGearItem(e) {
  e.preventDefault();
  const name = document.getElementById('newGearName').value.trim();
  const category = document.getElementById('newGearCat').value;
  const weightKg = parseFloat(document.getElementById('newGearWeight').value) || 0.5;
  if (!name) return;

  // Duplicate prevention check
  const exists = state.gear.some(g => g.name.toLowerCase() === name.toLowerCase());
  if (exists && !confirm(`"${name}" is already on the shared list! Add another anyway?`)) return;

  state.gear.unshift({
    id: 'g' + Date.now(),
    name,
    category,
    needed: 1,
    weightKg,
    assignedTo: null,
    status: 'unclaimed',
    note: 'Added by crew'
  });
  renderAll();
}

function renderGearPanel() {
  const memberLoads = state.crew.map(member => {
    const totalKg = state.gear
      .filter(g => g.assignedTo === member.id)
      .reduce((sum, g) => sum + g.weightKg, 0);
    return { ...member, totalKg };
  });

  const maxLoad = Math.max(...memberLoads.map(m => m.totalKg), 4);

  document.getElementById('panel-gear').innerHTML = `
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Left: Checklist Table -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-heading font-bold text-lg text-stone-900">Anti-Duplicate Shared Gear Matrix</h2>
            <p class="text-xs text-stone-500">Strict 1-per-group quotas stop 3 people from packing camp stoves.</p>
          </div>
          <button onclick="toggleWeightUnit()" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300">
            Units: ${state.weightUnit.toUpperCase()}
          </button>
        </div>

        <!-- Quick Add Form -->
        <form onsubmit="addGearItem(event)" class="p-4 bg-stone-50 border-b border-stone-200 grid sm:grid-cols-4 gap-2">
          <input id="newGearName" type="text" placeholder="Item (e.g., Bear Canister)" required class="sm:col-span-2 text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-700" />
          <select id="newGearCat" class="text-xs px-2.5 py-2 rounded-lg border border-stone-300 bg-white">
            <option>Cooking</option>
            <option>Shelter</option>
            <option>Safety</option>
            <option>Water</option>
            <option>Navigation</option>
          </select>
          <div class="flex gap-2">
            <input id="newGearWeight" type="number" step="0.05" placeholder="kg" class="w-16 text-xs px-2 py-2 rounded-lg border border-stone-300" />
            <button type="submit" class="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg">Add</button>
          </div>
        </form>

        <div class="divide-y divide-stone-100">
          ${state.gear.map(item => {
            const statusStyles = {
              packed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              claimed: 'bg-amber-100 text-amber-800 border-amber-200',
              unclaimed: 'bg-rose-50 text-rose-700 border-rose-200'
            };
            return `
              <div class="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-stone-50/80 transition">
                <div class="min-w-[200px]">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-stone-900">${item.name}</span>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600">${item.category}</span>
                  </div>
                  <div class="text-xs text-stone-500 mt-0.5">${formatWeight(item.weightKg)} • ${item.note}</div>
                </div>

                <div class="flex items-center gap-2.5">
                  <select onchange="assignGearMember('${item.id}', this.value)" class="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-700">
                    <option value="">-- Unassigned --</option>
                    ${state.crew.map(c => `<option value="${c.id}" ${item.assignedTo === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>

                  <button onclick="cycleGearStatus('${item.id}')" class="text-xs font-semibold px-3 py-1.5 rounded-lg border capitalize min-w-[92px] text-center transition ${statusStyles[item.status]}">
                    ${item.status}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right: Pack Weight Balance -->
      <div class="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4 h-fit">
        <div>
          <h3 class="font-heading font-bold text-base text-stone-900">Group Pack Weight Balance</h3>
          <p class="text-xs text-stone-500">Keep shared group gear distributed fairly across packs.</p>
        </div>
        <div class="space-y-4">
          ${memberLoads.map(m => {
            const pct = Math.min(100, Math.round((m.totalKg / maxLoad) * 100));
            return `
              <div>
                <div class="flex justify-between text-xs font-medium mb-1">
                  <span class="text-stone-800">${m.name}</span>
                  <span class="font-bold text-emerald-800">${formatWeight(m.totalKg)}</span>
                </div>
                <div class="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div class="h-full ${m.color} rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// --- 2. AUTOMATED COST & FUEL SPLITTER ---
function calculateFuelTotal() {
  const { distanceKm, efficiencyL100, pricePerLiter, vehicles } = state.fuelCalc;
  return (distanceKm / 100) * efficiencyL100 * pricePerLiter * vehicles;
}

function calculateTotalExpenses() {
  const staticSum = state.expenses.reduce((s, e) => s + e.amount, 0);
  return staticSum + calculateFuelTotal();
}

function updateFuelCalc(field, val) {
  state.fuelCalc[field] = parseFloat(val) || 0;
  renderAll();
}

function addExpense(e) {
  e.preventDefault();
  const title = document.getElementById('expTitle').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const paidBy = document.getElementById('expPaidBy').value;
  if (!title || isNaN(amount) || amount <= 0) return;

  state.expenses.push({ id: 'e' + Date.now(), title, amount, paidBy, category: 'Shared' });
  renderAll();
}

function computeSettlements() {
  const total = calculateTotalExpenses();
  const fairShare = total / state.crew.length;

  // Fuel split equally between driver 1 (u1) and driver 2 (u3)
  const fuelTotal = calculateFuelTotal();
  const balances = state.crew.map(member => {
    let paid = state.expenses.filter(e => e.paidBy === member.id).reduce((s, e) => s + e.amount, 0);
    if (member.id === 'u1' || member.id === 'u3') paid += fuelTotal / 2;
    return { id: member.id, name: member.name, net: paid - fairShare };
  });

  const debtors = balances.filter(b => b.net < -0.01).sort((a, b) => a.net - b.net);
  const creditors = balances.filter(b => b.net > 0.01).sort((a, b) => b.net - a.net);
  const transfers = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].net, creditors[j].net);
    transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: amount.toFixed(2) });
    debtors[i].net += amount;
    creditors[j].net -= amount;
    if (Math.abs(debtors[i].net) < 0.01) i++;
    if (Math.abs(creditors[j].net) < 0.01) j++;
  }
  return transfers;
}

function renderCostsPanel() {
  const fuelTotal = calculateFuelTotal();
  const total = calculateTotalExpenses();
  const settlements = computeSettlements();

  document.getElementById('panel-costs').innerHTML = `
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Fuel Calculator & Ledger -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-heading font-bold text-lg text-stone-900">Automated Roadtrip Fuel Split</h2>
              <p class="text-xs text-stone-500">Auto-calculates round-trip gas across trailhead shuttle vehicles.</p>
            </div>
            <div class="text-right">
              <div class="text-xs text-stone-500">Total Fuel Pool</div>
              <div class="text-lg font-extrabold text-emerald-800">$${fuelTotal.toFixed(2)}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <label class="block text-[11px] font-semibold text-stone-600 mb-1">Round-Trip (km)</label>
              <input type="number" value="${state.fuelCalc.distanceKm}" oninput="updateFuelCalc('distanceKm', this.value)" class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-stone-600 mb-1">L / 100 km</label>
              <input type="number" step="0.1" value="${state.fuelCalc.efficiencyL100}" oninput="updateFuelCalc('efficiencyL100', this.value)" class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-stone-600 mb-1">Gas Price ($/L)</label>
              <input type="number" step="0.01" value="${state.fuelCalc.pricePerLiter}" oninput="updateFuelCalc('pricePerLiter', this.value)" class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-stone-600 mb-1">Vehicles</label>
              <input type="number" value="${state.fuelCalc.vehicles}" oninput="updateFuelCalc('vehicles', this.value)" class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white" />
            </div>
          </div>
        </div>

        <!-- Expense Ledger -->
        <div class="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-stone-200">
            <h3 class="font-heading font-bold text-base text-stone-900">Permits, Food & Shared Expenses</h3>
          </div>
          <form onsubmit="addExpense(event)" class="p-4 bg-stone-50 border-b border-stone-200 grid sm:grid-cols-4 gap-2">
            <input id="expTitle" type="text" placeholder="Expense (e.g., Park Pass)" required class="sm:col-span-2 text-xs px-3 py-2 rounded-lg border border-stone-300" />
            <input id="expAmount" type="number" step="0.01" placeholder="$ Amount" required class="text-xs px-3 py-2 rounded-lg border border-stone-300" />
            <div class="flex gap-2">
              <select id="expPaidBy" class="text-xs px-2 py-2 rounded-lg border border-stone-300 bg-white">
                ${state.crew.map(c => `<option value="${c.id}">${c.name.split(' ')[0]}</option>`).join('')}
              </select>
              <button type="submit" class="flex-1 bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg">Log</button>
            </div>
          </form>
          <div class="divide-y divide-stone-100">
            ${state.expenses.map(exp => {
              const payer = state.crew.find(c => c.id === exp.paidBy);
              return `
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <div class="text-sm font-semibold text-stone-900">${exp.title}</div>
                    <div class="text-xs text-stone-500">Paid by ${payer ? payer.name : 'Crew'}</div>
                  </div>
                  <div class="font-bold text-sm text-stone-900">$${exp.amount.toFixed(2)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Right: Minimal-Transfer Settlements -->
      <div class="bg-emerald-950 text-stone-100 rounded-2xl p-5 shadow-md space-y-4 h-fit">
        <div>
          <span class="text-[11px] uppercase tracking-wider font-bold text-amber-400">Zero-Math Settlement</span>
          <h3 class="font-heading font-bold text-lg text-white mt-0.5">Minimal Transfers Needed</h3>
          <p class="text-xs text-emerald-300/80">Total Group Spend: $${total.toFixed(2)} ($${(total / state.crew.length).toFixed(2)} / person)</p>
        </div>
        <div class="space-y-2.5">
          ${settlements.length === 0
            ? `<div class="text-xs text-emerald-200">Everyone is completely squared up!</div>`
            : settlements.map(t => `
              <div class="bg-emerald-900/80 border border-emerald-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold text-white">${t.from}</span>
                  <span class="text-emerald-300"> pays </span>
                  <span class="font-bold text-amber-300">${t.to}</span>
                </div>
                <span class="font-mono font-bold text-sm text-white">$${t.amount}</span>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
}

// --- 3. ROUTE, VIEWS TO EXPECT & TOURISTIC DETOURS ---
function selectDay(dayNum) {
  state.selectedDay = dayNum;
  renderRoutePanel();
  lucide.createIcons();
}

function toggleDetour(dayNum, detourIdx) {
  const dayObj = state.itinerary.find(d => d.day === dayNum);
  if (!dayObj) return;
  dayObj.detours[detourIdx].selected = !dayObj.detours[detourIdx].selected;
  renderAll();
}

function renderRoutePanel() {
  const current = state.itinerary.find(d => d.day === state.selectedDay) || state.itinerary[0];

  document.getElementById('panel-route').innerHTML = `
    <!-- Day Selector Pills -->
    <div class="flex flex-wrap gap-2">
      ${state.itinerary.map(d => `
        <button onclick="selectDay(${d.day})" class="px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
          d.day === state.selectedDay
            ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
        }">
          Day ${d.day}: ${d.distance}
        </button>
      `).join('')}
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- What Views to Expect -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
        <div class="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">Day ${current.day} Trail Intel</span>
            <h2 class="font-heading font-bold text-xl text-stone-900 mt-0.5">${current.title}</h2>
          </div>
          <div class="flex gap-2 text-xs font-semibold">
            <span class="bg-stone-100 px-2.5 py-1 rounded-lg text-stone-700">${current.distance}</span>
            <span class="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">${current.elevationGain}</span>
          </div>
        </div>

        <div>
          <h3 class="font-heading font-bold text-sm text-stone-800 flex items-center gap-2 mb-3">
            <i data-lucide="eye" class="w-4 h-4 text-emerald-700"></i> What Views to Expect & Golden-Hour Spots
          </h3>
          <div class="grid sm:grid-cols-2 gap-4">
            ${current.viewsToExpect.map(v => `
              <div class="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-sm text-emerald-950">${v.spot}</span>
                  <span class="text-[11px] font-semibold bg-white text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">${v.bestTime}</span>
                </div>
                <p class="text-xs text-stone-700 leading-relaxed">${v.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Nearby Touristic Locations & Detours -->
      <div class="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4 h-fit">
        <div>
          <h3 class="font-heading font-bold text-base text-stone-900 flex items-center gap-2">
            <i data-lucide="map-pin" class="w-4 h-4 text-amber-600"></i> Nearby Touristic Detours
          </h3>
          <p class="text-xs text-stone-500 mt-0.5">Toggle stops along the trailhead corridor to include in the crew timeline.</p>
        </div>

        <div class="space-y-3">
          ${current.detours.map((detour, idx) => `
            <div onclick="toggleDetour(${current.day}, ${idx})" class="cursor-pointer p-3.5 rounded-xl border transition ${
              detour.selected ? 'bg-amber-50/70 border-amber-300' : 'bg-stone-50 border-stone-200 opacity-75 hover:opacity-100'
            }">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-bold text-xs text-stone-900">${detour.name}</div>
                  <div class="text-[11px] text-amber-800 font-medium mt-0.5">${detour.type} • ${detour.extraTime}</div>
                </div>
                <input type="checkbox" ${detour.selected ? 'checked' : ''} class="mt-0.5 accent-emerald-800" />
              </div>
              <p class="text-xs text-stone-600 mt-2 leading-relaxed">${detour.note}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// --- 4. OFFLINE TRAIL & WEATHER ALERTS ---
function renderAlertsPanel() {
  document.getElementById('panel-alerts').innerHTML = `
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-3">
        <h2 class="font-heading font-bold text-lg text-stone-900">Aggregated Park & Wildlife Advisories</h2>
        ${state.alerts.map(a => {
          const badge = a.severity === 'high'
            ? 'bg-rose-100 text-rose-800 border-rose-200'
            : a.severity === 'medium'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : 'bg-sky-100 text-sky-800 border-sky-200';
          return `
            <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${badge}">${a.severity} Priority</span>
                <span class="text-[11px] text-stone-400 font-mono">${a.time}</span>
              </div>
              <h3 class="font-bold text-sm text-stone-900">${a.title}</h3>
              <p class="text-xs text-stone-600 leading-relaxed">${a.detail}</p>
            </div>
          `;
        }).join('')}
      </div>

      <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3 h-fit">
        <h3 class="font-heading font-bold text-base text-stone-900">Alpine Microclimate Forecast</h3>
        <div class="divide-y divide-stone-100">
          ${state.weather.map(w => `
            <div class="py-3 flex items-center justify-between text-xs">
              <div>
                <div class="font-bold text-stone-900">${w.day}</div>
                <div class="text-stone-500">${w.condition} • Wind ${w.wind}</div>
              </div>
              <div class="text-right font-mono">
                <div class="font-bold text-stone-900">${w.highC}° / ${w.lowC}°C</div>
                <div class="text-sky-700">Precip ${w.precip}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// --- 5. CREW & CARPOOL LOGISTICS ---
function renderCrewPanel() {
  document.getElementById('panel-crew').innerHTML = `
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${state.crew.map(member => `
        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${member.color} text-white font-bold flex items-center justify-center text-sm">
              ${member.avatar}
            </div>
            <div>
              <div class="font-bold text-sm text-stone-900">${member.name}</div>
              <div class="text-xs text-emerald-700 font-medium">${member.role}</div>
            </div>
          </div>
          <div class="pt-2 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
            <div><strong class="text-stone-800">Transport:</strong> ${member.car}</div>
            <div><strong class="text-stone-800">Safety Gear:</strong> ${member.emergency}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}