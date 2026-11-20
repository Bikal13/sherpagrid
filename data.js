const INITIAL_STATE = {
  activeTab: 'gear',
  weightUnit: 'kg', // 'kg' or 'lbs'
  offlineSimulated: false,
  selectedDay: 1,

  crew: [
    { id: 'u1', name: 'Maya Lin', role: 'Trip Lead & Navigator', avatar: 'ML', color: 'bg-emerald-700', car: 'Subaru Outback (3 seats left)', emergency: 'Garmin inReach Mini 2' },
    { id: 'u2', name: 'Liam Vance', role: 'Camp Chef & Stove', avatar: 'LV', color: 'bg-amber-600', car: 'Riding with Maya', emergency: 'First Aid Certified' },
    { id: 'u3', name: 'Elena Rostova', role: 'Permits & Photography', avatar: 'ER', color: 'bg-sky-700', car: 'Toyota RAV4 (2 seats left)', emergency: 'Bear Spray x2' },
    { id: 'u4', name: 'Noah Brooks', role: 'Water & Shelter', avatar: 'NB', color: 'bg-indigo-700', car: 'Riding with Elena', emergency: 'Satellite SOS iPhone' }
  ],

  gear: [
    { id: 'g1', name: 'MSR WhisperLite Camp Stove', category: 'Cooking', needed: 1, weightKg: 0.45, assignedTo: 'u2', status: 'packed', note: 'Only 1 needed for group boil' },
    { id: 'g2', name: 'IsoPro Fuel Canisters (230g)', category: 'Cooking', needed: 2, weightKg: 0.75, assignedTo: 'u2', status: 'claimed', note: '2 canisters total' },
    { id: 'g3', name: '3-Person Ultralight Tent #1', category: 'Shelter', needed: 1, weightKg: 2.10, assignedTo: 'u1', status: 'packed', note: 'Maya & Elena' },
    { id: 'g4', name: '3-Person Ultralight Tent #2', category: 'Shelter', needed: 1, weightKg: 2.05, assignedTo: 'u4', status: 'claimed', note: 'Liam & Noah' },
    { id: 'g5', name: 'Katadyn Gravity Water Filter (6L)', category: 'Water', needed: 1, weightKg: 0.35, assignedTo: 'u4', status: 'packed', note: 'Covers all 4 hikers' },
    { id: 'g6', name: 'Ursack Bear-Resistant Food Bag', category: 'Safety', needed: 2, weightKg: 0.40, assignedTo: 'u1', status: 'packed', note: 'Mandatory in Yoho' },
    { id: 'g7', name: 'Comprehensive Trail Med-Kit', category: 'Safety', needed: 1, weightKg: 0.65, assignedTo: null, status: 'unclaimed', note: 'Includes blister moleskin' },
    { id: 'g8', name: 'Garmin inReach Satellite Communicator', category: 'Navigation', needed: 1, weightKg: 0.12, assignedTo: 'u1', status: 'packed', note: 'Active subscription' }
  ],

  fuelCalc: {
    distanceKm: 460,
    efficiencyL100: 8.6,
    pricePerLiter: 1.68,
    vehicles: 2
  },

  expenses: [
    { id: 'e1', title: 'Parks Canada Backcountry Permits (3 Nights)', amount: 148.00, paidBy: 'u3', category: 'Permits' },
    { id: 'e2', title: 'Dehydrated Trail Dinners & Coffee', amount: 112.40, paidBy: 'u2', category: 'Food' },
    { id: 'e3', title: 'Bear Spray & Fuel Canisters', amount: 64.00, paidBy: 'u1', category: 'Gear' }
  ],

  itinerary: [
    {
      day: 1,
      title: 'Takakkaw Falls to Little Yoho Valley',
      distance: '11.4 km',
      elevationGain: '+640 m',
      difficulty: 'Moderate',
      viewsToExpect: [
        { spot: 'Takakkaw Falls Base Mist Zone', bestTime: '08:30 AM', description: '373m glacier-fed waterfall roaring right at the trailhead; expect rainbow mist on sunny mornings.' },
        { spot: 'Laughing Falls Canyon Overlook', bestTime: '11:15 AM', description: 'Turquoise glacial river slicing through steep limestone walls with hanging valley views.' }
      ],
      detours: [
        { name: 'Meeting of the Waters Viewpoint', extraTime: '+10 mins', type: 'Scenic Stop', selected: true, note: 'Where silt-heavy Yoho River collides with clear Kicking Horse River.' },
        { name: 'Spiral Tunnels Lower Viewpoint', extraTime: '+15 mins', type: 'Historic/Photo', selected: false, note: 'Watch freight trains loop inside Mount Ogden.' }
      ]
    },
    {
      day: 2,
      title: 'Little Yoho to Kiwetinok Pass & Emerald Basin',
      distance: '13.8 km',
      elevationGain: '+810 m',
      difficulty: 'Challenging',
      viewsToExpect: [
        { spot: 'Kiwetinok Pass Summit Ridge (2,460m)', bestTime: '12:30 PM', description: '360-degree alpine amphitheater overlooking President Glacier, Emerald Glacier, and jagged Dolomite peaks.' },
        { spot: 'Emerald Lake High Rim', bestTime: '04:45 PM', description: 'Bird’s-eye view of the famous vivid jade water caused by suspended rock flour.' }
      ],
      detours: [
        { name: 'Emerald Lake Canoe Boathouse & Café', extraTime: '+45 mins', type: 'Food & Rest', selected: true, note: 'Grab warm Bannock and espresso right off the trail.' },
        { name: 'Natural Bridge Rock Formation', extraTime: '+20 mins', type: 'Landmark', selected: true, note: '2 km west of Emerald Lake; dramatic sculpted limestone arch.' }
      ]
    },
    {
      day: 3,
      title: 'Iceline Trail Panorama Loop',
      distance: '10.6 km',
      elevationGain: '+520 m',
      difficulty: 'Moderate-Hard',
      viewsToExpect: [
        { spot: 'Iceline Moraine Balcony', bestTime: '10:30 AM', description: 'Walk directly alongside retreating blue glacier tongues with uninterrupted views across the entire Yoho Valley.' },
        { spot: 'Celeste Lake Reflection Tarn', bestTime: '03:15 PM', description: 'Mirror-still alpine tarn reflecting Cathedral Mountain—best golden-hour photo spot on the route.' }
      ],
      detours: [
        { name: 'Whiskey Jack Hostel Porch', extraTime: '+25 mins', type: 'Social / Water Refill', selected: false, note: 'Treated potable water tap and trail logbook.' }
      ]
    },
    {
      day: 4,
      title: 'Yoho Lake Descent & Lake Louise Detour',
      distance: '7.0 km',
      elevationGain: '+120 m / -760 m',
      difficulty: 'Easy-Moderate',
      viewsToExpect: [
        { spot: 'Wapta Falls Rim Trail', bestTime: '01:00 PM', description: '150-meter-wide curtain waterfall surrounded by mossy boreal forest.' }
      ],
      detours: [
        { name: 'Moraine Lake / Lake Louise Post-Hike Dinner', extraTime: '+1.5 hrs', type: 'Touristic Town', selected: true, note: 'Celebratory burgers & hot showers in Lake Louise Village before driving home.' },
        { name: 'Johnston Canyon Lower Falls', extraTime: '+50 mins', type: 'Boardwalk Trail', selected: false, note: 'Easy catwalk through a deep limestone gorge on the Bow Valley Parkway.' }
      ]
    }
  ],

  alerts: [
    { id: 'a1', severity: 'high', title: 'Grizzly Bear Advisory — Little Yoho Campground', time: 'Cached 24m ago', detail: 'Sow with two cubs spotted feeding on buffaloberries 800m north of camp. Travel in tight groups of 4+, carry bear spray on hip belt, and hang all scented items.' },
    { id: 'a2', severity: 'medium', title: 'High Ridge Wind Gusts (Day 2 Afternoon)', time: 'Cached 24m ago', detail: 'Gusts up to 55 km/h forecast above 2,300m after 2:00 PM. Aim to cross Kiwetinok Pass before 1:00 PM.' },
    { id: 'a3', severity: 'info', title: 'Takakkaw Falls Road Switchbacks Open', time: 'Cached 24m ago', detail: 'Yoho Valley Road is clear. Trailers/RVs prohibited on tight switchbacks—standard SUVs clear.' }
  ],

  weather: [
    { day: 'Day 1 (Aug 14)', condition: 'Sunny / Crisp', highC: 19, lowC: 5, precip: '10%', wind: '12 km/h' },
    { day: 'Day 2 (Aug 15)', condition: 'Alpine Breeze', highC: 16, lowC: 3, precip: '20%', wind: '34 km/h' },
    { day: 'Day 3 (Aug 16)', condition: 'Partly Cloudy', highC: 18, lowC: 4, precip: '15%', wind: '15 km/h' },
    { day: 'Day 4 (Aug 17)', condition: 'Clear Skies', highC: 21, lowC: 7, precip: '5%', wind: '10 km/h' }
  ]
};

// Working application state
const STORAGE_KEY = 'sherpagrid_expedition_v1';

// Load saved trip data from browser storage, or fall back to INITIAL_STATE
const savedData = localStorage.getItem(STORAGE_KEY);
let state = savedData ? JSON.parse(savedData) : JSON.parse(JSON.stringify(INITIAL_STATE));