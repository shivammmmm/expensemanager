# MongoDB Conversion Checklist

## Information gathered
- Backend currently uses in-memory arrays in `server/index.js`.
- API routes and JWT auth are already implemented.
- Project includes `mongodb` dependency but server is not using it.

## Plan to implement (approved)
1. Create `server/db.js` that connects to MongoDB Atlas using `MONGO_URI` from environment.
2. Add Mongoose models for:
   - User
   - Expense
   - Collection (received)
   - SentPayment
3. Update `server/index.js` to replace in-memory CRUD with Mongoose CRUD:
   - reads via `find()`
   - writes via `create()`
   - updates via `findByIdAndUpdate()` with auth filtering
   - orderBy support for `orderBy` query parameter.
4. Seed admin user automatically (if not exists) with:
   - email: admin@local.test
   - password: admin123
5. Keep ALL API routes unchanged.
6. Provide install + run commands.

## Progress
- [ ] Create `server/db.js`
- [ ] Create models (can be inside db.js or separate files)
- [ ] Patch `server/index.js`
- [ ] Install dependencies and run
- [ ] Smoke test key endpoints

