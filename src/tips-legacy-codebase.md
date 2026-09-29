# Tips: Entering a Legacy Codebase

Collected from web searches; each source's status is marked. Every tip ends with a note on how it applies to this project.

Sources: [Getting into a large codebase, Understand Legacy Code](https://understandlegacycode.com/getting-into-large-codebase/) ✅ · [A roadmap to working with your legacy codebases, LeadDev (YouTube)](https://www.youtube.com/watch?v=WTnrX07ATnQ) 🔎 title and channel "LeadDev" confirmed · search results for "onboarding to a legacy codebase" (used only for the "start from how it ships" idea) ⚠️.

1. **Enter from the edges:** pick one entry point and follow it inward instead of understanding everything. → Start at `getById` in `SchoolController` and follow it down to the HQL.

2. **Draw the dependency map by hand, roughly.** → Redraw the Knowledge File §5 diagram from memory, then compare.

3. **Exploratory refactoring** in a scratch copy purely to understand structure (never commit). → Try `KangoeroePoolsParticipantsRepositoryImpl` (400 lines) in a throwaway branch.

4. **Understand how it ships before how it works.** → Read `.gitlab-ci.yml` → `Dockerfile` → `OpenApiApplication` before the business logic.

5. **Accept technical debt as a fact of life** and improve incrementally. → Knowledge File §19 lists the debt; fix one small item per change.

6. **Watch someone experienced navigate unfamiliar code:** the LeadDev talk exists for that (title-level verification only).
