import { auditLogRepository } from "../src/repositories/auditLogRepository";
import { auditLogService } from "../src/services/auditLogService";

jest.mock("../src/repositories/auditLogRepository");

const mockedAuditLogRepo = auditLogRepository as jest.Mocked<typeof auditLogRepository>;

describe("auditLogService.listAll", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delegates straight through to the repository with the given filters", async () => {
    // Arrange
    const rows = [
      {
        id: 1,
        adminId: 1,
        action: "REDRAW_WINNER",
        entity: "Winner",
        entityId: 5,
        timestamp: new Date(),
        admin: { id: 1, username: "admin1" },
      },
    ];
    mockedAuditLogRepo.findAll.mockResolvedValue(rows as never);

    // Act
    const result = await auditLogService.listAll({ entity: "Winner" });

    // Assert
    expect(result).toEqual(rows);
    expect(mockedAuditLogRepo.findAll).toHaveBeenCalledWith({ entity: "Winner" });
  });
});
