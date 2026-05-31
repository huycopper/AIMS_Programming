# Project Context: AIMS_Programming

## 1. Global Development Philosophy & Source of Truth

- **ABSOLUTE AUTHORITY:** The file `Context/AIMS-ProblemStatement-ver3.1.1.md` holds the HIGHEST authority in this project. All other files in the `Context` directory (including Class Designs and Database Descriptions) are derived from this Problem Statement.
- **CRITICAL RULE:** Derived context files may contain errors, missing information, or conflicts. In any case of doubt, conflict, or ambiguity, you MUST cross-reference and defer to `AIMS-ProblemStatement-ver3.1.1.md` as the ultimate single source of truth for business rules and system requirements.
- **ANTI-SUMMARIZATION MANDATE:** When creating Epics, Stories, PRDs, or any other artifacts, you MUST NOT summarize, paraphrase, or omit any details from the `AIMS-ProblemStatement-ver3.1.1.md`. You must extract and quote the requirements exhaustively (including every UI field, logic constraint, and step). Missing a single field because of "lazy summarization" is considered a critical failure.

## 2. OOAD and Design Adherence

- **Strict Adherence:** The application architecture must map to the BCE classes defined in the UML and class design specs (`Group20-ClassDesignSpecification.md`), AND the database schema defined in `DatabaseDescription.md`.
- **Boundary-Control-Entity (BCE):**
  - _Boundaries_ (Angular components/UI screens) handle presentation.
  - _Controls_ (NestJS services/controllers) orchestrate business logic.
  - _Entities_ (TypeORM models/classes) represent state and data persistence.
- **Traceability:** Every class, method, and attribute implemented in the source code must be traceable back to the design specs, which ultimately must satisfy the Problem Statement.
- **Conflict Resolution Hierarchy:**
  1. `AIMS-ProblemStatement-ver3.1.1.md` (Highest authority - Business rules & Requirements).
  2. `DatabaseDescription.md` (Physical schema, field names, constraints - Single source of truth for data structures).
  3. `Group20-ClassDesignSpecification.md` (Method signatures, BCE architecture). If there is any naming or structural conflict between Class Design and Database Description (e.g., `productName` vs `title`), Database Description MUST be treated as the source of truth to ensure full-stack integration integrity.

## 3. Implementation Workflow

- When executing a story (`bmad-dev-story`), the Developer Agent (Amelia) must first cross-reference the story requirements with the Class Design Specification to identify the exact Boundary, Control, and Entity classes involved.
- Code generation must reflect the exact naming conventions, data types, and relationships defined in the design phase.
