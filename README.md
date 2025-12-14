# Analemma Simulation

> **Disclaimer**: This is a casual on/off hobby project made out of curiosity. It likely contains inaccuracies and bugs. Do not rely on it for any scientific, educational, or practical purposes.

An interactive visualization that helps build intuition about why the analemma - the figure-8 pattern traced by the Sun in the sky - has its characteristic shape.

https://mdilovar.github.io/analemma/

## What is the Analemma?

If you photograph the Sun at the same clock time every day for a year, it traces a figure-8 pattern in the sky called the **analemma**. This shape emerges from two key factors:

### 1. Earth's Axial Tilt (Obliquity) - 23.4°

The tilt of Earth's axis causes the Sun's north-south position (declination) to vary throughout the year. This creates the **vertical extent** of the analemma:
- Sun is highest in summer (northern hemisphere)
- Sun is lowest in winter
- Sun crosses the equator at the equinoxes

### 2. Orbital Eccentricity - 0.017

Earth's orbit is slightly elliptical, not perfectly circular. Combined with the axial tilt, this causes the **Equation of Time** - the difference between clock time and sundial time:
- Earth moves faster when closer to the Sun (perihelion, ~January 3)
- Earth moves slower when farther from the Sun (aphelion, ~July 4)
- This creates the **east-west asymmetry** of the analemma

## Features

- **Real-time analemma visualization** showing the Sun's position throughout the year
- **Interactive sliders** to adjust:
  - Axial tilt (0° to 45°)
  - Orbital eccentricity (0 to 0.2)
  - Perihelion day
  - Animation speed
- **Orbital view** showing Earth's position around the Sun
- **Equation of Time graph** showing the deviation from mean solar time
- **Component toggles** to see how each factor contributes to the shape
- **Color-coded seasons** to track progression through the year

## Building Intuition

Try these experiments:

1. **Set eccentricity to 0**: The analemma becomes a symmetric figure-8, showing only the effect of axial tilt
2. **Set tilt to 0**: The analemma becomes a horizontal line, showing only the eccentricity effect
3. **Increase eccentricity**: Watch the figure-8 become more asymmetric (one lobe larger)
4. **Change perihelion day**: See how the timing of closest approach affects the shape

## Running the Simulation

Simply open `index.html` in a modern web browser. No build process or server required.

```bash
# Or use a simple HTTP server
python -m http.server 8000
# Then open http://localhost:8000
```

## The Math

The simulation implements:

- **Solar declination**: δ = arcsin(sin(ε) × sin(λ))
  - Where ε is obliquity and λ is solar longitude

- **Equation of Time**: Combines two effects:
  - Eccentricity effect: -2e × sin(M) - 1.25e² × sin(2M)
  - Obliquity effect: y² × sin(2L) - 0.5y⁴ × sin(4L)
  - Where e is eccentricity, M is mean anomaly, L is mean longitude, and y = tan(ε/2)

## License

MIT
