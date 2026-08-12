import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminEmployeeService } from "@/services/adminEmployeeService";
import type { CreateEmployeeInput, EmployeeListFilters, UpdateEmployeeInput } from "@/types/employee";

const ADMIN_EMPLOYEES_QUERY_KEY = ["admin", "employees"] as const;

export function useAdminEmployees(filters?: EmployeeListFilters) {
  return useQuery({
    queryKey: [...ADMIN_EMPLOYEES_QUERY_KEY, filters ?? {}],
    queryFn: () => adminEmployeeService.listAll(filters),
  });
}

export function useAdminEmployee(id: number) {
  return useQuery({
    queryKey: [...ADMIN_EMPLOYEES_QUERY_KEY, id],
    queryFn: () => adminEmployeeService.getById(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => adminEmployeeService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_EMPLOYEES_QUERY_KEY }),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEmployeeInput }) =>
      adminEmployeeService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_EMPLOYEES_QUERY_KEY }),
  });
}

export function useImportEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminEmployeeService.importFile(file),
    // Invalidated even though some/all rows may have errored — a partial
    // import (see EmployeeImportSummary's created/updated counts) still
    // changed real data, so the list must not go stale just because the
    // file wasn't 100% clean.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_EMPLOYEES_QUERY_KEY }),
  });
}
