export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Sketch {
  id: number;
  author_id: number;
  author_username: string;
  word: string;
  image_data: string;
  time_limit: number;
  created_at: string;
  total_players: number;
  times_guessed: number;
  is_own?: boolean;
  user_attempts?: number;
  user_has_guessed?: boolean;
  user_exhausted?: boolean;
}

export interface Guess {
  id: number;
  sketch_id: number;
  user_id: number;
  guess_text: string;
  is_correct: number | boolean;
  attempt_number: number;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalSketches: number;
  totalPages: number;
}

export interface ArtistLeaderboardItem {
  id: number;
  username: string;
  avatar_url?: string | null;
  total_sketches: number;
  total_correct_guesses?: number;
  guess_rate?: number;
  total_guesses_received?: number;
  success_rate?: number;
}

export interface GuesserLeaderboardItem {
  id: number;
  username: string;
  avatar_url?: string | null;
  words_guessed: number;
  total_attempts: number;
}

export interface UserStats {
  total_sketches: number;
  sketches_guessed_by_others: number;
  total_play_sessions: number;
  artist_success_rate: number;
  words_guessed: number;
  words_failed: number;
  words_in_progress: number;
  total_guesses: number;
  avg_attempts_to_guess: number | null;
}

export interface ApiError {
  status?: number;
  error?: string;
  message?: string;
}
