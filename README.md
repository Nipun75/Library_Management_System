# Library Management System

A web-based Library Management System for managing books, members, borrowing/return transactions, fines, and reports.

## Project Goal

Replace manual library record-keeping with a simple, reliable, role-based digital system.

## Planned Users

- **Admin/Librarian** — manage books, members, issues, returns, fines, and reports.
- **Member/Student** — search books, view availability, view issued books, due dates, and fines.

## Functional Requirements

1. **Authentication**
   - User login/logout.
   - Role-based access for librarian/admin and members.

2. **Book Management**
   - Add, view, update, and remove books.
   - Track ISBN, title, author, publisher, category, quantity, and availability.

3. **Member Management**
   - Register, view, update, and deactivate members.
   - Maintain a unique member ID.

4. **Book Search**
   - Search by title, author, ISBN, category, or book ID.
   - Show current availability.

5. **Issue Management**
   - Issue an available book to a registered member.
   - Record issue date and due date.
   - Update available quantity.

6. **Return Management**
   - Record returned books.
   - Update availability and transaction status.
   - Calculate overdue fines.

7. **Renewal**
   - Allow eligible issued books to be renewed.
   - Update the due date.

8. **Fine Management**
   - Calculate and display overdue fines.
   - Track fine/payment status.

9. **Reports**
   - Available books.
   - Issued/returned books.
   - Overdue books.
   - Members.
   - Fines.
   - Transaction history.

## Non-Functional Requirements

- **Performance:** Normal searches and transactions should respond quickly.
- **Security:** Only authenticated users can access protected operations; permissions are role-based.
- **Usability:** Interfaces should be simple and easy for librarians and members to navigate.
- **Reliability:** Book, member, and transaction records must remain accurate and consistent.
- **Availability:** The application and database should be available during library operation.
- **Maintainability:** Code should be modular, documented, and easy to modify.
- **Scalability:** The system should support growth in books, members, and transactions.
- **Compatibility:** The web application should work with modern browsers such as Chrome and Edge.
- **Data Integrity:** Book/member IDs should be unique and transaction records should not be duplicated or corrupted.
- **Backup & Recovery:** Library data should be backed up and recoverable after failures.

## Development Plan

### Phase 1 — Foundation
- [x] Define project scope and requirements.
- [ ] Decide and document the final technology stack.
- [ ] Establish application structure.
- [ ] Configure database connection and environment variables.
- [ ] Add development setup instructions.

### Phase 2 — Authentication & Roles
- [ ] Implement login/logout.
- [ ] Implement secure password handling.
- [ ] Implement role-based authorization.
- [ ] Add admin/librarian and member dashboards.

### Phase 3 — Core Library Data
- [ ] Design database schema.
- [ ] Implement book CRUD.
- [ ] Implement member CRUD.
- [ ] Implement book search and availability.

### Phase 4 — Library Transactions
- [ ] Implement book issue.
- [ ] Implement book return.
- [ ] Implement renewal.
- [ ] Implement due-date tracking.
- [ ] Implement fine calculation.

### Phase 5 — Reports & UX
- [ ] Add transaction and overdue reports.
- [ ] Add fine reports.
- [ ] Improve responsive UI and validation.
- [ ] Add useful error and empty states.

### Phase 6 — Quality & Delivery
- [ ] Add unit/integration tests where appropriate.
- [ ] Test authentication and authorization.
- [ ] Test issue/return/fine edge cases.
- [ ] Add seed/demo data.
- [ ] Document installation, configuration, and usage.
- [ ] Review security and data validation.

## Proposed Architecture

The implementation will be kept modular so the UI, application logic, and database concerns can evolve independently.

```
Frontend / UI
     |
     v
Application / API
     |
     v
Database
```

The exact framework and database configuration will be confirmed after inspecting the intended implementation constraints.

## Git Workflow

Work should be committed in small, meaningful increments. Suggested commit sequence:

1. `docs: define project scope and requirements`
2. `chore: establish application structure`
3. `feat: add database schema and seed data`
4. `feat: implement authentication and roles`
5. `feat: implement book management`
6. `feat: implement member management`
7. `feat: implement issue and return workflow`
8. `feat: add renewal and fine management`
9. `feat: add reports and dashboard`
10. `test: add core workflow tests`
11. `docs: add setup and usage guide`

## Current Status

**Phase 1 — Foundation**

The repository has been initialized with this project plan. Implementation will proceed incrementally, with each major feature delivered as a separate commit.
