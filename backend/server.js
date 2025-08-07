const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { OpenAI } = require('openai'); // ✅ Corrected import for CommonJS

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_OPENAI_KEY';

// In-memory storage
let tripHistory = [];
let favoriteTrips = [];
let mockBusLocation = { lat: 28.6139, lng: 77.2090 };

// Root test
app.get('/', (req, res) => {
  res.send('✅ Smart Bus Backend is running...');
});

// Save trip
app.post('/api/save-trip', (req, res) => {
  const { from, to } = req.body;
  if (from && to) {
    const trip = { from, to, timestamp: new Date().toISOString() };
    tripHistory.push(trip);
    res.json({ message: '✅ Trip saved', trip });
  } else {
    res.status(400).json({ error: '❌ Missing "from" or "to"' });
  }
});

// Get trip history
app.get('/api/history', (req, res) => res.json(tripHistory));

// Save favorite
app.post('/api/favorite', (req, res) => {
  const { from, to } = req.body;
  if (from && to) {
    const fav = { from, to };
    favoriteTrips.push(fav);
    res.json({ message: '✅ Favorite saved', fav });
  } else {
    res.status(400).json({ error: '❌ Missing "from" or "to"' });
  }
});

// Get favorites
app.get('/api/favorites', (req, res) => res.json(favoriteTrips));

// Simulated vehicle location
app.get('/api/vehicle-location', (req, res) => {
  mockBusLocation.lat += 0.0002 * (Math.random() - 0.5);
  mockBusLocation.lng += 0.0002 * (Math.random() - 0.5);
  res.json(mockBusLocation);
});

// Reverse geocoding
app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: '❌ Missing lat/lng' });
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
    );
    res.json(response.data);
  } catch (err) {
    console.error("❌ Geocoding error:", err.response?.data || err.message);
    res.status(500).json({ error: '❌ Failed to reverse geocode' });
  }
});

// ✅ Chatbot Route using OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).json({ error: 'Message is required' });

  try {
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are SmartBot, a helpful assistant for public transportation and travel route planning." },
        { role: "user", content: userMessage }
      ]
    });

    const reply = chatResponse.choices[0]?.message?.content || "🤖 Sorry, no reply.";
    res.json({ reply });
  } catch (err) {
    console.error("❌ OpenAI Chatbot Error:", err.message);
    res.status(500).json({ error: "Failed to get response from OpenAI" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
