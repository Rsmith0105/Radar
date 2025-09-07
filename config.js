// 25 RADAX config — set your station and dump1090 URL
const CONFIG = {
  HOME: { lat: 51.369, lon: 0.574 },            // UPDATE: your latitude/longitude
  UP_BEARING_DEG: 0,                            // 0 = north-up
  // If you host this alongside tar1090 on the same Pi, leave as-is:
  DUMP1090_URL: '/data/aircraft.json',
  // OR set the Pi's IP: 'http://192.168.0.103:8080/data/aircraft.json'
  FETCH_MS: 1000,
  SHOW_TRAILS: true,
  TRAIL_SECONDS: 120,
  AUDIO_ON_NEW: true,
  MAX_RANGE_KM: 450
};
