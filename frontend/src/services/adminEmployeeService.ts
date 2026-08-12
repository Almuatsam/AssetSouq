import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type {
  CreateEmployeeInput,
  Employee,
  EmployeeImportSummary,
  EmployeeListFilters,
  UpdateEmployeeInput,
} from "@/types/employee";

export const adminEmployeeService = {
  async listAll(filters?: EmployeeListFilters): Promise<Employee[]> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ employees: Employee[] }>>("/admin/employees", {
        params: filters,
      });
      return res.data.data!.employees;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async getById(id: number): Promise<Employee> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ employee: Employee }>>(`/admin/employees/${id}`);
      return res.data.data!.employee;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async create(data: CreateEmployeeInput): Promise<Employee> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ employee: Employee }>>("/admin/employees", data);
      return res.data.data!.employee;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async update(id: number, data: UpdateEmployeeInput): Promise<Employee> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ employee: Employee }>>(
        `/admin/employees/${id}`,
        data,
      );
      return res.data.data!.employee;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async importFile(file: File): Promise<EmployeeImportSummary> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post<ApiEnvelope<{ summary: EmployeeImportSummary }>>(
        "/admin/employees/import",
        formData,
      );
      return res.data.data!.summary;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
