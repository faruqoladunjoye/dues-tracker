export interface Due {
  id: number;
  player_id: number;
  month: number;
  year: number;
  paid: boolean;
  paid_at: string | null;
}

export interface Player {
  id: number;
  name: string;
  nickname: string | null;
  date_of_birth: string | null;
  phone_number: string | null;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
  created_at: string;
  dues: Due[];
}

export interface PlayersResponse {
  players: Player[];
  activeYear: number;
  total: number;
  page: number;
  totalPages: number;
}
