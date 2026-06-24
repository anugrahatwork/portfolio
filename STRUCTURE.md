# Project Structure & Architecture

## Overview
This project is a **Personal Identity Platform**, a "Personal Operating System" designed to showcase a multifaceted professional identity through "Personas", "Projects", and "Reflective Activities". Unlike traditional portfolios, it focuses on the evolution of identity and current focus.

## Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management:** React `useState` for local UI state (filtering).
- **Icons/UI:** Custom components with Lucide-like patterns (implied by usage in components).

## Directory Structure

### `/app`
Contains the Next.js application logic.
- `page.tsx`: The main entry point. It handles the core layout and the "Persona" filtering logic.
- `layout.tsx`: Root layout defining the HTML structure and global styles.
- `globals.css`: Tailwind CSS imports and global styles.
- `components/`: Modular UI components:
    - `ProfileCard.tsx`: Displays the main identity and "Now" status.
    - `PersonaCard.tsx`: Selectable cards for filtering the view by a specific role.
    - `ProjectCard.tsx`: Displays individual project details and status.
    - `ActivityFeed.tsx`: A chronological list of recent updates/actions.
    - `FocusTimeline.tsx`: Visualizes phases of professional focus.
    - `LearningLog.tsx`: Captures intention-driven reflections.
    - `PersonaEvolution.tsx`: Shows how a specific persona has changed over time.

### `/data`
A centralized data store using TypeScript files. This makes the site easy to update without a database.
- `profile.ts`: Core personal information.
- `personas.ts`: Definitions for various professional identities.
- `projects.ts`: List of projects and their metadata.
- `activities.ts`: Granular activity entries.
- `focusTimeline.ts`: Data for the timeline visualization.
- `learningLogs.ts`: Reflection entries.

### `/public`
Static assets like images and SVGs.

## Core Concepts

### 1. Personas
The central axis of the application. A user can have multiple personas (e.g., "Fullstack Developer", "Prompt Engineer"). Selecting a persona filters projects and activities to show contextual relevance.

### 2. Contextual Filtering
The `Home` component in `app/page.tsx` maintains a `selectedPersona` state. When a persona is selected:
- **Projects** are filtered based on `relatedPersonas`.
- **Activities** are filtered based on `relatedPersona`.
- **Persona Evolution** details are displayed for the active selection.

### 3. Focus & Reflection
The platform emphasizes *current* work through the `CurrentFocusCard` and *continuous learning* through the `LearningLog`.

## Getting Started
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Edit data in `/data` to update content.
