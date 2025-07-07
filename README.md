**Project Title:** TimeBlock

**Description:**
TimeBlockr is a lightweight, time-aware to-do web application designed around the principle of **intentional time-blocking**. Unlike traditional to-do lists that only track task completion, TimeBlockr prompts users to estimate how long each task should take, helps them focus with real-time timers, and then compares actual time spent vs their original expectations.

The app also introduces structured **break planning**, historical **time analytics**, and personalized **productivity tracking** — inspired by systems like iOS Screen Time or workplace timesheets. This encourages users not only to complete tasks, but to improve their **self-awareness, efficiency, and planning accuracy** over time.

---

# 📄 Product Requirements Document (PRD)

---

## 1. 🎯 Summary & Objectives

The objective of TimeBlockr is to blend **task management** with **temporal intention** — helping users develop a better relationship with how they allocate and actually spend time.

Key objectives:

* Let users plan their day based on **how long** tasks will take, not just task quantity.
* Track real-time execution of tasks using **start/stop/pause timers**.
* Offer a non-intrusive break system to prevent burnout and promote recovery.
* Show meaningful **insights** into planned vs actual time, time across categories, and historical trends.
* Serve as a **daily anchor** to build productive routines — while staying simple and flexible.

---

## 2. 👥 Users & Accounts

* Users can **register and log in** using Supabase Auth (email/password).
* Each user has their own private workspace — tasks, timers, preferences, and productivity data are isolated.
* Authentication tokens are stored client-side using JWTs.
* The app architecture allows easy future expansion into team-based collaboration and task sharing.

---

## 3. 📋 Core Features (MVP)

### 🗂 Task Management

Users can create tasks with the following attributes:

| Field                 | Description                                             |
| --------------------- | ------------------------------------------------------- |
| **Title**             | Required short text (e.g., "Review lecture slides")     |
| **Description**       | Optional notes, visible on click/expand                 |
| **Expected Duration** | Input via slider or picker for hours and minutes        |
| **Priority**          | low / medium / high (used for sorting/filtering)        |
| **Category**          | Optional, for grouping (e.g., "Uni", "Work", "Fitness") |
| **Difficulty**        | Integer from 0 to 10 (subjective self-estimation)       |
| **Deadline**          | Optional — non-enforced, used for filtering only        |
| **Recurring**         | Optional — repeat task every X days/weeks               |

Tasks are **editable at any time** (before, during, or after), and can be deleted. Incomplete tasks automatically **roll over** to the next day’s list.

---

### ⏱ Time Tracking

Time tracking is at the heart of TimeBlockr. Users can interact with timers as follows:

* Press **“Start”** on any task to begin tracking its execution.
* A visual timer begins counting down from the **expected duration**.
* When the timer ends:

  * User is prompted: “Finished?” → they can mark it done or go into **overtime**.
  * If not finished, timer turns into a **stopwatch** to continue tracking extended effort.
* User can **pause/resume** the timer, and optionally **skip or edit** final recorded time.
* The app stores actual time spent (planned + overtime) per task.
* Only **one task can be actively tracked at a time.** Starting a new task pauses the current one.

---

### 🌿 Break Planning

TimeBlockr encourages healthy focus-rest cycles:

* Users can define their preferred **break frequency and duration** (e.g., 5-minute break every 30 minutes).
* App will **suggest breaks** between tasks or after a time threshold is crossed.
* Users can:

  * Accept a break (start break timer)
  * Skip the break
  * Start an unplanned break manually
* Breaks are tracked and counted in analytics (but separated from productive time)

---

### 📊 Stats & Insights

TimeBlockr offers a **dedicated stats dashboard**:

* Daily time breakdown:

  * **Planned time** vs **Actual time**
  * Time in breaks
* Weekly and monthly summaries:

  * Total time spent
  * Average daily effort
  * Time by category (e.g., “Work: 4h, Uni: 2h”)
* Focus accuracy: how close planned vs actual durations are
* Charts: bar graphs, pie charts, streaks, calendar heatmaps (TBD)
* Editable logs: users can correct timers (e.g., forgot to stop)

---

## 4. 🧠 User Stories

* As a user, I can create a task with a time estimate and category
* As a user, I can start a timer and track my time while working
* As a user, I can pause/resume or stop the task at any time
* As a user, I get prompted when I exceed the estimated duration
* As a user, I can manually mark a task as done without a timer
* As a user, I can define break preferences and be reminded to rest
* As a user, I can review stats about my productivity and time usage
* As a user, I can access my data from any device via login

---

## 5. 🎨 UX Expectations

### 📄 Pages / Views

1. **Task List View (Home)**

   * Vertical scrollable list of tasks
   * Each task shows:

     * Title
     * Expected duration
     * Start/Pause/Done buttons
     * Timer bar/indicator
   * Filters:

     * “Show tasks under 30 minutes”
     * “Show high priority”
     * “Show by category”
   * Sort options:

     * Duration (short–long / long–short)
     * Priority
     * Difficulty

2. **Stats Dashboard**

   * Graphs and tables
   * Tabs or filters for “Today”, “This Week”, “By Category”
   * Comparison between planned and actual time
   * Totals with/without breaks

3. **Settings**

   * Break preferences (every X minutes → break Y minutes)
   * Light/dark mode toggle
   * Timer sound settings (gentle alert, silent)

---

## 6. 🛠 Technical Overview

| Layer     | Tech                                           |
| --------- | ---------------------------------------------- |
| Frontend  | Next.js (App Router) + React                   |
| Styling   | Tailwind CSS + Shadcn UI + Radix UI            |
| Auth      | Supabase Auth (email/password)                 |
| AuthZ     | JWT (custom validation, stored client-side)    |
| Database  | Supabase Postgres                              |
| API Layer | Next.js API routes or Supabase client-side SDK |
| Hosting   | Vercel or similar                              |

### Supabase Tables (Proposed)

#### `tasks`

| Column              | Type                   |
| ------------------- | ---------------------- |
| id                  | uuid (PK)              |
| user\_id            | uuid (FK)              |
| title               | text                   |
| description         | text                   |
| duration\_estimated | int (in minutes)       |
| priority            | enum (low/medium/high) |
| category            | text                   |
| difficulty          | int (0–10)             |
| is\_recurring       | boolean                |
| deadline            | date                   |
| created\_at         | timestamp              |

#### `time_logs`

| Column             | Type             |
| ------------------ | ---------------- |
| id                 | uuid             |
| task\_id           | uuid (FK)        |
| user\_id           | uuid (FK)        |
| started\_at        | timestamp        |
| ended\_at          | timestamp        |
| duration\_actual   | int (in minutes) |
| overtime\_duration | int (optional)   |

#### `break_settings`

| Column                | Type          |
| --------------------- | ------------- |
| user\_id              | uuid (PK, FK) |
| break\_every\_mins    | int           |
| break\_duration\_mins | int           |

---

## 7. 🔮 Stretch Goals (Future Scope)

* **Pomodoro Mode:** Timer can run in 25/5 minute cycles
* **Team Collaboration:** View others’ active tasks, assign subtasks
* **Voice Input:** “Add task: reply to email for 15 minutes”
* **Time Budgeting:** Allocate a time limit to each day and track how much is left
* **Streaks & Gamification:** “3-day streak of completing tasks on time!”

---