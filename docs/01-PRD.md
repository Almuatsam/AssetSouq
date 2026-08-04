# Product Requirements Document (PRD)

## Product Name
IT Asset Disposal & Employee Raffle System

## Goal
Build a secure web application that manages the company's IT asset disposal
process by allowing eligible employees to register interest in available
devices, automatically validating eligibility, conducting a fair random
draw to select a buyer, collecting payment at a fixed price, and enabling
administrators to manage devices, registrations, winners, payments, and
reports.

This is a **sale**, not a giveaway: winners pay a fixed price per device
before handover.

## Objectives
- Reduce manual work
- Provide transparent raffle selection
- Ensure company policy compliance
- Generate reports
- Support Arabic and English
- Provide a responsive UI

## User Roles
- Employee
- Administrator

## Employee Features
- Login using Staff ID
- View available devices (including listed price)
- Read device information
- Submit registration of interest in a device
- View registration status
- Read Terms & Conditions
- Pay the fixed price if selected as winner
- Switch between Arabic and English

## Admin Features
- Dashboard
- Manage Devices
- Manage Employees
- Manage Registrations
- Set price per device
- Run Draw
- Redraw Winner
- Track payment status
- Manage Winners
- Export Excel Reports
- Import Employee List
- System Settings
- Language Management

## Business Rules
1. Only Active Employees
2. One Registration Per Employee
3. Laptop Holders Cannot Participate
4. Previous Winners Wait 24 Months
5. One Device Per Employee
6. No Warranty
7. No Technical Support
8. Admin Can Remove Device Before Draw
9. Factory Reset Required
10. Management Approval Required
11. Price is fixed per device, set by admin at listing time
12. Winner must pay before handover; non-payment triggers a redraw

Note: all eligibility rules must be evaluated together against a single
employee, not checked independently. See CLAUDE.md.

## Functional Requirements
- Authentication
- Eligibility Validation
- Device Management
- Registration Management
- Draw Engine (supports multi-unit devices, one draw selects all winners
  for that device at once)
- Payment Tracking (per-winner, before handover)
- Excel Export
- Excel Import
- Audit Logs
- Multi-language Support
- Responsive Design

## Non-functional Requirements
- Responsive
- Secure
- Fast
- Mobile Friendly
- WCAG Accessibility
- Arabic RTL
- English LTR
