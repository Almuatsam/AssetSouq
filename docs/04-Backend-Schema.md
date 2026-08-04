# Backend Schema

## Employee
- id
- staffNumber
- name
- department
- email
- active
- laptopHolder
- lastWinnerDate
- eligible
- createdAt
- updatedAt

## Device
- id
- assetTag
- deviceType
- brand
- model
- cpu
- ram
- storage
- purchaseYear
- yearsUsed
- price
- status
- quantity
- createdAt

## Registration
- id
- employeeId
- deviceId
- agreed
- submittedAt
- status

## Winner
- id
- employeeId
- deviceId
- drawDate
- accepted
- priceDue (copied from device.price at draw time, so later price edits
  don't change what an existing winner owes)
- paymentStatus (enum: PENDING | PAID | NON_PAYMENT)
- paymentDate (nullable)
- paymentMethod (nullable — e.g. payroll deduction, cash, card; confirm
  supported methods before implementing)
- handoverDate
- redrawOf (nullable, self-referencing — links a redrawn winner record
  back to the winner slot it replaced)
- redrawReason (enum: DECLINED | NON_PAYMENT | NO_SHOW | ADMIN_OVERRIDE, nullable)

## Draw
- id
- deviceId
- rngSeed
- candidatePoolSnapshot (JSON — employeeIds considered eligible at draw time)
- drawnAt
- drawnByAdminId

> Added `Draw` as its own table (not in the original list) so multi-winner
> draws and their audit trail have somewhere to live beyond the
> per-winner rows. Confirm before implementing if you'd rather fold this
> into AuditLog only.

## Admin
- id
- username
- passwordHash
- lastLogin

## AuditLog
- id
- adminId
- action
- entity
- entityId
- timestamp
