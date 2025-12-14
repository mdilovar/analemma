// Sky View Analemma Simulation
// Shows the analemma as it appears in the sky at different times of day

class SkySimulation {
    constructor() {
        this.canvas = document.getElementById('skyCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Parameters
        this.hour = 12;
        this.latitude = 40;
        this.showGrid = true;
        this.showLabels = true;
        this.animationSpeed = 1;

        // Animation state
        this.isAnimating = false;
        this.animationId = null;

        // Fixed orbital parameters (Earth's actual values)
        this.tilt = 23.44;
        this.eccentricity = 0.0167;
        this.perihelionDay = 3; // January 3

        this.setupCanvas();
        this.setupControls();
        this.draw();
    }

    setupCanvas() {
        // Handle high-DPI displays
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
        // Hour slider
        const hourSlider = document.getElementById('hourSlider');
        const hourValue = document.getElementById('hourValue');
        const timeDisplay = document.getElementById('timeDisplay');

        hourSlider.addEventListener('input', (e) => {
            this.hour = parseFloat(e.target.value);
            const timeStr = this.formatTime(this.hour);
            hourValue.textContent = timeStr;
            timeDisplay.textContent = timeStr;
            this.draw();
        });

        // Latitude slider
        const latitudeSlider = document.getElementById('latitudeSlider');
        const latitudeValue = document.getElementById('latitudeValue');

        latitudeSlider.addEventListener('input', (e) => {
            this.latitude = parseFloat(e.target.value);
            const dir = this.latitude >= 0 ? 'N' : 'S';
            latitudeValue.textContent = `${Math.abs(this.latitude)}°${dir}`;
            this.draw();
        });

        // Speed slider
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');

        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            speedValue.textContent = `${this.animationSpeed}x`;
        });

