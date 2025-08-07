let map, directionsService, directionsRenderer, vehicleMarker = null;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 26.9124, lng: 75.7873 }, // Jaipur
    zoom: 12,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  new google.maps.places.Autocomplete(document.getElementById("source"));
  new google.maps.places.Autocomplete(document.getElementById("destination"));
}
window.initMap = initMap;

// Scroll to section
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: "smooth" });
}

// Chatbot logic
function toggleChatbot() {
  document.getElementById("chatbot-window").classList.toggle("hidden");
}

const chatDisplay = document.getElementById("chat-display");
const chatInput = document.getElementById("chat-input");

// Store conversation history
const messageHistory = [
  {
    role: "system",
    content: "You are SmartBot, a helpful assistant for public transport and travel routing queries."
  }
];

async function sendChatMessage() {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  // Add user message to history
  messageHistory.push({ role: "user", content: userMessage });

  // Display user message in UI
  chatDisplay.innerHTML += `<div class="mb-2"><b>You:</b> ${userMessage}</div>`;
  chatDisplay.innerHTML += `<div class="mb-2" id="thinking"><b>SmartBot:</b> <i>Thinking...</i></div>`;
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
  chatInput.value = "";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer YOUR_OPENAI_API_KEY`  // Replace this with your actual key
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messageHistory
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "🤖 Sorry, no response.";

    // Add assistant reply to history
    messageHistory.push({ role: "assistant", content: reply });

    // Replace thinking message
    document.getElementById("thinking").innerHTML = `<b>SmartBot:</b> ${reply}`;
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

  } catch (err) {
    console.error("Chatbot error:", err);
    document.getElementById("thinking").innerHTML = `<b>SmartBot:</b> ❌ Failed to respond.`;
  }
}


// Current location
function getCurrentLocation() {
  if (!navigator.geolocation) return alert("Geolocation not supported!");
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    document.getElementById("source").value = `${latitude},${longitude}`;
    alert("📍 Location set!");
  }, () => alert("❌ Unable to fetch location."));
}

// Manual route planning
function findRoute() {
  const source = document.getElementById("source").value;
  const destination = document.getElementById("destination").value;
  if (!source || !destination) return alert("Please enter both source and destination");

  directionsService.route({
    origin: source,
    destination,
    travelMode: google.maps.TravelMode.TRANSIT,
    departureTime: new Date()
  }, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
      const leg = result.routes[0].legs[0];
      document.getElementById("route-results").innerHTML = `
        <p><b>From:</b> ${leg.start_address}</p>
        <p><b>To:</b> ${leg.end_address}</p>
        <p><b>Distance:</b> ${leg.distance.text}</p>
        <p><b>Duration:</b> ${leg.duration.text}</p>`;
    } else {
      alert("❌ Route not found");
    }
  });
}

// Smart Route Planner
function findSmartRoute() {
  const busStands = [
    "Kukas Bus Stand, Jaipur",
    "Gopalpura Bypass Bus Stop, Jaipur",
    "Sindhi Camp Bus Stand, Jaipur",
    "Durgapura Bus Stand, Jaipur"
  ];
  const finalDestination = "Manipal University Jaipur";

  if (!navigator.geolocation) return alert("❌ Geolocation not supported.");

  navigator.geolocation.getCurrentPosition(async pos => {
    const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
    let bestOption = null;
    let bestETA = Infinity;
    document.getElementById("route-results").innerHTML = `<p>⏳ Calculating best route...</p>`;

    for (const stand of busStands) {
      try {
        const toStand = await getRouteETA(origin, stand, "DRIVING");
        const toManipal = await getRouteETA(stand, finalDestination, "TRANSIT");
        const totalETA = toStand.duration + toManipal.duration;

        if (totalETA < bestETA) {
          bestETA = totalETA;
          bestOption = { stand, toStand, toManipal };
        }
      } catch (e) {
        console.warn(`❌ Error via ${stand}:`, e);
      }
    }

    if (bestOption) {
      displaySmartRoute(bestOption);
    } else {
      document.getElementById("route-results").innerHTML = `<p class="text-red-500">❌ Could not find a suitable route.</p>`;
    }
  }, () => alert("❌ Unable to get current location."));
}

function getRouteETA(from, to, mode = "TRANSIT") {
  const request = {
    origin: from,
    destination: to,
    travelMode: google.maps.TravelMode[mode]
  };

  // ✅ Only set departureTime if mode is allowed
  if (mode === "DRIVING" || mode === "TRANSIT") {
    request.departureTime = new Date();
  }

  return new Promise((resolve, reject) => {
    directionsService.route(request, (result, status) => {
      if (status === "OK" && result.routes.length > 0) {
        const leg = result.routes[0].legs[0];
        resolve({
          origin: leg.start_address,
          destination: leg.end_address,
          duration: leg.duration.value,
          text: leg.duration.text,
          distance: leg.distance.text,
          result
        });
      } else {
        reject(`No ${mode} route found from ${from} to ${to}`);
      }
    });
  });
}


function displaySmartRoute(data) {
  directionsRenderer.setDirections(data.toManipal.result);
  const totalMinutes = Math.round((data.toStand.duration + data.toManipal.duration) / 60);
  document.getElementById("route-results").innerHTML = `
    <h3 class="font-semibold text-lg mb-2">🚀 Smart Route Selected</h3>
    <p><b>Nearest Bus Stand:</b> ${data.stand}</p>
    <p><b>Time to Bus Stand:</b> ${data.toStand.text}</p>
    <p><b>Time from Bus Stand to Manipal:</b> ${data.toManipal.text}</p>
    <p><b>Total Estimated Time:</b> ${totalMinutes} minutes</p>`;
}

// Live Bus Simulation
function simulateLiveBusRoute() {
  const origin = "Kukas Bus Stand, Jaipur";
  const destination = "Manipal University Jaipur";

  directionsService.route({ origin, destination, travelMode: google.maps.TravelMode.TRANSIT }, (result, status) => {
    if (status === "OK") {
      const path = result.routes[0].overview_path;
      animateBusAlongPath(path);
    } else {
      alert("❌ Could not load live bus route");
    }
  });
}

function animateBusAlongPath(path) {
  if (vehicleMarker) vehicleMarker.setMap(null);
  let index = 0;

  vehicleMarker = new google.maps.Marker({
    position: path[0],
    map,
    icon: "https://maps.google.com/mapfiles/ms/icons/bus.png",
    title: "Simulated Bus"
  });

  const interval = setInterval(() => {
    if (index >= path.length) {
      clearInterval(interval);
      document.getElementById("live-status").innerText = "✅ Bus Reached Destination!";
      return;
    }

    vehicleMarker.setPosition(path[index]);
    const lat = path[index].lat();
    const lng = path[index].lng();
    document.getElementById("live-status").innerText = `🚌 Bus at: (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    index++;
  }, 2000);
}

