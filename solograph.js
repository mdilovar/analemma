// Solograph - Daily Sun Path Visualization

class Solograph {
    constructor() {
        this.canvas = document.getElementById('solographCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Parameters
        this.latitude = 40;
        this.dayOfYear = 172; // Summer solstice
        this.showSolstices = true;
        this.showEquinoxes = true;
        this.showGrid = true;
        this.showHourMarkers = true;
        this.animationSpeed = 1;

        // Animation state
        this.isAnimating = false;
        this.animationId = null;

        // Hour trace paths (analemma for each hour)
        this.showHourTraces = true;
        this.hourTraces = {}; // Store traced points for each hour
        this.traceStartDay = 1;

        // Fixed orbital parameters
        this.tilt = 23.44;

        this.initializeHourTraces();
        this.setupCanvas();
        this.setupControls();
        this.draw();
    }

    initializeHourTraces() {
        // Pre-calculate full analemma paths for each hour
        this.hourTraces = {};
        for (let hour = 5; hour <= 19; hour++) {
            this.hourTraces[hour] = [];
            for (let day = 1; day <= 365; day++) {
                const declination = this.getDeclination(day);
                const hourAngle = hour - 12;
                const pos = this.equatorialToHorizontal(hourAngle, declination, this.latitude);
                this.hourTraces[hour].push({
                    day,
                    altitude: pos.altitude,
                    azimuth: pos.azimuth
                });
            }
        }
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;

        // Sky view dimensions
        this.centerX = this.width / 2;
        this.horizonY = this.height * 0.85;
        this.skyRadius = this.height * 0.75;
    }

    setupControls() {
        // Latitude slider
        const latitudeSlider = document.getElementById('latitudeSlider');
        const latitudeValue = document.getElementById('latitudeValue');

        latitudeSlider.addEventListener('input', (e) => {
            this.latitude = parseFloat(e.target.value);
            const dir = this.latitude >= 0 ? 'N' : 'S';
            latitudeValue.textContent = `${Math.abs(this.latitude)}°${dir}`;
            this.initializeHourTraces(); // Recalculate traces for new latitude
            this.draw();
        });

        // Day slider
        const daySlider = document.getElementById('daySlider');
        const dayValue = document.getElementById('dayValue');

        daySlider.addEventListener('input', (e) => {
            this.dayOfYear = parseInt(e.target.value);
            dayValue.textContent = this.getDayName(this.dayOfYear);
            this.draw();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.dayOfYear = parseInt(btn.dataset.day);
                daySlider.value = this.dayOfYear;
                dayValue.textContent = this.getDayName(this.dayOfYear);
                this.draw();
            });
        });

        // Checkboxes
        document.getElementById('showSolstices').addEventListener('change', (e) => {
            this.showSolstices = e.target.checked;
            this.draw();
        });

