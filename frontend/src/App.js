import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Legend,
} from "recharts";
import "./App.css";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

function StatCard({ title, value, subtitle }) {
  return (
    <div className="stat-card">
      <p className="stat-card-title">{title}</p>
      <h2 className="stat-card-value">{value}</h2>
      <p className="stat-card-subtitle">{subtitle}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="section-card">
      <h2 className="section-title">{title}</h2>
      <p className="section-subtitle">{subtitle}</p>
      {children}
    </div>
  );
}

function PitchTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="pitch-tooltip">
        <p className="pitch-tooltip-name">{d.player_name}</p>
        <p><strong>Result:</strong> {d.challenge_result}</p>
        <p><strong>Inning:</strong> {d.inning}</p>
        <p><strong>Count:</strong> {d.balls}-{d.strikes}</p>
        <p><strong>Location:</strong> ({d.pitch_x}, {d.pitch_z})</p>
      </div>
    );
  }
  return null;
}

// Color helper for count heatmap
// Low overturn = red, mid = yellow, high = green
function rateToColor(rate) {
  if (rate == null) return "#e5e7eb";
  let r, g;
  if (rate < 0.5) {
    r = 220;
    g = Math.round(rate * 2 * 180);
  } else {
    r = Math.round((1 - rate) * 2 * 220);
    g = 180;
  }
  return `rgb(${r},${g},40)`;
}