// Share Trip
function shareTrip() {
  const source = document.getElementById("source").value;
  const destination = document.getElementById("destination").value;
  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;

  if (navigator.share) {
    navigator.share({ title: "My Trip", url });
  } else {
    navigator.clipboard.writeText(url);
    alert("Trip link copied!");
  }
}

// Analytics
function loadAnalytics() {
  Promise.all([
    fetch("http://localhost:5000/api/history").then(res => res.json()),
    fetch("http://localhost:5000/api/favorites").then(res => res.json())
  ]).then(([history, favorites]) => {
    document.getElementById("total-trips").textContent = history.length;
    document.getElementById("total-favorites").textContent = favorites.length;

    const destinations = history.map(trip => trip.to);
    const mostDest = findMostFrequent(destinations) || "N/A";
    document.getElementById("most-destination").textContent = mostDest;

    document.getElementById("average-duration").textContent = "Coming soon...";
  }).catch(err => {
    console.error("Analytics error:", err);
    document.getElementById("analytics-panel").innerHTML = `<p class="text-red-600">❌ Failed to load analytics.</p>`;
  });
}

function findMostFrequent(arr) {
  const count = {};
  arr.forEach(x => count[x] = (count[x] || 0) + 1);
  let max = 0, most = "";
  for (const k in count) {
    if (count[k] > max) {
      max = count[k];
      most = k;
    }
  }
  return most;
}

// Load analytics on page load
window.addEventListener("DOMContentLoaded", loadAnalytics);