        // Grid toggle
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.draw();
        });

        // Labels toggle
        document.getElementById('showLabels').addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
            this.draw();
        });

        // Animate button
        document.getElementById('animateBtn').addEventListener('click', () => {
            this.startAnimation();
        });

        // Stop button
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopAnimation();
        });

        // Handle resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.draw();
        });
    }

    formatTime(hour) {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    toRad(deg) {
        return deg * Math.PI / 180;
    }

    toDeg(rad) {
        return rad * 180 / Math.PI;
    }

    // Get mean anomaly for a given day of year
    getMeanAnomaly(day) {
        const daysFromPerihelion = (day - this.perihelionDay + 365) % 365;
        return this.toRad(360 * daysFromPerihelion / 365);
    }

    // Get true anomaly from mean anomaly (Kepler's equation approximation)
    getTrueAnomaly(M) {
        const e = this.eccentricity;
        return M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
    }

    // Get solar declination for a given day
    getDeclination(day) {
        const obliquity = this.toRad(this.tilt);
        const springEquinox = 80;
        const M = this.getMeanAnomaly(day);
        const v = this.getTrueAnomaly(M);
        const perihelionLongitude = this.toRad(360 * (this.perihelionDay - springEquinox) / 365);
        const solarLongitude = v + perihelionLongitude + Math.PI;
        return Math.asin(Math.sin(obliquity) * Math.sin(solarLongitude));
    }

    // Get equation of time in hours for a given day
    getEquationOfTime(day) {
        const obliquity = this.toRad(this.tilt);
        const e = this.eccentricity;
        const M = this.getMeanAnomaly(day);
        const springEquinox = 80;
        const L = this.toRad(360 * (day - springEquinox) / 365);

        // Eccentricity effect
        const eccentricityEffect = -2 * e * Math.sin(M) - 1.25 * e * e * Math.sin(2 * M);

        // Obliquity effect
        const y = Math.tan(obliquity / 2);
        const y2 = y * y;
        const obliquityEffect = y2 * Math.sin(2 * L) - 0.5 * y2 * y2 * Math.sin(4 * L);

        // Convert from radians to hours (24 hours = 2π radians)
        return (eccentricityEffect + obliquityEffect) * 24 / (2 * Math.PI);
    }

    // Convert hour angle and declination to altitude and azimuth
    equatorialToHorizontal(hourAngle, declination, latitude) {
        const ha = this.toRad(hourAngle * 15); // Convert hours to degrees, then to radians
        const dec = declination; // Already in radians
        const lat = this.toRad(latitude);

        // Calculate altitude
        const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
        const altitude = Math.asin(sinAlt);

        // Calculate azimuth
        const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * Math.cos(altitude));
        const sinAz = -Math.sin(ha) * Math.cos(dec) / Math.cos(altitude);

        let azimuth = Math.atan2(sinAz, cosAz);

        return {
            altitude: this.toDeg(altitude),
            azimuth: this.toDeg(azimuth)
        };
    }

    // Get Sun position for a specific day and hour
    getSunPosition(day, hour) {
        const declination = this.getDeclination(day);
        const eot = this.getEquationOfTime(day);

        // Hour angle: 0 at solar noon, negative in morning, positive in afternoon
        // EOT shifts apparent solar time relative to mean solar time
        const solarHour = hour + eot;
        const hourAngle = solarHour - 12; // Hours from noon

        return this.equatorialToHorizontal(hourAngle, declination, this.latitude);
    }

    // Convert altitude/azimuth to canvas coordinates
    skyToCanvas(altitude, azimuth) {
        // Altitude: 0° at horizon, 90° at zenith
        // Azimuth: 0° = North, 90° = East, 180° = South, 270° = West

        // We're looking south, so azimuth 180° is at center
        // Map altitude to distance from top (zenith)
        const r = this.skyRadius * (90 - altitude) / 90;

        // Adjust azimuth so south is at center (azimuth - 180°)
        const az = this.toRad(azimuth - 180);

        const x = this.centerX + r * Math.sin(az);
        const y = this.horizonY - r * Math.cos(az);

        return { x, y };
    }

    // Get season color for a day
    getSeasonColor(day) {
        // Color based on time of year
        if (day < 80) {
            // Winter -> Spring (Jan-Mar)
            return `hsl(${200 + (day / 80) * 60}, 80%, 60%)`;
        } else if (day < 172) {
            // Spring -> Summer (Mar-Jun)
            return `hsl(${260 + ((day - 80) / 92) * 60}, 80%, 60%)`;
        } else if (day < 264) {
            // Summer -> Fall (Jun-Sep)
            return `hsl(${320 + ((day - 172) / 92) * 40}, 80%, 60%)`;
        } else {
            // Fall -> Winter (Sep-Dec)
            return `hsl(${0 + ((day - 264) / 101) * 200}, 80%, 60%)`;
        }
    }

    drawSkyBackground() {
        const ctx = this.ctx;

        // Sky gradient based on time of day
        let skyColors;
        if (this.hour < 6 || this.hour > 19) {
            // Night
            skyColors = ['#000022', '#001133', '#002244'];
        } else if (this.hour < 7 || this.hour > 18) {
            // Twilight
            skyColors = ['#1a0a30', '#2d1850', '#4a2070'];
        } else if (this.hour < 8 || this.hour > 17) {
            // Dawn/dusk
            skyColors = ['#2d1850', '#ff6b35', '#ffcc00'];
        } else {
            // Day
            skyColors = ['#000033', '#003366', '#4a90c2'];
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, this.horizonY);
        gradient.addColorStop(0, skyColors[0]);
        gradient.addColorStop(0.5, skyColors[1]);
        gradient.addColorStop(1, skyColors[2]);

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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

        // Altitude circles (every 15°)
        for (let alt = 15; alt <= 75; alt += 15) {
            const r = this.skyRadius * (90 - alt) / 90;
            ctx.beginPath();
            ctx.arc(this.centerX, this.horizonY, r, Math.PI, 2 * Math.PI);
            ctx.stroke();

            // Label
            const labelPos = this.skyToCanvas(alt, 180);
            ctx.fillText(`${alt}°`, labelPos.x + 5, labelPos.y);
        }

        // Azimuth lines (every 30°)
        for (let az = 90; az <= 270; az += 30) {
            const endPoint = this.skyToCanvas(0, az);
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.horizonY);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
        }

        // Cardinal direction labels
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';

        ctx.fillText('S', this.centerX, this.horizonY + 20);
        ctx.fillText('E', this.width * 0.15, this.horizonY + 20);
        ctx.fillText('W', this.width * 0.85, this.horizonY + 20);

        ctx.textAlign = 'left';
    }

    drawAnalemma() {
        const ctx = this.ctx;
        const points = [];

        // Calculate analemma points for each day of the year
        for (let day = 0; day < 365; day++) {
            const pos = this.getSunPosition(day, this.hour);

            // Only include points above the horizon
            if (pos.altitude > -5) {
                const canvasPos = this.skyToCanvas(Math.max(0, pos.altitude), pos.azimuth);
                points.push({
                    day,
                    altitude: pos.altitude,
                    azimuth: pos.azimuth,
                    x: canvasPos.x,
                    y: canvasPos.y,
                    belowHorizon: pos.altitude < 0
                });
            }
        }

        // Draw the analemma curve
        if (points.length > 0) {
            // Draw curve with color gradient
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];

                // Skip large gaps (year boundary)
                if (Math.abs(p1.day - p2.day) > 10) continue;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

                const color = this.getSeasonColor(p1.day);
                ctx.strokeStyle = p1.belowHorizon ? 'rgba(100, 100, 100, 0.3)' : color;
                ctx.lineWidth = p1.belowHorizon ? 1 : 2.5;
                ctx.stroke();
            }

            // Draw month markers
            const monthDays = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            for (let m = 0; m < 12; m++) {
                const day = monthDays[m];
                const pos = this.getSunPosition(day, this.hour);

                if (pos.altitude > 0) {
                    const canvasPos = this.skyToCanvas(pos.altitude, pos.azimuth);

                    // Draw marker dot
                    ctx.beginPath();
                    ctx.arc(canvasPos.x, canvasPos.y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = this.getSeasonColor(day);
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Draw label
                    if (this.showLabels) {
                        ctx.font = '11px sans-serif';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'left';
                        ctx.fillText(monthNames[m], canvasPos.x + 8, canvasPos.y + 4);
                    }
                }
            }
        }

        // Draw current sun position (today)
        const today = Math.floor((new Date().getMonth() * 30.44 + new Date().getDate()));
        const todayPos = this.getSunPosition(today, this.hour);

        if (todayPos.altitude > 0) {
            const sunCanvas = this.skyToCanvas(todayPos.altitude, todayPos.azimuth);

            // Sun glow
            const glowGradient = ctx.createRadialGradient(
                sunCanvas.x, sunCanvas.y, 0,
                sunCanvas.x, sunCanvas.y, 30
            );
            glowGradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
            glowGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.3)');
            glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

            ctx.beginPath();
            ctx.arc(sunCanvas.x, sunCanvas.y, 30, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();

            // Sun disk
            ctx.beginPath();
            ctx.arc(sunCanvas.x, sunCanvas.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#ffdd44';
            ctx.fill();
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    drawInfo() {
        const ctx = this.ctx;

        // Info box in top-left
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 180, 70);
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, 180, 70);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';

        const today = Math.floor((new Date().getMonth() * 30.44 + new Date().getDate()));
        const todayPos = this.getSunPosition(today, this.hour);

        ctx.fillText(`Time: ${this.formatTime(this.hour)} LST`, 20, 30);
        ctx.fillText(`Latitude: ${Math.abs(this.latitude)}°${this.latitude >= 0 ? 'N' : 'S'}`, 20, 48);

        if (todayPos.altitude > 0) {
            ctx.fillText(`Sun Alt: ${todayPos.altitude.toFixed(1)}° Az: ${todayPos.azimuth.toFixed(1)}°`, 20, 66);
        } else {
            ctx.fillStyle = '#888';
            ctx.fillText(`Sun below horizon`, 20, 66);
        }
    }

    draw() {
        this.drawSkyBackground();
        this.drawGrid();
        this.drawAnalemma();
        this.drawInfo();
    }

    startAnimation() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        const hourSlider = document.getElementById('hourSlider');
        const hourValue = document.getElementById('hourValue');
        const timeDisplay = document.getElementById('timeDisplay');

        let lastTime = performance.now();

        const animate = (currentTime) => {
            if (!this.isAnimating) return;

            const delta = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Advance hour (complete day cycle in ~16 seconds at 1x speed)
            this.hour += delta * this.animationSpeed;

            // Wrap around
            if (this.hour > 20) {
                this.hour = 4;
            }

            // Update UI
            hourSlider.value = this.hour;
            const timeStr = this.formatTime(this.hour);
            hourValue.textContent = timeStr;
            timeDisplay.textContent = timeStr;

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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SkySimulation();
});
