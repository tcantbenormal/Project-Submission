import React, { useMemo } from 'react';

/* ------------------------------------------------------------------ *
 * Horizon & Sun Path chart
 *
 * Why this rewrite: Recharts renders cartesian *data series*, sorted
 * and scaled internally — it fights you the moment you need true
 * parametric curves (hour analemmas that double back on themselves,
 * wrap-around azimuths, etc). This version drops the charting library
 * entirely and draws straight to SVG, computing its own x/y scales.
 * That's what makes the curves render correctly and predictably.
 *
 * Solar geometry uses the same compact, public-domain astronomical
 * formulas SunCalc is built on (Astronomy Answers / Jean Meeus),
 * reimplemented here so there's no external dependency.
 * ------------------------------------------------------------------ */

const COLORS = {
  terrain: '#D6392A',
  active: '#FFD54A',
  hourCurve: '#F2A93B',
  clockMarker: '#2E6F8E',
  solarMarker: '#111111',
  axis: '#333333',
  grid: '#e8e8e8',
};

// ---- Terrain horizon mock profile (azimuth deg -> elevation deg) ----
// Swap for a real DEM/horizon-survey profile if you have one.
const TERRAIN_AZ = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];
const TERRAIN_EL = [3, 5, 9, 4, 2, 3, 6, 10, 14, 8, 4, 2, 3];

// ------------------------- solar position -------------------------
const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

function toDays(date) {
  return date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
}
function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(M) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}
function sunCoords(d) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return {
    dec: Math.asin(Math.sin(OBLIQUITY) * Math.sin(L)),
    ra: Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L)),
  };
}
function siderealTime(d, lw) {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

/** Returns { azimuth: 0-360 (0=N, clockwise), elevation: deg } for a UTC Date instant. */
export function getSolarPosition(date, lat, lng) {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const c = sunCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi));
  const alt = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
  return { azimuth: (az / RAD + 180 + 360) % 360, elevation: alt / RAD };
}

// simple linear interpolation over a control-point profile
function lerpProfile(x, xs, ys) {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

// sample elevation of a (time-ordered, possibly wrapping) az/el curve at a given azimuth
function curveElAtAz(curveSortedByAz, az) {
  const pts = curveSortedByAz;
  if (!pts.length) return 0;
  if (az <= pts[0].az) return pts[0].el;
  if (az >= pts[pts.length - 1].az) return pts[pts.length - 1].el;
  for (let i = 0; i < pts.length - 1; i++) {
    if (az >= pts[i].az && az <= pts[i + 1].az) {
      const t = (az - pts[i].az) / (pts[i + 1].az - pts[i].az || 1);
      return pts[i].el + t * (pts[i + 1].el - pts[i].el);
    }
  }
  return 0;
}

// Build an SVG path 'd' string from a chronologically-ordered list of
// {az, el} points, splitting into separate segments wherever azimuth
// jumps a lot between consecutive samples (handles horizon wrap-around).
function buildPathD(points, xScale, yScale, jumpThresholdDeg = 20) {
  if (!points.length) return '';
  let d = '';
  let started = false;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const prev = points[i - 1];
      if (Math.abs(p.az - prev.az) > jumpThresholdDeg) started = false;
    }
    const x = xScale(p.az);
    const y = yScale(p.el);
    d += (started ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
    started = true;
  }
  return d.trim();
}

const CARDINAL = { 0: 'North', 90: 'East', 180: 'South', 270: 'West', 360: 'North' };

