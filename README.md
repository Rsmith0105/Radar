# 25 RADAX LIVE RADAR
A simple military‑style radar display to show **exactly what your Pi + antenna are seeing**.

## Setup
1. Unzip to your Pi (or any web server).
2. Edit `config.js`:
   - `HOME` → your latitude/longitude
   - `DUMP1090_URL` → keep `/data/aircraft.json` if hosting next to tar1090/dump1090, or set `http://<pi-ip>:8080/data/aircraft.json`
3. Open `index.html`. If the feed isn’t reachable yet, demo targets appear so you can preview the look.

### Notes
- Trails, labels, sweep, and “new target” blip are included.
- Everything runs in the browser; no build steps needed.
