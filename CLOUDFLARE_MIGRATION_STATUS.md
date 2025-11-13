# 🚀 Cloudflare Pages Migration Status

**Project:** Emaús Vota Election System  
**From:** Node.js + Express + better-sqlite3 (Replit)  
**To:** Cloudflare Pages + Functions + D1 + R2  
**Last Updated:** 2025-01-13

---

## ✅ Completed Infrastructure

### 1. Configuration Files
- ✅ `wrangler.toml` - Complete with D1/R2 bindings, cron triggers
  - ✅ **SECURITY FIX**: Removed hardcoded JWT_SECRET
  - ✅ All secrets documented for `wrangler secret put`
- ✅ `tsconfig.json` - Includes @cloudflare/workers-types
- ✅ `migrations/d1-schema.sql` - Full database schema (snake_case columns)

### 2. Utility Libraries
- ✅ `functions/lib/types.ts` - EventContext and environment types
- ✅ `functions/lib/auth.ts` - **FIXED**: Uses @tsndr/cloudflare-worker-jwt (Workers-compatible)
  - ✅ Replaced `jsonwebtoken` with `@tsndr/cloudflare-worker-jwt`
  - ✅ All functions now async (generateToken, authenticateToken, requireAuth)
  - ✅ WebCrypto compatible JWT signing and verification
- ✅ `functions/lib/utils.ts` - **COMPLETE**: Properly typed normalization
  - ✅ Defensive toBoolean() handles D1 string/number variants
  - ✅ normalizeUser() with TypeScript overloads
  - ✅ normalizeUsers() with strict typing (no `as any`)
  - ✅ Full User schema coverage from @shared/schema

### 3. Example Functions (Conversion Templates)
- ✅ `functions/api/auth/login.ts` - Async JWT, normalized responses
- ✅ `functions/api/auth/request-code.ts` - Normalized user data, camelCase API
  - ⚠️ **TODO**: Implement Resend email integration (currently stubbed)

### 4. Documentation
- ✅ `CLOUDFLARE_DEPLOY.md` - Comprehensive deployment guide
  - ✅ D1 setup and data seeding instructions
  - ✅ R2 configuration
  - ✅ Secret management (secure patterns)
  - ✅ Scheduled jobs migration (Cron Triggers)
  - ✅ Conversion patterns for Express → Functions
  - ✅ Troubleshooting section

### 5. Dependencies
- ✅ @cloudflare/workers-types - TypeScript support
- ✅ @tsndr/cloudflare-worker-jwt - WebCrypto-compatible JWT (replaces jsonwebtoken)

---

## 📊 Migration Progress

### Routes Migrated: 2 / 45+ (4%)

**Auth Routes (2/6)**
- ✅ POST /api/auth/login
- ✅ POST /api/auth/request-code
- ⏳ POST /api/auth/verify-code
- ⏳ POST /api/auth/set-password
- ⏳ GET /api/auth/validate-token
- ⏳ POST /api/auth/logout

**Admin Routes (0/8)**
- ⏳ POST /api/admin/members (create member)
- ⏳ GET /api/members (list all members)
- ⏳ GET /api/members/:id
- ⏳ PATCH /api/members/:id
- ⏳ DELETE /api/members/:id
- ⏳ POST /api/admin/upload-photo
- ⏳ POST /api/admin/import-members
- ⏳ POST /api/admin/seed-positions

**Election Routes (0/15+)**
- ⏳ All election CRUD operations
- ⏳ Election attendance tracking
- ⏳ Election positions management
- ⏳ Election status management

**Candidate Routes (0/6)**
- ⏳ All candidate CRUD operations
- ⏳ Candidate photo management

**Voting Routes (0/8)**
- ⏳ Cast vote
- ⏳ View results
- ⏳ Scrutiny management
- ⏳ Tie-breaking logic

**Audit & PDF Routes (0/4)**
- ⏳ PDF generation (needs R2 integration)
- ⏳ Audit log retrieval

