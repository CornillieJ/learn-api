# Tips: Entering a Legacy Codebase

Six moves for your first weeks in `vwo-api`, in the order to make them.

1. **Understand how it ships before how it works.**
   **Do this:** read `.gitlab-ci.yml` → `Dockerfile` → `OpenApiApplication`
   before any business logic. You'll know the WAR name, the context path
   and the environment switch before day two.

2. **Enter from the edges.** Pick one entry point and follow it inward
   instead of trying to understand everything.
   **Do this:** start at `getById` in `SchoolController` and follow it
   down to the HQL in `ScholenDaoImpl`.

3. **Draw the dependency map by hand, roughly.**
   **Do this:** redraw the Knowledge File §5 diagram from memory, then
   compare it with the [UML walkthrough](codebase-walkthroughs/uml.md).

4. **Refactor to understand, in a scratch copy, and never commit it.**
   **Do this:** try `KangoeroePoolsParticipantsRepositoryImpl` (400 lines)
   in a throwaway branch: extract methods until its structure is obvious.

5. **Accept technical debt as a fact of life** and improve incrementally.
   **Do this:** Knowledge File §19 lists the debt; fix one small item per
   change you ship, never a big-bang cleanup.

6. **Watch someone experienced navigate unfamiliar code.**
   **Do this:** watch the LeadDev talk below (title-level verification
   only), then pair with a colleague on one ticket.

## Sources

[Getting into a large codebase, Understand Legacy Code](https://understandlegacycode.com/getting-into-large-codebase/) ✅ · [A roadmap to working with your legacy codebases, LeadDev (YouTube)](https://www.youtube.com/watch?v=WTnrX07ATnQ) 🔎 title and channel "LeadDev" confirmed · search results for "onboarding to a legacy codebase" (used only for the "start from how it ships" idea) ⚠️.
