export type ListVisibility = "private" | "unlisted" | "public" | "invite";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type MovieList = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  target_size: number;
  visibility: ListVisibility;
  allow_overflow: boolean;
  created_at: string;
  updated_at: string;
};

export type ListItem = {
  id: string;
  list_id: string;
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  position: number | null;
  elo: number;
  notes: string | null;
  source: "manual" | "letterboxd" | "suggestion";
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type Battle = {
  id: string;
  list_id: string;
  user_id: string;
  winner_item_id: string | null;
  loser_item_id: string | null;
  is_draw: boolean;
  elo_winner_before: number | null;
  elo_winner_after: number | null;
  elo_loser_before: number | null;
  elo_loser_after: number | null;
  created_at: string;
};

export type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview?: string;
  vote_average?: number;
};

export type SuggestedMovie = TmdbMovie & {
  score: number;
  because: string[];
};

export type LetterboxdRow = {
  name: string;
  year: number | null;
  rating: number | null;
};
