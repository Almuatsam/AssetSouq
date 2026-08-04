# Technical Design Document (TDD)

## Frontend
- React
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- React Router
- React Hook Form
- Zod
- TanStack Query (React Query)
- Axios
- i18next
- Framer Motion

## Backend
- Node.js
- Express
- TypeScript
- JWT
- Prisma ORM
- MySQL
- ExcelJS
- bcrypt
- Multer
- Nodemailer

## Authentication
- JWT
- Role Based Access: Employee, Admin

## Frontend Folder Structure
```
src/
  components/
  pages/
  layouts/
  hooks/
  services/
  store/
  locales/
  types/
  utils/
  styles/
```

## Backend Folder Structure
```
src/
  controllers/
  routes/
  middlewares/
  services/
  repositories/
  models/
  validators/
  utils/
  config/
```

## Recommended Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| State | TanStack Query |
| Routing | React Router |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Database | MySQL |
| Authentication | JWT |
| File Export | ExcelJS |
| Charts | Recharts |
| Internationalization | react-i18next |
| Deployment | Docker + Nginx |
| Version Control | Git + GitHub |

This architecture is scalable enough for future enhancements such as
Microsoft Entra ID (Azure AD) sign-in, HR system integration, barcode or
QR code asset scanning, email notifications, approval workflows, and
multiple administrators, without requiring a major redesign.
