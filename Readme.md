# ⚾ ABS Strategy Dashboard

## 📌 Overview

This project analyzes Automated Ball-Strike (ABS) challenge data to help baseball teams make more informed decisions about when to challenge umpire calls.

The dashboard transforms raw pitch and challenge data into actionable insights through interactive visualizations and a lightweight prediction tool.

---

## 🎯 Project Goal

The goal of this project is to demonstrate how data visualization and simple machine learning can inform ABS strategy by answering key questions:

- When are challenges most likely to succeed?
- Which players challenge most often and effectively?
- Where are overturned calls most likely to occur?
- How can teams decide whether to challenge in a given situation?

---

## 📊 Key Features

### 🔹 1. Dashboard Overview
- Total number of ABS challenges
- Overall challenge success rate
- Most active challenger
- Best inning to challenge

---

### 🔹 2. Strike Zone Pitch Map
- Visualizes pitch locations using `pitch_x` and `pitch_z`
- Green points = overturned calls  
- Red points = confirmed calls  

📌 Insight:
Overturned calls tend to cluster near the edges of the strike zone, indicating that borderline pitches are the strongest candidates for challenges.

---

### 🔹 3. Count Strategy Matrix (Heatmap)
- Shows challenge success rate by ball-strike count

📌 Insight:
Challenge success varies significantly by count, making this a highly actionable tool for in-game strategy.

---

### 🔹 4. Player Analysis
- Bar chart of most active challengers
- Table showing:
  - total challenges
  - successful challenges
  - success rate

📌 Insight:
Some players challenge frequently but inefficiently, while others show higher success rates.

---

### 🔹 5. Inning Trend Analysis
- Line chart of challenge success rate by inning

📌 Insight:
Challenge success varies throughout the game, suggesting teams may benefit from strategic timing.

---

### 🔹 6. 🤖 Prediction Assistant (ML)
- Input: pitch location + game context
- Output:
  - predicted success probability
  - recommendation (low / borderline / strong)

📌 Insight:
Provides lightweight decision support for evaluating individual challenge opportunities.

---

## 🧠 Machine Learning Approach

A logistic regression model was trained on historical ABS challenge data.

### Features used:
- inning, outs
- balls, strikes
- pitch_x, pitch_z
- strike zone bounds (sz_top, sz_bot)
- challenger_role
- original_call
- inning_half

### Output:
- Probability that a challenge will be overturned

This model is intended as a **decision-support tool**, not a definitive predictor.

---

## 📂 Dataset

### Files:
- `abs_challenges.csv`: one row per ABS challenge
- `pitches.csv`: all called pitches
- `players.csv`: player metadata

### Scope:
- 4 teams  
- 56 players  
- 180 games  
- 30,559 called pitches  
- 859 ABS challenges  

---

## 📏 Strike Zone Definition

For simplicity, all players are assumed to be 6 feet tall.

- `sz_top = 3.21`
- `sz_bot = 1.62`
- horizontal bounds: `-0.708 <= pitch_x <= 0.708`

A pitch is considered an ABS strike if:
-0.708 <= pitch_x <= 0.708
1.62 <= pitch_z <= 3.21