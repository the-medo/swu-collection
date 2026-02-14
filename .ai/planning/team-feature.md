# Teams!

Plan for the new Swubase feature: Teams.

### 1. Database Schema (Drizzle / PostgreSQL) - DONE

We need to store teams, their members (with roles), and join requests.

#### `team` table
- `id`: `uuid`, primary key
- `name`: `varchar`, not null
- `shortcut`: `varchar`, unique, indexed (for nice URLs)
- `description`: `text`
- `logoUrl`: `text` (S3 URL)
- `privacy`: `enum('public', 'private')`, default 'private'
- `createdAt`: `timestamp`, default now()
- `updatedAt`: `timestamp`, default now()

#### `team_member` table
- `teamId`: `uuid`, references `team.id`
- `userId`: `text`, references `user.id`
- `role`: `enum('owner', 'member')`, default 'member'
- `joinedAt`: `timestamp`, default now()
- Primary key: `(teamId, userId)`

#### `team_deck` table
- `teamId`: `uuid`, references `team.id`
- `deckId`: `uuid`, references `deck.id`
- `addedAt`: `timestamp`, default now()
- Primary key: `(teamId, deckId)`

#### `team_join_request` table
- `id`: `uuid`, primary key
- `teamId`: `uuid`, references `team.id`
- `userId`: `text`, references `user.id`
- `status`: `enum('pending', 'approved', 'rejected')`, default 'pending'
- `createdAt`: `timestamp`, default now()
- `updatedAt`: `timestamp`, default now()

---

### 2. User Rights & Permissions

- **Owner**:
    - Manage team details (name, shortcut, description, logo).
    - Manage members (promote to owner, remove members).
    - Approve/Reject join requests.
    - Delete team.
    - Add/Edit/Delete team decks (via `team_deck`).
- **Member**:
    - View team decks.
    - Add/Delete decks to/from team.
    - Abandon team.
    - Share join link.

---

### 3. Business Rules & Constraints

- **Discoverability**: Teams are NOT discoverable for now. Only way to find/join is through a direct link.
- **Team Limit**: One user can be a member of max. 2 teams.
- **Privacy**: Only 'private' is set for now.

---

### 4. API Endpoints - DONE

- [x] `GET /api/user-setup`: Returns user settings, integrations, and teams in one go.
- [x] `POST /api/teams`: Create a new team.
    - Input: `name`, `shortcut`, `description` (optional).
    - Logic: Check team limit (max 2), creator becomes `owner`.
- [x] `GET /api/teams/:idOrShortcut`: Get team details.
    - Logic: Allow fetching by either UUID or unique shortcut.
- [x] `PATCH /api/teams/:id`: Update team details.
    - Permissions: `Owner` only.
    - Fields: `name`, `shortcut`, `description`, `privacy`.
- [x] `POST /api/teams/:id/logo`: Upload logo to S3 and update team.
    - Permissions: `Owner` only.
    - Storage: S3 bucket `swubase-teams`.
- [x] `GET /api/teams/:id/members`: List team members and their roles.
- [x] `POST /api/teams/:id/join-request`: Submit a request to join.
    - Logic: Check if user is already a member or has a pending request.
- [x] `GET /api/teams/:id/join-requests`: List pending requests.
    - Permissions: `Owner` only.
- [x] `PATCH /api/teams/:id/join-requests/:requestId`: Approve/Reject request.
    - Permissions: `Owner` only.
    - Action: If approved, create `team_member` entry.
- [x] `GET /api/teams/my`: List teams the current user is a member of.
- [x] `POST /api/teams/:id/decks`: Add a deck to the team.
    - Permissions: `Owner` or `Member`.
- [x] `DELETE /api/teams/:id/decks/:deckId`: Remove a deck from the team.
    - Permissions: `Owner` or `Member`.

---

### 5. Frontend Implementation

#### API Hooks (TanStack Query)
Located in `frontend/src/api/teams/`.

- [x] `useUserSetup`: Fetch combined user data (settings, integrations, teams).
- [x] `useTeams`: Fetch current user's teams.
- [x] `useTeam(idOrShortcut)`: Fetch specific team details.
- [x] `useCreateTeam`: Mutation to create a team.
- [x] `useUpdateTeam`: Mutation for team settings.
- [x] `useUploadTeamLogo`: Mutation for logo upload.
- [x] `useTeamMembers(teamId)`: Fetch members list.
- [x] `useSubmitJoinRequest`: Mutation to ask to join.
- [x] `useJoinRequests(teamId)`: Fetch pending requests for owners.
- [x] `useHandleJoinRequest`: Mutation to approve/reject.
- [x] `useAddTeamDeck`: Mutation to link a deck to a team.
- [x] `useRemoveTeamDeck`: Mutation to unlink a deck.

#### Left Menu Updates (`LeftSidebar.tsx`)
- Add a new "Teams" group.
- **"Create Team"** button (opens a dialog).
- List of teams user is part of.
- "Only direct links to teams are possible" message as requested.

#### Team Detail Page
- When a user is in a Team Detail view:
    - Replace the **Swubase Logo** at the top of the sidebar with the **Team Logo**.
    - Display a **small Swubase Logo** at the bottom right corner of the sidebar.
- **Access Control & Views**:
    - **Member View**: Tabs for Decks, Members, Settings (Owner only), Join Requests (Owner only).
    - **Non-Member View**:
        - Display team logo and name.
        - **Description**: Show the team's description to the user.
        - **Join Button**: Large "Request to Join" button.
        - Message: "You are not a member of this team. Join to see their decks and participate."

#### Team Logo Upload
- Implement S3 upload logic in the backend.
- Simple file input in Team Settings for owners.

---

### 6. Task Checklist

- [x] Create DB migration for `team`, `team_member`, `team_deck`, `team_join_request`.
- [x] Implement `GET /api/user-setup` endpoint.
- [x] Implement backend routes and controllers for teams.
- [x] Add S3 bucket/folder for team logos.
- [x] Create frontend API hooks for teams (checklist in Step 5).
- [x] Create `TeamPage` in frontend.
- [x] Create `TeamsPage` (teams overview page at `/teams` route).
- [x] Update `LeftSidebar.tsx` with new "Teams" section.
- [ ] Implement logo replacement logic based on route context.
- [ ] Implement join request flow.