import type { NextFunction, Request, Response } from "express";

import { employeeService } from "../services/employeeService";
import { idParamSchema } from "../validators/commonValidators";
import {
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
} from "../validators/adminEmployeeValidators";

export const adminEmployeeController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listEmployeesQuerySchema.parse(req.query);
      const employees = await employeeService.listAll(filters);
      res.json({ success: true, data: { employees } });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const employee = await employeeService.getById(id);
      res.json({ success: true, data: { employee } });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createEmployeeSchema.parse(req.body);
      const employee = await employeeService.createEmployee(input);
      res.status(201).json({ success: true, data: { employee } });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const input = updateEmployeeSchema.parse(req.body);
      const employee = await employeeService.updateEmployee(id, input);
      res.json({ success: true, data: { employee } });
    } catch (err) {
      next(err);
    }
  },
};
