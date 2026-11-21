# LS Distributors – Order Management System
React 18 + TypeScript + Tailwind CSS 4 + shadcn/ui (client) | Express + TypeScript + MongoDB (server)

## Run it (Node 18+ and a MongoDB / Atlas connection string)
1. Copy `server/.env.example` to `server/.env` and fill in MONGO_URI (with /ls_oms before the ?) and a long random JWT_SECRET.
2. From this folder:
   npm install            (installs the small "concurrently" helper)
   npm run setup          (installs server and client packages)
   npm run seed           (creates the admin login, once)
   npm run dev            (starts API on :5000 and web app on :5173)
3. Open http://localhost:5173 and sign in: admin@lsdistributor.in / Admin@12345 (change it).
4. Admin: Products (use Bulk add), Team (add marketing and sales users), then Customers import.

## Folders
server/src  index.ts, models.ts, auth.ts, routes.ts, seed.ts
client/src  main.tsx (routes + mobile/desktop shell), index.css (Tailwind + theme), api.ts,
            components/ui/* (shadcn components, included), components/kit.tsx, pages/*

## Roles
Marketing: creates orders, sees own orders. Sales: confirms, dispatches, delivers. Admin: everything.
