import pandas as pd

challenges = pd.read_csv("../data/abs_challenges.csv")
pitches = pd.read_csv("../data/pitches.csv")
players = pd.read_csv("../data/players.csv")

# Merge challenges + pitches
df = challenges.merge(pitches, on="challenge_id", how="left")

# Merge players
df = df.merge(players, left_on="challenger_player_id", right_on="player_id", how="left")

# Create success column
df["is_success"] = df["challenge_result"].apply(lambda x: 1 if x == "overturned" else 0)

print(df.head())