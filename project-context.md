# Project Context: AIMS_Programming

## 1. Global Development Philosophy & Source of Truth
- **ABSOLUTE AUTHORITY:** The file `Context/AIMS-ProblemStatement-ver3.1.1.md` holds the HIGHEST authority in this project. All other files in the `Context` directory (including Class Designs and Database Descriptions) are derived from this Problem Statement. 
- **CRITICAL RULE:** Derived context files may contain errors, missing information, or conflicts. In any case of doubt, conflict, or ambiguity, you MUST cross-reference and defer to `AIMS-ProblemStatement-ver3.1.1.md` as the ultimate single source of truth for business rules and system requirements.

## 2. OOAD and Design Adherence
- **Strict Adherence:** The application architecture must map to the BCE classes defined in the UML and class design specs (`Group20-ClassDesignSpecification.md`), AND the database schema defined in `DatabaseDescription.md`.
- **Boundary-Control-Entity (BCE):**
  - *Boundaries* (Angular components/UI screens) handle presentation.
  - *Controls* (NestJS services/controllers) orchestrate business logic.
  - *Entities* (TypeORM models/classes) represent state and data persistence.
- **Traceability:** Every class, method, and attribute implemented in the source code must be traceable back to the design specs, which ultimately must satisfy the Problem Statement.
- **Conflict Resolution Hierarchy:** 
  1. `AIMS-ProblemStatement-ver3.1.1.md` (Highest authority - Business rules & Requirements).
  2. `DatabaseDescription.md` (Physical schema, field names, constraints - Single source of truth for data structures).
  3. `Group20-ClassDesignSpecification.md` (Method signatures, BCE architecture). If there is any naming or structural conflict between Class Design and Database Description (e.g., `productName` vs `title`), Database Description MUST be treated as the source of truth to ensure full-stack integration integrity.
## 3. Implementation Workflow
- When executing a story (`bmad-dev-story`), the Developer Agent (Amelia) must first cross-reference the story requirements with the Class Design Specification to identify the exact Boundary, Control, and Entity classes involved.
- Code generation must reflect the exact naming conventions, data types, and relationships defined in the design phase.
