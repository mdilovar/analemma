// Analemma Simulation
// Models the figure-8 pattern traced by the Sun in the sky

class AnalemmaSimulation {
    constructor() {
        // Canvases
        this.analemmaCanvas = document.getElementById('analemmaCanvas');
        this.orbitCanvas = document.getElementById('orbitCanvas');
        this.eotCanvas = document.getElementById('eotCanvas');

        this.analemmaCtx = this.analemmaCanvas.getContext('2d');
        this.orbitCtx = this.orbitCanvas.getContext('2d');
        this.eotCtx = this.eotCanvas.getContext('2d');

        // Set up high DPI canvases
        this.setupCanvas(this.analemmaCanvas, this.analemmaCtx);
        this.setupCanvas(this.orbitCanvas, this.orbitCtx);
        this.setupCanvas(this.eotCanvas, this.eotCtx);

        // Simulation parameters
        this.params = {
            tilt: 23.4,              // Earth's axial tilt in degrees
            eccentricity: 0.017,     // Earth's orbital eccentricity
            perihelionDay: 3,        // Day of year for perihelion (Jan 3)
            speed: 1,
            currentDay: 0,
            isPlaying: true,
            showTiltComponent: true,
            showEccentricityComponent: true
        };

        // Animation state
        this.lastTime = 0;
        this.dayAccumulator = 0;

        // Month names for display
        this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Days in each month (non-leap year)
        this.daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        this.setupControls();
        this.animate(0);
    }

