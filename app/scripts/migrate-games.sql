-- Game wins leaderboard table
-- Run against Neon DB: node app/scripts/run-migrate-games.js

CREATE TABLE IF NOT EXISTS game_wins (
  id           SERIAL PRIMARY KEY,
  wallet       VARCHAR(64)  NOT NULL,
  game_type    VARCHAR(20)  NOT NULL,   -- 'ttt' | 'checkers' | 'chess' | 'backgammon'
  tokens_earned INTEGER     NOT NULL DEFAULT 0,
  session_id   VARCHAR(128) NOT NULL,   -- unique per game session, prevents duplicate rewards
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_wins_session   ON game_wins(session_id);
CREATE        INDEX IF NOT EXISTS idx_game_wins_wallet    ON game_wins(wallet);
CREATE        INDEX IF NOT EXISTS idx_game_wins_game_type ON game_wins(game_type);
