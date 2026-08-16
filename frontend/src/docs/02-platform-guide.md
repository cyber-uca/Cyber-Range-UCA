# Platform Guide

This page covers how UCA CyRange works mechanically — how content is structured, how your progress is recorded, and what the different parts of the interface do. Think of it as the reference you come back to when something isn't behaving the way you expected.

---

## Content hierarchy

Everything in UCA CyRange follows the same structure:

```
Path  →  Module  →  Room  →  Task  →  Question
```

A **Path** is a broad domain of knowledge — Risk Management, Offensive, Defensive, or Mitigation. It's the highest level of the hierarchy.

A **Module** is a thematic cluster of rooms inside a path. For example, the Risk Management path has four modules: Accidental Risk, Environmental Risk, Regulatory Risk, and Organizational Risk. Modules give you a sense of where a room fits conceptually before you open it.

A **Room** is a complete scenario. It has a story, objectives, an estimated duration, a difficulty level, and a set of virtual machines. Rooms are the main unit of learning on the platform.

A **Task** is a phase inside a room — typically named after the action you're performing: Discover, Collect Evidence, Analyze, Decide, Mitigate, Apply. Tasks are meant to be done in order.

A **Question** is an assessment point inside a task. Answering questions correctly earns XP and marks the task as complete.

---

## Question types

You'll encounter several different question formats across the rooms:

**Multiple choice (single)** — four options, one correct answer. Read all four before choosing; the wrong answers are usually plausible.

**Multiple choice (multi)** — several options, more than one correct. You need to select all the right ones.

**Flag** — you find a specific value inside a VM (in a log file, a config, a command output) and submit it exactly. Flags look like `FLAG{some_value}` or `ANSWER_X` depending on the room.

**Short text** — type a word or phrase. Used when the answer is a specific term or identifier.

**Matching** — drag items from the left column to their corresponding items on the right. Used for things like matching attack techniques to their descriptions, or protocols to their layers.

**Numeric** — enter a number. Used for things like port numbers, voltage thresholds, or timestamps.

---

## The lab interface

When you click **Start Lab** inside a room, the lab interface opens in a full-screen view. It has two panels:

The **left panel** shows your tasks. Click a task to expand it and see the description, objectives, and questions. A green checkmark appears when a task is complete.

The **right panel** is the activity log and VM console. The log shows provisioning status, your submissions, and any system messages. The VM console opens as a noVNC window inside the browser — no extra software needed.

### VM access
Each room specifies its VMs and their IP addresses in the task descriptions. You can connect to them directly via the noVNC console in the lab, or SSH from one VM to another using the credentials listed in the task text.

### Pause and resume
The **Pause** button suspends all running VMs and freezes the timer. The **Resume** button wakes them back up. Pausing doesn't end your session or lose your answers — it's designed for when you need to step away.

### Reset
If something goes wrong with a VM (you accidentally broke a config, a service crashed), use the **Reset Lab** button. This destroys the current VMs and provisions fresh clones. Your answers are kept, but the machines go back to their initial state.

---

## Progress tracking

Progress is recorded at every level of the hierarchy. On the Dashboard you can see:

- Which rooms you've started and how far through them you are
- Your score vs. the maximum score for each room
- Module completion percentage
- Total XP across all paths

A room is marked complete when all its mandatory questions are answered. A module is marked complete when all its published rooms are done. Completing a module unlocks the **module quiz** — a short set of questions that synthesizes the concepts from all the rooms in that module.

---

## The module quiz

The quiz at the end of each module isn't graded against a pass/fail threshold — it's there to consolidate what you learned. You get your score at the end with explanations for each question. You can retake it. It doesn't affect your room progress, only your module progress.

---

## Your dashboard

The Dashboard gives you a quick read on where you stand. It shows your recent activity, a progress ring for each path, and your position on the leaderboard. The leaderboard ranks learners by total XP, so answering questions correctly and completely matters more than finishing rooms fast.