        document.getElementById('showEquinoxes').addEventListener('change', (e) => {
            this.showEquinoxes = e.target.checked;
            this.draw();
        });

        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.draw();
        });

        document.getElementById('showHourMarkers').addEventListener('change', (e) => {
            this.showHourMarkers = e.target.checked;
            this.draw();
        });

        document.getElementById('showHourTraces').addEventListener('change', (e) => {
            this.showHourTraces = e.target.checked;
            this.draw();
        });

        // Speed slider
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');

        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            speedValue.textContent = `${this.animationSpeed}x`;
        });

        // Animation buttons
        document.getElementById('animateYearBtn').addEventListener('click', () => {
            this.startAnimation();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopAnimation();
        });

        // Handle resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.draw();
        });
    }

    getDayName(day) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        let remaining = day;
        for (let m = 0; m < 12; m++) {
            if (remaining <= daysInMonth[m]) {
                return `${months[m]} ${remaining}`;
            }
            remaining -= daysInMonth[m];
        }
        return `Dec 31`;
    }

    toRad(deg) {
        return deg * Math.PI / 180;
    }

    toDeg(rad) {
        return rad * 180 / Math.PI;
    }

    // Get solar declination for a given day
    getDeclination(day) {
        // Simple approximation
        const obliquity = this.toRad(this.tilt);
        const springEquinox = 80;
        const angle = this.toRad(360 * (day - springEquinox) / 365);
        return Math.asin(Math.sin(obliquity) * Math.sin(angle));
    }

    // Convert hour angle and declination to altitude and azimuth
    equatorialToHorizontal(hourAngle, declination, latitude) {
        const ha = this.toRad(hourAngle * 15);
        const dec = declination;
        const lat = this.toRad(latitude);

        const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
        const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

        const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * Math.cos(altitude) + 0.0001);
        const sinAz = -Math.sin(ha) * Math.cos(dec) / (Math.cos(altitude) + 0.0001);

        let azimuth = Math.atan2(sinAz, cosAz);

        return {
            altitude: this.toDeg(altitude),
            azimuth: this.toDeg(azimuth)
        };
    }

    // Get sun path for an entire day
    getSunPath(day) {
        const declination = this.getDeclination(day);
        const points = [];

        // Calculate for every 5 minutes
        for (let minutes = 0; minutes < 24 * 60; minutes += 5) {
            const hour = minutes / 60;
            const hourAngle = hour - 12;
            const pos = this.equatorialToHorizontal(hourAngle, declination, this.latitude);

            points.push({
                hour,
                altitude: pos.altitude,
                azimuth: pos.azimuth
            });
        }

        return points;
    }

    // Calculate sunrise/sunset times
    getSunTimes(day) {
        const declination = this.getDeclination(day);
        const lat = this.toRad(this.latitude);

        // Hour angle at sunrise/sunset (altitude = 0)
        const cosHa = -Math.tan(lat) * Math.tan(declination);

        if (cosHa < -1) {
            // Midnight sun
            return { sunrise: 0, sunset: 24, dayLength: 24, neverSets: true };
        } else if (cosHa > 1) {
            // Polar night
            return { sunrise: 12, sunset: 12, dayLength: 0, neverRises: true };
        }

        const ha = this.toDeg(Math.acos(cosHa)) / 15; // Convert to hours
        const sunrise = 12 - ha;
        const sunset = 12 + ha;

        return {
            sunrise,
            sunset,
            dayLength: sunset - sunrise
        };
    }

    // Calculate solar noon altitude
    getNoonAltitude(day) {
        const declination = this.getDeclination(day);
        const lat = this.toRad(this.latitude);
        return 90 - Math.abs(this.latitude - this.toDeg(declination));
    }

    // Convert altitude/azimuth to canvas coordinates
    skyToCanvas(altitude, azimuth) {
        const r = this.skyRadius * (90 - Math.max(0, altitude)) / 90;
        const az = this.toRad(azimuth - 180);

        const x = this.centerX + r * Math.sin(az);
        const y = this.horizonY - r * Math.cos(az);

        return { x, y };
    }

    formatTime(hours) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    drawBackground() {
        const ctx = this.ctx;

        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.horizonY);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(0.5, '#003366');
        gradient.addColorStop(1, '#4a90c2');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.horizonY);

        // Ground
        const groundGradient = ctx.createLinearGradient(0, this.horizonY, 0, this.height);
        groundGradient.addColorStop(0, '#1a3d1a');
        groundGradient.addColorStop(1, '#0d1f0d');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, this.horizonY, this.width, this.height - this.horizonY);

        // Horizon line
        ctx.strokeStyle = '#4a6a4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.horizonY);
        ctx.lineTo(this.width, this.horizonY);
        ctx.stroke();
    }

    drawGrid() {
        if (!this.showGrid) return;

        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

        // Altitude circles
        for (let alt = 15; alt <= 75; alt += 15) {
            const r = this.skyRadius * (90 - alt) / 90;
            ctx.beginPath();
            ctx.arc(this.centerX, this.horizonY, r, Math.PI, 2 * Math.PI);
            ctx.stroke();

            ctx.fillText(`${alt}°`, this.centerX + 5, this.horizonY - r + 12);
        }

        // Azimuth lines
        for (let az = 90; az <= 270; az += 30) {
            const endPoint = this.skyToCanvas(0, az);
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.horizonY);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
        }

        // Cardinal directions
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';

        ctx.fillText('S', this.centerX, this.horizonY + 20);
        ctx.fillText('E', this.width * 0.1, this.horizonY + 20);
        ctx.fillText('W', this.width * 0.9, this.horizonY + 20);

        ctx.textAlign = 'left';
    }

    drawHourTraces() {
        if (!this.showHourTraces) return;

        const ctx = this.ctx;
        const currentDay = Math.floor(this.dayOfYear);

        // Color palette for different hours
        const getHourColor = (hour) => {
            // Morning hours: blue to cyan
            // Noon: yellow
            // Afternoon: orange to red
            if (hour < 12) {
                const t = (hour - 5) / 7;
                return `hsla(${200 - t * 40}, 80%, 60%, 0.7)`;
            } else if (hour === 12) {
                return 'hsla(45, 100%, 60%, 0.8)';
            } else {
                const t = (hour - 12) / 7;
                return `hsla(${40 - t * 40}, 80%, 60%, 0.7)`;
            }
        };

        // Draw each hour's analemma trace
        for (let hour = 5; hour <= 19; hour++) {
            const trace = this.hourTraces[hour];
            if (!trace || trace.length === 0) continue;

            const color = getHourColor(hour);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            let started = false;
            let prevAboveHorizon = false;

            // Draw the full analemma for this hour
            for (let i = 0; i < trace.length; i++) {
                const point = trace[i];
                if (point.altitude > 0) {
                    const pos = this.skyToCanvas(point.altitude, point.azimuth);

                    if (!started || !prevAboveHorizon) {
                        ctx.moveTo(pos.x, pos.y);
                        started = true;
                    } else {
                        ctx.lineTo(pos.x, pos.y);
                    }
                    prevAboveHorizon = true;
                } else {
                    prevAboveHorizon = false;
                }
            }
            ctx.stroke();

            // Draw hour label at the current day's position
            const currentPoint = trace[currentDay - 1];
            if (currentPoint && currentPoint.altitude > 5) {
                const labelPos = this.skyToCanvas(currentPoint.altitude, currentPoint.azimuth);

                // Small dot at current position
                ctx.beginPath();
                ctx.arc(labelPos.x, labelPos.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Hour label
                ctx.font = 'bold 9px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(`${hour}h`, labelPos.x, labelPos.y - 8);
            }
        }
        ctx.textAlign = 'left';
    }

    drawSunPath(day, color, lineWidth, drawMarkers = false) {
        const ctx = this.ctx;
        const path = this.getSunPath(day);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        let started = false;
        let lastAboveHorizon = false;

        for (const point of path) {
            if (point.altitude > -2) {
                const pos = this.skyToCanvas(Math.max(0, point.altitude), point.azimuth);

                if (!started || (point.altitude > 0 !== lastAboveHorizon)) {
                    ctx.moveTo(pos.x, pos.y);
                    started = true;
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
                lastAboveHorizon = point.altitude > 0;
            }
        }
        ctx.stroke();

        // Hour markers
        if (drawMarkers && this.showHourMarkers) {
            ctx.fillStyle = color;
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';

            for (let hour = 5; hour <= 20; hour++) {
                const hourAngle = hour - 12;
                const declination = this.getDeclination(day);
                const pos = this.equatorialToHorizontal(hourAngle, declination, this.latitude);

                if (pos.altitude > 2) {
                    const canvasPos = this.skyToCanvas(pos.altitude, pos.azimuth);

                    // Draw dot
                    ctx.beginPath();
                    ctx.arc(canvasPos.x, canvasPos.y, 4, 0, Math.PI * 2);
                    ctx.fill();

                    // Draw hour label
                    ctx.fillText(`${hour}:00`, canvasPos.x, canvasPos.y - 10);
                }
            }
        }
    }

    drawCurrentDay() {
        const ctx = this.ctx;
        const times = this.getSunTimes(this.dayOfYear);

        // Draw the selected day's path (brightest)
        this.drawSunPath(this.dayOfYear, '#ffcc00', 3, true);

        // Draw noon sun
        const noonAlt = this.getNoonAltitude(this.dayOfYear);
        if (noonAlt > 0) {
            const declination = this.getDeclination(this.dayOfYear);
            const noonPos = this.equatorialToHorizontal(0, declination, this.latitude);
            const noonCanvas = this.skyToCanvas(noonPos.altitude, noonPos.azimuth);

            // Sun glow
            const glowGradient = ctx.createRadialGradient(
                noonCanvas.x, noonCanvas.y, 0,
                noonCanvas.x, noonCanvas.y, 25
            );
            glowGradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
            glowGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.3)');
            glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

            ctx.beginPath();
            ctx.arc(noonCanvas.x, noonCanvas.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();

            // Sun disk
            ctx.beginPath();
            ctx.arc(noonCanvas.x, noonCanvas.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffdd44';
            ctx.fill();

            // Noon altitude label
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(`${noonPos.altitude.toFixed(1)}°`, noonCanvas.x, noonCanvas.y + 25);
        }

        // Update info display
        document.getElementById('sunriseTime').textContent =
            times.neverRises ? 'Never' : (times.neverSets ? '00:00' : this.formatTime(times.sunrise));
        document.getElementById('sunsetTime').textContent =
            times.neverRises ? 'Never' : (times.neverSets ? '24:00' : this.formatTime(times.sunset));
        document.getElementById('noonTime').textContent = '12:00';

        const hours = Math.floor(times.dayLength);
        const mins = Math.round((times.dayLength - hours) * 60);
        document.getElementById('dayLength').textContent =
            times.neverRises ? '0h 0m' : `${hours}h ${mins}m`;
    }

    draw() {
        this.drawBackground();
        this.drawGrid();

        // Draw hour traces (analemmas for each hour)
        this.drawHourTraces();

        // Draw reference paths (solstices and equinoxes)
        if (this.showEquinoxes) {
            this.drawSunPath(80, 'rgba(107, 255, 107, 0.5)', 1.5);   // Spring equinox
            this.drawSunPath(266, 'rgba(107, 255, 107, 0.5)', 1.5);  // Fall equinox
        }

        if (this.showSolstices) {
            this.drawSunPath(172, 'rgba(255, 107, 107, 0.5)', 1.5);  // Summer solstice
            this.drawSunPath(355, 'rgba(107, 159, 255, 0.5)', 1.5);  // Winter solstice
        }

        // Draw selected day
        this.drawCurrentDay();

        // Draw date label
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 120, 35);
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, 120, 35);

        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(this.getDayName(this.dayOfYear), 20, 32);
    }

    startAnimation() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        const daySlider = document.getElementById('daySlider');
        const dayValue = document.getElementById('dayValue');

        let lastTime = performance.now();

        const animate = (currentTime) => {
            if (!this.isAnimating) return;

            const delta = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Advance day (complete year in ~12 seconds at 1x)
            this.dayOfYear += delta * 30 * this.animationSpeed;

            if (this.dayOfYear > 365) {
                this.dayOfYear = 1;
            }

            daySlider.value = Math.floor(this.dayOfYear);
            dayValue.textContent = this.getDayName(Math.floor(this.dayOfYear));

            this.draw();
            this.animationId = requestAnimationFrame(animate);
        };

        this.animationId = requestAnimationFrame(animate);
    }

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new Solograph();
});
