# Emaús Vota - Election Management System

## Overview
Emaús Vota is a full-stack web application designed to manage elections for the UMP Emaús church youth group. It provides email-based authentication, role-based access, election creation, secure voting, and real-time results. The system promotes transparency and accessibility through features like shareable results images and PDF audit reports, aiming to streamline the electoral process and build trust among participants. The project envisions expanding into a comprehensive "Portal UMP Emaús" by integrating additional functionalities like devotionals, prayer requests, event management, and a dedicated member area, with the voting system remaining a core module.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system features a responsive, mobile-first UI with Portuguese localization and UMP Emaús branding (primary orange color #FFA500). It utilizes Material Design principles. Real-time results include automatic polling and smart sorting. Admins can export election result images and generate comprehensive PDF audit reports. Member photo uploads feature a circular crop tool.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, Wouter for routing, and TanStack Query for server state. UI components are derived from shadcn/ui on Radix UI primitives, styled with Tailwind CSS. State management uses React Context API for authentication and local storage for tokens, with forms handled by React Hook Form and Zod validation.

The backend uses Express.js with Node.js and TypeScript, exposing RESTful API endpoints. Authentication is email-based with 6-digit verification codes and JWT. User roles (`isAdmin`/`isMember`) manage access. The API is organized by domains. The system uses Drizzle ORM configured for PostgreSQL, with Better-SQLite3 for development. The database schema enforces election rules (e.g., one active election, one vote per user per position) and a three-round scrutiny system. The architecture supports robust election creation with a transactional-like rollback pattern to prevent data corruption. The application has been migrated to Cloudflare Pages, D1 database, and R2 storage, utilizing 41 Cloudflare Functions endpoints.

### Feature Specifications
Key features include:
- Email/password authentication with JWT and 2-hour session auto-logout.
- Role-based access control (admin/member).
- Comprehensive election management (create, close, archive, per-position control).
- Candidate registration and secure, duplicate-prevented voting.
- Real-time results with vote counts and percentages, including automatic majority-based position closing and tie-resolution.
- Admin panel for member registration, editing, attendance, and active status management.
- Generation of shareable election results images and detailed PDF audit reports (attendance, vote timeline, results).
- Automated birthday email system.
- Circular image crop tool for member photos.
- Full mobile optimization.
- Tracking of active/inactive members for election participation management.

### System Design Choices
The project is structured around modularity and scalability, designed to expand into a complete portal. Future planned modules include:
- **Devotionals:** CRUD operations for spiritual content, managed by a dedicated secretariat.
- **Prayer Requests:** Public submission and member-viewable details with status updates.
- **Events/Schedules:** CRUD for upcoming events with a visual calendar.
- **Current Board:** Public display of board members with synchronized data.
- **Instagram Integration:** Automatic syncing and display of posts via Instagram Graph API.
- **Expanded Permissions System:** Granular access control for visitors, common members, secretariat members, and administrators.
- **New Database Tables:** `secretarias`, `devotionals`, `prayer_requests`, `events`, `instagram_posts` to support new functionalities.

## External Dependencies

### Email Service
- **Resend**: For transactional emails and verification codes.

### UI Component Libraries
- **@radix-ui/**: Accessible UI primitives.
- **lucide-react**: Icon library.
- **react-easy-crop**: Interactive image cropping.

### Database
- **better-sqlite3**: For local SQLite development.
- **Cloudflare D1**: For production (serverless SQL database).
- **Cloudflare R2**: For file storage (member photos, audit reports).

### Development Tools
- **Drizzle Kit**: Database migration and schema management.
- **tsx**: TypeScript execution.
- **node-cron**: Automated task scheduling.

### Validation
- **Zod**: Runtime schema validation.
- **drizzle-zod**: Zod schema generation from Drizzle tables.