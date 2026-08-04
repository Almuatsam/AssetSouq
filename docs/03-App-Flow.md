# App Flow

## Employee Flow
1. Landing Page
2. Language Selection
3. Login (Staff ID)
4. Eligibility Check
5. Available Devices (with listed price)
6. Device Details
7. Terms & Conditions (device is sold as-is; winner pays listed price)
8. Submit Registration (registering interest — not a purchase yet)
9. Success
10. View Status
11. If selected as winner: Pay listed price
12. Collect device (after payment + factory reset + management approval)

## Admin Flow
1. Login
2. Dashboard
3. Manage Devices (including setting price per device)
4. Manage Employees
5. Manage Registrations
6. Run Draw
7. Generate Winners
8. Track Payments
9. Reports
10. Export Excel

## Draw Flow (detail)
1. Admin selects a device and triggers "Run Draw"
2. System pulls the eligible candidate pool for that device (registrations
   that pass all business rules)
3. If `device.quantity > 1`, the system selects all winners for that
   device in a single draw, not one raffle per unit
4. Winners + candidate pool + RNG seed are written to AuditLog
5. Winner is notified and must pay the device's listed price within the
   configured window
6. If a winner declines, doesn't pay in time, doesn't collect, or an admin
   manually overrides a result, admin triggers "Redraw Winner" for that
   specific slot, which re-runs selection against the remaining eligible
   pool (or waiting list) and logs the redraw as a new AuditLog entry
7. Once paid, device moves to handover: factory reset + management
   approval, then release to employee