---

## 🔧 Technical Decisions

### JWT Library
- **Decision:** Use `@tsndr/cloudflare-worker-jwt` instead of `jsonwebtoken`
- **Reason:** Workers-compatible, WebCrypto API, zero dependencies, 44K+ weekly downloads
- **Impact:** All auth functions now async (`await generateToken()`, `await requireAuth()`)

### Data Normalization
- **Pattern:** D1 stores data in snake_case, API returns camelCase
- **Solution:** `normalizeUser()` and `normalizeUsers()` helpers
- **Type Safety:** TypeScript overloads for password inclusion

### Boolean Storage
- **D1 Format:** Integer (0/1) or string ("0"/"1") depending on driver
- **Solution:** Defensive `toBoolean()` using `Number()` conversion
- **API Format:** JavaScript boolean (true/false)

---

## ⚠️ Known Issues & TODOs

### Critical (Blocks Production Deploy)
1. **Email Integration**: Resend adapter not implemented
   - File: `functions/api/auth/request-code.ts`
   - Status: Stubbed with TODO comments
   - Required for: Password reset, verification codes

### High Priority
2. **Remaining Routes**: 43+ Express routes to convert
3. **Scheduled Jobs**: Birthday email cron not implemented
   - Needs: Separate Worker with cron trigger
   - Schedule: Daily at 7 AM Brasília time

### Medium Priority
4. **R2 Photo Uploads**: Pattern demonstrated but not implemented
5. **Data Seeding**: Admin user creation script needed
6. **Testing**: End-to-end tests with D1 bindings

### Low Priority
7. **Error Handling**: Standardize error responses across all Functions
8. **Logging**: Structured logging strategy for production

---

## 🎯 Next Steps

### Phase 1: Complete Auth Routes
1. Convert verify-code.ts
2. Convert set-password.ts
3. Implement Resend email service
4. Test complete auth flow with D1

### Phase 2: Admin & Member Routes
1. Convert member CRUD operations
2. Implement R2 photo uploads
3. Test admin dashboard functionality

### Phase 3: Election System
1. Convert election CRUD
2. Convert candidate management
3. Convert voting logic
4. Test scrutiny and tie-breaking

### Phase 4: Advanced Features
1. PDF generation with R2 storage
2. Audit log system
3. Birthday email scheduler (Worker)
4. Production deployment

---

## 📚 Key Files Reference

### Migration Infrastructure
- `wrangler.toml` - Cloudflare configuration
- `migrations/d1-schema.sql` - Database schema
- `CLOUDFLARE_DEPLOY.md` - Deployment guide

### Utility Libraries
- `functions/lib/types.ts` - Type definitions
- `functions/lib/auth.ts` - JWT & authentication
- `functions/lib/utils.ts` - Data normalization

### Example Functions
- `functions/api/auth/login.ts` - Login endpoint
- `functions/api/auth/request-code.ts` - Verification codes

---

## 🔐 Security Checklist

- ✅ JWT_SECRET removed from wrangler.toml
- ✅ All secrets use `wrangler secret put`
- ✅ Password hashing with bcrypt
- ✅ JWT expiry (2 hours)
- ✅ Admin/member authorization checks
- ✅ Type-safe password handling (NormalizedUserWithPassword)
- ⏳ Rate limiting (not yet implemented)
- ⏳ CORS configuration (partial)

---

## 📝 Notes for Future Developers

1. **Always use normalizeUser()** when returning user data from D1
2. **All auth functions are async** - remember to `await`
3. **Never commit secrets** - use `wrangler secret put`
4. **Test with D1 locally** - use `wrangler pages dev`
5. **Boolean fields** - D1 returns 0/1, API expects true/false
6. **JWT payload** - includes `sub`, `id`, `email`, `isAdmin`, `isMember`, `exp`

---

**Ready for:** Continuing with remaining route conversions  
**Blocked on:** Resend email integration for production deployment