export default function SunpathChart({
  lat = 33.6007,
  lng = 73.0679,
  year = new Date().getFullYear(),
  tzLabel = 'PKT (UTC+05:00)',
  utcOffsetHours = 5,
  width = 900,
  height = 620,
}) {
  const margin = { top: 46, right: 30, bottom: 70, left: 56 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const xScale = (az) => margin.left + (az / 360) * plotW;
  const yScale = (el) => margin.top + plotH - (Math.max(el, 0) / 90) * plotH;

  const data = useMemo(() => {
    // full-day path for a given month/day (0-indexed month), sampled every 5 min in UTC
    const pathFor = (month, day) => {
      const pts = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 5) {
          const t = new Date(Date.UTC(year, month, day, h, m));
          const p = getSolarPosition(t, lat, lng);
          if (p.elevation > -1) pts.push({ az: p.azimuth, el: p.elevation });
        }
      }
      return pts;
    };

    const june = pathFor(5, 21);
    const dec = pathFor(11, 21);
    const equ = pathFor(2, 20);

    // hour curves: fixed local-clock hour, swept across the whole year
    const hours = [];
    for (let h = 6; h <= 19; h++) {
      const pts = [];
      for (let day = 1; day <= 365; day += 5) {
        const localNoonUTC = new Date(Date.UTC(year, 0, day, h - utcOffsetHours, 0));
        const p = getSolarPosition(localNoonUTC, lat, lng);
        if (p.elevation > 0) pts.push({ az: p.azimuth, el: p.elevation });
      }
      if (pts.length > 2) hours.push({ hour: h, points: pts });
    }

    // equinox samples: clock-time marker (arrow) + true solar-time marker (dot)
    const markers = [];
    for (let h = 6; h <= 19; h++) {
      const tClock = new Date(Date.UTC(year, 2, 20, h - utcOffsetHours, 0));
      const pClock = getSolarPosition(tClock, lat, lng);
      if (pClock.elevation <= 0) continue;

      // equation of time (minutes) - true solar time offset from mean/clock time
      const d = toDays(tClock);
      const M = solarMeanAnomaly(d);
      const L = eclipticLongitude(M);
      const ra = Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
      let eot = (M + RAD * 102.9372 + Math.PI - ra) / RAD; // deg
      eot = ((eot + 180) % 360) - 180; // wrap to [-180,180]
      const eotMinutes = eot * 4;

      const tSolar = new Date(tClock.getTime() + eotMinutes * 60 * 1000);
      const pSolar = getSolarPosition(tSolar, lat, lng);

      markers.push({
        hour: h,
        clock: pClock.elevation > 0 ? pClock : null,
        solar: pSolar.elevation > 0 ? pSolar : null,
      });
    }

    // hour-label position: apex of each hour curve (near the June-solstice edge)
    const hourLabels = hours.map(({ hour, points }) => {
      const top = points.reduce((mx, p) => (p.el > mx.el ? p : mx), points[0]);
      return { hour, az: top.az, el: Math.min(top.el, 88) };
    });

    // terrain + active-area fill, sampled on a regular azimuth grid
    const juneSorted = [...june].sort((a, b) => a.az - b.az);
    const decSorted = [...dec].sort((a, b) => a.az - b.az);
    const grid = [];
    for (let az = 0; az <= 360; az += 1) {
      const terrain = lerpProfile(az, TERRAIN_AZ, TERRAIN_EL);
      const upper = Math.max(curveElAtAz(juneSorted, az), 0);
      const lower = Math.max(curveElAtAz(decSorted, az), 0);
      const base = Math.max(lower, terrain);
      grid.push({ az, terrain, base, top: Math.max(upper, base) });
    }

    return { june, dec, equ, hours, markers, hourLabels, grid };
  }, [lat, lng, year, utcOffsetHours]);

  // ---- derived SVG strings ----
  const terrainD = data.grid
    .map((g, i) => `${i === 0 ? 'M' : 'L'}${xScale(g.az).toFixed(2)},${yScale(g.terrain).toFixed(2)}`)
    .join(' ');

  const activeAreaD =
    data.grid.map((g, i) => `${i === 0 ? 'M' : 'L'}${xScale(g.az).toFixed(2)},${yScale(g.top).toFixed(2)}`).join(' ') +
    ' ' +
    [...data.grid].reverse().map((g) => `L${xScale(g.az).toFixed(2)},${yScale(g.base).toFixed(2)}`).join(' ') +
    ' Z';

  const juneD = buildPathD(data.june, xScale, yScale);
  const decD = buildPathD(data.dec, xScale, yScale);
  const equD = buildPathD(data.equ, xScale, yScale);

  const azTicks = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  const elTicks = [0, 15, 30, 45, 60, 75, 90];

  return (
    <div style={{ width: '100%', fontFamily: 'Arial, Helvetica, sans-serif', color: COLORS.axis }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, paddingLeft: 10 }}>Horizon and sunpath</div>

      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* --- gridlines & frame --- */}
        {elTicks.map((el) => (
          <line key={`gy${el}`} x1={margin.left} x2={width - margin.right}
                y1={yScale(el)} y2={yScale(el)} stroke={COLORS.grid} strokeWidth={1} />
        ))}
        <line x1={margin.left} x2={width - margin.right} y1={yScale(0)} y2={yScale(0)} stroke={COLORS.axis} strokeWidth={1.2} />
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={yScale(0)} stroke={COLORS.axis} strokeWidth={1.2} />

        {/* --- active area fill --- */}
        <path d={activeAreaD} fill={COLORS.active} fillOpacity={0.55} stroke="none" />

        {/* --- terrain horizon (dashed) --- */}
        <path d={terrainD} fill="none" stroke={COLORS.terrain} strokeWidth={1.8} strokeDasharray="7 4" />

        {/* --- hour curves --- */}
        {data.hours.map(({ hour, points }) => (
          <path key={`hc${hour}`} d={buildPathD(points, xScale, yScale, 15)}
                fill="none" stroke={COLORS.hourCurve} strokeWidth={1} opacity={0.9} />
        ))}

        {/* --- date curves --- */}
        <path d={decD} fill="none" stroke="#000" strokeWidth={1.5} />
        <path d={juneD} fill="none" stroke="#000" strokeWidth={1.5} />
        <path d={equD} fill="none" stroke="#000" strokeWidth={1.2} strokeDasharray="1 3" strokeLinecap="round" />

        {/* --- hour markers: clock-time arrow + true solar-time dot --- */}
        {data.markers.map(({ hour, clock, solar }) => (
          <g key={`mk${hour}`}>
            {solar && <circle cx={xScale(solar.azimuth)} cy={yScale(solar.elevation)} r={2.6} fill={COLORS.solarMarker} />}
            {clock && (
              <path
                d="M -4,-3 L 4,0 L -4,3 Z"
                fill={COLORS.clockMarker}
                transform={`translate(${xScale(clock.azimuth)},${yScale(clock.elevation)})`}
              />
            )}
          </g>
        ))}

        {/* --- hour labels --- */}
        {data.hourLabels.map(({ hour, az, el }) => (
          <text key={`lbl${hour}`} x={xScale(az)} y={yScale(el) - 6}
                fontSize={11} textAnchor="middle" fill="#444">{hour}h</text>
        ))}

        {/* --- axes ticks & labels --- */}
        {azTicks.map((az) => (
          <g key={`ax${az}`}>
            <line x1={xScale(az)} x2={xScale(az)} y1={margin.top} y2={margin.top - 6} stroke={COLORS.axis} />
            <text x={xScale(az)} y={margin.top - 10} fontSize={11} textAnchor="middle">{az}</text>
            <line x1={xScale(az)} x2={xScale(az)} y1={yScale(0)} y2={yScale(0) + 6} stroke={COLORS.axis} />
          </g>
        ))}
        {[0, 90, 180, 270, 360].map((az) => (
          <text key={`cd${az}`} x={xScale(az)} y={yScale(0) + 26} fontSize={12} fontWeight={600} textAnchor="middle">
            {CARDINAL[az]}
          </text>
        ))}
        {elTicks.map((el) => (
          <g key={`ey${el}`}>
            <line x1={margin.left - 6} x2={margin.left} y1={yScale(el)} y2={yScale(el)} stroke={COLORS.axis} />
            <text x={margin.left - 10} y={yScale(el) + 4} fontSize={11} textAnchor="end">{el}</text>
          </g>
        ))}

        {/* --- axis titles --- */}
        <text x={margin.left + plotW / 2} y={16} fontSize={13} textAnchor="middle">Solar azimuth [°]</text>
        <text x={16} y={margin.top + plotH / 2} fontSize={13} textAnchor="middle"
              transform={`rotate(-90 16 ${margin.top + plotH / 2})`}>Solar elevation [°]</text>

        {/* --- legend --- */}
        <g transform={`translate(${margin.left}, ${height - 34})`} fontSize={11}>
          <LegendItem x={0}   render={() => <line x1={0} y1={0} x2={20} y2={0} stroke={COLORS.terrain} strokeWidth={1.8} strokeDasharray="6 3" />} label="Terrain horizon" />
          <LegendItem x={150} render={() => <rect x={0} y={-6} width={20} height={12} fill={COLORS.active} fillOpacity={0.55} />} label="Active area" />
          <LegendItem x={270} render={() => <path d="M0,-3 L10,0 L0,3 Z" fill={COLORS.clockMarker} />} label={tzLabel} />
          <LegendItem x={410} render={() => <circle cx={5} cy={0} r={2.6} fill={COLORS.solarMarker} />} label="Solar time" />
          <LegendItem x={510} render={() => <line x1={0} y1={0} x2={20} y2={0} stroke="#000" strokeWidth={1.5} />} label="June solstice" />
          <LegendItem x={630} render={() => <line x1={0} y1={0} x2={20} y2={0} stroke="#000" strokeWidth={1.5} />} label="December solstice" />
        </g>
        <g transform={`translate(${margin.left}, ${height - 14})`} fontSize={11}>
          <LegendItem x={0} render={() => <line x1={0} y1={0} x2={20} y2={0} stroke="#000" strokeWidth={1.2} strokeDasharray="1 3" strokeLinecap="round" />} label="Equinox" />
        </g>
      </svg>
    </div>
  );
}

function LegendItem({ x, render, label }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <g transform="translate(0, 0)">{render()}</g>
      <text x={26} y={4}>{label}</text>
    </g>
  );
}