    setupCanvas(canvas, ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);

        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    }

    setupControls() {
        // Sliders
        const tiltSlider = document.getElementById('tiltSlider');
        const eccentricitySlider = document.getElementById('eccentricitySlider');
        const perihelionSlider = document.getElementById('perihelionSlider');
        const speedSlider = document.getElementById('speedSlider');
        const daySlider = document.getElementById('daySlider');

        tiltSlider.addEventListener('input', (e) => {
            this.params.tilt = parseFloat(e.target.value);
            document.getElementById('tiltValue').textContent = this.params.tilt.toFixed(1) + '°';
        });

        eccentricitySlider.addEventListener('input', (e) => {
            this.params.eccentricity = parseFloat(e.target.value);
            document.getElementById('eccentricityValue').textContent = this.params.eccentricity.toFixed(3);
        });

        perihelionSlider.addEventListener('input', (e) => {
            this.params.perihelionDay = parseInt(e.target.value);
            document.getElementById('perihelionValue').textContent = 'Day ' + this.params.perihelionDay;
        });

        speedSlider.addEventListener('input', (e) => {
            this.params.speed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.params.speed.toFixed(1) + 'x';
        });

        daySlider.addEventListener('input', (e) => {
            this.params.currentDay = parseInt(e.target.value);
            document.getElementById('dayValue').textContent = this.params.currentDay;
        });

        // Checkboxes
        document.getElementById('showTiltComponent').addEventListener('change', (e) => {
            this.params.showTiltComponent = e.target.checked;
        });

        document.getElementById('showEccentricityComponent').addEventListener('change', (e) => {
            this.params.showEccentricityComponent = e.target.checked;
        });

        // Buttons
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.params.isPlaying = !this.params.isPlaying;
            document.getElementById('playPauseBtn').textContent = this.params.isPlaying ? 'Pause' : 'Play';
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.params.tilt = 23.4;
            this.params.eccentricity = 0.017;
            this.params.perihelionDay = 3;
            this.params.speed = 1;
            this.params.currentDay = 0;

            tiltSlider.value = 23.4;
            eccentricitySlider.value = 0.017;
            perihelionSlider.value = 3;
            speedSlider.value = 1;
            daySlider.value = 0;

            document.getElementById('tiltValue').textContent = '23.4°';
            document.getElementById('eccentricityValue').textContent = '0.017';
            document.getElementById('perihelionValue').textContent = 'Day 3';
            document.getElementById('speedValue').textContent = '1x';
            document.getElementById('dayValue').textContent = '0';
        });
    }

    // Convert degrees to radians
    toRad(deg) {
        return deg * Math.PI / 180;
    }

    // Convert radians to degrees
    toDeg(rad) {
        return rad * 180 / Math.PI;
    }

    // Calculate the mean anomaly for a given day
    getMeanAnomaly(day) {
        // Mean anomaly: how far Earth has traveled in its orbit (if it were circular)
        // Zero at perihelion
        const daysSincePerihelion = (day - this.params.perihelionDay + 365) % 365;
        return this.toRad(360 * daysSincePerihelion / 365);
    }

    // Calculate the true anomaly (actual position in elliptical orbit)
    getTrueAnomaly(meanAnomaly) {
        // Use equation of center approximation for small eccentricity
        const e = this.params.eccentricity;
        const M = meanAnomaly;

        // Equation of center (approximation valid for small e)
        const C = (2 * e - e * e * e / 4) * Math.sin(M) +
                  (5 * e * e / 4) * Math.sin(2 * M) +
                  (13 * e * e * e / 12) * Math.sin(3 * M);

        return M + C;
    }

    // Calculate solar longitude (position along ecliptic)
    getSolarLongitude(day) {
        // Spring equinox is around day 80 (March 21)
        // Solar longitude is 0 at spring equinox
        const springEquinox = 80;
        const meanLongitude = this.toRad(360 * (day - springEquinox) / 365);

        const meanAnomaly = this.getMeanAnomaly(day);
        const trueAnomaly = this.getTrueAnomaly(meanAnomaly);

        // Difference between true and mean anomaly
        const equationOfCenter = trueAnomaly - meanAnomaly;

        return meanLongitude + equationOfCenter;
    }

    // Calculate solar declination (north-south position of Sun)
    getSolarDeclination(day) {
        const solarLongitude = this.getSolarLongitude(day);
        const obliquity = this.toRad(this.params.tilt);

        // Declination from spherical trigonometry
        const declination = Math.asin(Math.sin(obliquity) * Math.sin(solarLongitude));

        return this.toDeg(declination);
    }

    // Calculate the Equation of Time (in minutes)
    // This is the difference between apparent solar time and mean solar time
    getEquationOfTime(day) {
        const obliquity = this.toRad(this.params.tilt);
        const e = this.params.eccentricity;

        // Mean anomaly
        const M = this.getMeanAnomaly(day);

        // Mean longitude (from vernal equinox, day 80)
        const springEquinox = 80;
        const L = this.toRad(360 * (day - springEquinox) / 365);

        // Equation of time has two components:

        // 1. Eccentricity effect (Earth moves faster near perihelion)
        const eccentricityEffect = -2 * e * Math.sin(M) - 1.25 * e * e * Math.sin(2 * M);

        // 2. Obliquity effect (Sun appears to move at varying rate along ecliptic)
        const y = Math.tan(obliquity / 2);
        const y2 = y * y;
        const obliquityEffect = y2 * Math.sin(2 * L) - 0.5 * y2 * y2 * Math.sin(4 * L);

        // Combine effects (convert from radians to minutes)
        // 24 hours = 1440 minutes = 2π radians, so 1 radian = 1440/(2π) ≈ 229.18 minutes
        let eot = 0;
        if (this.params.showEccentricityComponent) {
            eot += eccentricityEffect;
        }
        if (this.params.showTiltComponent) {
            eot += obliquityEffect;
        }

        return eot * 229.18;
    }

    // Get the month and day from day of year
    getDayMonth(dayOfYear) {
        let day = dayOfYear;
        let month = 0;

        while (month < 12 && day >= this.daysInMonth[month]) {
            day -= this.daysInMonth[month];
            month++;
        }

        if (month >= 12) {
            month = 0;
            day = dayOfYear;
        }

        return { month: this.months[month], day: Math.floor(day) + 1 };
    }

    // Get color for a given day of year
    getSeasonColor(day, alpha = 1) {
        // Map day to a color representing the season
        // Winter: blue, Spring: green, Summer: orange, Autumn: red

        const t = day / 365;
        let r, g, b;

        if (t < 0.25) {
            // Winter to Spring (blue to green)
            const s = t / 0.25;
            r = Math.floor(74 * (1 - s) + 74 * s);
            g = Math.floor(158 * (1 - s) + 255 * s);
            b = Math.floor(255 * (1 - s) + 74 * s);
        } else if (t < 0.5) {
            // Spring to Summer (green to orange)
            const s = (t - 0.25) / 0.25;
            r = Math.floor(74 * (1 - s) + 255 * s);
            g = Math.floor(255 * (1 - s) + 170 * s);
            b = Math.floor(74 * (1 - s) + 0 * s);
        } else if (t < 0.75) {
            // Summer to Autumn (orange to red)
            const s = (t - 0.5) / 0.25;
            r = Math.floor(255);
            g = Math.floor(170 * (1 - s) + 74 * s);
            b = Math.floor(0 * (1 - s) + 74 * s);
        } else {
            // Autumn to Winter (red to blue)
            const s = (t - 0.75) / 0.25;
            r = Math.floor(255 * (1 - s) + 74 * s);
            g = Math.floor(74 * (1 - s) + 158 * s);
            b = Math.floor(74 * (1 - s) + 255 * s);
        }

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Draw the analemma pattern
    drawAnalemma() {
        const ctx = this.analemmaCtx;
        const canvas = this.analemmaCanvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 10, 1)';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        // Scale factors
        const scaleX = width / 50;  // minutes to pixels (±20 minutes range)
        const scaleY = height / 60; // degrees to pixels (±30 degrees range)

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Vertical lines (equation of time)
        for (let m = -20; m <= 20; m += 5) {
            const x = centerX + m * scaleX;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            if (m !== 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(m + 'm', x, height - 10);
            }
        }

        // Horizontal lines (declination)
        for (let d = -25; d <= 25; d += 5) {
            const y = centerY - d * scaleY;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            if (d !== 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(d + '°', 10, y + 4);
            }
        }

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        // Vertical axis (declination)
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();

        // Horizontal axis (equation of time)
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw axis labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← Sun Early | Sun Late →', centerX, height - 30);

        ctx.save();
        ctx.translate(width - 25, centerY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('← South | North →', 0, 0);
        ctx.restore();

        // Draw the full analemma trail
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw as colored segments
        for (let day = 0; day < 365; day++) {
            const eot = this.getEquationOfTime(day);
            const decl = this.params.showTiltComponent ? this.getSolarDeclination(day) : 0;

            const x = centerX + eot * scaleX;
            const y = centerY - decl * scaleY;

            const nextDay = (day + 1) % 365;
            const nextEot = this.getEquationOfTime(nextDay);
            const nextDecl = this.params.showTiltComponent ? this.getSolarDeclination(nextDay) : 0;
            const nextX = centerX + nextEot * scaleX;
            const nextY = centerY - nextDecl * scaleY;

            ctx.strokeStyle = this.getSeasonColor(day, 0.8);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nextX, nextY);
            ctx.stroke();
        }

        // Draw current position marker
        const currentEot = this.getEquationOfTime(this.params.currentDay);
        const currentDecl = this.params.showTiltComponent ? this.getSolarDeclination(this.params.currentDay) : 0;
        const currentX = centerX + currentEot * scaleX;
        const currentY = centerY - currentDecl * scaleY;

        // Glow effect
        const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 20);
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Sun marker
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(currentX - 2, currentY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw month markers
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';

        const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

        for (let i = 0; i < 12; i++) {
            const day = monthDays[i] + 15; // Middle of month
            const eot = this.getEquationOfTime(day);
            const decl = this.params.showTiltComponent ? this.getSolarDeclination(day) : 0;
            const x = centerX + eot * scaleX;
            const y = centerY - decl * scaleY;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Offset labels to avoid overlap
            let labelX = x + 15;
            let labelY = y + 4;

            if (i === 5 || i === 6) labelX = x - 20; // Jun, Jul on left
            if (i === 11 || i === 0) labelY = y - 10; // Dec, Jan above

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(this.months[i], labelX, labelY);
        }
    }

    // Draw the orbital view
    drawOrbit() {
        const ctx = this.orbitCtx;
        const canvas = this.orbitCanvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 10, 1)';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const orbitRadius = Math.min(width, height) * 0.38;

        // Calculate focus offset for ellipse (Sun is at one focus)
        const focusOffset = orbitRadius * this.params.eccentricity;

        // Draw orbit path
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, orbitRadius, orbitRadius * Math.sqrt(1 - this.params.eccentricity * this.params.eccentricity), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Sun at focus
        const sunX = centerX + focusOffset;
        const sunY = centerY;

        // Sun glow
        const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
        sunGradient.addColorStop(0, 'rgba(255, 230, 150, 1)');
        sunGradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.8)');
        sunGradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.3)');
        sunGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffee88';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sun', sunX, sunY + 35);

        // Draw Earth's positions for each month
        const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

        for (let i = 0; i < 12; i++) {
            const day = monthDays[i];
            const meanAnomaly = this.getMeanAnomaly(day);
            const trueAnomaly = this.getTrueAnomaly(meanAnomaly);

            // Position in orbit (true anomaly is angle from perihelion)
            // Perihelion is to the right (0 angle), so we need to adjust
            const angle = trueAnomaly + Math.PI; // Adjust so perihelion direction is correct

            // Distance from Sun (in terms of orbit radius as semi-major axis)
            const e = this.params.eccentricity;
            const r = orbitRadius * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

            const x = sunX + r * Math.cos(angle);
            const y = sunY + r * Math.sin(angle);

            ctx.fillStyle = this.getSeasonColor(day, 0.5);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px sans-serif';
            const labelR = r + 20;
            const labelX = sunX + labelR * Math.cos(angle);
            const labelY = sunY + labelR * Math.sin(angle);
            ctx.fillText(this.months[i], labelX, labelY);
        }

        // Draw current Earth position
        const meanAnomaly = this.getMeanAnomaly(this.params.currentDay);
        const trueAnomaly = this.getTrueAnomaly(meanAnomaly);
        const angle = trueAnomaly + Math.PI;
        const e = this.params.eccentricity;
        const r = orbitRadius * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

        const earthX = sunX + r * Math.cos(angle);
        const earthY = sunY + r * Math.sin(angle);

        // Draw line from Sun to Earth
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(earthX, earthY);
        ctx.stroke();

        // Earth glow
        const earthGlow = ctx.createRadialGradient(earthX, earthY, 0, earthX, earthY, 25);
        earthGlow.addColorStop(0, 'rgba(100, 150, 255, 0.5)');
        earthGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');
        ctx.fillStyle = earthGlow;
        ctx.beginPath();
        ctx.arc(earthX, earthY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Earth
        ctx.fillStyle = '#4a88ff';
        ctx.beginPath();
        ctx.arc(earthX, earthY, 12, 0, Math.PI * 2);
        ctx.fill();

        // Earth continents (simple)
        ctx.fillStyle = '#3d8b40';
        ctx.beginPath();
        ctx.arc(earthX - 2, earthY - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(earthX + 3, earthY + 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw Earth's axis tilt
        if (this.params.tilt > 0) {
            const axisLength = 25;
            const tiltAngle = this.toRad(this.params.tilt);

            // Axis is tilted relative to orbital plane
            // For visualization, we show it tilted in the viewing plane
            const axisEndX = earthX + axisLength * Math.sin(tiltAngle);
            const axisEndY = earthY - axisLength * Math.cos(tiltAngle);
            const axisStartX = earthX - axisLength * Math.sin(tiltAngle);
            const axisStartY = earthY + axisLength * Math.cos(tiltAngle);

            ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(axisStartX, axisStartY);
            ctx.lineTo(axisEndX, axisEndY);
            ctx.stroke();

            // Arrow at north pole
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.beginPath();
            ctx.arc(axisEndX, axisEndY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw perihelion/aphelion markers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px sans-serif';

        // Perihelion (closest to Sun) - on the right
        const periX = sunX - orbitRadius * (1 - e);
        ctx.fillText('Perihelion', periX - 40, centerY + 15);
        ctx.beginPath();
        ctx.arc(periX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Aphelion (farthest from Sun) - on the left
        const apX = sunX + orbitRadius * (1 + e);
        ctx.fillText('Aphelion', apX + 10, centerY + 15);
        ctx.beginPath();
        ctx.arc(apX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Legend
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Top-down view of Earth\'s orbit', 15, 25);
        ctx.fillText('(Not to scale)', 15, 40);
    }

    // Draw the equation of time graph
    drawEOTGraph() {
        const ctx = this.eotCtx;
        const canvas = this.eotCanvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 10, 1)';
        ctx.fillRect(0, 0, width, height);

        const padding = { left: 50, right: 20, top: 20, bottom: 30 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let m = -15; m <= 15; m += 5) {
            const y = padding.top + graphHeight / 2 - (m / 20) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(m + 'm', padding.left - 5, y + 4);
        }

        // Zero line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + graphHeight / 2);
        ctx.lineTo(width - padding.right, padding.top + graphHeight / 2);
        ctx.stroke();

        // Month labels
        const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        for (let i = 0; i < 12; i++) {
            const x = padding.left + (monthDays[i] / 365) * graphWidth;
            ctx.fillText(this.months[i], x + 15, height - 10);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();
        }

        // Draw EOT curve
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let day = 0; day < 364; day++) {
            const eot = this.getEquationOfTime(day);
            const nextEot = this.getEquationOfTime(day + 1);

            const x1 = padding.left + (day / 365) * graphWidth;
            const y1 = padding.top + graphHeight / 2 - (eot / 20) * graphHeight;
            const x2 = padding.left + ((day + 1) / 365) * graphWidth;
            const y2 = padding.top + graphHeight / 2 - (nextEot / 20) * graphHeight;

            ctx.strokeStyle = this.getSeasonColor(day, 0.8);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Draw current day marker
        const currentX = padding.left + (this.params.currentDay / 365) * graphWidth;
        const currentEot = this.getEquationOfTime(this.params.currentDay);
        const currentY = padding.top + graphHeight / 2 - (currentEot / 20) * graphHeight;

        // Vertical line at current day
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(currentX, padding.top);
        ctx.lineTo(currentX, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current point
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Equation of Time', padding.left, 15);
    }

    // Update info displays
    updateInfo() {
        const dateInfo = this.getDayMonth(this.params.currentDay);
        document.getElementById('currentDate').textContent = dateInfo.month + ' ' + dateInfo.day;

        const declination = this.getSolarDeclination(this.params.currentDay);
        document.getElementById('declination').textContent = declination.toFixed(1) + '°';

        const eot = this.getEquationOfTime(this.params.currentDay);
        const eotSign = eot >= 0 ? '+' : '';
        document.getElementById('eot').textContent = eotSign + eot.toFixed(1) + ' min';

        // Update day slider
        document.getElementById('daySlider').value = this.params.currentDay;
        document.getElementById('dayValue').textContent = Math.floor(this.params.currentDay);
    }

    // Animation loop
    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update day counter
        if (this.params.isPlaying) {
            // Advance time - complete one year in about 30 seconds at 1x speed
            this.dayAccumulator += deltaTime * 0.012 * this.params.speed;

            if (this.dayAccumulator >= 1) {
                this.params.currentDay = (this.params.currentDay + Math.floor(this.dayAccumulator)) % 365;
                this.dayAccumulator = this.dayAccumulator % 1;
            }
        }

        // Draw everything
        this.drawAnalemma();
        this.drawOrbit();
        this.drawEOTGraph();
        this.updateInfo();

        // Continue animation
        requestAnimationFrame((t) => this.animate(t));
    }
}

// Start simulation when page loads
window.addEventListener('load', () => {
    new AnalemmaSimulation();
});
