# Project Context: AIMS_Programming

## 1. Global Development Philosophy
**CRITICAL RULE:** The source code MUST strictly follow the design. The design is considered complete and correctly applies Object-Oriented Analysis and Design (OOAD) principles.

## 2. OOAD and Design Adherence
- **Strict Adherence:** Under no circumstances should the implementation agent (Developer) invent new entities, controllers, or boundaries that contradict or circumvent the provided `Group20-ClassDesignSpecification.md` and `DatabaseDescription.md`.
- **Boundary-Control-Entity (BCE):** The application architecture must rigorously map to the BCE classes defined in the UML and class design specs. 
  - *Boundaries* (Angular components/UI screens) handle presentation.
  - *Controls* (NestJS services/controllers) orchestrate business logic.
  - *Entities* (TypeORM models/classes) represent state and data persistence.
- **Traceability:** Every class, method, and attribute implemented in the source code must be traceable back to a specific element in the Class Design Specification.

## 3. Implementation Workflow
- When executing a story (`bmad-dev-story`), the Developer Agent (Amelia) must first cross-reference the story requirements with the Class Design Specification to identify the exact Boundary, Control, and Entity classes involved.
- Code generation must reflect the exact naming conventions, data types, and relationships defined in the design phase.
