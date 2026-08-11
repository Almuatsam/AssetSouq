import type { WinnerAdminRow, WinnerListFilters } from "../repositories/winnerRepository";
import { winnerRepository } from "../repositories/winnerRepository";

export const winnerService = {
  // Admin-only surface (see routes/adminWinnerRoutes.ts).
  listAllForAdmin(filters: WinnerListFilters): Promise<WinnerAdminRow[]> {
    return winnerRepository.findAllForAdmin(filters);
  },
};