// --- Count Matrix Heatmap ---
function CountMatrix({ data, selectedTeam }) {
  const balls = [0, 1, 2, 3];
  const strikes = [0, 1, 2];

  // Build count stats from pitch map data filtered by team
  const countStats = useMemo(() => {
    const filtered = selectedTeam === "All"
      ? data
      : data.filter((p) => p.team_name === selectedTeam);

    const stats = {};
    filtered.forEach((p) => {
      const key = `${p.balls}-${p.strikes}`;
      if (!stats[key]) stats[key] = { total: 0, overturned: 0 };
      stats[key].total++;
      if (p.challenge_result === "overturned") stats[key].overturned++;
    });
    return stats;
  }, [data, selectedTeam]);

  return (
    <div className="count-matrix">
      {/* Column headers */}
      <div className="count-matrix-row">
        <div className="count-matrix-corner" />
        {strikes.map((s) => (
          <div key={s} className="count-matrix-header">
            {s} {s === 1 ? "Strike" : "Strikes"}
          </div>
        ))}
      </div>

      {/* Rows */}
      {balls.map((b) => (
        <div key={b} className="count-matrix-row">
          <div className="count-matrix-row-label">
            {b} {b === 1 ? "Ball" : "Balls"}
          </div>
          {strikes.map((s) => {
            const key = `${b}-${s}`;
            const cs = countStats[key];
            const rate = cs && cs.total > 0 ? cs.overturned / cs.total : null;
            return (
              <div
                key={s}
                className="count-matrix-cell"
                style={{ background: rateToColor(rate) }}
              >
                <span className="count-matrix-pct">
                  {rate != null ? `${(rate * 100).toFixed(0)}%` : "—"}
                </span>
                <span className="count-matrix-count">
                  {b}-{s}
                </span>
                {cs && (
                  <span className="count-matrix-sub">
                    {cs.overturned}/{cs.total}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="count-matrix-legend">
        <span className="legend-label">Low</span>
        <div className="legend-gradient" />
        <span className="legend-label">High Overturn Rate</span>
      </div>
    </div>
  );
}

// --- Sortable Player Table ---
function PlayerTable({ data }) {
  const [sortKey, setSortKey] = useState("total_challenges");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);

  const cols = [
    { key: "player_name",      label: "Player" },
    { key: "team_name",        label: "Team" },
    { key: "position",         label: "Pos" },
    { key: "total_challenges", label: "Challenges" },
    { key: "overturned",       label: "Overturned" },
    { key: "success_rate",     label: "Success %" },
  ];

  const arrow = (key) => {
    if (sortKey !== key) return " ⇅";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="player-table-wrapper">
      <table className="player-table">
        <thead>
          <tr>
            {cols.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="player-table-th"
              >
                {col.label}{arrow(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "row-even" : "row-odd"}>
              <td className="player-table-td">{row.player_name}</td>
              <td className="player-table-td">{row.team_name}</td>
              <td className="player-table-td">{row.position ?? "—"}</td>
              <td className="player-table-td">{row.total_challenges}</td>
              <td className="player-table-td">{row.overturned ?? "—"}</td>
              <td className="player-table-td">
                {row.success_rate != null
                  ? `${(row.success_rate * 100).toFixed(1)}%`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Team Filter Bar ---
function TeamFilter({ teams, selected, onChange }) {
  return (
    <div className="team-filter">
      <span className="team-filter-label">Filter by team:</span>
      {["All", ...teams].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`team-filter-btn ${selected === t ? "active" : ""}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [summary, setSummary] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [challengeTrends, setChallengeTrends] = useState([]);
  const [pitchMap, setPitchMap] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("All");

  const [predictionForm, setPredictionForm] = useState({
    inning: 8,
    outs: 0,
    balls: 3,
    strikes: 1,
    pitch_x: 0.548,
    pitch_z: 1.637,
    sz_top: 3.21,
    sz_bot: 1.62,
    challenger_role: "batter",
    original_call: "strike",
    inning_half: "bottom",
  });

  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summaryRes = await axios.get(`${API_BASE}/summary`);
        setSummary(summaryRes.data);
      } catch (e) { console.error("Summary error:", e); }

      try {
        const playerRes = await axios.get(`${API_BASE}/player-stats`);
        setPlayerStats(playerRes.data);
      } catch (e) { console.error("Player stats error:", e); }

      try {
        const trendsRes = await axios.get(`${API_BASE}/challenge-trends`);
        setChallengeTrends(trendsRes.data);
      } catch (e) { console.error("Challenge trends error:", e); }

      try {
        const pitchRes = await axios.get(`${API_BASE}/pitch-map`);
        setPitchMap(pitchRes.data);
      } catch (e) { console.error("Pitch map error:", e); }
    };

    fetchData();
  }, []);

  // All unique teams from pitch map data
  const teams = useMemo(() => {
    const s = new Set(pitchMap.map((p) => p.team_name).filter(Boolean));
    return [...s].sort();
  }, [pitchMap]);

  // Filter pitch map and player stats by selected team
  const filteredPitchMap = useMemo(() =>
    selectedTeam === "All"
      ? pitchMap
      : pitchMap.filter((p) => p.team_name === selectedTeam),
    [pitchMap, selectedTeam]
  );

  const filteredPlayerStats = useMemo(() =>
    selectedTeam === "All"
      ? playerStats
      : playerStats.filter((p) => p.team_name === selectedTeam),
    [playerStats, selectedTeam]
  );

  const filteredTrends = useMemo(() => {
    if (selectedTeam === "All") return challengeTrends;
    // Recompute trends from pitch map for the selected team
    const byInning = {};
    filteredPitchMap.forEach((p) => {
      const inn = p.inning;
      if (!byInning[inn]) byInning[inn] = { total: 0, overturned: 0 };
      byInning[inn].total++;
      if (p.challenge_result === "overturned") byInning[inn].overturned++;
    });
    return Object.entries(byInning)
      .map(([inning, d]) => ({
        inning: Number(inning),
        success_rate: d.total > 0 ? d.overturned / d.total : 0,
      }))
      .sort((a, b) => a.inning - b.inning);
  }, [challengeTrends, filteredPitchMap, selectedTeam]);

  const overturnedPitches = useMemo(
    () => filteredPitchMap.filter((p) => p.challenge_result === "overturned"),
    [filteredPitchMap]
  );

  const confirmedPitches = useMemo(
    () => filteredPitchMap.filter((p) => p.challenge_result === "confirmed"),
    [filteredPitchMap]
  );

  const topPlayer = useMemo(() => {
    if (!filteredPlayerStats.length) return null;
    return [...filteredPlayerStats].sort(
      (a, b) => b.total_challenges - a.total_challenges
    )[0];
  }, [filteredPlayerStats]);

  const bestInning = useMemo(() => {
    if (!filteredTrends.length) return null;
    return [...filteredTrends].sort((a, b) => b.success_rate - a.success_rate)[0];
  }, [filteredTrends]);

  const formattedSuccessRate = summary
    ? `${(summary.success_rate * 100).toFixed(1)}%`
    : "Loading...";

  const handlePredictionChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["inning","outs","balls","strikes","pitch_x","pitch_z","sz_top","sz_bot"];
    setPredictionForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setPredictionLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/predict`, predictionForm);
      setPredictionResult(response.data);
    } catch (e) {
      console.error("Prediction error:", e);
    } finally {
      setPredictionLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="dashboard-container">
        <div className="hero">
          <h1 className="hero-title">ABS Strategy Dashboard</h1>
          <p className="hero-subtitle">
            This dashboard helps analysts and coaches understand how ABS
            challenges perform across players, innings, and pitch locations. It
            also includes a lightweight prediction tool to estimate whether a
            challenge is likely to overturn the original call.
          </p>
        </div>

        {/* Team Filter — affects all charts below */}
        <TeamFilter
          teams={teams}
          selected={selectedTeam}
          onChange={setSelectedTeam}
        />

        <div className="stats-grid">
          <StatCard
            title="Total Challenges"
            value={summary ? summary.total_challenges : "Loading..."}
            subtitle="The total number of ABS challenges included in the analysis."
          />
          <StatCard
            title="Challenge Success Rate"
            value={formattedSuccessRate}
            subtitle="The share of challenges that overturned the original call."
          />
          <StatCard
            title="Most Active Challenger"
            value={topPlayer ? topPlayer.player_name : "Loading..."}
            subtitle={topPlayer ? `${topPlayer.total_challenges} total challenges` : "Player challenge volume"}
          />
          <StatCard
            title="Best Inning to Challenge"
            value={bestInning ? `Inning ${bestInning.inning}` : "Loading..."}
            subtitle={bestInning ? `${(bestInning.success_rate * 100).toFixed(1)}% success rate` : "Highest overturn rate by inning"}
          />
        </div>

        <SectionCard
          title="What this dashboard shows"
          subtitle="A quick interpretation of the visuals for baseball operations staff."
        >
          <div className="insight-box">
            <p>This dashboard analyzes 859 ABS challenges from 180 games and 30,559 called pitches across 4 teams and 56 players. It summarizes challenge volume, overturn rate, player behavior, inning-level trends, pitch locations, and a lightweight prediction of challenge success.</p>
            <p>The KPI cards at the top summarize overall challenge volume and how often challenges are successful. In this dataset, challenges are overturned {formattedSuccessRate} of the time.</p>
            <p>The player chart shows who is using challenges most often. The inning chart shows when challenge success tends to be higher or lower across the course of a game.</p>
            <p>The pitch location map helps identify where overturned calls happen, and the prediction panel estimates the probability that a challenge will succeed for a given game situation and pitch location.</p>
          </div>
        </SectionCard>

       
        <SectionCard
          title="Challenge Decision Assistant"
          subtitle="Enter a pitch situation to estimate the probability that an ABS challenge will be overturned."
        >
          <form onSubmit={handlePredict}>
            <div className="form-grid">
              {[
                { label: "Inning",             name: "inning",           type: "number", step: null },
                { label: "Outs",               name: "outs",             type: "number", step: null },
                { label: "Balls",              name: "balls",            type: "number", step: null },
                { label: "Strikes",            name: "strikes",          type: "number", step: null },
                { label: "Pitch X",            name: "pitch_x",          type: "number", step: "0.001" },
                { label: "Pitch Z",            name: "pitch_z",          type: "number", step: "0.001" },
                { label: "Strike Zone Top",    name: "sz_top",           type: "number", step: "0.01" },
                { label: "Strike Zone Bottom", name: "sz_bot",           type: "number", step: "0.01" },
              ].map(({ label, name, type, step }) => (
                <div key={name} className="form-field">
                  <label>{label}</label>
                  <input
                    className="form-input"
                    type={type}
                    name={name}
                    step={step ?? undefined}
                    value={predictionForm[name]}
                    onChange={handlePredictionChange}
                  />
                </div>
              ))}

              <div className="form-field">
                <label>Challenger Role</label>
                <select className="form-input" name="challenger_role" value={predictionForm.challenger_role} onChange={handlePredictionChange}>
                  <option value="batter">batter</option>
                  <option value="pitcher">pitcher</option>
                  <option value="catcher">catcher</option>
                </select>
              </div>
              <div className="form-field">
                <label>Original Call</label>
                <select className="form-input" name="original_call" value={predictionForm.original_call} onChange={handlePredictionChange}>
                  <option value="ball">ball</option>
                  <option value="strike">strike</option>
                </select>
              </div>
              <div className="form-field">
                <label>Inning Half</label>
                <select className="form-input" name="inning_half" value={predictionForm.inning_half} onChange={handlePredictionChange}>
                  <option value="top">top</option>
                  <option value="bottom">bottom</option>
                </select>
              </div>
            </div>

            <button type="submit" className="primary-button">
              {predictionLoading ? "Predicting..." : "Predict Challenge Success"}
            </button>
          </form>

          {predictionResult && (
            <div className="prediction-result">
              <p className="prediction-result-title">
                Predicted Success Probability:{" "}
                {(predictionResult.predicted_success_probability * 100).toFixed(1)}%
              </p>
              <div className="prediction-bar-track">
                <div
                  className="prediction-bar-fill"
                  style={{ width: `${(predictionResult.predicted_success_probability * 100).toFixed(1)}%` }}
                />
              </div>
              <p className="prediction-result-text">
                Recommendation: {predictionResult.recommendation}
              </p>
            </div>
          )}
        </SectionCard>

        {/* Count Matrix Heatmap */}
        <SectionCard
          title="Count Strategy Matrix"
          subtitle="Overturn rate for every ball-strike count. Green = high success, Red = low success. Use this to decide when to challenge."
        >
          <CountMatrix data={filteredPitchMap} selectedTeam={selectedTeam} />
        </SectionCard>

        {/* Top Challengers bar chart + sortable table */}
        <SectionCard
          title="Top Challengers"
          subtitle="This chart shows which players are using ABS challenges most often."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredPlayerStats.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="player_name" interval={0} angle={-25} textAnchor="end" height={90} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_challenges" name="Challenges" fill="#111827" />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-note">
            Taller bars mean a player challenges more often. Click any column header in the table below to sort.
          </p>

          <PlayerTable data={filteredPlayerStats} />
        </SectionCard>

        <SectionCard
          title="Challenge Success by Inning"
          subtitle="This chart shows how often challenges are overturned in each inning."
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="inning" />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="success_rate" name="Success Rate" strokeWidth={3} stroke="#111827" />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-note">
            Higher points mean challenges were more likely to overturn the original call in that inning.
          </p>
        </SectionCard>

        <SectionCard
          title="Pitch Location Map"
          subtitle="This plot shows where challenged pitches crossed the plate area."
        >
          <ResponsiveContainer width="100%" height={430}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="pitch_x" name="Horizontal (ft)" domain={[-2, 2]} label={{ value: "Horizontal (ft)", position: "insideBottom", offset: -10 }} />
              <YAxis type="number" dataKey="pitch_z" name="Vertical (ft)"   domain={[0, 5]}  label={{ value: "Vertical (ft)", angle: -90, position: "insideLeft" }} />
              <Tooltip content={<PitchTooltip />} />
              <Legend />
              <Scatter name="Overturned" data={overturnedPitches} fill="#16a34a" />
              <Scatter name="Confirmed"  data={confirmedPitches}  fill="#dc2626" />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="chart-note">
            Each dot is a challenged pitch. Green = overturned, Red = confirmed. Use the team filter above to focus on a specific squad.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

export default App;